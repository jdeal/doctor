var _ = require('custom-underscore-util');

/* bar */
function bar() {

}

/* baz */
function bazzo() {

}

_(module).export(
  bar,
  {baz: bazzo}
);