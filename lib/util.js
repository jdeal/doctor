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
          console.log(Object.keys(arguments))
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

function compareFileDatesSync(a, b, cb) {
  compareFileDates(a, b, cb, true);
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

function findFileSync(fileList, ifCb, elseCb) {
  findFile(fileList, ifCb, elseCb, true);
}

function findDir(dirList, ifCb, elseCb, sync) {
  (function (async, path) {
    var dirExists = dirExists;
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
  }(async, path));
}

function findDirSync(dirList, ifCb, elseCb) {
  findDir(dirList, ifCb, elseCb, true);
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