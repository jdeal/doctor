var h = require('handlebars');
var path = require('path');
var fs = require('fs');

module.exports = function render(options, report, cb) {
  fs.readFile(path.join(__dirname, 'module.md'), 'utf-8', function (err, md) {
    if (err) {
      return cb(err);
    }
    var t = h.compile(md);
    var moduleNames = report.items.modules.items;
    var files = {};
    moduleNames.forEach(function (moduleName, i) {
      var data = {module_name: moduleName};
      var file = t(data);
      files[moduleName + ".md"] = file;
    });
    cb(null, files);
  });
};