var rules = [];

rules.push({
  type: 'comment',
  match: function (node) {
    // see if we're at the last of the single-line comments
    if (node.multiline) {
      return false;
    }
    if (node.next && node.next.type && node.next.type === 'comment' && !node.next.multiline) {
      return false;
    }
    return true;
  },
  transform: function (node) {
    var newNode = {type: 'comment', gap: node.gap, joined: true, position: node.position, text: ''};
    var prev = node;
    var lines = [];
    while (prev && prev.type && prev.type === 'comment' && !prev.multiline) {
      lines.unshift(prev.value);
      prev = prev.prev;
    }
    var m = lines[0].match(/\s+/);
    if (m) {
      var re = new RegExp('^\\s{0,' + m[0].length + '}');
      lines.forEach(function (line, i) {
        lines[i] = line.replace(re, '');
      });
    }
    newNode.text = lines.join('\n');
    node.after(newNode);
    prev = node;
    while (prev && prev.type && prev.type === 'comment' && !prev.multiline) {
      var nodeToRemove = prev;
      prev = prev.prev;
      nodeToRemove.remove();
    }
  }
});

rules.push({
  type: 'define',
  transform: function (node) {
    var nameNode = node.nodes[0];
    var argsNodes = node.nodes[1] ? node.nodes[1].nodes : [];
    node.name = nameNode.value;
    node.args = [];
    argsNodes.forEach(function (argNode, i) {
      node.args.push(argNode.value);
    });
  }
});

module.exports = rules;