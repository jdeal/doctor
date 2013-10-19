/*global suite:false, test:false*/
var util = require('../lib/util');
var fs = require('fs');
var path = require('path');

var assert = require('assert');

suite('test util module');

test('toArray', function () {
  assert.deepEqual(util.toArray([1, 2]), [1, 2]);
  assert.deepEqual(util.toArray(1), [1]);
  assert.deepEqual(util.toArray(), []);
  assert.deepEqual(util.toArray(null), [null]);
  assert.deepEqual(util.toArray(undefined), []);
});

// test('clone', function () {
//   var obj = { a: "a", b: "b" };
//   var result = util.clone(obj);
  
//   assert.deepEqual(obj, result);
//   obj.a = "not a";
//   assert.equal(obj.a, "not a");
//   assert.equal(result.a, "a");
// });

test('findFile exists', function (done) {
  util.findFile(['doesNotExist', __filename], function (file) {
    assert.equal(file, __filename);
    done();
  }, function () {
    assert.fail('file should exist but does not');
    done();
  });
});

test('findFile does not exist', function (done) {
  util.findFile(['doesNotExist'], function (file) {
    assert.fail('file should not exist but does - ' + file);
    done();
  }, function () {
    done();
  });
});


test('findDir exists', function (done) {
  util.findDir(['doesNotExist', __filename, __dirname], function (file) {
    assert.equal(file, __dirname);
    done();
  }, function () {
    assert.fail('file should exist but does not');
    done();
  });
});

test('findDir does not exist', function (done) {
  util.findDir([__filename, 'doesNotExist'], function (file) {
    assert.fail('file should not exist but does - ' + file);
    done();
  }, function () {
    done();
  });
});

test('findFunctions', function () {
  var dir = 'render';
  var functions = util.findFunctions(['default'], dir);
  assert.equal(functions.length, 1);
  assert.equal(functions[0].name, 'render');
});

test('cleanUndefinedProperties', function () {
  var obj = {
    x: 1
  };
  obj.y = undefined;
  assert.notDeepEqual(obj, {x: 1});
  var cleanObj = util.cleanUndefinedProperties(obj);
  assert.deepEqual(cleanObj, {x: 1});
});
