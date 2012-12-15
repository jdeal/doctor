var rules = [];

// Root rule.
rules.push({
  type: 'files',
  report: function (node, report) {
// Set a report item with key of 'console.log' and a callCount property of 0.
    report.item('console.log', {
      callCount: 0
    });
  }
});


// Catch all console.log statements.
rules.push({
  type: 'call',
  match: function (node) {
    return node.likeSource('console.log()');
  },
  report: function (node, report) {
    var item = report.item('console.log');
// Increment the call count.
    report.item('console.log', {
      callCount: item.callCount + 1
    });
  }
});

module.exports = rules;