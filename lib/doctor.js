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
  return "$$__comment(\"" + commentGroup.replace(/\\/,"\\\\").replace(/\n/g,"\\n").replace(/"/,"\"") + "\");" +
    ((gap && gap.length > 0) ? "$$__gap(\"" + gap.replace(/\\/,"\\\\").replace(/\n/g,"\\n").replace(/"/,"\"") + "\");" : "");
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

function simplify(nodes){
  var i, j;

  for (i = 0; i < nodes.length; i++){
    var node = nodes[i];
    if (isArray(node)){
      if (typeof node[0] === 'object' && node[0].name){
        nodes[i] = {type: node[0].name, nodes: simplify(node.slice(1))};
        node = nodes[i];
        if ((node.type === 'call' || node.type === 'dot') && node.nodes.length > 0 &&
        node.nodes[0].length === 2 && node.nodes[0][0] === 'name'){
          node.nodes[0] = {type:'name', name: node.nodes[0][1]};
        }
        if (node.type === 'name'){
          node.name = node.nodes[0];
          delete node.nodes;
        }
        switch (node.type){
          case 'call':
            if (node.nodes.length === 2 && node.nodes[0].type && node.nodes[0].type === 'name'){
              if (node.nodes[0].name === '$$__comment'){
                node.type = 'comment';
                node.value = node.nodes[1][0].value;
                delete node.nodes;
              } else if (node.nodes[0].name === '$$__gap'){
                node.type = 'gap';
                node.value = node.nodes[1][0].value;
                delete node.nodes;
              }
            }
            break;
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
          case 'defun':
            node.type = 'define';
            break;
          case 'assign':
            if (node.nodes[0] === true){
              delete node.nodes[0];
            }
            break;
          case 'string':
            node.value = node.nodes.join('');
            delete node.nodes;
            break;
          case 'num':
            node.type = 'number';
            node.value = node.nodes[0];
            delete node.nodes;
            break;
        }
      } else {
        nodes[i] = simplify(node);
      }
    }
  }
  return nodes || [];
}

function astFromFile(file, cb){
  fs.readFile(file, 'utf-8', function (err, source){
    source = convertComments(source);
    try {
      var ast = uglify.parser.parse(source, false, true);
      ast = {type: "file", path: file, nodes: simplify(ast[1])};
      cb(null, ast);
    } catch (e) {
      cb(e);
    }
  });
}

function report(options, ast, cb){
  var report = [];
  if (options.ast){
    return cb(null, {ast:ast, report:report});
  } else {
    return cb(null, report);
  }
}

function examine(options, cb){
  if (!isArray(options.files)){
    cb(new Error('must pass in array of files'));
  }
  var astList = [];
  function eachFile(file, cb){
    astFromFile(file, function (e, ast){
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