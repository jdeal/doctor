var Path = require('path');
var _ = require('underscore');

function isCapitalized(string) {
  return (string && string.match(/^[A-Z]/)) ? true : false;
}

// make a set of params to match the signature
function fixSignatureParams(item, signature) {
  signature.params = [];
  for (var i = 0; i < signature.arity; i++) {
    signature.params.push(item.params[i]);
  }
}

/*
create function signatures for this function
@param fn {Function} node for the function
@param node {AstNode} first node of the body
@param fnItem {Object} report item for the function
@param signatures {Array} list to hold signatures
@param [direction] {Number} whether successive signatures are increasing or decreasing arity
@param [lastParamIndex] {Number} for decreasing arity, the index of the previous arity parameter
*/
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

/*
create a function report item and any required class items
@param node {AstNode} node holding description, examples, etc.
@param [fnNode] {AstNode} node of the function
@param name {String} name for the function
@param [item] {Object} override report item for the function
*/
function functionReportItems(node, fnNode, name, item) {
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
      module: node.item('module'),
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

function fullRequirePath(node, requirePath) {
  var fullPath = Path.join(Path.dirname(node.item('fullPath')), requirePath);
  if (!fullPath.match(/\.js$/)) {
    fullPath += '.js';
  }
  return fullPath;
}

function expressionNames(node) {
  var leftNames;
  if (node.type === 'call') {
    if (node.nodes[0].value === 'require') {
      var argsNode = node.nodes[1];
      if (argsNode.nodes.length > 0) {
        var path = argsNode.nodes[0].value;
        if (path.charAt(0) === '.') {
          return [fullRequirePath(node, path)];
        }
      }
    }
  } else if (node.nodes[1].type === 'name') {
    if (node.nodes[0].type === 'name') {
      return [node.nodes[0].value, node.nodes[1].value];
    } else if (node.nodes[0].type === 'call') {
      leftNames = expressionNames(node.nodes[0]);
      if (leftNames) {
        return leftNames.concat(node.nodes[1].value);
      }
    } else if (node.nodes[0].type === 'dot') {
      leftNames = expressionNames(node.nodes[0]);
      if (leftNames) {
        return leftNames.concat(node.nodes[1].value);
      }
    }
  }
  return null;
}

function findVarProperty(varNames, varItem) {
  if (!varItem) {
    return null;
  }
  if (varNames.length === 0) {
    return varItem;
  }
  varNames = varNames.slice(0);
  var varName = varNames.shift();
  if (varName in varItem.properties) {
    return findVarProperty(varNames, varItem.properties[varName]);
  }
  return null;
}

/*
Finds the value object of a variable.
@param valueNode {AstNode} Node of expression or name.
*/
function findVarItem(valueNode) {
  var varNames = [];
  var varName;
  if (valueNode.type === 'name') {
    varName = valueNode.value;
  } else if (valueNode.type === 'dot' || valueNode.type === 'call') {
    varNames = expressionNames(valueNode);
    if (!varNames) {
      return;
    }
    varName = varNames.shift();
  }
  if (!varName) {
    return;
  }
  var varItem = valueNode.item('var.' + varName);
  if (typeof varItem === 'undefined') {
    return;
  }
  varItem = findVarProperty(varNames, varItem);
  return varItem;
}

/*
Creates an object to represent a variable value.
@param node {AstNode} Node holding the variable scope.
@param valueNode {AstNode} Node holding the value.
*/
function varItem(node, valueNode) {
  var type;
  var properties = {};
  if (valueNode.type === 'object') {
    type = 'object';
    _(valueNode.nodes).each(function (prop) {
      var name = prop.nodes[0].value;
      var item = varItem(prop, prop.nodes[1]);
      if (item) {
        properties[name] = item;
      }
    });
  } else if (valueNode.type === 'function' ||
             valueNode.type === 'define-function') {
    type = 'function';
  } else if (valueNode.type === 'new') {
    type = 'object';
    var className = valueNode.nodes[0].value;
    if (node.item('classes')[className]) {
      var classVar = node.item('var.' + className);
      var classPrototype = classVar.properties.prototype;
      if (classPrototype) {
        _(classPrototype.properties).each(function (method, key) {
          var item = varItem(method.node, method.value);
          if (item) {
            properties[key] = item;
          }
        });
      }
    }
  } else {
    return findVarItem(valueNode);
  }
  return {
    node: node,
    value: valueNode,
    type: type,
    properties: properties
  };
}

/*
Saves a variable for later exporting.
@param node {AstNode} Node that holds the variable scope.
@param node {String|AstNode} Name of variable or name node or expression of
name nodes.
@param valueNode {AstNode} Node that holds the value of the variable.
*/
function saveVar(node, name, valueNode) {
  var scopeNode = node.item('scopeNode');
  var names = [];
  if (typeof name !== 'string') {
    if (Array.isArray(name)) {
      names = name;
    } else {
      names = expressionNames(name);
    }
    if (!names || names.length === 0) {
      // some names can't be understood yet
      return;
    }
    name = names.shift();
  }
  if (names.length === 0) {
    var item = varItem(node, valueNode);
    if (item && item.type === 'function') {
      if (isCapitalized(name)) {
        item.isConstructor = true;
      }
      item.name = name;
    }
    scopeNode.item('var.' + name, item);
  } else {
    var savedVarItem = scopeNode.item('var.' + name);
    if (!savedVarItem && names[0] === 'prototype') {
      // assume this is a global class and create a proxy for it here
      var moduleScopeNode = node.item('moduleScopeNode');
      saveVar(moduleScopeNode, name, {type: 'function', nodes: []});
      savedVarItem = scopeNode.item('var.' + name);
      saveVar(moduleScopeNode, [name, 'prototype'], {type: 'object', nodes: []});
      node.item('classes')[name] = {global: true};
    }
    if (savedVarItem) {
      var lastPropertyName = names.pop();
      savedVarItem = findVarProperty(names, savedVarItem);
      if (!savedVarItem && names[0] === 'prototype') {
        node.item('classes')[name] = {};
        saveVar(node, [name, 'prototype'], {type: 'object', nodes: []});
        savedVarItem = scopeNode.item('var.' + name);
        savedVarItem = findVarProperty(names, savedVarItem);
      }
      if (savedVarItem) {
        // check for literal prototypes
        if (lastPropertyName === 'prototype' && !(name in node.item('classes'))) {
          node.item('classes')[name] = {};
        }
        savedVarItem.properties[lastPropertyName] = varItem(node, valueNode);
      }
    }
  }
}

function extendVar(node, name, valueNode) {
  var scopeNode = node.item('scopeNode');
  var savedVarItem = scopeNode.item('var.' + name);
  if (savedVarItem) {
    var valueVarItem = varItem(node, valueNode);
    if (valueVarItem) {
      _.extend(savedVarItem.properties, valueVarItem.properties);
    }
  }
}

function exportVarValue(exports, exportName) {
  var node = exports.node;
  var valueNode = exports.value;
  if (valueNode.type === 'function' || valueNode.type === 'define-function') {
    var item = {api: true};
    if (exportName === 'anonymous') {
      item.type = 'module-function';
      item.constructorFunction = exports.isConstructor;
      item.name = exports.name;
      exportName = 'exports-' + exports.name;
    }
    return functionReportItems(node, valueNode, exportName, item);
  } else if (valueNode.type === 'object') {
    var props = valueNode.nodes;
    var items = [];
    props.forEach(function (prop) {
      var name = exportName + '.' + prop.nodes[0].value;
      items = items.concat(exportVarValue({node: prop, value: prop.nodes[1]}, name));
    });
    return items;
  }
}

function exportModule(exports, exportName) {
  var items = [];
  if (!exports) {
    return [];
  }
  if (exports.type === 'function') {
    items = items.concat(exportVarValue(exports, exportName || 'anonymous'));
  }
  _(exports.properties).each(function (obj, key) {
    var nextExportName = exportName;
    if (nextExportName) {
      nextExportName += '.' + key;
    } else {
      nextExportName = key;
    }
    // don't export prototype of function
    if (key !== 'prototype') {
      items = items.concat(exportModule(obj, nextExportName));
    }
  });
  // re-key items from other modules
  _(items).each(function (item) {
    var key = item.key;
    if (key.indexOf('.') >= 0) {
      var subKey = key.substring(key.indexOf('.'));
      item.key = exports.node.item('module') + subKey;
    }
  });
  return items;
}

var rules = [];

rules.push({
  type: 'files',
  report: function (node, report) {
    // save this global scope
    node.item('globalScopeNode', node);
    node.item('scopeNode', node);
    return [
      {
        type: 'group',
        key: 'modules',
        name: 'Modules'
      },
      {
        type: 'group',
        key: 'classes',
        name: 'Classes'
      }
    ];
  }
});

rules.push({
  type: 'file',
  report: function (node, report) {
    node.item('module', node.path);
    node.item('fullPath', node.fullPath);
    // create a new scope by saving this node as the place to save vars
    node.item('scopeNode', node);
    // save this module scope
    node.item('moduleScopeNode', node);
    node.item('var.exports', {
      node: node,
      value: {type: 'object', nodes: []},
      type: 'object',
      properties: {}
    });
    node.item('var.module', {
      node: node,
      value: {type: 'object', nodes: []},
      type: 'object',
      properties: {
        exports: node.item('var.exports')
      }
    });
    node.item('classes', {});
    // special case for underscore object
    node.item('var._', {
      node: node,
      value: {type: 'object', nodes: []},
      type: 'object',
      properties: {}
    });
    return {
      type: 'module',
      key: node.path,
      name: node.path,
      description: node.description,
      examples: node.examples,
      groups: ['modules'],
      package: node.package,
      required: node.required
    };
  }
});

/*
function f() {}
*/
rules.push({
  type: 'define-function',
  report: function (node, report) {
    var name = node.nodes[0].value;
    saveVar(node, name, node);
    // create a new scope by saving this node as the place to save vars
    node.item('scopeNode', node);
  }
});

/*
var f = function f() {}
var f = function () {}
*/
rules.push({
  type: 'var',
  match: function (node) {
    return node.likeSource('var __name__ = function __name__() {}') ||
           node.likeSource('var __name__ = function () {}');
  },
  report: function (node, report) {
    var name = node.nodes[0].value;
    var fnNode = node.nodes[1];
    saveVar(node, name, fnNode);
  }
});

rules.push({
  type: 'function',
  report: function (node, report) {
    // create a new scope by saving this node as the place to save vars
    node.item('scopeNode', node);
  }
});

/*
var f = x;
var f = x.y.z;
var f = require('foo');
*/
rules.push({
  type: 'var',
  match: function (node) {
    return node.likeSource('var __name__ = __name__') ||
           node.likeSource('var __name__ = __dot__') ||
           node.likeSource('var __name__ = require(__string__)');
  },
  report: function (node, report) {
    var name = node.nodes[0].value;
    var varNode = node.nodes[1];
    saveVar(node, name, varNode);
  }
});

/*
var thing = {};
*/
rules.push({
  type: 'var',
  match: function (node) {
    return node.likeSource('var __name__ = {}');
  },
  report: function (node, report) {
    var name = node.nodes[0].value;
    var objNode = node.nodes[1];
    saveVar(node, name, objNode);
  }
});

/*
var thing = new Foo();
*/
rules.push({
  type: 'var',
  match: function (node) {
    return node.likeSource('var __name__ = new __name__()');
  },
  report: function (node, report) {
    var name = node.nodes[0].value;
    var newNode = node.nodes[1];
    saveVar(node, name, newNode);
  }
});

/*
f = x.y.z;
f = require('foo');
*/
rules.push({
  type: 'assign',
  match: function (node) {
    return node.likeSource('__name__ = __name__') ||
           node.likeSource('__name__ = __dot__') ||
           node.likeSource('__name__ = require(__string__)');
  },
  report: function (node, report) {
    var name = node.nodes[1].value;
    var varNode = node.nodes[2];
    saveVar(node, name, varNode);
  }
});


/*
f = new Foo();
*/
rules.push({
  type: 'assign',
  match: function (node) {
    return node.likeSource('__name__ = new __name__()');
  },
  report: function (node, report) {
    var name = node.nodes[1].value;
    var newNode = node.nodes[2];
    saveVar(node, name, newNode);
  }
});

/*
a.b.c = function () {};
*/
rules.push({
  type: 'assign',
  match: function (node) {
    if (!node.likeSource('__dot__ = function () {}') &&
        !node.likeSource('__dot__ = function __name__() {}')) {
      return false;
    }
    return true;
  },
  report: function (node, report) {
    var nameSelector = node.nodes[1];
    var fnNode = node.nodes[2];
    saveVar(node, nameSelector, fnNode);
  }
});

/*
a.b.c = {};
*/
rules.push({
  type: 'assign',
  match: function (node) {
    if (!node.likeSource('__dot__ = {}')) {
      return false;
    }
    return true;
  },
  report: function (node, report) {
    var nameSelector = node.nodes[1];
    var objNode = node.nodes[2];
    saveVar(node, nameSelector, objNode);
  }
});

/*
a.b.c = x;
a.b.c = x.y.z;
a.b.c = require('foo');
a.b.c = require('foo').bar;
*/
rules.push({
  type: 'assign',
  match: function (node) {
    if (!node.likeSource('__dot__ = __name__') &&
        !node.likeSource('__dot__ = __dot__') &&
        !node.likeSource('__dot__ = require(__string__)')) {
      return false;
    }
    return true;
  },
  report: function (node, report) {
    var nameSelector = node.nodes[1];
    var varSelector = node.nodes[2];
    saveVar(node, nameSelector, varSelector);
  }
});

/*
a.b.c = new Foo();
*/
rules.push({
  type: 'assign',
  match: function (node) {
    if (!node.likeSource('__dot__ = new __name__()')) {
      return false;
    }
    return true;
  },
  report: function (node, report) {
    var nameSelector = node.nodes[1];
    var newNode = node.nodes[2];
    saveVar(node, nameSelector, newNode);
  }
});

/*
_.mixin(...)
*/
rules.push({
  type: 'call',
  match: function (node) {
    return node.likeSource('_.mixin()');
  },
  report: function (node, report) {
    if (node.nodes[1].nodes.length > 0) {
      var mixinArgNode = node.nodes[1].nodes[0];
      extendVar(node, '_', mixinArgNode);
    }
  }
});

/*
_(module).export(...)
*/
rules.push({
  type: 'call',
  match: function (node) {
    return node.likeSource('_(module).export()');
  },
  report: function (node, report) {
    var exportArgNodes = node.nodes[1].nodes;
    exportArgNodes.forEach(function (argNode, i) {
      if (argNode.type === 'name') {
        saveVar(node, ['exports', argNode.value], argNode);
      } else if (argNode.type === 'object') {
        argNode.nodes.forEach(function (propertyNode, i) {
          saveVar(node, ['exports', propertyNode.nodes[0].value], propertyNode.nodes[1]);
        });
      }
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
    var objName = argNodes[0].value;
    _(argNodes).each(function (argNode, i) {
      if (i > 0) {
        if (argNode.type === 'name') {
          var fnName = argNode.value;
          saveVar(node, [objName, fnName], argNode);
        } else if (argNode.type === 'object') {
          argNode.nodes.forEach(function (propertyNode, i) {
            var varNode = propertyNode.nodes[1];
            var exportName = propertyNode.nodes[0].value;
            saveVar(node, [objName, exportName], varNode);
          });
        }
      }
    });
  }
});

rules.push({
  type: 'end-file',
  report: function (node, report) {
    var exportsObj = node.item('var.module').properties.exports;
    node.item('globalScopeNode').item('var.' + node.item('fullPath'), exportsObj);
    return exportModule(exportsObj);
  }
});

rules.push({
  type: 'end-file',
  report: function (node, report) {
    var items = [];
    var classes = node.item('classes');
    _(classes).each(function (classDef, className) {
      var classVar = node.item('var.' + className);
      var groupName = node.item('module') + '.class.' + className;
      if (!report.item(groupName)) {
        report.add({
          type: 'class',
          key: groupName,
          name: className,
          groups: ['classes']
        });
      }
      var methods = classVar.properties.prototype.properties;
      _(methods).each(function (method, methodName) {
        items = items.concat(functionReportItems(method.node, method.value, methodName, {
          method: true,
          key: node.item('module') + '.class.' + className + '.' + methodName,
          groups: [groupName]
        }));
      });
    });
    return items;
  }
});

/*
Remove required files.
*/
rules.push({
  type: 'end-files',
  report: function (node, report) {
    var modulesToRemove = [];
    var moduleNames = report.item('modules').items.slice(0);
    _(moduleNames).each(function (moduleName) {
      var item = report.item(moduleName);
      if (item.required) {
        if (item.type === 'module') {
          modulesToRemove.push(moduleName);
        }
        report.remove(moduleName);
      }
    });
    _(report.items).each(function (item, key) {
      if (key.indexOf('.') >= 0) {
        var moduleName = key.substr(0, key.indexOf('.'));
        if (modulesToRemove.indexOf(moduleName) >= 0) {
          report.remove(key);
        }
      }
    });
  }
});

/*
Rename modules to package names.
*/
rules.push({
  type: 'end-files',
  report: function (node, report) {
    _(report.items).each(function (item, key) {
      if (item.package && item.package.name) {
        item.name = item.package.name;
      }
    });
  }
});

module.exports = rules;

// TESTS NEEDED
// literal prototypes
// a requires b
// export top-level function