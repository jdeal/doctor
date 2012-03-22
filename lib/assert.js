var assert = require('assert');
var _ = require('underscore');

assert.hasKey = function hasKey(obj, key, message) {
  message = message || ('has key ' + JSON.stringify(key));
  assert.equal(true, key in obj, message);
};

exports.assert = assert;