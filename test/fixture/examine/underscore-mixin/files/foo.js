var _ = require('underscore');

/* bar */
function bar() {

}

/* baz */
function baz() {

}

_.mixin({
  bar: bar,
  baz: baz
});

module.exports = _;