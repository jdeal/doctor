function isArray(obj) {
  if (typeof obj === 'undefined') {
    return false;
  }
  return Object.prototype.toString.call(obj) === '[object Array]';
}

module.exports.isArray = isArray;