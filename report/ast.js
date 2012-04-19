var rules = [];

rules.push({
  type: 'script',
  report: function (node) {
    return {
      key: node.path,
      ast: node.ast()
    };
  }
});

module.exports = rules;