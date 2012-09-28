var Path = require('path');
var marked = require('marked');

var rules = [];

rules.push({
  type: 'script',
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
      fullPath: node.fullPath,
      originalPath: node.originalPath
    };
  }
});

function addDep(path, node) {
  var ext = Path.extname(path);
  if (ext === '.js' || ext === '') {
    //if (path[0] === '.') {
      path = Path.join(Path.dirname(node.item('fullPath')), path);
      // if (ext === '') {
      //   path += '.js';
      // }
      node.item('requires')[path] = path;
    //}
  }
}

rules.push({
  type: 'call',
  match: function (node) {
    return node.likeSource('require(__string__)');
  },
  report: function (node, report) {
    var requirePath = node.nodes[1].nodes[0].value;
    addDep(requirePath, node);
  }
});

/*
define([], function () {});
requirejs([], function () {});
*/
rules.push({
  type: 'call',
  match: function (node) {
    return node.likeSource('define([], function(){})') ||
           node.likeSource('requirejs([], function(){})');
  },
  report: function (node, report) {
    var deps = node.nodes[1].nodes[0].nodes;
    deps.forEach(function (dep) {
      if (dep.value) {
        addDep(dep.value, node);
      }
    });
  }
});

rules.push({
  type: 'end-script',
  report: function (node, report) {
    report.item(node.item('module')).requires = Object.keys(node.item('requires'));
  }
});

module.exports = rules;