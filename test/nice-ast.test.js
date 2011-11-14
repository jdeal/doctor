var test = require("tap").test;
var path = require('path');

var nast = require('../lib/nice-ast');

var fakeAst = {
  type: 'root',
  nodes: [
    {
      type: 'first',
      nodes: [
        {
          type: 'first-first'
        },
        {
          type: 'first-second'
        }
      ]
    },
    {
      type: 'second',
      nodes: [
        {
          type: 'second-first'
        },
        {
          type: 'second-second'
        }
      ]
    }
  ]
};

test('ast walker', function (t) {
  var walkList = [];
  nast.walk(fakeAst,
    function (node) {
      walkList.push(node.type);
    },
    function (node) {
      if (node.nodes) {
        walkList.push('end-' + node.type);
      }
    }
  );
  t.deepEqual(walkList,
    ['root', 'first', 'first-first', 'first-second', 'end-first', 'second',
    'second-first', 'second-second', 'end-second', 'end-root']);
  t.end();
});

test('ast end walker', function (t) {
  var walkList = [];
  nast.walkEnd(fakeAst, function (node) {
    walkList.push(node.type === 'end' ? 'end-' + node.node.type : node.type);
  });
  t.deepEqual(walkList,
    ['root', 'first', 'first-first', 'first-second', 'end-first', 'second',
    'second-first', 'second-second', 'end-second', 'end-root']);
  t.end();
});

test('extend the ast', function (t) {
  var extendedAst = nast.extendAst(fakeAst);

  // basic extensions

  var first = extendedAst.nodes[0];
  var second = extendedAst.nodes[1];
  var firstFirst = first.nodes[0];
  var firstSecond = first.nodes[1];
  var secondFirst = second.nodes[0];
  var secondSecond = second.nodes[1];
  t.equal(first.next, second);
  t.equal(second.prev, first);
  t.equal(first.parent, extendedAst);
  t.equal(second.parent, extendedAst);
  t.equal(firstFirst.next, firstSecond);
  t.equal(firstSecond.prev, firstFirst);
  t.equal(firstFirst.parent, first);
  t.equal(firstSecond.parent, first);
  t.equal(secondFirst.parent, second);
  t.equal(secondSecond.parent, second);

  // transform extensions

  firstSecond.after({type: 'first-third'});
  var firstThird = first.nodes[2];
  t.equal(firstSecond.next, firstThird);
  t.equal(firstThird.type, 'first-third');
  firstFirst.after({type: 'first-first-a'});
  var firstFirstA = first.nodes[1];
  t.equal(firstFirstA.type, 'first-first-a');
  t.equal(firstFirstA.next, firstSecond);
  t.equal(firstSecond.prev, firstFirstA);

  second.append({type: 'second-third'});
  var secondThird = second.nodes[2];
  t.equal(secondThird.type, 'second-third');

  t.equal(secondThird.prev, secondSecond);
  t.equal(secondSecond.next, secondThird);
  t.equal(secondThird.parent, second);

  t.equal(secondFirst.index(), 0);
  t.equal(secondSecond.index(), 1);
  t.equal(secondThird.index(), 2);

  secondThird.remove();
  t.equal(second.nodes.length, 2);
  t.equal(secondSecond.next, null);
  second.append({type: 'second-third'});
  secondThird = second.nodes[2];
  secondSecond.remove();
  t.equal(secondFirst.next, secondThird);
  t.equal(secondThird.prev, secondFirst);
  secondFirst.remove();
  t.equal(secondThird.prev, null);

  t.end();
});

test('clean an extended ast', function (t) {
  var extendedAst = nast.extendAst(fakeAst);
  var cleanAst = nast.cleanAst(extendedAst);
  t.deepEqual(fakeAst, cleanAst);
  t.end();
});

function testFixtureAst(sourceFile, t) {
  var fixtureAstFile = './fixture/' + sourceFile + '.ast.js';
  sourceFile = path.join(__dirname, 'fixture', sourceFile + '.js');
  var fixtureAst = require(fixtureAstFile);
  nast.astFromFile({}, sourceFile, function (err, ast) {
    ast.path = ast.path.replace(path.join(__dirname, 'fixture') + '/', '');
    t.deepEqual(ast, fixtureAst);
  });
}

test('ast from file', function (t) {
  t.plan(4 * 1);
  testFixtureAst('define', t);
  testFixtureAst('var-function', t);
  testFixtureAst('subscript', t);
  testFixtureAst('object', t);
});