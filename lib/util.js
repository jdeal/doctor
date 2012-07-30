/*
This module contains various utility functions used by doctor.

It notably contains some nasty synchronous versions of asynchronous modules.

Say what?

Yeah, that's right. This is so doctor can run synchronously or ansynhronously.
Doctor wants to run asynchronously, so when we have to run synchronously (such
as during that ugly startup phase where you have to deal with synchronous
require), we have to fake it out with synchronous versions of asynchronous
modules. This is ugly, but it's better than having to write two different
versions of doctor.
*/

var fs = require('fs');
var path = require('path');
var async = require('async');
var _ = require('underscore');

// turn synchronous things into callbacks to they can stand in
// for asynchronous things
function callbackify(thing, canError) {
  if (typeof thing === 'function') {
    return function () {
      try {
        var result = thing.apply(this, Array.prototype.slice.call(arguments, 0, arguments.length - 1));
        if (canError) {
          arguments[arguments.length - 1](null, result);
        } else {
          arguments[arguments.length - 1](result);
        }
      } catch (err) {
        if (canError) {
          arguments[arguments.length - 1](err);
        } else {
          arguments[arguments.length - 1](false);
        }
      }
    };
  } else if (typeof thing === 'object' && !_.isArray(thing)) {
    var copy = _.extend({}, thing);
    _(copy).each(function (f, key) {
      copy[key].__name = key;
      if (key.substring(key.length - 4) === 'Sync') {
        copy[key.substring(0, key.length - 4)] = callbackify(f,
          key === 'existsSync' ? false : true);
        copy[key.substring(0, key.length - 4)].__name = key;
      }
    });
    return copy;
  } else {
    return thing;
  }
}

var fsSync = callbackify(fs);
var pathSync = callbackify(path);
// hack in a synchronous version of async
var asyncSync = {
  /*
  Synchronous forEachSeries, with an asynchronous signature. Because it's
  synchronous, it can also be used as the forEach function.

  See the async module for details.
  */
  forEachSeries: function (array, eachCb, finalCb) {
    var error = null;
    function flag(err) {
      if (err) {
        error = err;
      }
    }
    for (var i = 0; i < array.length; i++) {
      var item = array[i];
      eachCb(item, flag);
      if (error) {
        break;
      }
    }
    finalCb(error);
  },
  /*
  Synchronous detect, with an asynchronous signature.

  See the async module for details.
  */
  detect: function (array, passCb, resultCb) {
    var detected;
    var detectedValue;
    function flag(yes) {
      detected = yes;
      if (detected) {
        detectedValue = this;
      }
    }
    for (var i = 0; i < array.length; i++) {
      var item = array[i];
      passCb(item, flag.bind(item));
      if (detected) {
        break;
      }
    }
    resultCb(detectedValue);
  },
  /*
  Synchronous some, with an asynchronous signature.

  See the async module for details.
  */
  some: function (array, passCb, doneCb) {
    var detected;
    function flag(yes) {
      detected = yes;
    }
    for (var i = 0; i < array.length; i++) {
      var item = array[i];
      passCb(item, flag);
      if (detected) {
        break;
      }
    }
    doneCb(detected);
  }
};

asyncSync.forEach = asyncSync.forEachSeries;

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
Compare the modified time stamps of two files.
@param {String} a Path to first file.
@param {String} b Path to second file.
@param {function} cb Function to call with comparison value.
@param {boolean} sync Flag to force function to run synchronously.
*/
function compareFileDates(a, b, cb, sync) {
  (function (fs) {
    if (sync) {
      fs = fsSync;
    }
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
  }(fs));
}

/*
@copy compareFileDates
*/
function compareFileDatesSync(a, b, cb) {
  compareFileDates(a, b, cb, true);
}

/*
Require the specified rule modules, either from the default location or from
the user-specified location.
@param {Array|string} optionRules Rule modules.
@param {string} defaultDir Default directory for rules.
*/
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
function dirExists(dir, cb, sync) {
  (function (path, fs) {
    if (sync) {
      path = pathSync;
      fs = fsSync;
    }
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
  }(path, fs));
}

function dirExistsSync(dir, cb) {
  dirExists(dir, cb, true);
}

/*
Find one of a list of files.
@param {Array} fileList Possible files to find.
@param {function} ifCb If one is found, do this.
@param {function} elseCb If one is not found, do this.
@param {boolean} sync Flag to force function to run synchronously.
*/
function findFile(fileList, ifCb, elseCb, sync) {
  (function (async, path) {
    if (sync) {
      async = asyncSync;
      path = pathSync;
    }
    async.detect(fileList, path.exists, function (file) {
      if (file) {
        ifCb(file);
      } else {
        elseCb();
      }
    });
  }(async, path));
}

/*
@copy findFile
*/
function findFileSync(fileList, ifCb, elseCb) {
  findFile(fileList, ifCb, elseCb, true);
}

/*
Find one of a list of directories.
@param {Array} dirList Possible directories to find.
@param {function} ifCb If one is found, do this.
@param {function} elseCb If one is not found, do this.
@param {boolean} sync Flag to force function to run synchronously.
*/
function findDir(dirList, ifCb, elseCb, sync) {
  (function (async, path, dirExists) {
    if (sync) {
      async = asyncSync;
      path = pathSync;
      dirExists = dirExistsSync;
    }
    async.detect(dirList, dirExists, function (dir) {
      if (dir) {
        ifCb(dir);
      } else {
        elseCb();
      }
    });
  }(async, path, dirExists));
}

/*
@copy findDir
*/
function findDirSync(dirList, ifCb, elseCb) {
  findDir(dirList, ifCb, elseCb, true);
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
module.exports.compareFileDates = compareFileDates;
module.exports.toArray = toArray;
module.exports.localizePaths = localizePaths;
module.exports.cleanUndefinedProperties = cleanUndefinedProperties;
module.exports.isCapitalized = isCapitalized;

module.exports.fs = fs;
module.exports.path = path;
module.exports.async = async;

var sync = {};
_.extend(sync, module.exports);
sync.compareFileDates = compareFileDatesSync;
sync.findFile = findFileSync;
sync.findDir = findDirSync;
sync.fs = fsSync;
sync.path = pathSync;
sync.async = asyncSync;
module.exports.sync = sync;