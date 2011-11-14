var rules = [];

rules.push({
  type: 'file',
  report: function (node, report) {
    node.item('module', node.path);
    if (!report.item('modules')) {
      report.add({
        type: 'group',
        key: 'modules',
        name: 'Modules'
      });
    }
    return {
      type: 'module',
      key: node.path,
      name: node.path,
      groups: ['modules']
    };
  }
});

rules.push({
  type: 'define',
  report: function (node) {
    var name = node.nodes[0].value;
    return {
      type: 'function',
      key: node.item('module') + '.' + name,
      parameters: node.parameters,
      groups: [node.item('module')],
      name: name
    };
  }
});

rules.push({
  type: 'assign',
  match: function (node) {
    if (node.nodes[0].type === 'dot' && node.nodes[1].value && node.nodes[1].type === 'name') {
      return true;
    }
    return false;
  },
  report: function (node, report) {
    /*
    if (!report.item('functions')){
      report.add({key: 'functions', type: 'group'})
    }
    if (!report.item('craps')){
      report.add({key: 'craps', type: 'group', groups: ['functions']})
    }
    */
    var name = node.nodes[1].value;
    var dotLeft = node.nodes[0].nodes[0];
    var dotRight = node.nodes[0].nodes[1];
    if (dotLeft.type === 'dot') {
      var dotDotLeft = dotLeft.nodes[0];
      var dotDotRight = dotLeft.nodes[1];
      if (dotDotLeft.type === 'name' && dotDotRight.type === 'name' && dotDotLeft.value === 'module') {
        dotLeft = dotDotRight;
      }
    }
    if (dotLeft.type === 'name' && dotRight.type === 'name' && dotLeft.value === 'exports') {
      var exportName = dotRight.value;
      if (report.item(node.item('module') + '.' + name)) {
        var functionItem = report.item(node.item('module') + '.' + name);
        functionItem.api = true;
        functionItem.name = exportName;
      }
    }
  }
});

rules.push({
  type: 'end-files',
  report: function (node, report) {
    Object.keys(report.items).forEach(function (key) {
      var item = report.item(key);
      if (item.type === 'function' && !item.api && report.options.api) {
        report.remove(key);
      }
    });
  }
});

module.exports = rules;