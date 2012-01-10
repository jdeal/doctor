/* f */
var f = function f(x, y) {
  /* @signature fx */
  if (typeof y === 'undefined') {
    console.log(x + 1);
  }
  /* @signature fxy */
  console.log(x + y);
}

exports.f = f;