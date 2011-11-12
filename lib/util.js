var dive = require('dive');
var fs = require('fs');
var path = require('path');

function isArray(obj) {
  if (typeof obj === 'undefined') {
    return false;
  }
  return Object.prototype.toString.call(obj) === '[object Array]';
}

function requireMaybe(moduleName) {
  try {
    var modulePath = require.resolve(moduleName);
  } catch (e) {
    return null;
  }
  // just let this fall through
  return require(moduleName);
}

function findRules(options, defaultRules) {
  var allRules = [];
  var optionRules = options.rules || null;
  if (!optionRules) {
    optionRules = defaultRules;
  }
  if (typeof optionRules === 'string') {
    optionRules = [optionRules];
  } else if (!isArray(optionRules)) {
    throw new Error('rules must be a string or array');
  }
  optionRules.forEach(function (rules, i) {
    if (isArray(rules)) {
      allRules = allRules.concat(rules);
      return;
    }
    if (typeof rules !== 'string') {
      throw new Error('rules must be a string or array');
    }
    var m = requireMaybe(rules);
    if (!m) {
      m = requireMaybe(path.join(process.cwd(), rules));
    }
    if (!m) {
      m = requireMaybe('./rules/' + rules);
    }
    if (!m) {
      throw new Error('did not find rules or problem loading rules: ' + rules);
    }
    rules = m;
    if (m.rules) {
      rules = m.rules;
    }
    if (!isArray(rules)) {
      throw new Error('rules must be an array');
    }
    allRules = allRules.concat(rules);
  });
  return allRules;
}

module.exports.isArray = isArray;
module.exports.findRules = findRules;