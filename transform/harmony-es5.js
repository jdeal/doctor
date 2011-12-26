var rules = [];

rules.push({
  type: 'define-function',
  transform: function (node) {
    var paramsNodes = node.nodes[1] ? node.nodes[1].nodes : [];
    for (var i = paramsNodes.length - 1; i >= 0; i--) {
      var paramNode = paramsNodes[i];
      if (paramNode.type === 'name-value') {
        var name = paramNode.nodes[0].value;
        var valueAst = paramNode.nodes[1].ast();
        paramNode.type = 'name';
        paramNode.value = name;
        delete paramNode.nodes;
        var defaultAssign = {
          type: 'assign',
          nodes: [
            {
              type: 'operator',
              value: '='
            },
            {
              type: 'name',
              value: name
            },
            {
              type: 'binary',
              nodes: [
                {
                  type: 'operator',
                  value: '||'
                },
                {
                  type: 'name',
                  value: name
                },
                valueAst
              ]
            }
          ]
        };
        node.nodes[2].prepend(defaultAssign);
      }
    }
  }
});

// rules.push({
//   match: function (node) {console.log(node.lispify())}
// })

module.exports = rules;