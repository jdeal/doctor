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
  type: 'define-function',
  report: function (node) {
    var name = node.nodes[0].value;
    return {
      type: 'function',
      key: node.item('module') + '.' + name,
      params: node.params,
      description: node.description,
      groups: [node.item('module')],
      name: name
    };
  }
});

function exportFunction(node, report, name, exportName) {
  exportName = exportName || name;
  if (report.item(node.item('module') + '.' + name)) {
    var functionItem = report.item(node.item('module') + '.' + name);
    functionItem.api = true;
    functionItem.name = exportName;
  }
}

/*
  exports.x = x;
  module.exports.x = x;
*/
rules.push({
  type: 'assign',
  match: function (node) {
    // op dot name
    try {
      if (node.nodes[0].value === '=' && node.nodes[1].type === 'dot' &&
          node.nodes[2].type === 'name') {
        return true;
      }
    } catch (e) {
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
    var name = node.nodes[2].value;
    var dotLeft = node.nodes[1].nodes[0];
    var dotRight = node.nodes[1].nodes[1];
    if (dotLeft.type === 'dot') {
      var dotDotLeft = dotLeft.nodes[0];
      var dotDotRight = dotLeft.nodes[1];
      if (dotDotLeft.type === 'name' && dotDotRight.type === 'name' && dotDotLeft.value === 'module') {
        dotLeft = dotDotRight;
      }
    }
    if (dotLeft.type === 'name' && dotRight.type === 'name' && dotLeft.value === 'exports') {
      var exportName = dotRight.value;
      exportFunction(node, report, name, exportName);
    }
  }
});

/*
  _(module).export(...)
*/
rules.push({
  match: function (node) {
    return node.likeSource("_(module).export()");
  },
  report: function (node, report) {
    console.log(node.lispify());

    var exportArgNodes = node.nodes[1].nodes;
    exportArgNodes.forEach(function (argNode, i) {
      if (argNode.type === 'name') {
        exportFunction(node, report, argNode.value);
      } else if (argNode.type === 'object') {
        argNode.nodes.forEach(function (propertyNode, i) {
          exportFunction(node, report, propertyNode.nodes[0].value, propertyNode.nodes[1].value);
        });
      }
    });
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
