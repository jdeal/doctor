var argv = require('optimist').argv;
//var parser = require('uglify-js').parser;
var parser = require('./fork/parse-js');
var fs = require('fs');
//var traverse = require('traverse');
var async = require('async');
var path = require('path');
var ncp = require('ncp').ncp;

var report = require('./report');
var isArray = require('./util').isArray;
var copyDir = require('./util').copyDir;

function replaceComment(s, commentGroup, x, y, z, gap) {
  return " $$__comment(\"" + commentGroup.replace(/\\/, "\\\\").replace(/\n/g, "\\n").replace(/"/g, "\\\"") + "\"); ";
}

function convertComments(source) {
  /*jshint regexp: false */
  source = source.replace(/(\/\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+\/)(\s*\n(\s*\n)+)/g, replaceComment);
  //console.log(source);
  return source;
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

// function replaceGaps(s) {
//   return '\n$$__gap("' + s.replace(/\n/g, '\\n') + '");\n';
// }

// function convertGaps(source) {
//   source = source.replace(/\s*\n(\s*\n)+\s*/g, replaceGaps);
//   return source;
// }

function indent(depth) {
  return (new Array(depth + 1)).join("  ");
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
    //source = convertComments(source);
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
        node.nodes.push(extendNodeForReport(childNode, i, node));
      } else {
        node.nodes.push(childNode);
      }
    });
  }

  return node;
}

function examine(options, cb) {
  if (!isArray(options.files)) {
    cb(new Error('must pass in array of files'));
  }
  if (!options.output) {
    cb(new Error('must specify an output directory'));
  }
  var outputDir = path.dirname(options.output);
  var outputReportName = null;
  if (path.extname(options.output) === '.json') {
    outputReportName = path.basename(options.output);
  } else {
    outputDir = options.output;
    if (!options.render) {
      outputReportName = 'report.json';
    }
  }
  var astList = [];
  var done = false;
  async.waterfall([
    function checkOutputDir(cb) {
      path.exists(outputDir, function (exists) {
        if (!exists) {
          return cb(new Error('output directory ' + outputDir + ' does not exist'));
        }
        cb(null);
      });
    },
    function copyView(cb) {
      if (!options.view) {
        return cb(null);
      }
      ncp(options.view, outputDir, cb);
    },
    function getAst(cb) {
      async.forEach(options.files, function (file, cb) {
        astFromFile(options, file, function (e, ast) {
          if (e) {
            return cb(e);
          }
          astList.push(ast);
          cb(null);
        });
      }, cb);
    },
    function gotAst(cb) {
      var ast = {type: 'files', nodes: astList};
      cb(null, ast);
    },
    function makeReport(ast, cb) {
      if (!options.report) {
        return cb(null, {ast: ast, report: null});
      }
      var extendedAst = extendNodeForReport(ast);
      report(options, extendedAst, function (err, report) {
        if (err) {
          return cb(err);
        }
        cb(null, {ast: ast, report: report});
      });
    },
    function render(result, cb) {
      result.files = {};
      if (!result.report) {
        return cb(null, result);
      }
      if (outputReportName) {
        try {
          // if circular references were introduced, this will fail
          var fileString = JSON.stringify(result.report, null, 2);
          result.files[outputReportName] = fileString;
        } catch (jsonError) {
          return cb(jsonError);
        }
      }
      if (options.render) {
        var r;
        try {
          r = options.render;
          if (typeof r === 'string') {
            r = require(path.join(process.cwd(), r));
          }
          if (typeof r !== 'function') {
            r = render.render;
          }
        } catch (rendererError) {
          return cb(rendererError);
        }
        r(options, result.report, function (err, files) {
          Object.keys(files).forEach(function (file, i) {
            result.files[file] = files[file];
          });
          cb(null, result);
        });
      } else {
        cb(null, result);
      }
    },
    function writeOutput(result, cb) {
      function writeFile(file, cb) {
        fs.writeFile(path.join(outputDir, file), result.files[file], function (err) {
          cb(err);
        });
      }
      async.forEach(Object.keys(result.files), writeFile, function (err) {
        cb(err, result);
      });
    }
  ],
  function (err, result) {
    if (err) {
      return cb(err);
    }
    if (!options.ast && !options.render) {
      result = result.report;
    } else if (!options.ast) {
      result = {report: result.report, files: result.files};
    } else if (!options.render) {
      result = {ast: result.ast, report: result.report};
    }
    cb(null, result);
  });
}

module.exports.examine = examine;