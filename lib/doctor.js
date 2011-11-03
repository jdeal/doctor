#!/usr/bin/env node

var argv = require('optimist').argv;
var uglify = require('uglify-js');
var fs = require('fs');
//var traverse = require('traverse');
var util = require('util');
var async = require('async');

function isArray (obj) {
  if (typeof obj === 'undefined'){
    return false;
  }
  return Object.prototype.toString.call(obj) === '[object Array]';
}

function replaceComment(s,commentGroup,x,y,z,gap){
  return "$$__comment(\"" + commentGroup.replace(/\\/,"\\\\").replace(/\n/g,"\\n").replace(/"/g,"\\\"") + "\");" +
    ((gap && gap.length > 0) ? "$$__gap(\"" + gap.replace(/\\/,"\\\\").replace(/\n/g,"\\n").replace(/"/g,"\\\"") + "\");" : "");
}

function convertComments(source){
  /*jshint regexp: false */
  source = source.replace(/(\/\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+\/)(\s*\n\s*(\n\s*)+)?/g,replaceComment);
  //console.log(source);
  return source;
}

function indent(depth){
  return (new Array(depth + 1)).join("  ");
}

var simplifyArgs;

function simplifyFunction(array){
  var type = array[0];
  if (type.name){
    type = type.name;
  }
  var args = array.slice(1);
  args = simplifyArgs(args, type);
  return {type: type, nodes: args};
}

function valueNode(node){
  if (node.nodes.length > 1){
    throw new Error('value node can only have one value');
  }
  node.value = node.nodes[0];
  delete node.nodes;
}

function namesNode(node){
  var i;
  var nodes = node.nodes;
  for (i = 0; i < nodes.length; i++){
    if (typeof nodes[i] === 'string'){
      nodes[i] = {type: 'name', nodes: [nodes[i]]};
    }
  }
}

var aliasTypes = {
  num: 'number',
  defun: 'define'
}

function simplifyArgs(nodes, type){
  type = type || null;
  var i, j;
  for (i = 0; i < nodes.length; i++){
    var node = nodes[i];
    if (isArray(node)){
      if (type === 'var'){
        for (j = 0; j < node.length; j++){
          var varNode = node[j];
          node[j] = simplifyArgs(varNode, 'var-arg');
        //   var nameNode = {type: 'name', value: varNode[0]};
        //   node[j] = [nameNode, simplifyFunction(varNode[1]);
        }
      } else if (isArray(node[0])){
        nodes[i] = simplifyArgs(node);
      } else if (node.length > 0){
        node = simplifyFunction(node);
        nodes[i] = node;

        if (node.type === 'call' || node.type === 'dot'){
          namesNode(node);
        }

        if (node.type === 'name' || node.type === 'string' || node.type === 'num'){
          valueNode(node);
        }

        if (node.type in aliasTypes){
          node.type = aliasTypes[node.type];
        }

        switch (node.type){
          case 'stat':
            if (node.nodes.length === 0){
              delete nodes[i];
              i--;
            } else {
              var children = node.nodes;
              delete nodes[i];
              for (j = 0; j < children.length; j++){
                nodes.splice(i,0,children[j]);
                i++;
              }
            }
            break;
          case 'call':
            if (node.nodes[0].type && node.nodes[0].type === 'name'){
              var callName = node.nodes[0].value;
              if (callName === '$$__comment' || callName === '$$__gap'){
                node.type = callName.substr(4);
                node.value = node.nodes[1][0].value;
                delete node.nodes;
              }
            }
            break;
          case 'var':
            if (node.nodes.length === 1 && isArray(node.nodes[0])){
              node.nodes = node.nodes[0];
            }
            var childNodes = node.nodes;
            delete nodes[i];
            for (j = 0; j < childNodes.length; j++){
              var newVarNode = {type: 'var', nodes: [{name: childNodes[j][0]}, childNodes[j][1]]};
              nodes.splice(i,0,newVarNode);
              i++;
            }
            break;
          case 'assign':
            if (node.nodes[0] === true){
              delete node.nodes[0];
            }
            break;
        }
      }
    } else if (type === 'var-arg' && typeof node === 'string'){
      nodes[i] = {type: 'name', value: node};
    }
  }
  return nodes;
}

function simplify(nodes){
  simplifyArgs(nodes);
  return nodes || [];
}

function astFromFile(options, file, cb){
  fs.readFile(file, 'utf-8', function (err, source){
    source = convertComments(source);
    try {
      var raw = uglify.parser.parse(source, false, true);
      var ast = {type: "file", path: file, nodes: simplify(raw[1])};
      if (options.raw){
        ast.raw = uglify.parser.parse(source, false, true);
      }
      cb(null, ast);
    } catch (e) {
      cb(e);
    }
  });
}

function report(options, ast, cb){
  var functionReport = [];
  if (options.ast){
    return cb(null, {ast:ast, report:functionReport});
  } else {
    return cb(null, functionReport);
  }
}

function examine(options, cb){
  if (!isArray(options.files)){
    cb(new Error('must pass in array of files'));
  }
  var astList = [];
  function eachFile(file, cb){
    astFromFile(options, file, function (e, ast){
      if (e) return cb(e);
      astList.push(ast);
      cb(null);
    });
  }
  function finish(err){
    if (err) return cb(err);
    var ast = {type: 'files', nodes: astList};
    if (options.ast && !options.report){
      return cb(err, ast);
    }
    report(options, ast, cb);
  }
  async.forEach(options.files, eachFile, finish);
}



module.exports.examine = examine;