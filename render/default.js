var ghm = require("github-flavored-markdown");
var _ = require('underscore');

function markdownToHtml(nodes) {
  if (nodes instanceof Object) {
    if (nodes.description) {
      nodes.description = ghm.parse(nodes.description);
    }

    _(nodes).each(function (value) {
      markdownToHtml(value);
    });
  }
}

module.exports = function render(options, files, cb) {
  markdownToHtml(files);
  cb(null, files);
};
