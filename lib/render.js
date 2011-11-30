var async = require('async');
var path = require('path');

var u = require('./util');

function render(options, report, cb) {
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
      files = renderedFiles;
      cb(err, files);
    });
  }
  async.forEachSeries(renderFunctions, eachRender, function (err) {
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
}

module.exports = render;