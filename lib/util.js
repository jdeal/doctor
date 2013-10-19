/*
This module contains various utility functions used by doctor.
*/

var fs = require('fs');
var path = require('path');
var async = require('async');
var _ = require('underscore');

/*
Take an array or a value, and if it's a value, wrap it in an array.
@param maybeArray Array or value.
*/
function toArray(maybeArray) {
  if (Array.isArray(maybeArray)) {
    return maybeArray;
  }
  if (typeof maybeArray === 'undefined') {
    return [];
  }
  return [maybeArray];
}

/*
Try to require module, or return null.
@param {String} moduleName Path to possible module.
*/
function requireMaybe(moduleName) {
  try {
    var modulePath = require.resolve(moduleName);
  } catch (e) {
    return null;
  }
  // just let this fall through
  return require(moduleName);
}

/*
Require the specified rule modules, either from the default location or from
the user-specified location.
@param {Array|string} optionRules Rule modules.
@param {string} defaultDir Default directory for rules.
*/
function findRules(options, optionRules, defaultDir) {
  options.progressCb({
    type: 'find-rules',
    message: 'find rules for: ' + defaultDir
  });
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
    var m;
    var rulesPath;
    if (!m && rules[0] === '/') {
      rulesPath = rules;
      m = requireMaybe(rules);
    }
    if (!m) {
      rulesPath = path.join(process.cwd(), rules);
      m = requireMaybe(rulesPath);
    }
    if (!m) {
      rulesPath = path.join('..', defaultDir, rules);
      m = requireMaybe(rulesPath);
    }
    if (!m) {
      throw new Error('did not find rules or problem loading rules: ' + rules);
    } else {
      options.progressCb({
        type: 'found-rules',
        message: 'found rules: ' + rulesPath
      });
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

/*
Require the specified function modules, either in the default location or
the user-specified location.
@param {Array|string}  Possible modules to find.
@param {string} Default location to look for modules.
*/
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

/* Check if a directory exists. */
function dirExists(dir, cb) {
  var fsExists = fs.exists || path.exists;
  fsExists(dir, function (exists) {
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

/*
Find one of a list of files.
@param {Array} fileList Possible files to find.
@param {function} ifCb If one is found, do this.
@param {function} elseCb If one is not found, do this.
*/
function findFile(fileList, ifCb, elseCb) {
  var fsExists = fs.exists || path.exists;
  async.detect(fileList, fsExists, function (file) {
    if (file) {
      ifCb(file);
    } else {
      elseCb();
    }
  });
}

/*
Find one of a list of directories.
@param {Array} dirList Possible directories to find.
@param {function} ifCb If one is found, do this.
@param {function} elseCb If one is not found, do this.
*/
function findDir(dirList, ifCb, elseCb) {
  async.detect(dirList, dirExists, function (dir) {
    if (dir) {
      ifCb(dir);
    } else {
      elseCb();
    }
  });
}

/*
Compress absolute paths down to minimal non-colliding lengths.
@param {Array} pathList List of absolute paths.
*/
function localizePaths(pathList) {
  // resolve paths so that './foo/bar.js' and 'foo/bar.js' resolve to the same localized path
  pathList = pathList.map(function (p) {
    var resolvedPath = path.resolve(p);
    if (resolvedPath.substr(resolvedPath.length - 3) === '.js') {
      resolvedPath = resolvedPath.substr(0, resolvedPath.length - 3);
    }
    return resolvedPath;
  });

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

/*
Create a copy of the object without the undefined properties.
@param obj Object to copy.
*/
function cleanUndefinedProperties(obj) {
  var newObj;
  var isArray = false;
  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      newObj = [];
      isArray = true;
    } else {
      newObj = {};
    }
  } else {
    return obj;
  }
  var keys = Object.keys(obj);
  keys.forEach(function (key, i) {
    if (isArray || typeof obj[key] !== 'undefined') {
      newObj[key] = cleanUndefinedProperties(obj[key]);
    }
  });
  return newObj;
}

/*
Check if string starts with a captial letter.
@param {string} string String to check.
*/
function isCapitalized(string) {
  return (string && string.match(/^[A-Z]/)) ? true : false;
}

module.exports.findRules = findRules;
module.exports.findFunctions = findFunctions;
module.exports.findFile = findFile;
module.exports.findDir = findDir;
module.exports.toArray = toArray;
module.exports.localizePaths = localizePaths;
module.exports.cleanUndefinedProperties = cleanUndefinedProperties;
module.exports.isCapitalized = isCapitalized;