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
var isArray = require('./util').isArray;

function examine(options, cb) {
  if (!isArray(options.files)) {
    cb(new Error('must pass in array of files'));
  }
  if (!options.output) {
    cb(new Error('must specify an output directory'));
  }
  var outputDir = path.dirname(options.output);
  var outputReportName = null;
  if (path.extname(options.output) === '.json') {
    outputReportName = path.basename(options.output);
  } else {
    outputDir = options.output;
    if (!options.render) {
      outputReportName = 'report.json';
    }
  }
  var astList = [];
  var done = false;
  async.waterfall([
    function checkOutputDir(cb) {
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
      ncp(options.view, outputDir, cb);
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
    function render(result, cb) {
      result.files = {};
      if (!result.report) {
        return cb(null, result);
      }
      if (outputReportName) {
        try {
          // if circular references were introduced, this will fail
          var fileString = JSON.stringify(result.report, null, 2);
          result.files[outputReportName] = fileString;
        } catch (jsonError) {
          return cb(jsonError);
        }
      }
      if (options.render) {
        var r;
        try {
          r = options.render;
          if (typeof r === 'string') {
            r = require(path.join(process.cwd(), r));
          }
          if (typeof r !== 'function') {
            r = render.render;
          }
        } catch (rendererError) {
          return cb(rendererError);
        }
        r(options, result.report, function (err, files) {
          Object.keys(files).forEach(function (file, i) {
            result.files[file] = files[file];
          });
          cb(null, result);
        });
      } else {
        cb(null, result);
      }
    },
    function writeOutput(result, cb) {
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
      result = {report: result.report, files: result.files};
    } else if (!options.render) {
      var cleanAst = nast.cleanAst(result.ast);
      if (!options.report) {
        result = cleanAst;
      } else {
        result = {ast: cleanAst, report: result.report};
      }
    }
    cb(null, result);
  });
}

module.exports.examine = examine;