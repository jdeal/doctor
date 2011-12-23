'use strict';

var ghm = require("github-flavored-markdown");
var _ = require('underscore');

function stripParagraphTag(text) {
  /*jshint regexp: false */
  return text.replace(/^<p>(.*)<\/p>$/, '$1');
}

function markdownToHtml(nodes) {
  if (nodes instanceof Object) {
    if (nodes.description) {
      nodes.description = stripParagraphTag(ghm.parse(nodes.description));
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
