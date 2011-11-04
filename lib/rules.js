var rules = [];

rules.push({
  type: 'define',
  report: function (node) {
    return {
      type: 'function',
      key: node.nodes[0].value
    };
  }
});

rules.push({
  type: 'assign',
  match: function (node) {
    if (node.nodes[0].type === 'dot' && node.nodes[1].value && node.nodes[1].type === 'name'){
      return true;
    }
    return false;
  },
  report: function (node, report) {
    var name = node.nodes[1].value;
    var dotLeft = node.nodes[0].nodes[0];
    var dotRight = node.nodes[0].nodes[1];
    if (dotLeft.type === 'dot'){
      var dotDotLeft = dotLeft.nodes[0];
      var dotDotRight = dotLeft.nodes[1];
      if (dotDotLeft.type === 'name' && dotDotRight.type === 'name' && dotDotLeft.value === 'module'){
        dotLeft = dotDotRight;
      }
    }
    if (dotLeft.type === 'name' && dotRight.type === 'name' && dotLeft.value === 'exports'){
      var exportName = dotRight.value;
      if (report.item(name)){
        return {
          key: 'api.' + exportName,
          type: 'function',
          api: true
        };
      }
    }
  }
});

rules.push({
  type: 'end-files',
  report: function (node, report){
    Object.keys(report.items).forEach(function (key){
      if (!report.item(key).api){
        report.remove(key);
      }
    });
  }
});

module.exports = rules;