/*global suite:false, test:false*/
var util = require('../lib/util');
var fs = require('fs');
var path = require('path');

var assert = require('assert');

test('toArray', function () {
  assert.deepEqual(util.toArray([1, 2]), [1, 2]);
  assert.deepEqual(util.toArray(1), [1]);
  assert.deepEqual(util.toArray(), []);
  assert.deepEqual(util.toArray(null), [null]);
  assert.deepEqual(util.toArray(undefined), []);
});

test('clone', function () {
  var obj = { a: "a", b: "b" };
  var result = util.clone(obj);
  
  assert.deepEqual(obj, result);
  obj.a = "not a";
  assert.equal(obj.a, "not a");
  assert.equal(result.a, "a");
});

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

test('compareFileDates old file, new file', function (done) {
  var newFile = 'new1.txt';
  fs.writeFileSync(newFile, 'data');

  util.compareFileDates(__filename, newFile, function (cmp) {
    assert.equal(cmp, 1);
    fs.unlinkSync(newFile);
    done();
  });
});

test('compareFileDates new file, old file', function (done) {
  var newFile = 'new2.txt';
  fs.writeFileSync(newFile, 'data');

  util.compareFileDates(newFile, __filename, function (cmp) {
    assert.equal(cmp, -1);
    fs.unlinkSync(newFile);
    done();
  });
});

test('compareFileDates same file', function (done) {
  util.compareFileDates(__filename, __filename, function (cmp) {
    assert.equal(cmp, 0);
    done();
  });
});

test('compareFileDates file a does not exist', function (done) {
  util.compareFileDates('doesNotExist', __filename, function (cmp) {
    assert.equal(cmp, 1);
    done();
  });
});

test('compareFileDates file b does not exist', function (done) {
  util.compareFileDates(__filename, 'doesNotExist', function (cmp) {
    assert.equal(cmp, -1);
    done();
  });
});

test('compareFileDates neither file exists', function (done) {
  util.compareFileDates('doesNotExist', 'doesNotExistEither', function (cmp) {
    assert.equal(cmp, 0);
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
