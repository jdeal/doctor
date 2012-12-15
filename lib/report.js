var nast = require('./nice-ast');
var u = require('./util');
var _ = require('underscore');

/*
Creates an empty report to be filled in by running rules against the AST.
@param {Object} options Doctor options.
@param {AstNode} ast Extended AST created from parsing source and extending with
AstNode.
*/
function Report(options, ast) {
  this.options = options;
  this.ast = ast;
  this.items = {root: {type: 'group', items: []}};
  this._home = null;
}

/*
Walk AST, calling end callback with pseudo-node.
@param {AstNode} node Node of extended AST.
@param {function} cb Function to call at start and end of node.
*/
function walk(node, cb) {
  nast.walk(node,
    function (node) {
      cb(node);
    },
    function (node) {
      cb({type: 'end', node: node});
    }
  );
}

/*
Run the report through the supplied report rules.
@param {function} cb Function to call when finished walking and applying rules
to the AST.
*/
Report.prototype.run = function (cb) {

  var self = this;

  var currentPath = "unknown";

  function eachNode(node, rule) {
    if (node.path) {
      currentPath = node.path;
    }
    if (typeof rule.report === 'function') {
      var reportItems;
      try {
        reportItems = rule.report(node, self);
      } catch (e) {
        e.message = "Problem creating report for " + currentPath + " at line " + node.line +
          ", column " + node.column + '.\n' + e.message;
        throw e;
      }
      if (reportItems) {
        reportItems = Array.isArray(reportItems) ? reportItems : [reportItems];
        for (var i = 0; i < reportItems.length; i++) {
          var reportItem = reportItems[i];
          self.add(reportItem);
        }
      }
    }
  }

  function setHomePath(report, currentKey, allKeys) {
    allKeys = allKeys || [];
    if (allKeys.indexOf(currentKey) >= 0) {
      return;
    }
    allKeys.push(currentKey);
    if (!report.items.hasOwnProperty(currentKey)) {
      return;
    }
    var item = report.items[currentKey];
    item.isHomePath = true;
    if (currentKey === 'root') {
      return;
    }
    var groups = item.groups;
    if (!groups) {
      return;
    }
    _(groups).each(function (group) {
      setHomePath(report, group, allKeys);
    });
  }

  function finishRules(err) {
    if (err) {
      return cb(err);
    }
    var finalReport = {};
    finalReport.items = self.items;
    if (self._home) {
      finalReport.home = self._home;
      setHomePath(finalReport, finalReport.home);
    }
    cb(null, finalReport);
  }

  var rules = u.toArray(self.options.report || 'default');
  nast.walkWithRules(self.options, rules, 'report', self.ast, eachNode, finishRules);
};

/*
@param {String} key - Key of report item.
@returns {Object} Object representing a report item.
*/
Report.prototype.item = function (key, item) {
/*
@signature Returns a report item.
*/
  if (typeof item === 'undefined') {
    return this.items[key];
  }
/*
@signaure Adds/sets a report item.
@param {Object} item - Object representing a report item.
*/
  if (item.key !== key) {
    item = _.extend({}, item);
    _.extend(item, {key: key});
  }
  this.add(item);
  return this.items[key];
};

// Can't remember why this is here. Leaving it in case something explodes.
//
// Report.prototype.ref = function (key) {
//   if (!(key in this.items)) {
//     throw new Error('trying to reference ' + key + ", but it doesn't exist");
//   }
//   return {$item: key};
// };

/*
Removes a report item.
@param {String} key Key of report item.
*/
Report.prototype.remove = function (key) {
  var self = this;
  if (!(key in self.items)) {
    throw new Error('no item with key ' + key + ' to remove');
  }
  var item = self.items[key];
  if (item.type === 'group' && item.items && item.items.length > 0) {
    throw new Error('cannot delete non-empty group: ' + item.key);
  }
  if (item.groups) {
    item.groups.forEach(function (group, i) {
      var groupItem = self.items[group];
      if (groupItem) {
        var index = groupItem.items.indexOf(key);
        if (index >= 0) {
          groupItem.items.splice(index, 1);
          if (groupItem.itemTypeCounts && groupItem.itemTypeCounts[item.type]) {
            groupItem.itemTypeCounts[item.type]--;
          }
        }
      }
    });
  }
  delete self.items[key];
};

/*
Adds a report item.
@param {String} item Report item.
*/
Report.prototype.add = function (item) {

  var self = this;
  
  if (!item.key) {
    throw new Error('undefined report item key for:\n' +
      JSON.stringify(item, null, 2));
  }

  // some modules don't work without overriding the same function twice
  // if (item.key in self.items) {
  //   throw new Error('must supply unique key for report item (' + item.key + ')' +
  //                  ' make sure you do not have the same function, class etc defined twice');
  // }

  if (self.items[item.key]) {
    self.remove(item.key);
  }
  self.items[item.key] = item;
  if (typeof item.groups === 'string') {
    item.groups = [item.groups];
  }
  var newGroups = item.groups || [];
  item.type = item.type || 'item';
  item.name = item.name || item.key;
  if (item.type === 'group') {
    if (newGroups.length === 0) {
      newGroups.push('root');
      if (!item.groups) {
        item.groups = [];
      }
      item.groups.push('root');
    }
  }

  _(newGroups).each(function (group) {
    var groupItem = self.items[group];
    if (!groupItem) {
      groupItem = {key: group, type: 'group', items: []};
      self.add(groupItem);
    }
    if (!groupItem.items) {
      groupItem.items = [];
    }
    if (!groupItem.itemTypeCounts) {
      groupItem.itemTypeCounts = {};
    }
    if (!groupItem.itemTypeCounts[item.type]) {
      groupItem.itemTypeCounts[item.type] = 0;
    }
    groupItem.items.push(item.key);
    groupItem.itemTypeCounts[item.type]++;
  });

  // if (item.groups) {
  //   item.groups.forEach(function (group, i) {
  //     if (!self.items[group]) {
  //       self.add({key: group, type: 'group', items: []});
  //     }
  //     if (!self.items[group].items) {
  //       self.items[group].items = [];
  //     }
  //     self.items[group].items.push(item.key);
  //   });
  // } else if (item.type === 'group') {
  //   self.items.root.items.push(item.key);
  // }

  if (item.isHome) {
    self.home(item.key);
  }
};

Report.prototype.home = function (item) {
/*
@signature Gets the key of the home item for the report.
@returns {String} Key of the home item.
*/
  if (typeof item === 'undefined') {
    return this._home;
  }
/*
@signature Sets the key of the home item for the report.
@param {String} item Key of the home item.
*/
  var key = item;
  if (typeof item === 'object') {
    key = item.key;
  }
  if (this._home) {
    if (this.items.hasOwnProperty(this._home)) {
      delete this.items[this._home].isHome;
    }
    this._home = null;
  }
  if (key && this.items.hasOwnProperty(key)) {
    this.items[key].isHome = true;
    this._home = key;
  }
}

/*
Run an AST through a set of rules and return a report in a callback.
@param {Object} options Doctor options.
@param {AstNode} ast AST.
@param {function} cb Function to call when finished.
*/
function run(options, ast, cb) {
  var report = new Report(options, ast);
  report.run(cb);
}

module.exports = run;
