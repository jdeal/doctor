var fs = require('fs');
var path = require('path');
var async = require('async');

function toArray(maybeArray) {
  if (Array.isArray(maybeArray)) {
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
    if (Array.isArray(rules)) {
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
    if (!Array.isArray(rules)) {
      throw new Error('rules module must contain an array');
    }
    allRules = allRules.concat(rules);
  });
  return allRules;
}

function findFunctions(optionFunctions, defaultDir) {
  var allFunctions = [];
  optionFunctions = toArray(optionFunctions);
  optionFunctions.forEach(function (fn, i) {
    if (typeof fn === 'function') {
      allFunctions.push(fn);
      return;
    }
    if (typeof fn !== 'string') {
      throw new Error('function must be a string or array');
    }
    var m = requireMaybe(fn);
    if (!m) {
      m = requireMaybe(path.join(process.cwd(), fn));
    }
    if (!m) {
      m = requireMaybe(path.join('..', defaultDir, fn));
    }
    if (!m) {
      throw new Error('did not find function or problem loading function: ' + fn);
    }
    if (typeof m !== 'function') {
      throw new Error('function module must export a function');
    }
    allFunctions.push(m);
  });
  return allFunctions;
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

function localizePaths(pathList) {
  var localizedPathList = [];
  if (pathList.length > 0) {
    var commonPath = null;
    pathList.forEach(function (fullPath, i) {
      var parts;
      if (commonPath === null) {
        parts = fullPath.split('/');
        if (parts.length > 1) {
          commonPath = parts.slice(0, parts.length - 1).join('/') + '/';
        } else {
          commonPath = '';
        }
      } else if (commonPath.length > 0) {
        parts = commonPath.split('/');
        parts.pop();
        commonPath = '';
        for (var partIndex = 0; partIndex < parts.length; partIndex++) {
          var testPath = commonPath + parts[partIndex] + '/';
          if (fullPath.substring(0, testPath.length) === testPath) {
            commonPath = testPath;
          } else {
            break;
          }
        }
      }
    });
    pathList.forEach(function (fullPath, i) {
      localizedPathList.push(fullPath.substr(commonPath.length));
    });
  }
  return localizedPathList;
}

module.exports.findRules = findRules;
module.exports.findFunctions = findFunctions;
module.exports.findFile = findFile;
module.exports.findDir = findDir;
module.exports.compareFileDates = compareFileDates;
module.exports.clone = clone;
module.exports.toArray = toArray;
module.exports.localizePaths = localizePaths;
