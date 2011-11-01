#!/usr/bin/env node

var argv = require('optimist').argv;
var uglify = require('uglify-js');
var fs = require('fs');
//var traverse = require('traverse');
var util = require('util');

console.log(JSON.stringify(argv));

var file = argv._[0];

console.log(file);

function isArray (obj) {
  return Object.prototype.toString.call(obj) === '[object Array]';
}

function replaceComment(s,commentGroup,x,y,z,gap){
  return "$$__comment(\"" + commentGroup.replace(/\\/,"\\\\").replace(/\n/g,"\\n").replace(/"/,"\"") + "\");" +
    ((gap && gap.length > 0) ? "$$__gap();" : "");
}

function convertComments(source){
  /*jshint regexp: false */
  source = source.replace(/(\/\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+\/)(\s*\n\s*(\n\s*)+)?/g,replaceComment);
  //console.log(source);
  return source;
}

function convertBreaks(source){
  source = source.replace(/\n\n+/g,"$$__break()");
  return source;
}

function indent(depth){
  return (new Array(depth + 1)).join("  ");
}

/*
function extendContext(){
  var index = parseInt(this.key,10);
  var nextIndex = null;
  var prevIndex = null;
  if (this.parent && this.parent.node.length > (index + 1)){
    nextIndex = index + 1;
  }
  if (index > 0){
    prevIndex = index - 1;
  }
  this.previousNode = null;
  this.nextNode = null;
  if (nextIndex != null){
    this.nextNode = this.parent.node[nextIndex];
  }
  if (prevIndex != null){
    this.previousNode = this.parent.node[prevIndex];
  }
}
*/

function simplify(nodes, isArgList){
  isArgList = isArgList || false;
  var i, j;

  for (i = 0; i < nodes.length; i++){
    var node = nodes[i];
    if (isArray(node)){
      if (typeof node[0] === 'object' && node[0].name){
        nodes[i] = {type: node[0].name, nodes: simplify(node.slice(1), true)};
        node = nodes[i];
        if ((node.type === 'call' || node.type === 'dot') && node.nodes.length > 0 && node.nodes[0].length === 2 && node.nodes[0][0] === 'name'){
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
              var newVarNode = {type: 'var', name: childNodes[j][0], value: childNodes[j][1]};
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

fs.readFile(file, 'utf-8', function (err, source){
  source = convertComments(source);
  //console.log(source);
  var ast = uglify.parser.parse(source, false, true);
  //console.log(util.inspect(ast, false, Infinity, true))
  //ast = ast[1];
  //ast = {type:"file",nodes:ast[1]};
  /*
  traverse(ast).forEach(function (node){
    if (isArray(node) && typeof node[0] === 'object' && node[0].name){
      console.log(indent(this.level) + node[0].name);
    }
  });
  */
  //console.log(JSON.stringify(ast[1][0]))
  ast = {type: "file", path: file, nodes: simplify(ast[1])};
  
 /*
  traverse(ast).forEach(function (node){
    try {
      if (node[1][1][1] === '$$__comment'){
        var commentText = node[1][2][0][1];
        //console.log(commentText);
        this.update(["comment",commentText]);
      } else if (node[1][1][1] === '$$__gap'){
        this.update(["gap"]);
      }
    } catch (e) {
      // not a comment
    }
  });
  traverse(ast).forEach(function (node){
    extendContext.call(this);
    if (typeof node === 'object'){
      console.log(indent(this.level) + "[]" + (this.nextNode ? this.nextNode[0] : ""));
    } else {
      console.log(indent(this.level) + node);
    }
  });
  console.log(JSON.stringify(ast))
  burrito(source, function (node){

  });
  */
 
  //console.log(JSON.stringify(ast));
  console.log(util.inspect(ast, false, Infinity, true));

});
