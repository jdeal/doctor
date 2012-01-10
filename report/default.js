var path = require('path');
var _ = require('underscore');

var rules = [];

function isCapitalized(string) {
  return (string && string.match(/^[A-Z]/)) ? true : false;
}

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
    if (!report.item('classes')) {
      report.add({
        type: 'group',
        key: 'classes',
        name: 'Classes'
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

function fixSignatureParams(item, signature) {
  signature.params = [];
  for (var i = 0; i < signature.arity; i++) {
    signature.params.push(item.params[i]);
  }
}

function functionSignatures(fn, node, fnItem, signatures, direction, lastParamIndex) {
  var isFirst = true;
  if (signatures.length > 0) {
    isFirst = false;
  }
  if (node && node.checksSignature) {
    var arity;
    var signature = {
      description: node.description,
      returns: node.returns || fn.returns,
      examples: node.examples
    };
    //item.returns = node.returns || fn.returns;
    if (node.type === 'if') {
      var paramName = node.nodes[0].nodes[1].nodes[1].value;
      var paramIndex;
      if (!(paramName in fn.paramIndex)) {
        return;
      } else {
        paramIndex = fn.paramIndex[paramName];
      }
      var nextNode = node.next;
      if (node.likeSource("if (typeof __name__ === 'undefined') {}")) {
        signature.arity = fn.paramIndex[paramName];
        fixSignatureParams(fnItem, signature);
        signatures.push(signature);
        functionSignatures(fn, nextNode, fnItem, signatures, 1, paramIndex);
      } else if (node.likeSource("if (typeof __name__ !== 'undefined') {}")) {
        signature.arity = fn.params.length;
        fixSignatureParams(fnItem, signature);
        if (!isFirst) {
          signature.arity = lastParamIndex;
        }
        signatures.push(signature);
        functionSignatures(fn, nextNode, fnItem, signatures, -1, paramIndex);
      }
    } else if (!isFirst) {
      if (direction) {
        signature.arity = fn.params.length;
        fixSignatureParams(fnItem, signature);
        signatures.push(signature);
      } else {
        signature.arity = lastParamIndex;
        fixSignatureParams(fnItem, signature);
        signatures.push(signature);
      }
    }
  }
}

function functionReportItem(node, fnNode, name, item) {
  if (!fnNode.type) {
    item = name;
    name = fnNode;
    fnNode = node;
  }
  item = item || {};
  var signatures = [];
  var body = fnNode.nodes[2];
  var items = [];
  var fnItem = {
    type: 'function',
    constructorFunction: isCapitalized(name),
    key: node.item('module') + '.' + name,
    params: fnNode.params,
    classDescription: node.classDescription,
    returns: node.returns,
    constructorDescription: node.constructorDescription,
    description: node.description,
    properties: node.properties,
    examples: node.examples,
    visibility: node.visibility,
    extends: node.extends,
    groups: [node.item('module')],
    name: name,
    signatures: signatures
  };
  fnItem = _.extend(fnItem, item);
  functionSignatures(fnNode, body.nodes[0], fnItem, signatures);
  if (fnItem.constructorFunction) {
    var classItem = {
      type: 'class',
      key: node.item('module') + ".class." + fnItem.name,
      name: fnItem.name,
      groups: ['classes']
    };
    items.push(classItem);
    fnItem.groups.push(classItem.key);
  }
  items.push(fnItem);
  return items;
}

rules.push({
  type: 'define-function',
  report: function (node) {
    return functionReportItem(node, node.nodes[0].value);
  }
});

/*
  var f = function f() {}
  var f = function () {}
*/
rules.push({
  type: 'var',
  match: function (node) {
    //console.log(node.lispify())
    return node.likeSource('var __name__ = function __name__() {}') ||
           node.likeSource('var __name__ = function () {}');
  },
  report: function (node, report) {
    return functionReportItem(node.nodes[1], node.nodes[0].value);
  }
});

function exportFunction(node, report, name, exportName) {
  exportName = exportName || name;
  if (report.item(node.item('module') + '.' + name)) {
    var functionItem = report.item(node.item('module') + '.' + name);
    functionItem.api = true;
    functionItem.name = exportName;
    functionItem.constructorFunction = isCapitalized(name);
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
    return node.likeSource('exports.__name__ = __name__') ||
           node.likeSource('module.exports.__name__ = __name__');
  },
  report: function (node, report) {
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
      var f = exportFunction(node, report, name, exportName);
      if (!f) {
        // whatever else it is, it's exported so show it's name and comment tags at least:
        return {
          type: 'var',
          key: node.item('module') + '.' + exportName,
          groups: [node.item('module')],
          name: exportName,
          api: true,
          description: node.description,
          examples: node.examples,
        }
      }
    }
  }
});

/*
  exports.x = y.z;
  module.exports.x = y.z;
*/
rules.push({
  type: 'assign',
  match: function (node) {
    return node.likeSource('module.exports.__name__ = __name__.__name__') ||
           node.likeSource('exports.__name__ = __name__.__name__');
  },
  report: function (node, report) {
    var exportName = node.nodes[1].nodes[1].value;
    var localName = node.nodes[2].nodes[0].value + '.' + node.nodes[2].nodes[1].value;
    var key = node.item('module') + '.' + localName;
    var item = report.item(key);
    if (item) {
      item.api = true;
      item.name = exportName;
      item.constructorFunction = isCapitalized(exportName);
    } else {
      // misc export
      return {
        type: 'var',
        key: node.item('module') + '.' + exportName,
        groups: [node.item('module')],
        name: exportName,
        api: true,
        description: node.description,
        examples: node.examples,
      }
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
  module.exports = ...
*/
rules.push({
  type: 'assign',
  match: function (node) {
    return node.nodes[0].value === '=' && node.nodes[1].likeSource('module.exports');
  },
  report: function (node, report) {
    var typeNode = node.nodes[2];
    var type = typeNode.type;

    if (type === 'name') {
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
        var exportName = name ? name : 'function';
        var f = exportFunction(node, report, name, exportName);
        if (f) {
          f.type = 'module-function';
        }
      }
    } else if (type === 'new') {
      var constructorName = node.nodes[2].nodes[0].value;
      var o = exportFunction(node, report, constructorName, 'object');
      if (o) {
        o.type = 'module-object';
      }
    } else if (type === 'function') {
      var key = node.item('module') +  '.anonymous';
      return {
        type: 'module-function',
        key: key,
        params: typeNode.params,
        returns: node.returns,
        description: node.description,
        examples: node.examples,
        visibility: node.visibility,
        api: true,
        groups: [node.item('module')],
        name: 'anonymous'
      };
    }
  }
});


function getFullPath(node, requiredFile) {
  var fullPath = path.join(path.dirname(node.parent.fullPath), requiredFile);
  if (!fullPath.match(/\.js$/)) {
    fullPath += '.js';
  }
  return fullPath;
}
/*
  exports.x = require('...')
*/
rules.push({
  type: 'assign',
  match: function (node) {
    return node.likeSource("exports.__name__ = require()");
  },
  report: function (node, report) {
    var name = node.nodes[1].nodes[1].value;
    var requiredFile = node.nodes[2].nodes[1].nodes[0].value;
    var fullPath = getFullPath(node, requiredFile);

    return {
      type: 'module-function',
      constructorFunction: isCapitalized(name),
      key: node.item('module') + '.' + name,
      description: node.description,
      properties: node.properties,
      examples: node.examples,
      visibility: node.visibility,
      extends: node.extends,
      groups: [node.item('module')],
      required: true,
      items: [ fullPath ],
      name: name
    };
  }
});

/*
 public requires
*/
rules.push({
  type: 'call',
  match: function (node) {
    return node.likeSource("require()") && node.visibility === 'public';
  },
  report: function (node, report) {
    var requiredFile = node.nodes[1].nodes[0].value;
    var fullPath = getFullPath(node, requiredFile);

    return {
      type: 'module',
      key: node.item('module') + '.' + requiredFile,
      description: node.description,
      properties: node.properties,
      examples: node.examples,
      visibility: node.visibility,
      groups: [node.item('module')],
      required: true,
      items: [ fullPath ],
      name: 'anonymous require'
    };
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

    var moduleName = node.item('module');
    var key = moduleName + '.' + name;

    if (!report.item(key)) {
      return {
        type: 'var',
        key: key,
        groups: [moduleName],
        name: name
      };
    }
  }
});

/*
  obj.x = function
*/
rules.push({
  type: 'assign',
  match: function (node) {
    return node.likeSource('__name__.__name__ = function() {}');
  },
  report: function (node, report) {
    var objName = node.nodes[1].nodes[0].value;
    var propName = node.nodes[1].nodes[1].value;
    var key = node.item('module') + '.' + objName + '.' + propName;
    var params = node.nodes[2].params;

    return {
      type: 'function',
      key: key,
      params: params,
      returns: node.returns,
      description: node.description,
      examples: node.examples,
      visibility: node.visibility,
      groups: [node.item('module')],
      name: propName
    };
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

/*
 *.prototype.*
 */
rules.push({
  type: 'assign',
  match: function (node) {
    return node.likeSource('__name__.prototype.__name__ = function () {}');
  },
  report: function (node, report) {
    var methodName = node.nodes[1].nodes[1].value;
    var className = node.nodes[1].nodes[0].nodes[0].value;
    //var params = node.nodes[2].params;
    var key = node.item('module') + '.' + className + '.' + methodName;
    var group = node.item('module') + '.class.' + className;

    return functionReportItem(node, node.nodes[2], methodName, {
      method: true,
      key: key,
      groups: [group]
    });

    /*

    return {
      type: 'function',
      method: true,
      key: key,
      params: params,
      classDescription: node.classDescription,
      constructorDescription: node.constructorDescription,
      returns: node.returns,
      description: node.description,
      properties: node.properties,
      examples: node.examples,
      visibility: node.visibility,
      extends: node.extends,
      groups: [group],
      name: methodName
    };

    */
  }
});

rules.push({
  type: 'assign',
  match: function (node) {
    return node.likeSource('__name__.__name__ = pcodeDefine()') ||
        node.likeSource('__name__.__name__ = selectFirstDefine()');
  },
  report: function (node, report) {
    var name = node.nodes[1].nodes[0].value + '.' + node.nodes[1].nodes[1].value;
    var args = node.nodes[2].nodes[1].nodes[0].value.split(/,\s*/);
    var params = _(args).map(function (arg) {
      return {name: arg};
    });
    var moduleName = node.item('module');
    var key = moduleName + '.' + name;

    return {
      type: 'function',
      key: key,
      params: params,
      returns: node.returns,
      description: node.description,
      examples: node.examples,
      visibility: node.visibility,
      groups: [moduleName],
      name: name
    };
  }
});

/*
function inFunction(node) {
  return node.parent.parent.type === 'function' ||
    node.parent.parent.type === 'define-function';
}

rules.push({
  type: 'if',
  match: function (node) {
    return inFunction(node) &&
      node.likeSource("if (typeof __name__ === 'undefined') {return __name__()}");
  },
  report: function (node, report) {
    console.log(node.lispify())
  }
});
*/

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
