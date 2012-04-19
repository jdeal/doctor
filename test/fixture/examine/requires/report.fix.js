var Path = require('path');

module.exports = function (report) {
  var items = report.items;
  items.b.fullPath = Path.join(__dirname, items.b.fullPath);
  items.a.fullPath = Path.join(__dirname, items.a.fullPath);
  items.b.originalPath = Path.join(__dirname, items.b.originalPath);
  items.a.originalPath = Path.join(__dirname, items.a.originalPath);
  items.a.requires[0] = Path.join(__dirname, items.a.requires[0]);
};