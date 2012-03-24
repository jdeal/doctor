/*global suite:false, test:false*/

var path = require('path');

var nast = require('../lib/nice-ast');

var assert = require('chai').assert;

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

suite('test nice ast module')

test('ast walker', function () {
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
  assert.deepEqual(walkList,
    ['root', 'first', 'first-first', 'first-second', 'end-first', 'second',
    'second-first', 'second-second', 'end-second', 'end-root']);
});

test('ast end walker', function () {
  var walkList = [];
  nast.walkEnd(fakeAst, function (node) {
    walkList.push(node.type === 'end' ? 'end-' + node.node.type : node.type);
  });
  assert.deepEqual(walkList,
    ['root', 'first', 'first-first', 'first-second', 'end-first', 'second',
    'second-first', 'second-second', 'end-second', 'end-root']);
});

test('extend the ast', function () {
  var extendedAst = nast.extendAst(fakeAst);

  // basic extensions

  var first = extendedAst.nodes[0];
  var second = extendedAst.nodes[1];
  var firstFirst = first.nodes[0];
  var firstSecond = first.nodes[1];
  var secondFirst = second.nodes[0];
  var secondSecond = second.nodes[1];
  assert.equal(first.next, second);
  assert.equal(second.prev, first);
  assert.equal(first.parent, extendedAst);
  assert.equal(second.parent, extendedAst);
  assert.equal(firstFirst.next, firstSecond);
  assert.equal(firstSecond.prev, firstFirst);
  assert.equal(firstFirst.parent, first);
  assert.equal(firstSecond.parent, first);
  assert.equal(secondFirst.parent, second);
  assert.equal(secondSecond.parent, second);

  // transform extensions

  firstSecond.after({type: 'first-third'});
  var firstThird = first.nodes[2];
  assert.equal(firstSecond.next, firstThird);
  assert.equal(firstThird.type, 'first-third');
  firstFirst.after({type: 'first-first-a'});
  var firstFirstA = first.nodes[1];
  assert.equal(firstFirstA.type, 'first-first-a');
  assert.equal(firstFirstA.next, firstSecond);
  assert.equal(firstSecond.prev, firstFirstA);

  second.append({type: 'second-third'});
  var secondThird = second.nodes[2];
  assert.equal(secondThird.type, 'second-third');

  assert.equal(secondThird.prev, secondSecond);
  assert.equal(secondSecond.next, secondThird);
  assert.equal(secondThird.parent, second);

  assert.equal(secondFirst.index(), 0);
  assert.equal(secondSecond.index(), 1);
  assert.equal(secondThird.index(), 2);

  secondThird.remove();
  assert.equal(second.nodes.length, 2);
  assert.equal(secondSecond.next, null);
  second.append({type: 'second-third'});
  secondThird = second.nodes[2];
  secondSecond.remove();
  assert.equal(secondFirst.next, secondThird);
  assert.equal(secondThird.prev, secondFirst);
  secondFirst.remove();
  assert.equal(secondThird.prev, null);
});

test('clean an extended ast', function () {
  var extendedAst = nast.extendAst(fakeAst);
  var cleanAst = nast.cleanAst(extendedAst);
  assert.deepEqual(fakeAst, cleanAst);
});

function assertDeepEqual(a, b, keyPath) {
  keyPath = keyPath || (Array.isArray(a) ? '[array]' : '{object}');
  assert.equal(typeof a, typeof b, 'typeof comparison at ' + keyPath + ' is equal');
  if (typeof a === 'object') {
    var isArray = Array.isArray(a);
    Object.keys(a).forEach(function (key) {
      var newKeyPath;
      if (isArray) {
        newKeyPath = keyPath + '[' + key + ']';
      } else {
        newKeyPath = keyPath + "." + key;
      }
      assert.notEqual(b[key], undefined, 'key comparison at ' + newKeyPath + ' exists');
      assertDeepEqual(a[key], b[key], newKeyPath);
    });
  } else {
    assert.equal(a, b, 'value comparison at ' + keyPath + ' is equal');
  }
}

function testFixtureAst(sourceFile) {
  test('check against ast: ' + sourceFile, function (done) {
    var fixtureAstFile = path.join(__dirname, 'fixture', 'ast', sourceFile + '.ast.js');
    sourceFile = path.join(__dirname, 'fixture', 'ast', sourceFile + '.js');
    var fixtureAst = require(fixtureAstFile);
    nast.astFromFile({}, sourceFile, function (err, ast) {
      assert.equal(ast.type, fixtureAst.type);
      // if (sourceFile.indexOf('object.js') >= 0) {
      //   console.log(JSON.stringify(ast.nodes, null, 2));
      //   console.log(JSON.stringify(fixtureAst.nodes, null, 2));
      // }
      assertDeepEqual(ast.nodes, fixtureAst.nodes);
      //assert.deepEqual(ast.nodes, fixtureAst.nodes);
      done();
    });
  });
}

testFixtureAst('define');
testFixtureAst('var-function');
testFixtureAst('subscript');
testFixtureAst('object');
testFixtureAst('gaps');
testFixtureAst('commented-function');