var async = require('async');
var path = require('path');

var u = require('./util');

/* Render the report with the render modules supplied in the options. */
function render(options, report, cb) {
  (function (async, u) {
    if (options.sync) {
      async = u.sync.async;
      u = u.sync;
    }

    var reportName = options.outputReportName || 'report.json';
    var files = {};
    files[reportName] = report;
    var renderFunctions = u.toArray(options.render || 'default');
    try {
      renderFunctions = u.findFunctions(renderFunctions, 'render');
    } catch (findError) {
      return cb(findError);
    }
    function eachRender(fn, cb) {
      fn(options, files, function (err, renderedFiles) {
        if (err) {
          return cb(err);
        }
        files = renderedFiles;
        cb(null, files);
      });
    }
    async.forEachSeries(renderFunctions, eachRender, function (err) {
      if (err) {
        return cb(err);
      }
      Object.keys(files).forEach(function (filename, i) {
        var file = files[filename];
        if (typeof file !== 'string') {
          try {
            // if circular references were introduced, this will fail
            var fileString = JSON.stringify(file, null, 2);
            files[filename] = fileString;
          } catch (jsonError) {
            return cb(jsonError);
          }
        }
      });
      cb(err, files);
    });
  }(async, u));
}

module.exports = render;