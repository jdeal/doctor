var rules = [];

rules.push({
  match: function (node) {
    return typeof node.comments !== 'undefined' && node.comments.length > 0;
  },
  transform: function (node) {
    var comments = node.comments;
    var lastComment = comments[comments.length - 1];
    var commentText = "";
    if (lastComment.indexOf('/*') === 0) {
      commentText = '  ' + lastComment.substr(2, lastComment.length - 4);
    } else {
      
    }
    node.commentText = commentText;
  }
});

rules.push({
  type: 'define-function',
  transform: function (node) {
    var nameNode = node.nodes[0];
    var paramsNodes = node.nodes[1] ? node.nodes[1].nodes : [];
    node.name = nameNode.value;
    node.params = [];
    paramsNodes.forEach(function (paramNode, i) {
      node.params.push(paramNode.value);
    });
  }
});

module.exports = rules;
