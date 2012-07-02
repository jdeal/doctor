var _ = require('underscore');

var rules = [];

function hookInfoString(options, node) {
  var info = {
    type: 'function',
    line: node.line,
    column: node.column
  };
  if (node.type === 'script') {
    info.type = 'module';
    info.name = 'module';
  }
  if (node.nodes[0]) {
    if (node.nodes[0].type === 'name') {
      info.name = node.nodes[0].value;
    } else if (node.nodes[0].type === 'dot') {
      if (node.nodes[0].nodes[1].type === 'name') {
        info.name = node.nodes[0].nodes[1].value;
      }
    }
  }
  if (node.type === 'call') {
    info.type = 'call';
  }
  return JSON.stringify(info).replace(/\}$/, ', filename:__filename}');
}

function hookFilename(options) {
  return options.hookFilename ? options.hookFilename : '';
}

function makeHook(options, type, node) {
  var hookNode = node.fromSource('__doctor._callHook(' +
    JSON.stringify(type) + ',' +
    JSON.stringify(hookFilename(options)) + ',' +
    hookInfoString(options, node) + ')');
  hookNode.ignore = true;
  return hookNode;
}

rules.push({
  type: 'script',
  transform: function (node, transform) {
    node.item('modulePath', node.path);
    node.item('functionNode', node);
    node.prepend(makeHook(transform.options, 'enter', node));
    //node.prepend(node.fromSource("var __ = {}"));
    var drRequire = node.fromSource("var __doctor = require(" + JSON.stringify(transform.options.hookDoctorPath) + ")");
    drRequire.nodes[0].nodes[1].ignore = true;
    node.prepend(drRequire);
  }
});

rules.push({
  type: ['function', 'define-function'],
  transform: function (node, transform) {
    node.item('functionNode', node);
    node.nodes[2].prepend(makeHook(transform.options, 'enter', node));
  }
});

rules.push({
  type: 'return',
  match: function (node) {
    return node.nodes[0].type === 'undefined';
  },
  transform: function (node, transform) {
    var returnBlock = node.nodeFromSource('{return;}');
    returnBlock.prepend(makeHook(transform.options, 'exit', node.item('functionNode')));
    node.before(returnBlock);
    node.remove();
  }
});

rules.push({
  type: 'return',
  match: function (node) {
    return node.nodes[0].type !== 'undefined';
  },
  transform: function (node, transform) {
    var returnValue = node.nodes[0].ast();
    var returnBlock = node.nodeFromSource('{var __doctor__return = 0}');
    var returnVar = returnBlock.nodes[0];
    // console.log(returnVar.lispify());
    // console.log(returnBlock.nodes[0].lispify());
    //console.log(returnVar.nodes[0].nodes[1].lispify());
    //console.log(returnBlock.lispify())
    returnVar.nodes[0].nodes[1].remove();
    //console.log(returnBlock.lispify())
    returnVar.nodes[0].append(returnValue);
    //console.log(returnBlock.lispify())
    returnBlock.append(makeHook(transform.options, 'exit', node.item('functionNode')));
    returnBlock.append(node.nodeFromSource('return __doctor__return'));
    returnBlock.line = node.line;
    node.before(returnBlock);

    //console.log(returnBlock.lispify());
    //node.before(node.nodeFromSource('return __doctor__return'));
    node.remove();
    //console.log(node.lispify())
  }
});

rules.push({
  type: 'call',
  match: function (node) {
    return !node.ignore;
  },
  transform: function (node, transform) {
    var args = node.nodes[1];
    var wrap = node.nodeFromSource('__doctor._wrapCall(' +
      JSON.stringify(hookFilename(transform.options)) + ', ' +
      hookInfoString(transform.options, node) + ')');
    wrap.line = node.line;
    var argsArray = node.nodeFromSource('[]');
    argsArray.line = node.line;
    _(args.nodes).each(function (argNode) {
      argsArray.append(argNode);
    });
    wrap.nodes[1].prepend(argsArray);
    if (node.nodes[0].type === 'dot') {
      wrap.nodes[1].prepend(node.nodes[0].nodes[0]);
    } else {
      wrap.nodes[1].prepend({type: 'null'});
    }
    wrap.nodes[1].prepend(node.nodes[0]);
    node.before(wrap);
    node.remove();
  }
});

// rules.push({
//   type: 'return',
//   match: function (node) {
//     return node.nodes[0].type !== 'undefined';
//   },
//   transform: function (node) {
//     var returnValueAst = node.nodes[0].ast();
//     var newReturn = node.nodeFromSource('return doctor.callExitHook(0)');
//     newReturn.nodes[0].nodes[1].nodes[0] = returnValueAst;
//     node.before(newReturn);
//     node.remove();


//     // var returnValue = node.nodes[0];

//     // var returnVar = node.nodeFromSource('var __doctor__return = 0');
//     // var returnBlock = node.nodeFromSource('{var __doctor__return = 0}');
//     // console.log(returnVar.lispify());
//     // console.log(returnBlock.lispify());
//     // //console.log(returnVar.nodes[0].nodes[1].lispify());
//     // returnVar.nodes[0].nodes[1] = returnValue;
//     // node.before(returnVar);
//     // node.before(makeHook('exit', node.item('functionNode')));
//     // node.before(node.nodeFromSource('return __doctor__return'));
//   }
// });


rules.push({
  type: ['end-function', 'end-define-function'],
  transform: function (node, transform) {
    node.nodes[2].append(makeHook(transform.options, 'exit', node));
  }
});

rules.push({
  type: 'end-script',
  transform: function (node, transform) {
    node.append(makeHook(transform.options, 'exit', node));
  }
});

module.exports = rules;