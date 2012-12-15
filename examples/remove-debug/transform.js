var rules = [];

// remove calls to debug function
rules.push({
  type: 'call',
  match: function (node) {
    return node.nodes[0].value === 'debug';
  },
  transform: function (node) {
    node.remove();
  }
});

module.exports = rules;