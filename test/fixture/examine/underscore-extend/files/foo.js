var _ = require('underscore');

var thing = {};

/* bar */
function bar() {

}

/* baz */
function baz() {

}

_.extend(thing, {
  bar: bar,
  baz: baz
});

module.exports = thing;