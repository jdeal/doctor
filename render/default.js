'use strict';

var marked = require('marked');
var _ = require('underscore');

marked.setOptions({
  gfm: true
});

function stripParagraphTag(text) {
  /*jshint regexp: false */
  return text.replace(/^<p>(.*)<\/p>$/, '$1');
}

function stripTrailingNewline(text) {
  if (text.charAt(text.length - 1) === '\n') {
    text = text.substring(0, text.length - 1);
  }
  return text;
}

function markdownToHtml(nodes) {
  if (nodes instanceof Object) {
    if (nodes.description) {
      //nodes.description = stripParagraphTag(converter.makeHtml(nodes.description));
      //nodes.description = converter.makeHtml(nodes.description);
      nodes.description = stripTrailingNewline(marked(nodes.description));
    }
    if (nodes.content) {
      nodes.content = stripTrailingNewline(marked(nodes.content));
      //nodes.content = ghm.parse(nodes.content);
    }
    _(nodes).each(function (value) {
      markdownToHtml(value);
    });
  }
}

module.exports = function render(options, files, cb) {
  try {
    markdownToHtml(files);
  } catch (e) {
    cb(e);
  }
  cb(null, files);
};
