
var fs = require('fs');
var peg = require('pegjs');
var path = require('path');
var fs = require('fs');
var async = require('async');

var AstNode = require('./ast-node');
var u = require('./util');

var pegParsers = {};

/*
Walks a tree of AST nodes.
@param {AstNode|Object} node AST node to walk.
@param {String} node.type Each AST node needs a type.
@param {Array} [node.nodes] Each AST node can optionally have a list of nodes to recurse.
@param {Function} beforeCb Function to call before recursing into node.
@param {Function} afterCb Function to call after recursing into node.
*/
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

/*
Walks a tree of AST nodes.
@param {AstNode|Object} node AST node to walk.
@param {String} node.type Each AST node needs a type.
@param {Array} [node.nodes] Each AST node can optionally have a list of nodes to
recurse.
@param {Function} cb Function to call before and after recursing into node.
After recursing node, pseudo-node of type "end" will be passed to callback.
*/
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

/*
Takes a plain object representing a node, converts it to an AstNode and attaches
it to a parent in an AstNode tree.
@param {Object} node Plain object representing a node.
@param {String} node.type Type of the node.
@param {Array} [node.nodes] Child nodes that will also be converted.
@param {AstNode} parent Parent AstNode in the tree.
*/
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
Converts a node (and its descendants) into plain objects that can be serialized.
@param {AstNode} node Node to convert.
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

/*
Given doctor options and a file extension, retrieve an appropriate peg parser.
@param {Object} options Doctor options.
@param {String} extension File extension.
@param {Function} cb Function to call with peg parser.
*/
function pegParser(options, extension, cb) {
  (function (path, fs, async, u) {
    if (options.sync) {
      path = u.sync.path;
      fs = u.sync.fs;
      async = u.sync.async;
      u = u.sync;
    }

    if (typeof cb === 'undefined') {
      cb = extension;
      extension = null;
    }

    var grammarFiles = [];
    if (typeof options === 'string') {
      options = {grammar: options};
    }
    var grammar = options.grammar;
    if (typeof grammar === 'object') {
      if (grammar[extension]) {
        grammar = grammar[extension];
      }
    }
    if (typeof grammar !== 'string') {
      if (extension === 'js') {
        grammar = 'javascript';
      } else if (extension === 'md') {
        grammar = 'markdown';
      }
    }
    if (grammar) {
      grammarFiles.push(grammar);
      grammarFiles.push(path.join(__dirname, '../grammar', grammar + '.pegjs'));
    } else {
      grammarFiles.push(path.join(__dirname, '../grammar/javascript.pegjs'));
    }

    var parser = null;
    var parserGrammarFile = null;
    var grammarErr = null;

    function existsNewerCompiledGrammarFile(grammarFile, cb) {
      u.compareFileDates(grammarFile, grammarFile + '.js', function (c) {
        cb(c > 0);
      });
    }

    function findGrammarFile(grammarFile, cb) {
      if (pegParsers[grammarFile]) {
        parser = pegParsers[grammarFile];
        parserGrammarFile = grammarFile;
        return cb(true);
      }

      path.exists(grammarFile, function (exists) {
        if (!exists) {
          return cb(false);
        }
        existsNewerCompiledGrammarFile(grammarFile, function (existsCompiled) {
          if (existsCompiled) {
            var cachedParser;
            try {
              cachedParser = require(grammarFile + '.js');
            } catch (e) {
              // something wrong with compiled grammar, just write new one
            }
            if (cachedParser && cachedParser.parse) {
              parser = cachedParser;
              pegParsers[grammarFile] = parser;
              parserGrammarFile = grammarFile;
              return cb(true);
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
              parserGrammarFile = grammarFile;
              // cache the grammar for next time
            } catch (e) {
              grammarErr = e;
              return cb(true);
            }
            fs.writeFile(grammarFile + '.js', 'module.exports = ' + parser.toSource(), function (err) {
              if (err) {
                grammarErr = err;
              }
              return cb(true);
            });
          });
        });
      });
    }
    async.some(grammarFiles, findGrammarFile, function () {
      if (grammarErr || parser) {
        return cb(grammarErr, parser, parserGrammarFile);
      }
      cb(new Error('grammar file not found'));
    });
  }(path, fs, async, u));
}

/*
Add line numbers to ast nodes.
@param {Object|AstNode} ast Root AST node for file.
@param {String} source Source code for AST.
*/
function addLineNumbers(ast, source) {
  var i;
  var sourcePosition = 0;
  var sourceLine = 1;
  var sourceColumn = 1;
  var prevBreak = false;
  walk(ast, function (node) {
    if (typeof node.pos !== 'undefined') {
      if (node.pos < sourcePosition) {
        sourcePosition = 0;
        sourceLine = 1;
        sourceColumn = 1;
      }
      for (i = sourcePosition; i < node.pos; i++) {
        var c = source.charAt(i);
        if (c === "\n") {
          if (!prevBreak) {
            sourceLine++;
          }
          sourceColumn = 1;
          prevBreak = false;
        } else if (c === "\r" || c === "\u2028" || c === "\u2029") {
          sourceLine++;
          sourceColumn = 1;
          prevBreak = true;
        } else {
          sourceColumn++;
          prevBreak = false;
        }
      }
      node.line = sourceLine;
      node.column = sourceColumn;
      sourcePosition = i;
    }
  });
}

/*
Convert source code to an AST.
@param {Object} options Doctor options.
@param {String} source Source code.
@param {String} extension File extension for source file.
@param {Function} cb Function to call with AST.
*/
function astFromSource(options, source, extension, cb) {
  if (typeof cb === 'undefined') {
    cb = extension;
    extension = null;
  }
  pegParser(options, extension, function (err, parser, key) {
    if (err) {
      return cb(err);
    }
    var ast;
    try {
      ast = parser.parse(source);
      addLineNumbers(ast, source);
      if (ast.type === 'program') {
        ast.type = 'script';
      }
      ast.grammarFile = key;
      // adding in comment nodes, in case they get added to the grammar later
      walk(ast, function (node) {
        if (!node.comments && node.type !== 'undefined') {
          node.comments = [];
        }
      });
      //console.log(JSON.stringify(ast, null, 2));
    } catch (e) {
      return cb(e);
    }
    return cb(null, ast);
  });
}

/*
Convert file to AST.
@param {Object} options Doctor options.
@param {String} file File name.
@param {Function} cb Function to call with AST.
*/
function astFromFile(options, file, cb) {
  (function (fs) {
    if (options.sync) {
      fs = u.sync.fs;
    }

    function convertSourceFile(file, packageName, packagePath) {
      fs.readFile(file, 'utf-8', function (err, source) {
        if (err) {
          return cb(err);
        }
        var extension = path.extname(file);
        if (extension[0] === '.') {
          extension = extension.substr(1);
        }
        astFromSource(options, source, extension, function (err, ast) {
          if (err) {
            err.file = file;
            return cb(err);
          }
          if (packageName) {
            ast.package = {name: packageName, path: packagePath};
            if (packagePath[0] !== '/') {
              ast.package.path = path.join(process.cwd(), packagePath);
            }
            ast.package.originalPath = packagePath;
          }
          ast.originalPath = file;
          if (file[0] === '/') {
            ast.path = file;
          } else {
            ast.path = path.join(process.cwd(), file);
          }
          return cb(null, ast);
        });
      });
    }

    function convertPackage() {
      if (path.basename(file) === 'package.json') {
        fs.readFile(file, 'utf-8', function (err, pkgString) {
          try {
            var pkg = JSON.parse(pkgString);
            if (!pkg.main) {
              return cb(new Error(file + " has no main modules."));
            }
            var main = path.join(path.dirname(file), pkg.main);
            if (!main.match(/\.js$/)) {
              main = main + '.js';
            }
            convertSourceFile(main, pkg.name, file);
          } catch (packageParseError) {
            packageParseError.message = 'Error parsing ' + file + ' - ' + packageParseError.message;
            return cb(packageParseError);
          }
        });
      } else {
        convertSourceFile(file, null);
      }
    }

    convertPackage();

  }(fs));
}

/*
Prepare rules from one or more rules files so they fire correctly.
@param {Array|String} rules One or more names of rules modules.
@param {String} defaultDir Default location for rules modules.
*/
function prepareRules(rules, defaultDir) {
  rules = u.findRules(rules, defaultDir);
  var typeToRules = {'end': []};
  var anyRules = [];

  rules.forEach(function (rule) {
    var ruleTypes = rule.type || [];
    ruleTypes = Array.isArray(ruleTypes) ? ruleTypes : [ruleTypes];
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

  return typeToRules;
}

/*
Walk a tree of AST nodes and apply rules.
@param {Object} options Doctor options.
@param {Array|String} rules One or more rules file names.
@param {String} defaultDir Default location for rules modules.
@param {AstNode} ast Root of AST.
@param {Function} nodeCb Function to call for each node.
@param {Function} finalCb Function to call when finished walking.
*/
function walkWithRules(options, rules, defaultDir, ast, nodeCb, finalCb) {
  var typeToRules;
  try {
    typeToRules = prepareRules(rules, defaultDir);
  } catch (e) {
    return finalCb(e);
  }

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

  try {
    walkEnd(ast, eachNode);
    delete options._walkQueue;
  } catch (e) {
    return finalCb(e);
  }

  finalCb(null, ast);

}

/*
Convert a node to a lisp-like string, useful for debugging rules.
@param {AstNode|Object} AST node to lispify.
*/
function lispify(node) {
  if (!('value' in node) && !node.nodes) {
    return '(' + node.type + ')';
  }
  if ('value' in node) {
    return '(' + node.type + ' ' + JSON.stringify(node.value) + ')';
  }
  var buffer = ['(' + node.type];
  node.nodes.forEach(function (childNode, i) {
    buffer.push(' ' + lispify(childNode));
  });
  buffer.push(')');
  return buffer.join('');
}

/*
Determine whether a node represents a primitive value.
@param {AstNode|Object} AST node to test.
*/
function isValueNode(node) {
  if (!('nodes' in node)) {
    return true;
  }
  return false;
}

/*
Determine if a node is "like" another node, meaning it has all the properties of
that node.
@param {AstNode|Object} a Node to test for comparison. Must have all the
properties of node b.
@param {AstNode|Object} b Node that has a partial set of node a's properties.
*/
function like(a, b) {
  if (a.type === 'var' && b.type === 'vars') {
    if (b.nodes.length === 1) {
      b = b.nodes[0];
    }
  }
  // allow wildcards
  if (b.type === 'name' &&
       (b.value === ('__' + a.type + '__') || b.value === '__any__')) {
    return true;
  }
  if (a.type !== b.type) {
    return false;
  }
  if (a.value !== b.value) {
    // if (b.type === 'name' && b.value === '__name__') {
    //   return true;
    // }
    return false;
  }
  if (isValueNode(a) !== isValueNode(b)) {
    return false;
  }
  if (!isValueNode(a)) {
    if (a.nodes.length < b.nodes.length) {
      return false;
    }
    for (var i = 0; i < b.nodes.length; i++) {
      if (!like(a.nodes[i], b.nodes[i])) {
        return false;
      }
    }
  }
  return true;
}

/*
Fills a diff object with line and column of unmatching nodes.
@param {AstNode} a Example node.
@param {AstNode} b Node that should have a's properties.
*/
function equalDiff(a, b, diff) {
  diff.a = {
    line: a.line,
    column: a.column
  };
  diff.b = {
    line: b.line,
    column: b.column
  };
  return false;
}

/*
Tests two AST nodes for equality.
@param {AstNode} a Example node.
@param {AstNode} b Node that should match a's properties.
*/
function equal(a, b, diff) {
  diff = diff || {};
  if (a.type !== b.type) {
    return equalDiff(a, b, diff);
  }
  if (a.value !== b.value) {
    return equalDiff(a, b, diff);
  }
  if (isValueNode(a) !== isValueNode(b)) {
    return equalDiff(a, b, diff);
  }
  if (!isValueNode(a)) {
    if (a.nodes.length !== b.nodes.length) {
      return equalDiff(a, b, diff);
    }
    for (var i = 0; i < b.nodes.length; i++) {
      if (!equal(a.nodes[i], b.nodes[i], diff)) {
        return false;
      }
    }
  }
  return true;
}

/*
Return the PEG parser for a given grammar file.
@param {String} grammarFile Name of grammar file.
*/
function parserForGrammar(grammarFile) {
  if (grammarFile in pegParsers) {
    return pegParsers[grammarFile];
  }
  return null;
}

exports.walk = walk;
exports.walkEnd = walkEnd;
exports.extendAst = extendAst;
exports.cleanAst = cleanAst;
exports.astFromFile = astFromFile;
exports.astFromSource = astFromSource;
exports.walkWithRules = walkWithRules;
exports.pegParser = pegParser;
exports.lispify = lispify;
exports.like = like;
exports.equal = equal;
exports.parserForGrammar = parserForGrammar;
