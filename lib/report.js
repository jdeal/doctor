var isArray = require('./util').isArray;

function Report(options, ast) {
  this.options = options;
  this.ast = ast;
  this.items = {root: {type: 'group', items: []}};
}

function getNodeItem(key) {
  if (key in this._items) {
    return this._items[key];
  }
  if (this.parent) {
    return getNodeItem.call(this.parent, key);
  }
  return null;
}

function nodeItem(key, value) {
  if (typeof value === 'undefined') {
    return getNodeItem.call(this, key);
  }
  this._items[key] = value;
}

function walk(node, cb) {
  node._items = {};
  node.item = nodeItem;

  if (node.type) {
    cb(node);
  }
  if (node.nodes) {
    node.nodes.forEach(function (childNode) {
      walk(childNode, cb);
    });
    cb({type: 'end', node: node});
  }

  delete node._items;
  delete node.item;
}

Report.prototype.run = function (cb) {
  try {
    var self = this;
    var rules = self.options.rules || require('./rules');
    var typeToRules = {'': []};

    rules.forEach(function (rule) {
      var ruleTypes = rule.type || [];
      ruleTypes = (typeof ruleTypes === 'array') ? ruleTypes : [ruleTypes];
      if (ruleTypes.length === 0) {
        typeToRules[''].push(rule);
      } else {
        ruleTypes.forEach(function (ruleType) {
          typeToRules[ruleType] = typeToRules[ruleType] || [];
          typeToRules[ruleType].push(rule);
        });
      }
    });

    Object.keys(typeToRules).forEach(function (key) {
      if (key !== '') {
        typeToRules[key] = typeToRules[key].concat(typeToRules['']);
      }
    });

    walk(self.ast, function (node) {
      //node = wrapNode(node, this);
      var nodeType = node.type;
      if (nodeType === 'end') {
        nodeType = nodeType + '-' + node.node.type;
        node = node.node;
      }
      var ruleType = (nodeType in typeToRules) ? nodeType : '';
      var rules = typeToRules[ruleType];
      var i, j;
      for (i = 0; i < rules.length; i++) {
        var rule = rules[i];
        if (typeof rule.match === 'function') {
          if (!rule.match(node)) {
            continue;
          }
        }
        if (typeof rule.report === 'function') {
          var reportItems = rule.report(node, self);
          if (!reportItems) {
            break;
          }
          reportItems = isArray(reportItems) ? reportItems : [reportItems];
          for (j = 0; j < reportItems.length; j++) {
            var reportItem = reportItems[j];
            self.add(reportItem);
          }
        }
        break;
      }
    });

    var finalReport = {};

    finalReport.items = self.items;

    return cb(null, finalReport);
  } catch (e) {
    cb(e);
  }
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
    throw new Error('must supply unique key for report item');
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