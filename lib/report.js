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

Report.prototype.run = function (cb) {

  var self = this;

  function eachNode(node, rule) {
    if (typeof rule.report === 'function') {
      var reportItems = rule.report(node, self);
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
      var index = self.items[group].items.indexOf(key);
      if (index >= 0) {
        self.items[group].items.splice(index, 1);
      }
    });
  }
  delete self.items[key];
};

Report.prototype.add = function (item) {
  var self = this;
  if (!item.key || (item.key in self.items)) {
    throw new Error('must supply unique key for report item (' + item.key + ')');
  }
  self.items[item.key] = item;
  item.type = item.type || 'item';
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
