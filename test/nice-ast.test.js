var test = require("tap").test;

var nast = require('../lib/nice-ast');

var astToWalk = {
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
  nast.walk(astToWalk,
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
  nast.walkEnd(astToWalk, function (node) {
    walkList.push(node.type === 'end' ? 'end-' + node.node.type : node.type);
  });
  t.deepEqual(walkList,
    ['root', 'first', 'first-first', 'first-second', 'end-first', 'second',
    'second-first', 'second-second', 'end-second', 'end-root']);
  t.end();
});