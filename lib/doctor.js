var argv = require('optimist').argv;
//var parser = require('uglify-js').parser;
var fs = require('fs');
//var traverse = require('traverse');
var async = require('async');
var path = require('path');
var ncp = require('ncp').ncp;

var parser = require('./fork/parse-js');

var nast = require('./nice-ast');
var transform = require('./transform');
var report = require('./report');
var render = require('./render');
var u = require('./util');

function examine(options, cb) {
  options = u.clone(options);
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
  var done = false;
  async.waterfall([
    function checkOutputDir(cb) {
      if (!outputDir) {
        return cb(null);
      }
      path.exists(outputDir, function (exists) {
        if (!exists) {
          return cb(new Error('output directory ' + outputDir + ' does not exist'));
        }
        cb(null);
      });
    },
    function copyView(cb) {
      if (!options.view) {
        return cb(null);
      }
      options.view = Array.isArray(options.view) ? options.view : [options.view];
      function eachView(view, cb) {
        var viewChoices = [view, path.join(__dirname, '../view', view)];
        u.findDir(viewChoices,
          function viewExists(dir) {
            ncp(dir, outputDir, {stopOnError: true}, cb);
          },
          function viewNotFound() {
            cb(new Error('View directory ' + view + ' does not exist.'));
          }
        );
      }
      async.forEachSeries(options.view, eachView, cb);
    },
    function getAst(cb) {
      async.forEach(options.files, function (file, cb) {
        nast.astFromFile(options, file, function (e, ast) {
          if (e) {
            return cb(e);
          }
          astList.push(ast);
          cb(null);
        });
      }, cb);
    },
    function getCommentParser(cb) {
      nast.pegParser('comment-tags', function (err, parser) {
        if (err) {
          return cb(err);
        }
        options.commentParser = parser;
        cb(null);
      });
    },
    function transformAst(cb) {
      var ast = {type: 'files', nodes: astList};
      var extendedAst = nast.extendAst(ast);
      if (!options.transform) {
        return cb(null, extendedAst);
      }
      transform(options, extendedAst, cb);
    },
    function makeReport(ast, cb) {
      if (!options.report) {
        return cb(null, {ast: ast, report: null});
      }
      report(options, ast, function (err, report) {
        if (err) {
          return cb(err);
        }
        cb(null, {ast: ast, report: report});
      });
    },
    function renderReport(result, cb) {
      result.files = {};
      if (!result.report) {
        return cb(null, result);
      }
      render(options, result.report, function (err, files) {
        if (err) {
          return cb(err);
        }
        Object.keys(files).forEach(function (file, i) {
          result.files[file] = files[file];
        });
        cb(null, result);
      });
    },
    function writeOutput(result, cb) {
      if (!options.output) {
        return cb(null, result);
      }
      function writeFile(file, cb) {
        fs.writeFile(path.join(outputDir, file), result.files[file], function (err) {
          cb(err);
        });
      }
      async.forEach(Object.keys(result.files), writeFile, function (err) {
        cb(err, result);
      });
    }
  ],
  function (err, result) {
    if (err) {
      return cb(err);
    }
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
    cb(null, result);
  });
}

module.exports.examine = examine;
