var fs = require('fs');

var parser = require('./fork/parse-js');

var isArray = require('./util').isArray;
var findRules = require('./util').findRules;

var AstNode = require('./AstNode');

function walk(node, beforeCb, afterCb) {
  if (node.type) {
    beforeCb(node);
  }
  if (node.nodes) {
    // copying in case the list changes
    var copyNodes = node.nodes.slice(0);
    copyNodes.forEach(function (childNode) {
      walk(childNode, beforeCb, afterCb);
    });
  }
  if (node.type) {
    if (typeof afterCb === 'function') {
      afterCb(node);
    }
  }
}

function walkEnd(node, cb) {
  walk(node,
    function (node) {
      cb(node);
    },
    function (node) {
      if (node.nodes) {
        cb({type: 'end', node: node});
      }
    }
  );
}

function extendAst(node, parent) {
  node = new AstNode(node);

  node.parent = parent || null;
  node.prev = null;
  node.next = null;

  if (node.nodes) {
    var children = node.nodes;
    node.nodes = [];
    children.forEach(function (childNode, i) {
      if (childNode.type) {
        node.nodes.push(extendAst(childNode, node));
      } else {
        node.nodes.push(childNode);
      }
    });

    node.nodes.forEach(function (childNode, i) {
      if (childNode.type) {
        if (i > 0) {
          childNode.prev = node.nodes[i - 1];
        }
        if (i < node.nodes.length) {
          childNode.next = node.nodes[i + 1];
        }
      }
    });
  }

  return node;
}

/*
function extendAst(node, index, parent) {
  node.parent = parent || null;
  node.prev = null;
  node.next = null;
  node._items = {};
  node.item = nodeItem;
  node.append = nodeAppend;
  node.after = nodeAfter;

  if (parent && index > 0) {
    node.prev = parent.nodes[index - 1];
  }
  if (parent && index < parent.nodes.length - 1) {
    node.next = parent.nodes[index + 1];
  }
  if (node.nodes) {
    node.nodes.forEach(function (childNode, i) {
      if (childNode.type) {
        extendAst(childNode, i, node);
      }
    });
  }
  return node;
}
*/
/*
function cleanAst(ast) {

  walk(ast, function (node) {

    if (typeof node.parent !== 'undefined') {
      delete node.parent;
    }
    if (typeof node.prev !== 'undefined') {
      delete node.prev;
    }
    if (typeof node.next !== 'undefined') {
      delete node.next;
    }
    if (typeof node._items !== 'undefined') {
      delete node._items;
    }
    if (typeof node.item !== 'undefined') {
      delete node.item;
    }
    if (typeof node.append !== 'undefined') {
      delete node.append;
    }
  });
}
*/

function cleanAst(node) {
  var copy = {};

  Object.keys(node).forEach(function (key, i) {
    if (key !== 'parent' && key !== 'prev' && key !== 'next' && key !== '_items') {
      copy[key] = node[key];
    }
  });

  node = copy;

  if (node.nodes) {
    var children = node.nodes;
    node.nodes = [];
    children.forEach(function (childNode, i) {
      if (childNode.type) {
        node.nodes.push(cleanAst(childNode));
      } else {
        node.nodes.push(childNode);
      }
    });
  }

  return node;
}

function moveGapAfterComment(s, commentGroup, x, y, z, gap) {
  return commentGroup.replace('*/', '{{__gap__}}*/');
}

function moveGapsAfterComments(source) {
  /*jshint regexp: false */
  source = source.replace(/(\/\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+\/)(\s*\n(\s*\n)+)/g, moveGapAfterComment);
  //console.log(source);
  return source;
}

var aliasTypes = {
  num: 'number',
  defun: 'define',
  sub: 'subscript'
};

var simplifyArgs;

function simplifyFunction(array, comments) {
  var type = array[0];
  if (type.name) {
    type = type.name;
  }
  if (type in aliasTypes) {
    type = aliasTypes[type];
  }
  var args = array.slice(1);
  return {type: type, nodes: simplifyArgs(args, type, comments)};
}

function valueNode(node) {
  if (node.nodes.length > 1) {
    throw new Error('value node can only have one value');
  }
  if ('value' in node.nodes[0]) {
    node.value = node.nodes[0].value;
  } else {
    node.value = node.nodes[0];
  }
  delete node.nodes;
}

// function namesNode(node) {
//   var i;
//   var nodes = node.nodes;
//   for (i = 0; i < nodes.length; i++) {
//     if (typeof nodes[i] === 'string') {
//       nodes[i] = {type: 'name', nodes: [nodes[i]]};
//     }
//   }
// }

function maybeValueName(node) {
  if (node.type === 'name') {
    if (node.value === 'null') {
      node.type = 'null';
      node.value = null;
    } else if (node.value === 'true') {
      node.type = 'boolean';
      node.value = true;
    } else if (node.value === 'false') {
      node.type = 'boolean';
      node.value = false;
    }
  }
  return node;
}

function parseCommentNode(node) {
  var m;
  var rawText = node.value;
  if (node.multiline) {
    rawText = '  ' + rawText;
  }
  var text = rawText.replace(/^(\s*\**\n)+/, '');
  text = text.replace(/\n\s*\*+/g, '\n');
  text = text.replace(/^\s*\*+/, '');
  m = text.match(/^\s+/);
  if (m) {
    var lines = text.split('\n');
    var buffer = [];
    var tabRe = new RegExp('\\s{0,' + m[0].length + '}');
    lines.forEach(function (line, i) {
      m = line.match(tabRe);
      if (m) {
        line = line.substr(m[0].length);
        line = line.replace(/\s*$/, '');
        if (!line.match(/^\s*$/)) {
          buffer.push(line);
        }
      }
    });
    text = buffer.join('\n');
  }
  node.text = text;
}

var nameArgsSet = {
  'var-arg': true,
  'define': true,
  'define-arg': true,
  'function': true,
  'function-arg': true,
  'dot': true
};

var listArgsSet = {
  'define': true,
  'function': true,
  'object-arg': true
};

var listTypes = {
  'define': 'nodes',
  'function': 'nodes',
  'object-arg': 'field',
  'block': 'nodes'
};

function simplifyArgs(nodes, type, comments) {
  type = type || null;
  // track comments already found
  comments = comments || {};
  var newNodes = [];

  nodes.forEach(function (node, nodeIndex) {
    if (isArray(node)) {
      if (node.length > 0 && node[0].start && node[0].start.comments_before) {
        node[0].start.comments_before.forEach(function (comment, i) {
          if (!(comment.pos in comments)) {
            var commentValue = comment.value;
            var commentNode = {type: 'comment'};
            if (commentValue.indexOf('{{__gap__}}') >= 0) {
              commentValue = commentValue.replace('{{__gap__}}', '');
              commentNode.gap = true;
            }
            commentNode.value = commentValue;
            if (comment.type === 'comment2') {
              commentNode.multiline = true;
            }
            parseCommentNode(commentNode);
            commentNode.position = comment.pos;
            newNodes.push(commentNode);
            comments[comment.pos] = comment;
          }
        });
      }

      if (type === 'var') {
        node.forEach(function (varNode) {
          newNodes.push(simplifyArgs(varNode, 'var-arg', comments));
        });
      } else if (node.length === 0 || isArray(node[0]) || type in listTypes) {
        var listArgs = simplifyArgs(node, type + '-arg', comments);
        if (type === 'object-arg') {
          if (listArgs[0].type === 'string') {
            listArgs[0].type = 'key';
          }
        }
        var listNode = {type: listTypes[type] || 'nodes', nodes: listArgs};
        newNodes.push(listNode);
      } else if (node.length > 0) {
        node = simplifyFunction(node, comments);
        newNodes.push(node);

        // if (node.type === 'call' || node.type === 'dot') {
        //   namesNode(node);
        // }

        // if (node.type === 'name' || node.type === 'string' || node.type === 'number') {
        //   valueNode(node);
        // }

        switch (node.type) {
        case 'stat':
          newNodes.pop();
          if (node.nodes.length > 0) {
            node.nodes.forEach(function (childNode) {
              newNodes.push(childNode);
            });
          }
          break;
        case 'object':
        case 'block':
          node.nodes = node.nodes[0].nodes;
          break;
        // case 'call':
        //   if (node.nodes[0].type && node.nodes[0].type === 'name') {
        //     var callName = node.nodes[0].value;
        //     if (callName === '$$__comment' || callName === '$$__gap') {
        //       node.type = callName.substr(4);
        //       node.value = node.nodes[1][0].value;
        //       delete node.nodes;
        //     }
        //   }
        //   break;
        case 'var':
          newNodes.pop();
          node.nodes.forEach(function (childNode) {
            var newVarNode = {type: 'var', nodes: childNode};
            newNodes.push(newVarNode);
          });
          break;
        case 'assign':
          if (node.nodes[0].value === true) {
            node.nodes = node.nodes.slice(1);
          }
          break;
        case 'name':
        case 'string':
        case 'number':
          valueNode(node);
          maybeValueName(node);
          break;
        }
      }
    } else if (type in nameArgsSet && typeof node === 'string') {
      newNodes.push(maybeValueName({type: 'name', value: node}));
    } else {
      if (node === null) {
        newNodes.push({type: 'undefined', value: undefined});
      } else {
        newNodes.push({type: typeof node, value: node});
      }
    }
  });
  return newNodes;
}

function simplify(nodes) {
  if (!isArray(nodes)) {
    throw new Error('ast must be an array');
  }
  return simplifyArgs(nodes);
}

function astFromFile(options, file, cb) {
  fs.readFile(file, 'utf-8', function (err, source) {
    source = moveGapsAfterComments(source);
    try {
      var raw = parser.parse(source, false, true);
      var ast = {type: "file", path: file, nodes: simplify(raw[1])};
      if (options.raw) {
        ast.raw = parser.parse(source, false, true);
      }
      cb(null, ast);
    } catch (e) {
      cb({message: e.message, line: e.line, col: e.col, pos: e.pos, file: file});
    }
  });
}

function walkWithRules(options, defaultRules, ast, nodeCb, finalCb) {
  try {
    var rules = findRules(options, defaultRules);
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

    walkEnd(ast, function (node) {
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

        nodeCb(node, rule);
      }
    });
    finalCb(null, ast);
  } catch (e) {
    finalCb(e);
  }
}

exports.walk = walk;
exports.walkEnd = walkEnd;
exports.extendAst = extendAst;
exports.cleanAst = cleanAst;
exports.astFromFile = astFromFile;
exports.walkWithRules = walkWithRules;