var argv = require('optimist').argv;
var uglify = require('uglify-js');
var fs = require('fs');
var traverse = require('traverse');
var async = require('async');
var path = require('path');

var report = require('./report');
var isArray = require('./util').isArray;

function replaceComment(s, commentGroup, x, y, z, gap) {
  return "$$__comment(\"" + commentGroup.replace(/\\/, "\\\\").replace(/\n/g, "\\n").replace(/"/g, "\\\"") + "\");" +
  ((gap && gap.length > 0) ? "$$__gap(\"" + gap.replace(/\\/, "\\\\").replace(/\n/g, "\\n").replace(/"/g, "\\\"") + "\");" : "");
}

function convertComments(source) {
  /*jshint regexp: false */
  source = source.replace(/(\/\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+\/)(\s*\n\s*(\n\s*)+)?/g, replaceComment);
  //console.log(source);
  return source;
}

function indent(depth) {
  return (new Array(depth + 1)).join("  ");
}

var aliasTypes = {
  num: 'number',
  defun: 'define'
};

var simplifyArgs;

function simplifyFunction(array) {
  var type = array[0];
  if (type.name) {
    type = type.name;
  }
  if (type in aliasTypes) {
    type = aliasTypes[type];
  }
  var args = array.slice(1);
  return {type: type, nodes: simplifyArgs(args, type)};
}

function valueNode(node) {
  if (node.nodes.length > 1) {
    throw new Error('value node can only have one value');
  }
  if (node.nodes[0].value){
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

var nameArgs = {
  'var-arg': true,
  'define': true,
  'dot': true
};

function simplifyArgs(nodes, type) {
  type = type || null;
  var newNodes = [];

  nodes.forEach(function (node) {
    if (isArray(node)) {
      if (type === 'var') {
        node.forEach(function (varNode) {
          newNodes.push(simplifyArgs(varNode, 'var-arg'));
        });
      } else if (isArray(node[0])) {
        newNodes.push(simplifyArgs(node));
      } else if (node.length > 0) {
        node = simplifyFunction(node);
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
    source = convertComments(source);
    try {
      var raw = uglify.parser.parse(source, false, true);
      var ast = {type: "file", path: file, nodes: simplify(raw[1])};
      if (options.raw) {
        ast.raw = uglify.parser.parse(source, false, true);
      }
      cb(null, ast);
    } catch (e) {
      cb({message: e.message, line: e.line, col: e.col, pos: e.pos, file: file});
    }
  });
}

function findParentNode(context) {
  if (context.parent) {
    if (context.parent.node.type) {
      return context.parent.node;
    } else {
      return findParentNode(context.parent);
    }
  }
  return null;
}

function extendNodeForReport(node, index, parent) {
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
        extendNodeForReport(childNode, i, node);
      }
    });
  }
}

function examine(options, cb) {
  if (!isArray(options.files)) {
    cb(new Error('must pass in array of files'));
  }
  if (!options.output) {
    cb(new Error('must specify an output directory'));
  }
  var outputDir = path.dirname(options.output);
  var outputPath = options.output;
  if (path.extname(options.output) !== '.json') {
    outputDir = options.output;
    outputPath = path.join(outputDir, 'report.json');
  }
  var astList = [];
  function eachFileAst(file, cb) {
    astFromFile(options, file, function (e, ast) {
      if (e) {
        return cb(e);
      }
      astList.push(ast);
      cb(null);
    });
  }
  function writeOutput(result) {
    fs.writeFile(outputPath, JSON.stringify(result, null, 2), function (err) {
      cb(err, result);
    });
  }
  function finishAst(err) {
    if (err) {
      return cb(err);
    }
    var ast = {type: 'files', nodes: astList};
    extendNodeForReport(ast);
    if (options.ast && !options.report) {
      return writeOutput(ast, cb);
    }
    report(options, ast, function (err, result) {
      if (err) {
        return cb(err);
      }
      return writeOutput(result);
    });
  }
  path.exists(outputDir, function (exists) {
    if (!exists) {
      cb(new Error('output directory ' + outputDir + ' does not exist'));
    }
    async.forEach(options.files, eachFileAst, finishAst);
  });
}

module.exports.examine = examine;