var dive = require('dive');
var fs = require('fs');
var path = require('path');

function isArray(obj) {
  if (typeof obj === 'undefined') {
    return false;
  }
  return Object.prototype.toString.call(obj) === '[object Array]';
}

module.exports.isArray = isArray;