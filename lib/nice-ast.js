var fs = require('fs');
var peg = require('pegjs');
var path = require('path');
var fs = require('fs');
var async = require('async');

var isArray = require('./util').isArray;
var findRules = require('./util').findRules;
var compareFileDates = require('./util').compareFileDates;

var AstNode = require('./AstNode');

var pegParsers = {};

function walk(node, beforeCb, afterCb) {
  if (node._removed) {
    return;
  }
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
    //console.log(node)
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
            commentNode.value = '/*' + commentValue + '*/';
            if (comment.type === 'comment2') {
              commentNode.multiline = true;
            }
            //parseCommentNode(commentNode);
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

function pegParser(options, cb) {
  var grammarFiles = [];
  if (typeof options === 'string') {
    options = {grammar: options};
  }
  if (options.grammar) {
    grammarFiles.push(options.grammar);
    grammarFiles.push(path.join(__dirname, 'grammar', options.grammar + '.pegjs'));
  } else {
    grammarFiles.push(path.join(__dirname, 'grammar/javascript.pegjs'));
  }
  var parser = null;
  var grammarErr = null;

  function existsNewerCompiledGrammarFile(grammarFile, cb) {
    compareFileDates(grammarFile, grammarFile + '.js', function (c) {
      cb(c > 0);
    });
  }

  function findGrammarFile(grammarFile, cb) {

    if (pegParsers[grammarFile]) {
      parser = pegParsers[grammarFile];
      return cb(true);
    }

    path.exists(grammarFile, function (exists) {
      if (!exists) {
        return cb(false);
      }
      existsNewerCompiledGrammarFile(grammarFile, function (existsCompiled) {
        if (existsCompiled) {
          try {
            var cachedParser = require(grammarFile + '.js');
            if (cachedParser.parse) {
              parser = cachedParser;
              pegParsers[grammarFile] = parser;
              return cb(true);
            }
          } catch (e) {
            // something wrong with compiled grammar, just write new one
          }
        }
        fs.readFile(grammarFile, 'utf-8', function (err, data) {
          if (err) {
            grammarErr = err;
            return cb(true);
          }
          try {
            parser = peg.buildParser(data);
            pegParsers[grammarFile] = parser;
            // cache the grammar for next time
            fs.writeFile(grammarFile + '.js', 'module.exports = ' + parser.toSource());
          } catch (e) {
            grammarErr = e;
          }
          return cb(true);
        });
      });
    });
  }
  async.some(grammarFiles, findGrammarFile, function () {
    if (grammarErr || parser) {
      return cb(grammarErr, parser);
    }
    cb(new Error('grammar file not found'));
  });
}

function astFromFile(options, file, cb) {
  fs.readFile(file, 'utf-8', function (err, source) {
    //mangleSource(source);
    //source = moveGapsAfterComments(source);

    if (err) {
      return cb(err);
    }

    pegParser(options, function (err, parser) {
      if (err) {
        return cb(err);
      }
      try {
        var ast = parser.parse(source);
        ast.type = 'file';
        ast.path = file;
        //console.log(JSON.stringify(ast, null, 2));
        return cb(null, ast);
      } catch (e) {
        e.file = file;
        return cb(e);
      }
    });

    /*
    try {
      pegParser(options, function (err, parser) {
        if (err) {
          Object.keys(err).forEach(function (key, i) {
            console.log(key + ': ' + err[key]);
          });
          return;
        }
        var ast = parser.parse(source);
        console.log("ast");
        console.log(JSON.stringify(ast, null, 2));
      });

      var raw = parser.parse(source, false, true);
      var ast = {type: "file", path: file, nodes: simplify(raw[1])};
      if (options.raw) {
        ast.raw = parser.parse(source, false, true);
      }
      cb(null, ast);
    } catch (e) {
      cb({message: e.message, line: e.line, col: e.col, pos: e.pos, file: file});
    }*/
  });
}

function walkWithRules(options, defaultRules, ast, nodeCb, finalCb) {
  try {
    var rules = findRules(options, defaultRules);
    var typeToRules = {'end': []};
    var anyRules = [];

    rules.forEach(function (rule) {
      var ruleTypes = rule.type || [];
      ruleTypes = isArray(ruleTypes) ? ruleTypes : [ruleTypes];
      if (ruleTypes.length === 0) {
        ruleTypes.push('');
      }
      ruleTypes.forEach(function (ruleType) {
        if (ruleType === '') {
          anyRules.push(rule);
          // add this any rule to then end of any typed rule lists
          Object.keys(typeToRules).forEach(function (key) {
            if (key !== 'end') {
              typeToRules[key].push(rule);
            }
          });
        } else {
          if (!(ruleType in typeToRules)) {
            typeToRules[ruleType] = [];
            if (ruleType !== 'end') {
              // put all preceding any rules first
              typeToRules[ruleType] = [].concat(anyRules);
            }
          }
          typeToRules[ruleType].push(rule);
        }
      });
    });

    typeToRules[''] = anyRules;

    options._walkQueue = [];

    function eachNode(node, queue) {
      //node = wrapNode(node, this);

      var nodeType = node.type;
      var isEndNode = false;
      if (nodeType === 'end') {
        isEndNode = true;
        nodeType = nodeType + '-' + node.node.type;
        node = node.node;
      }
      var ruleType = (nodeType in typeToRules) ? nodeType : '';
      if (ruleType === '' && isEndNode) {
        ruleType = 'end';
      }
      var rules = typeToRules[ruleType];

      for (var i = 0; i < rules.length; i++) {
        var rule = rules[i];

        if (typeof rule.match === 'function') {
          if (!rule.match(node)) {
            continue;
          }
        }
        nodeCb(node, rule);
      }

      if (!queue) {
        while (options._walkQueue.length > 0) {
          var nextNode = options._walkQueue.splice(0, 1)[0];
          eachNode(nextNode, true);
        }
      }
    }

    walkEnd(ast, eachNode);

    delete options._walkQueue;

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
exports.pegParser = pegParser;