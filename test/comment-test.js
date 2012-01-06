var test = require('tap').test;

var peg = require('pegjs');
var fs = require('fs');

var grammar = fs.readFileSync('../grammar/comment-tags.pegjs', 'utf8');
var parser = peg.buildParser(grammar);

test('simple returns tag', function (t) {
  var comment = "@returns description";
  var ast = parser.parse(comment);

  t.equal(ast.length, 1);

  var tag = ast[0];
  t.equal(tag.name, 'returns');
  t.deepEqual(tag.value, { description: 'description'});

  t.end();
});

test('returns tag with type', function (t) {
  var comment = "@returns {String} description";
  var ast = parser.parse(comment);

  t.equal(ast.length, 1);

  var tag = ast[0];
  t.equal(tag.name, 'returns');
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

test('properties', function (t) {
  var comment = "@property propOne property one description\n" +
      "@property {String} propTwo property two description";

  var ast = parser.parse(comment);
  t.equal(ast.length, 2);

  var prop1 = ast[0];
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

test('example', function (t) {
  var comment = '@example\n' +
      'var x = 3;\n' +
      'var y = 4;';
  
  var ast = parser.parse(comment);
  t.equal(ast.length, 1);

  var example = ast[0];
  t.equal(example.name, 'example');
  t.equal(example.value, 'var x = 3;\nvar y = 4;');

  t.end();
});

test('visibility', function (t) {
  var comment = '@public';

  var ast = parser.parse(comment);
  t.equal(ast.length, 1);
  
  var tag = ast[0];
  t.equal(tag.name, 'visibility');
  t.equal(tag.value, 'public');

  t.end();
});

test('extends', function (t) {
  var comment = '@extends SuperClass';

  var ast = parser.parse(comment);
  t.equal(ast.length, 1);
  
  var tag = ast[0];
  t.equal(tag.name, 'extends');
  t.equal(tag.value, 'SuperClass');

  t.end();
});
