var async = require('async');

var fs = require('fs');
var path = require('path');

function isArray(obj) {
  if (typeof obj === 'undefined') {
    return false;
  }
  return Object.prototype.toString.call(obj) === '[object Array]';
}

function toArray(maybeArray) {
  if (isArray(maybeArray)) {
    return maybeArray;
  }
  if (typeof maybeArray === 'undefined') {
    return [];
  }
  return [maybeArray];
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

function compareFileDates(a, b, cb) {
  fs.stat(a, function (errA, statA) {
    fs.stat(b, function (errB, statB) {
      if (errA && errB) {
        // assuming neither file exists
        return cb(0);
      }
      if (errA) {
        return cb(1);
      }
      if (errB) {
        return cb(-1);
      }
      if (statB.mtime > statA.mtime) {
        return cb(1);
      }
      if (statB.mtime < statA.mtime) {
        return cb(-1);
      }
      return cb(0);
    });
  });
}

function findRules(optionRules, defaultDir) {
  var allRules = [];
  optionRules = toArray(optionRules);
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
      m = requireMaybe(path.join('..', defaultDir, rules));
    }
    if (!m) {
      throw new Error('did not find rules or problem loading rules: ' + rules);
    }
    rules = m;
    if (m.rules) {
      rules = m.rules;
    }
    if (!isArray(rules)) {
      throw new Error('rules module must contain an array');
    }
    allRules = allRules.concat(rules);
  });
  return allRules;
}

function clone(obj) {
  var newObj = {};
  Object.keys(obj).forEach(function (key, i) {
    newObj[key] = obj[key];
  });
  return newObj;
}

function dirExists(dir, cb) {
  path.exists(dir, function (exists) {
    if (!exists) {
      return cb(false);
    }
    fs.stat(dir, function (err, stat) {
      if (err) {
        return cb(false);
      }
      return cb(stat.isDirectory());
    });
  });
}

function findFile(fileList, ifCb, elseCb) {
  async.detect(fileList, path.exists, function (file) {
    if (file) {
      ifCb(file);
    } else {
      elseCb();
    }
  });
}

function findDir(dirList, ifCb, elseCb) {
  async.detect(dirList, dirExists, function (dir) {
    if (dir) {
      ifCb(dir);
    } else {
      elseCb();
    }
  });
}

module.exports.isArray = isArray;
module.exports.findRules = findRules;
module.exports.findFile = findFile;
module.exports.findDir = findDir;
module.exports.compareFileDates = compareFileDates;
module.exports.clone = clone;
module.exports.toArray = toArray;
