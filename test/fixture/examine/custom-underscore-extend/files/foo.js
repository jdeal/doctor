var _ = require('custom-underscore-util');

/* bar */
function bar() {

}

/* baz */
function bazzo() {

}

var util = {};

_.extendWithFunctions(util,
  bar,
  {baz: bazzo}
);

module.exports = util;