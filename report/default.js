var _ = require('underscore');

var rules = [];

rules.push({
  type: 'file',
  report: function (node, report) {
    node.item('module', node.path);
    node.item('object._', {});
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
      package: node.package
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
    return functionItem;
  }
  return null;
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
  type: 'call',
  match: function (node) {
    return node.likeSource("_(module).export()");
  },
  report: function (node, report) {

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

/*
  module.export = ...
*/
rules.push({
  type: 'assign',
  match: function (node) {
    return node.nodes[0].value === '=' && node.nodes[1].likeSource('module.exports');
  },
  report: function (node, report) {
    if (node.nodes[2].type === 'name') {
      var name = node.nodes[2].value;
      var obj = node.item('object.' + name);
      if (obj) {
        _(obj).each(function (prop, key) {
          if (prop.ref) {
            var name = prop.ref.name;
            var exportName = prop.ref.exportName || name;
            exportFunction(node, report, name, exportName);
          }
        });
      } else {
        var f = exportFunction(node, report, name, 'function');
        if (f) {
          f.type = 'module-function';
        }
      }
    }
  }
});

/*
  var obj = {...}
*/
rules.push({
  type: 'var',
  match: function (node) {
    return node.likeSource('var __name__ = {}');
  },
  report: function (node, report) {
    var name = node.nodes[0].value;
    var obj = {};
    node.parent.parent.item('object.' + name, obj);
    var props = node.nodes[1].nodes;
    _(props).each(function (prop) {
      // need to get functions here
    });
  }
});

/*
  extendWithFunctions(obj, ...)
  _.extendWithFunctions(obj, ...)
*/
rules.push({
  type: 'call',
  match: function (node) {
    return node.likeSource('extendWithFunctions(__name__)') ||
           node.likeSource('_.extendWithFunctions(__name__)');
  },
  report: function (node, report) {
    var argNodes = node.nodes[1].nodes;
    var name = argNodes[0].value;
    var obj = node.item('object.' + name);
    if (obj) {
      _(argNodes).each(function (argNode, i) {
        if (i > 0) {
          if (argNode.type === 'name') {
            var name = argNode.value;
            if (report.item(node.item('module') + '.' + name)) {
              obj[name] = {'ref': {name: name}};
            }
          } else if (argNode.type === 'object') {
            argNode.nodes.forEach(function (propertyNode, i) {
              var name = propertyNode.nodes[1].value;
              var exportName = propertyNode.nodes[0].value;
              if (report.item(node.item('module') + '.' + name)) {
                obj[name] = {'ref': {name: name, exportName: exportName}};
              }
            });
          }
        }
      });
    }
  }
});

/*
  _.mixin(...)
*/
rules.push({
  type: 'call',
  match: function (node) {
    return node.likeSource('_.mixin(__name__)');
  },
  report: function (node, report) {
    var name = node.nodes[1].nodes[0].value;
    var obj = node.item('object.' + name);
    if (obj) {
      _.extend(node.item('object._'), obj);
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