/*
Main module.

@example
var doctor = require('doctor');
*/

var argv = require('optimist').argv;
var fs = require('fs');
var async = require('async');
var Path = require('path');
var ncp = require('ncp').ncp;
var mkdirp = require('mkdirp');
var _ = require('underscore');

var nast = require('./nice-ast');
var transform = require('./transform');
var report = require('./report');
var render = require('./render');
var u = require('./util');

function getAst(options, astList, astPathList, cb) {
  async.forEachSeries(options.files, function (file, cb) {
    options.progressCb({
      type: 'get-ast',
      file: file,
      message: 'get ast: ' + file
    });
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
  var options = _.clone(originalOptions);

  if (!options.follow || !options.report) {
    return cb(null, result);
  }

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

var examine;

function filterItemRequires(item, cb) {
  function eachRequire(r, cb) {
    var fsExists = fs.exists || Path.exists;
    fsExists(r + '.js', function (exists) {
      if (exists) {
        return cb(null, r + '.js');
      }
      var extension = Path.extname(r);
      //var path = r.substring(0, r.length - extension.length);
      fsExists(r + '/package.json', function (exists) {
        if (exists) {
          return cb(null, r + '/package.json');
        }
        return cb(null, '');
      });
    });
  }
  async.map(item.requires, eachRequire, function (err, requires) {
    item.requires = requires.filter(function (r) {
      return r !== '';
    });
    cb(null);
  });
}

function filterRequires(report, cb) {
  async.forEach(report.items.modules.items, function (m, cb) {
    m = report.items[m];
    filterItemRequires(m, cb);
  }, function (err) {
    cb(null);
  });
}

function findRequired(options, files, moduleInfo, cb) {
  var firstPass = false;
  if (typeof moduleInfo === 'function') {
    cb = moduleInfo;
    moduleInfo = {
      requiredPaths: [],
      modulePaths: [],
      pathToModule: {}
    };
    firstPass = true;
  }
  if (files.length === 0) {
    return cb(null, moduleInfo);
  }
  var requireOptions = _.clone(options);
  requireOptions.files = files;
  requireOptions.report = ['requires'];
  requireOptions.render = false;
  requireOptions.follow = false;
  examine(requireOptions, function (progress) {
    if (progress.type === 'get-ast') {
      options.progressCb({
        type: 'get-required-ast',
        message: 'get required ast: ' + progress.file
      });
    }
  }, function (err, report) {
    if (err) {
      return cb(err);
    }
    // report might be wrapped
    if (report.report) {
      report = report.report;
    }
    if (!report.items.modules) {
      return cb(null, moduleInfo);
    }
    var newRequiredPaths = [];
    // will track package and main, so need to keep track of what should be
    // removed later
    var dupPaths = [];
    var originalPaths = [];
    var missingFiles = [];
    report.items.modules.items.forEach(function (m, i) {
      m = report.items[m];
      var packagePath = m.package ? m.package.path : null;
      if (firstPass) {
        originalPaths.push(m.originalPath);
        // register this as a top-level module
        moduleInfo.modulePaths.push(m.fullPath);
        if (packagePath) {
          originalPaths.push(m.package.originalPath);
          dupPaths.push(m.fullPath);
          moduleInfo.modulePaths.push(packagePath);
        }
      }
      // map the module path to the module
      moduleInfo.pathToModule[m.fullPath] = m;
      if (packagePath) {
        moduleInfo.pathToModule[packagePath] = m;
      }
    });
    if (firstPass) {
      missingFiles = _.difference(files, originalPaths);
    }
    filterRequires(report, function () {
      report.items.modules.items.forEach(function (m, i) {
        m = report.items[m];
        m.requires.forEach(function (requirePath, i) {
          if (moduleInfo.modulePaths.indexOf(requirePath) < 0 &&
              moduleInfo.requiredPaths.indexOf(requirePath) < 0) {
            // register this as a required module
            moduleInfo.requiredPaths.push(requirePath);
            // register this as a required module for this recursion
            newRequiredPaths.push(requirePath);
          }
        });
      });
      // dig deeper
      findRequired(options, newRequiredPaths, moduleInfo, function (err, moduleInfo) {
        if (err) {
          return cb(err);
        }
        if (firstPass) {
          var index, insertIndex;
          // put together top-level module paths with required paths
          var modulePaths = moduleInfo.modulePaths.concat(moduleInfo.requiredPaths);
          // filter out duplicate paths
          modulePaths = modulePaths.filter(function (path) {
            return dupPaths.indexOf(path) < 0;
          });
          // start sorting them
          var sorted = [modulePaths[0]];
          index++;
          for (index = 1; index < modulePaths.length; index++) {
            var modulePath = modulePaths[index];
            var m = moduleInfo.pathToModule[modulePath];
            for (insertIndex = 0; insertIndex < sorted.length; insertIndex++) {
              var sortedM = moduleInfo.pathToModule[sorted[insertIndex]];
              if (sortedM.requires.indexOf(modulePath) >= 0) {
                break;
              }
            }
            sorted.splice(insertIndex, 0, modulePath);
          }
          moduleInfo.sorted = sorted.concat(missingFiles);
        }
        cb(err, moduleInfo);
      });
    });
  });
}

/*
  Parses the AST of a set of JavaScript files, uses report rules to convert the
  AST into a report, and optionally combines the report with the view or
  renders the report into an output format.

  @param {Object} options
    Options for doctor.
    @param {Array|String} options.files
      One or more source files to inspect.
    @param {String|boolean} options.output
      Directory or filename for where to output the report file. If true, uses
      default output directory name of "output".
    @param {Array|String|boolean} options.view
      One or more view directories to merge into output directory. If true, uses
      default view.
    @param {Array|String|boolean} options.report
      One or more report modules. If true, uses default report module.
    @param {Array|String|boolean} options.transform
      One or more transform modules. If true, uses default transform module.
    @param {Array|String|boolean} options.render
      One or more render modules. If true, uses default render module.
    @param {String|Object} options.grammar
      Grammar file to use or a map of grammar files to use for each source
      extension.
  @param {function(progress)} [progressCb] Function to call with progress messages.
  @param {function(err, report)} cb Function to call when doctor is finished.

  @example
  var doctor = require('doctor');
  var options = {
    files: ['package.json'],
    view: ['default', 'doctor']
  };
  doctor.examine(options, function (err, report) {
    console.log(JSON.stringify(report));
  })
*/
function examine(options, progressCb, cb) {
  options = _.clone(options);
  if (typeof options.follow === 'undefined') {
    options.follow = true;
  }
  if (typeof cb === 'undefined') {
    cb = progressCb;
    progressCb = function () {};
  }
  options.progressCb = progressCb;

  if (!Array.isArray(options.files)) {
    cb(new Error('must pass in array of files'));
  }
  if (options.output === true) {
    options.output = 'output';
  }
  if (options.transform === true || typeof  options.transform === 'undefined') {
    options.transform = 'default';
  }
  if (options.report === true || typeof  options.report === 'undefined') {
    options.report = 'default';
  }
  if (options.view === true) {
    options.view = 'default';
  }
  // if (options.report && !options.render) {
  //   options.render = true;
  // }
  if (options.render === true || typeof  options.render === 'undefined') {
    options.render = 'default';
  }
  if (typeof options.unknown === 'undefined') {
    options.unknown = true;
  }
  var outputDir = null;
  var outputReportName = null;
  if (options.output) {
    outputDir = Path.dirname(options.output);
    if (Path.extname(options.output) === '.json') {
      outputReportName = Path.basename(options.output);
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
    progressCb({
      type: 'create-result',
      message: 'create result'
    });
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
    return cb(null, result);
  }

  function writeOutput(result) {
    if (!options.output) {
      return finish(result);
    }
    progressCb({
      type: 'write-output',
      message: 'write output'
    });
    function writeFile(file, cb) {
      var filePath = Path.join(outputDir, file);
      mkdirp(Path.dirname(filePath), parseInt(755, 8), function (err) {
        if (err) {
          return cb(err);
        }
        var fileString = result.files[file];
        if (typeof fileString !== 'string') {
          try {
            // if circular references were introduced, this will fail
            fileString = JSON.stringify(fileString, null, 2);
          } catch (e) {
            return cb(e);
          }
        }
        fs.writeFile(filePath, fileString, cb);
      });
    }
    async.forEach(Object.keys(result.files), writeFile, function (err) {
      if (err) {
        return cb(err);
      }
      finish(result);
    });
  }

  function renderReport(result) {
    progressCb({
      type: 'render-report',
      message: 'render report'
    });
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

  // function postProcess(result, cb) {
  //   if (!result.report) {
  //     return renderReport(result);
  //   }
  //   result.report = postProcessReport(result.report);
  //   return renderReport(result);
  // }

  // function followRequired(result) {
  //   pickupRequiredFiles(options, astList, astPathList, result, function (err, newResult) {
  //     if (err) {
  //       return cb(err);
  //     }
  //     return postProcess(newResult);
  //   });
  // }

  function doMakeReport(ast) {
    progressCb({
      type: 'make-report',
      message: 'make report'
    });
    makeReport(options, ast, function (err, report) {
      if (err) {
        return cb(err);
      }
      //return followRequired(report);
      return renderReport(report);
      //return postProcess(report);
    });
  }

  function doTransformAst() {
    progressCb({
      type: 'transform-ast',
      message: 'transform ast'
    });
    transformAst(options, astList, function (err, transformedAst) {
      if (err) {
        return cb(err);
      }
      return doMakeReport(transformedAst);
    });
  }

  function hoistToc(astList) {
    var tocIndex = -1;
    for (var i = 0; i < astList.length; i++) {
      var ast = astList[i];
      if (ast.type === 'markdown') {
        if (ast.path === 'TOC.md' || ast.path === 'toc.md') {
          tocIndex = i;
          break;
        }
      }
    }
    if (tocIndex >= 0) {
      var tocAst = astList[tocIndex];
      astList.splice(tocIndex, 1);
      astList.splice(0, 0, tocAst);
    }
  }

  function doGetAst(moduleInfo) {
    moduleInfo = moduleInfo || {};
    (function (originalOptions) {
      var options = _.clone(originalOptions);
      options.files = moduleInfo.sorted || options.files;
      getAst(options, astList, astPathList, function (err) {
        if (err) {
          return cb(err);
        }
        if (moduleInfo.sorted) {
          astList.forEach(function (ast, i) {
            var m = {};
            if (moduleInfo.pathToModule &&
                ast.fullPath in moduleInfo.pathToModule) {
              m = moduleInfo.pathToModule[ast.fullPath];
              if (!ast.package && m.package) {
                ast.package = m.package;
              }
            }
            if (moduleInfo.modulePaths.indexOf(ast.fullPath) < 0) {
              ast.required = true;
            }
          });
        }
        hoistToc(astList);
        return doTransformAst();
      });
    }(options));
  }

  function followRequired() {
    if (!options.follow) {
      return doGetAst();
    }
    progressCb({
      type: 'follow-required',
      message: 'find required modules'
    });
    findRequired(options, options.files, function (err, moduleInfo) {
      if (err) {
        return cb(err);
      }
      return doGetAst(moduleInfo);
    });
  }

  function getCommentParser() {
    progressCb({
      type: 'get-comment-parser',
      message: 'get comment parser'
    });
    nast.pegParser({grammar: 'comment-tags'}, function (err, parser) {
      if (err) {
        return cb(err);
      }
      options.commentParser = parser;
      return followRequired();
    });
  }

  function copyView() {
    if (!options.view) {
      return getCommentParser();
    }
    options.view = Array.isArray(options.view) ? options.view : [options.view];
    function eachView(view, cb) {
      progressCb({
        type: 'copy-view',
        message: 'copy view: ' + view
      });
      var viewChoices = [view, Path.join(__dirname, '../view', view)];
      u.findDir(viewChoices,
        function viewExists(dir) {
          ncp(dir, outputDir, {stopOnError: true}, function (err) {
            cb(err);
          });
        },
        function viewNotFound() {
          cb(new Error('View directory ' + view + ' does not exist.'));
        }
      );
    }
    async.forEachSeries(options.view, eachView, function (err) {
      if (err) {
        cb(err);
      }
      return getCommentParser();
    });
  }

  function checkOutputDir() {
    if (!outputDir) {
      return copyView();
    }
    var fsExists = fs.exists || Path.exists;
    fsExists(outputDir, function (exists) {
      if (!exists) {
        return cb(new Error('output directory ' + outputDir + ' does not exist'));
      }
      return copyView();
    });
  }
  checkOutputDir();
}

module.exports.examine = examine;