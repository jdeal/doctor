'use strict';

var ghm = require('github-flavored-markdown');
var Showdown = require('showdown').Showdown;
var _ = require('underscore');

var converter = new Showdown.converter();

function stripParagraphTag(text) {
  /*jshint regexp: false */
  return text.replace(/^<p>(.*)<\/p>$/, '$1');
}

function markdownToHtml(nodes) {
  if (nodes instanceof Object) {
    if (nodes.description) {
      nodes.description = stripParagraphTag(converter.makeHtml(nodes.description));
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
