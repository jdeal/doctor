var isArray = require('./util').isArray;

function Report (options, ast) {
  this.options = options;
  this.ast = ast;
  this.items = {};
}

function walk(node, cb) {
  if (node.type) {
    cb(node);
  }
  if (node.nodes) {
    node.nodes.forEach(function (childNode) {
      walk(childNode, cb);
    });
    cb({type: 'end', node: node});
  }
}

Report.prototype.run = function (cb){
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
    if (nodeType === 'end'){
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
          if (!reportItem.key || (reportItem.key in self.items)) {
            throw new Error('must supply unique key for report item');
          }
          self.items[reportItem.key] = reportItem;
        }
      }
      break;
    }
  });

  var finalReport = {};

  finalReport.items = self.items;

  if (self.options.ast) {
    return cb(null, {ast: self.ast, report: finalReport});
  } else {
    return cb(null, finalReport);
  }
};

Report.prototype.item = function (key) {
  return this.items[key];
};

Report.prototype.remove = function (key) {
  delete this.items[key];
};

function run(options, ast, cb){
  var report = new Report(options, ast);
  report.run(cb);
}

module.exports = run;