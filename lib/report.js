var nast = require('./nice-ast');
var u = require('./util');

function Report(options, ast) {
  this.options = options;
  this.ast = ast;
  this.items = {root: {type: 'group', items: []}};
}

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

/* Run the report through the supplied report rules. */
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

  function finishRules(err) {
    if (err) {
      return cb(err);
    }
    var finalReport = {};
    finalReport.items = self.items;
    cb(null, finalReport);
  }

  var rules = u.toArray(self.options.report || 'default');
  nast.walkWithRules(self.options, rules, 'report', self.ast, eachNode, finishRules);
};

Report.prototype.item = function (key) {
  return this.items[key];
};

Report.prototype.ref = function (key) {
  if (!(key in this.items)) {
    throw new Error('trying to reference ' + key + ", but it doesn't exist");
  }
  return {$item: key};
};

Report.prototype.remove = function (key) {
  var self = this;
  if (!(key in self.items)) {
    throw new Error('no item with key ' + key + ' to remove');
  }
  var item = self.items[key];
  if (item.type === 'group') {
    throw new Error('cannot delete group');
  }
  if (item.groups) {
    item.groups.forEach(function (group, i) {
      if (self.items[group]) {
        var index = self.items[group].items.indexOf(key);
        if (index >= 0) {
          self.items[group].items.splice(index, 1);
        }
      }
    });
  }
  delete self.items[key];
};

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

  self.items[item.key] = item;
  item.type = item.type || 'item';
  item.name = item.name || item.key;
  if (item.groups) {
    if (typeof item.groups === 'string') {
      item.groups = [item.groups];
    }
    item.groups.forEach(function (group, i) {
      if (!self.items[group]) {
        self.add({key: group, type: 'group', items: []});
      }
      if (!self.items[group].items) {
        self.items[group].items = [];
      }
      self.items[group].items.push(item.key);
    });
  } else if (item.type === 'group') {
    self.items.root.items.push(item.key);
  }
};

function run(options, ast, cb) {
  var report = new Report(options, ast);
  report.run(cb);
}

module.exports = run;
