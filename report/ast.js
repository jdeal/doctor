var rules = [];

rules.push({
  type: 'file',
  report: function (node) {
    return {
      key: node.path,
      ast: node.ast()
    };
  }
});

module.exports = rules;