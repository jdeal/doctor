var argv = require('optimist').argv;
//var parser = require('uglify-js').parser;
var fs = require('fs');
//var traverse = require('traverse');
var async = require('async');
var path = require('path');
var ncp = require('ncp').ncp;
var mkdirp = require('mkdirp');
var _ = require('underscore');

var parser = require('./fork/parse-js');

var nast = require('./nice-ast');
var transform = require('./transform');
var report = require('./report');
var render = require('./render');
var u = require('./util');
var postProcessReport = require('./post-process').postProcessReport;

function getAst(options, astList, astPathList, cb) {
  async.forEach(options.files, function (file, cb) {
    nast.astFromFile(options, file, function (e, ast) {
      if (e) {
        return cb(e);
      }
      astList.push(ast);
      astPathList.push(ast.path);
      cb(null);
    });
  }, function (err) {
    if (err) {
      return cb(err);
    }
    astPathList = u.localizePaths(astPathList);
    astList.forEach(function (ast, i) {
      ast.fullPath = ast.path;
      ast.path = astPathList[i];
    });
    cb(null);
  });
}

function transformAst(options, astList, cb) {
  var ast = {type: 'files', nodes: astList};
  var extendedAst = nast.extendAst(ast);
  if (!options.transform) {
    return cb(null, extendedAst);
  }
  transform(options, extendedAst, cb);
}

function makeReport(options, ast, cb) {
  if (!options.report) {
    return cb(null, {ast: ast, report: null});
  }
  report(options, ast, function (err, report) {
    if (err) {
      return cb(err);
    }
    cb(null, {ast: ast, report: report});
  });
}

function pickupRequiredFiles(originalOptions, astList, astPathList, result, cb) {
  var options = u.clone(originalOptions);

  if (!options.followRequired || !options.report) {
    return cb(null, result);
  }
  // no sync here yet

  var requires = [];
  _.each(result.report.items, function (value, key) {
    if (value.required) {
      requires.push(value.items[0]);
    }
  });

  options.files = requires;

  async.waterfall([
    async.apply(getAst, options, astList, astPathList),
    async.apply(transformAst, options, astList),
    async.apply(makeReport, options)
  ], function (err, newResult) {
    if (err) {
      return cb(err);
    }
    
    var items = newResult.report.items;

    requires.forEach(function (moduleKey) {
      var modules = items.modules.items;
      var index = modules.indexOf(moduleKey);
      modules.splice(index, 1);
    });
    
    _(items).each(function (value, key) {
      if (value.required) {
        var childKey = value.items[0];
        var child = items[childKey];
        if (child) {
          child.groups.splice(child.groups.indexOf('modules'), 1);
          child.groups.push(key);
          child.type.replace(/^module-/, '');
        }
      }
    });

    cb(null, newResult);
  });
}

/* Parses the AST of a set of JavaScript files, uses report rules to convert the
   AST into a report, and optionally combines the report with the view or
   renders the report into an output format. */
function examine(options, cb) {
  (function (path, fs, async, u) {
    var syncFinished = false;
    options = u.clone(options);
    options.sync = options.sync || false;
    if (typeof options.followRequired === 'undefined') {
      options.followRequired = true;
    }
    var origCb = cb;
    var syncError = null;
    var syncResult = null;

    if (options.sync) {
      path = u.sync.path;
      fs = u.sync.fs;
      async = u.sync.async;
      u = u.sync;
      cb = function (err, result) {
        syncFinished = true;
        syncError = err;
        syncResult = result;
      };
    }

    if (!Array.isArray(options.files)) {
      cb(new Error('must pass in array of files'));
    }
    if (options.output === true) {
      options.output = 'output';
    }
    if (options.transform === true) {
      options.transform = 'default';
    }
    if (options.report === true) {
      options.report = 'default';
    }
    if (options.view === true) {
      options.view = 'default';
    }
    if (options.report && !options.render) {
      options.render = true;
    }
    if (options.render === true) {
      options.render = 'default';
    }
    var outputDir = null;
    var outputReportName = null;
    if (options.output) {
      outputDir = path.dirname(options.output);
      if (path.extname(options.output) === '.json') {
        outputReportName = path.basename(options.output);
      } else {
        outputDir = options.output;
      }
    }
    if (outputReportName) {
      options.outputReportName = outputReportName;
    }
    var astList = [];
    var astPathList = [];
    var done = false;

    function finish(result) {
      if (!options.ast && !options.render) {
        result = result.report;
      } else if (!options.ast) {
        result = result.files;
      } else {
        var cleanAst = nast.cleanAst(result.ast);
        result.ast = cleanAst;
        if (!options.report) {
          result = cleanAst;
        } else if (!options.render) {
          result = {ast: cleanAst, report: result.report};
        }
      }
      syncFinished = true;
      return cb(null, result);
    }

    function writeOutput(result) {
      if (!options.output) {
        return finish(result);
      }
      function writeFile(file, cb) {
        var filePath = path.join(outputDir, file);
        // this will not work for sync, but we shouldn't be writing files
        // for sync anyway
        mkdirp(path.dirname(filePath), parseInt(755, 8), function (err) {
          if (err) {
            return cb(err);
          }
          fs.writeFile(filePath, result.files[file], cb);
        });
      }
      async.forEach(Object.keys(result.files), writeFile, function (err) {
        cb(err, result);
      });
    }

    function renderReport(result) {
      result.files = {};
      if (!result.report) {
        return writeOutput(result);
      }
      render(options, result.report, function (err, files) {
        if (err) {
          return cb(err);
        }
        Object.keys(files).forEach(function (file, i) {
          result.files[file] = files[file];
        });
        return writeOutput(result);
      });
    }

    function postProcess(result, cb) {
      if (!result.report) {
        return renderReport(result);
      }
      result.report = postProcessReport(result.report);
      return renderReport(result);
    }

    function followRequired(result) {
      pickupRequiredFiles(options, astList, astPathList, result, function (err, newResult) {
        if (err) {
          return cb(err);
        }
        return postProcess(newResult);
      });
    }

    function doMakeReport(ast) {
      makeReport(options, ast, function (err, report) {
        if (err) {
          return cb(err);
        }
        return followRequired(report);
      });
    }

    function doTransformAst() {
      transformAst(options, astList, function (err, transformedAst) {
        if (err) {
          return cb(err);
        }
        return doMakeReport(transformedAst);
      });
    }

    function doGetAst() {
      getAst(options, astList, astPathList, function (err) {
        if (err) {
          return cb(err);
        }
        return doTransformAst();
      });
    }

    function getCommentParser() {
      nast.pegParser({grammar: 'comment-tags', sync: options.sync}, function (err, parser) {
        if (err) {
          return cb(err);
        }
        options.commentParser = parser;
        return doGetAst();
      });
    }

    // this will not run synchronously
    function copyView() {
      if (!options.view) {
        return getCommentParser();
      }
      options.view = Array.isArray(options.view) ? options.view : [options.view];
      function eachView(view, cb) {
        var viewChoices = [view, path.join(__dirname, '../view', view)];
        u.findDir(viewChoices,
          function viewExists(dir) {
            ncp(dir, outputDir, {stopOnError: true}, function (err) {
              if (err) {
                return cb(err);
              }
              return getCommentParser();
            });
          },
          function viewNotFound() {
            cb(new Error('View directory ' + view + ' does not exist.'));
          }
        );
      }
      async.forEachSeries(options.view, eachView, cb);
    }

    function checkOutputDir() {
      if (!outputDir) {
        return copyView();
      }
      path.exists(outputDir, function (exists) {
        if (!exists) {
          return cb(new Error('output directory ' + outputDir + ' does not exist'));
        }
        return copyView();
      });
    }
    
    checkOutputDir();

    if (options.sync) {
      if (!syncFinished) {
        throw new Error('Problem attempting synchronous examine.');
      } else {
        origCb(syncError, syncResult);
      }
    }
  }(path, fs, async, u));
}

/* __EXPERIMENTAL!__ Registers a compiler for the .js extension that will
   compile harmony files to ECMAScript 5. */
function harmony() {

  function compiler(module, filename) {
    // don't attempt to run doctor code through harmony compiler before
    // doctor's dynamic requires are finished; otherwise, we'll deadlock
    if (!harmony.isStarted || harmony.isReady) {
      harmony.isStarted = true;
      var options = {
        files: [filename],
        grammar: 'harmony',
        report: ['ast'],
        render: ['source'],
        transform: ['harmony-es5'],
        sync: true,
        followRequired: false
      };
      var source;
      var error;

      examine(options, function (err, report) {
        if (err) {
          error = err;
        } else {
          var key = Object.keys(report)[0];
          source = report[key];
        }
        harmony.isReady = true;
      });

      //return module._compile(content, filename);
      if (error) {
        //throw error;
        throw SyntaxError("In " + filename + ", " + error.message + " on line " + error.line);
      }
      if (!error) {
        try {
          return module._compile(source, filename);
        } catch (e) {
          return module._compile(fs.readFileSync(filename, 'utf-8'), filename);
        }
      } else {
        return module._compile(fs.readFileSync(filename, 'utf-8'), filename);
      }
    } else {
      return module._compile(fs.readFileSync(filename, 'utf-8'), filename);
    }
  }

  require.extensions['.js'] = compiler;
}

module.exports.examine = examine;
module.exports.harmony = harmony;
