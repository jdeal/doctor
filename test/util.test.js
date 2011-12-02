var test = require('tap').test;
var util = require('../lib/util');
var fs = require('fs');

test('toArray', function (t) {
  t.deepEqual(util.toArray([1, 2]), [1, 2]);
  t.deepEqual(util.toArray(1), [1]);
  t.deepEqual(util.toArray(), []);
  t.deepEqual(util.toArray(null), [null]);
  t.deepEqual(util.toArray(undefined), []);

  t.end();
});

test('clone', function (t) {
  var obj = { a: "a", b: "b" };
  var result = util.clone(obj);
  
  t.deepEqual(obj, result);
  obj.a = "not a";
  t.equal(obj.a, "not a");
  t.equal(result.a, "a");

  t.end();
});

test('findFile exists', function (t) {
  util.findFile(['doesNotExist', __filename], function (file) {
    t.equal(file, __filename);
    t.end();
  }, function () {
    t.fail('file should exist but does not');
    t.end();
  });
});

test('findFile does not exist', function (t) {
  util.findFile(['doesNotExist'], function (file) {
    t.fail('file should not exist but does - ' + file);
    t.end();
  }, function () {
    t.end();
  });
});


test('findDir exists', function (t) {
  util.findDir(['doesNotExist', __filename, __dirname], function (file) {
    t.equal(file, __dirname);
    t.end();
  }, function () {
    t.fail('file should exist but does not');
    t.end();
  });
});

test('findDir does not exist', function (t) {
  util.findDir([__filename, 'doesNotExist'], function (file) {
    t.fail('file should not exist but does - ' + file);
    t.end();
  }, function () {
    t.end();
  });
});

test('compareFileDates old file, new file', function (t) {
  var newFile = 'new1.txt';
  fs.writeFileSync(newFile, 'data');

  util.compareFileDates(__filename, newFile, function (cmp) {
    t.equal(cmp, 1);
    fs.unlinkSync(newFile);
    t.end();
  });
});

test('compareFileDates new file, old file', function (t) {
  var newFile = 'new2.txt';
  fs.writeFileSync(newFile, 'data');

  util.compareFileDates(newFile, __filename, function (cmp) {
    t.equal(cmp, -1);
    fs.unlinkSync(newFile);
    t.end();
  });
});

test('compareFileDates same file', function (t) {
  util.compareFileDates(__filename, __filename, function (cmp) {
    t.equal(cmp, 0);
    t.end();
  });
});

test('compareFileDates file a does not exist', function (t) {
  util.compareFileDates('doesNotExist', __filename, function (cmp) {
    t.equal(cmp, 1);
    t.end();
  });
});

test('compareFileDates file b does not exist', function (t) {
  util.compareFileDates(__filename, 'doesNotExist', function (cmp) {
    t.equal(cmp, -1);
    t.end();
  });
});

test('compareFileDates neither file exists', function (t) {
  util.compareFileDates('doesNotExist', 'doesNotExistEither', function (cmp) {
    t.equal(cmp, 0);
    t.end();
  });
});

