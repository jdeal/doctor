var debug = require('debug');

function square(x) {
  debug('square:' + x);
  return x * x;
}

module.exports = square;