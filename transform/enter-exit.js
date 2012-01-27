var rules = [];

function makeHook(type, node) {
  type = type === 'enter' ? 'Enter' : type;
  type = type === 'exit' ? 'Exit' : type;

  var info = {
    type: node.type === 'file' ? 'module' : 'function',
    line: node.line,
    column: node.column,
    name: 'function'
  };
  if (node.type === 'file') {
    info.name = 'module';
  } else if (node.nodes[0].type === 'name') {
    info.name = node.nodes[0].value;
  }
  return node.fromSource('__doctor.call' + type + 'Hook(' +
    JSON.stringify(info).replace(/\}$/, ', filename:__filename}') + ')');
}

rules.push({
  type: 'file',
  transform: function (node) {
    node.item('modulePath', node.path);
    node.item('functionNode', node);
    node.prepend(makeHook('enter', node));
    node.prepend(node.fromSource("var __doctor = require('doctor')"));
  }
});

rules.push({
  type: ['function', 'define-function'],
  transform: function (node) {
    node.item('functionNode', node);
    node.nodes[2].prepend(makeHook('enter', node));
  }
});

rules.push({
  type: 'return',
  match: function (node) {
    return node.nodes[0].type === 'undefined';
  },
  transform: function (node) {
    var returnBlock = node.nodeFromSource('{return;}');
    returnBlock.prepend(makeHook('exit', node.item('functionNode')));
    node.before(returnBlock);
    node.remove();
  }
});

rules.push({
  type: 'return',
  match: function (node) {
    return node.nodes[0].type !== 'undefined';
  },
  transform: function (node) {
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
    returnBlock.append(makeHook('exit', node.item('functionNode')));
    returnBlock.append(node.nodeFromSource('return __doctor__return'))
    node.before(returnBlock);

    //console.log(returnBlock.lispify());
    //node.before(node.nodeFromSource('return __doctor__return'));
    node.remove();
    //console.log(node.lispify())
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
  transform: function (node) {
    node.nodes[2].append(makeHook('exit', node));
  }
});

rules.push({
  type: 'end-file',
  transform: function (node) {
    node.append(makeHook('exit', node));
  }
});

module.exports = rules;