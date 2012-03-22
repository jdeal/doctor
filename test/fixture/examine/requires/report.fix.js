var Path = require('path');

module.exports = function (report) {
  var items = report.items;
  items.b.fullPath = Path.join(__dirname, items.b.fullPath);
  items.a.fullPath = Path.join(__dirname, items.a.fullPath);
  items.a.requires[0] = Path.join(__dirname, items.a.requires[0]);
};