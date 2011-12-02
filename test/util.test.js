var test = require('tap').test;
var util = require('../lib/util');

test('toArray', function (t) {
  t.deepEqual(util.toArray([1, 2]), [1, 2]);
  t.deepEqual(util.toArray(1), [1]);
  t.deepEqual(util.toArray(), []);
  t.deepEqual(util.toArray(null), [null]);
  t.deepEqual(util.toArray(undefined), []);

  t.end();
});
