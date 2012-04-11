var Path = require('path');

var rules = [];

rules.push({
  type: 'file',
  report: function (node, report) {
    node.item('module', node.path);
    node.item('fullPath', node.fullPath);
    node.item('requires', {});
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
      groups: ['modules'],
      package: node.package,
      fullPath: node.fullPath
    };
  }
});

rules.push({
  type: 'call',
  match: function (node) {
    return node.likeSource('require(__string__)');
  },
  report: function (node, report) {
    var requirePath = node.nodes[1].nodes[0].value;
    var ext = Path.extname(requirePath);
    if (ext === '.js' || ext === '') {
      if (requirePath[0] === '.') {
        requirePath = Path.join(Path.dirname(node.item('fullPath')), requirePath);
        // if (ext === '') {
        //   requirePath += '.js';
        // }
        node.item('requires')[requirePath] = requirePath;
      }
    }
  }
});

rules.push({
  type: 'end-file',
  report: function (node, report) {
    report.item(node.item('module')).requires = Object.keys(node.item('requires'));
  }
});

module.exports = rules;