var test = require('tap').test;

var peg = require('pegjs');
var fs = require('fs');

var grammar = fs.readFileSync('../grammar/comment-tags.pegjs', 'utf8');
var parser = peg.buildParser(grammar);

test('simple return tag', function (t) {
  var comment = "@return description";
  var ast = parser.parse(comment);

  t.equal(ast.length, 1);

  var tag = ast[0];
  t.equal(tag.name, 'return');
  t.deepEqual(tag.value, { description: 'description'});

  t.end();
});

test('return tag with type', function (t) {
  var comment = "@return {String} description";
  var ast = parser.parse(comment);

  t.equal(ast.length, 1);

  var tag = ast[0];
  t.equal(tag.name, 'return');
  t.equal(tag.value.description, 'description');
  t.equal(tag.value.types.length, 1);
  t.equal(tag.value.types[0], 'String');

  t.end();
});

test('optional param tag', function (t) {
  var comment = "@param [s='giggly goo'] description";
  var ast = parser.parse(comment);

  t.equal(ast.length, 1);

  var tag = ast[0];

  t.ok(tag.value.optional);
  t.equal(tag.value.defaultValue, "'giggly goo'");
  t.equal(tag.name, 'param');
  t.equal(tag.value.name, 's');
  t.equal(tag.value.description, 'description');

  t.end();
});

test('class and constructor description', function (t) {
  var comment = "@class class description\n" +
      "@constructor constructor description";

  var ast = parser.parse(comment);
  t.equal(ast.length, 2);

  var tag = ast[0];

  t.equal(tag.name, 'classDescription');
  t.equal(tag.value.description, 'class description');

  t.end();
});

var util = require('util');

test('properties', function (t) {
  var comment = "@property propOne property one description\n" +
      "@property {String} propTwo property two description";

  var ast = parser.parse(comment);
  t.equal(ast.length, 2);

  var prop1 = ast[0];
  console.log(util.inspect(prop1));
  t.equal(prop1.name, 'property');
  t.equal(prop1.value.name, 'propOne');
  t.equal(prop1.value.description, 'property one description');
  t.notOk(prop1.types);

  var prop2 = ast[1];
  t.equal(prop2.name, 'property');
  t.equal(prop2.value.name, 'propTwo');
  t.equal(prop2.value.description, 'property two description');
  t.equal(prop2.value.types.length, 1);
  t.equal(prop2.value.types[0], 'String');

  t.end();
});
