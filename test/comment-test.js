var test = require('tap').test;

var peg = require('pegjs');
var fs = require('fs');
var util = require('util');

var grammar = fs.readFileSync('../grammar/comment-tags.pegjs', 'utf8');
var parser = peg.buildParser(grammar);

test('return tag', function (t) {
  var comment = "@return description";
  var ast = parser.parse(comment);

  t.equal(ast.length, 1);

  var tag = ast[0];
  t.equal(tag.name, 'return');
  t.deepEqual(tag.value, { description: 'description'});

  t.end();
});
