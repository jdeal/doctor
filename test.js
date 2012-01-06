function g() {
  
}

var f = function f(x, y) {
  if (typeof y === 'undefined') {
    return g(x);
  }
}