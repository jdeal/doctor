var fs = require('fs');

var parser = require('./fork/parse-js');

var isArray = require('./util').isArray;

function walk(node, beforeCb, afterCb) {
  beforeCb(node);
  if (node.nodes) {
    node.nodes.forEach(function (childNode) {
      walk(childNode, beforeCb, afterCb);
    });
  }
  if (typeof afterCb === 'function') {
    afterCb(node);
  }
}

function copyExtendAst(node, index, parent) {

  var copy = {};
  Object.keys(node).forEach(function (key, i) {
    copy[key] = node[key];
  });

  node = copy;

  node.parent = parent || null;
  node.prev = null;
  node.next = null;
  if (parent && index > 0) {
    node.prev = parent.nodes[index - 1];
  }
  if (parent && index < parent.nodes.length - 1) {
    node.next = parent.nodes[index + 1];
  }
  if (node.nodes) {
    var children = node.nodes;
    node.nodes = [];
    children.forEach(function (childNode, i) {
      if (childNode.type) {
        node.nodes.push(copyExtendAst(childNode, i, node));
      } else {
        node.nodes.push(childNode);
      }
    });
  }

  return node;
}

function extendAst(node, index, parent) {
  node.parent = parent || null;
  node.prev = null;
  node.next = null;
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
  });
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
  defun: 'define'
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
  if (node.nodes[0].value) {
    node.value = node.nodes[0].value;
  } else {
    node.value = node.nodes[0];
  }
  delete node.nodes;
}

function namesNode(node) {
  var i;
  var nodes = node.nodes;
  for (i = 0; i < nodes.length; i++) {
    if (typeof nodes[i] === 'string') {
      nodes[i] = {type: 'name', nodes: [nodes[i]]};
    }
  }
}

function parseCommentNode(node) {
  var rawText = node.value;
  var text = rawText.replace(/^\s*\*+/, '');
  text = text.replace(/\n\s*\*+/g, '\n');
  if (text.match(/^\s*\n/)) {
    text = text.replace(/^\s*\n/, '');
  }
  var m = text.match(/^\s+/);
  if (m) {
    var lines = text.split('\n');
    var buffer = [];
    var tabRe = new RegExp('\\s{0,' + m[0].length + '}');
    lines.forEach(function (line, i) {
      m = line.match(tabRe);
      if (m) {
        line = line.substr(m[0].length);
        if (!line.match(/^\s*$/)) {
          buffer.push(line);
        }
      }
    });
    text = buffer.join('\n');
  }
  node.text = text;
}

var nameArgs = {
  'var-arg': true,
  'define': true,
  'dot': true
};

function simplifyArgs(nodes, type, comments) {
  type = type || null;
  // track comments already found
  comments = comments || {};
  var newNodes = [];

  nodes.forEach(function (node) {
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
            newNodes.push(commentNode);
            comments[comment.pos] = comment;
          }
        });
      }

      if (type === 'var') {
        node.forEach(function (varNode) {
          newNodes.push(simplifyArgs(varNode, 'var-arg', comments));
        });
      } else if (isArray(node[0])) {
        newNodes.push(simplifyArgs(node, type, comments));
      } else if (node.length > 0) {
        node = simplifyFunction(node, comments);
        newNodes.push(node);

        if (node.type === 'call' || node.type === 'dot') {
          namesNode(node);
        }

        if (node.type === 'name' || node.type === 'string' || node.type === 'number') {
          valueNode(node);
        }

        switch (node.type) {
        case 'stat':
          newNodes.pop();
          if (node.nodes.length > 0) {
            node.nodes.forEach(function (childNode) {
              newNodes.push(childNode);
            });
          }
          break;
        case 'call':
          if (node.nodes[0].type && node.nodes[0].type === 'name') {
            var callName = node.nodes[0].value;
            if (callName === '$$__comment' || callName === '$$__gap') {
              node.type = callName.substr(4);
              node.value = node.nodes[1][0].value;
              delete node.nodes;
            }
          }
          break;
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
        }
      }
    } else if (type in nameArgs && typeof node === 'string') {
      newNodes.push({type: 'name', value: node});
    } else {
      newNodes.push({type: typeof node, value: node});
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

exports.walk = walk;
exports.extendAst = extendAst;
exports.cleanAst = cleanAst;
exports.astFromFile = astFromFile;