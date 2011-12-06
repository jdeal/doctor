var rules = [];

/* merge and normalize comments */
rules.push({
  match: function (node) {
    return typeof node.comments !== 'undefined' && node.comments.length > 0;
  },
  transform: function (node) {
    var comments = node.comments;
    var lastComment = comments[comments.length - 1];
    var commentText = "";

    comments.forEach(function (comment, i) {
      var text;
      if (comment.indexOf('/*') === 0) {
        text = '  ' + comment.substr(2, comment.length - 4);
        text = text.replace(/^[\s\*]*(\r\n|\n|\r)/, '');
        text = text.replace(/(\r\n|\n|\r)[\s\*]*$/, '');
        var lines = text.split(/(\r\n|\n|\r)/);
        lines.forEach(function (line, i) {
          var padMatch = line.match(/^\s*\*/);
          if (padMatch) {
            lines[i] = padMatch[0].replace(/\*/g, ' ') + line.replace(/^\s*\*/, '');
          }
        });
        text = lines.join('\n');
      } else {
        text = '  ' + comment.substr(2);
      }
      if (commentText !== '') {
        text = '\n' + text;
      }
      commentText += text;
    });

    var lines = commentText.split(/\n/);

    var indent = -1;
    var i;
    for (i = 0; i < lines.length; i++) {
      var padMatch = lines[i].match(/^\s*/);
      if (padMatch[0].length === 0) {
        indent = 0;
        break;
      }
      if (indent < 0 || padMatch[0].length < indent) {
        indent = padMatch[0].length;
      }
    }
    if (indent > 0) {
      lines.forEach(function (line, i) {
        lines[i] = line.replace(new RegExp('^\\s{0,' + indent + '}'), '');
      });
    }

    node.commentText = lines.join('\n');
  }
});

var commentTagFunctions = {
  "description": function (value, node) {
    node.description = value.description;
  },
  "param": function (value, node) {
    if (!node.paramTags) {
      node.paramTags = {};
    }
    node.paramTags[value.name] = value;
  }
};

function commentTransform(node, transform) {
  try {
    return transform.options.commentParser.parse(node.commentText);
  } catch (e) {
    var file = node.parent.path;
    var comment = node.commentText;
    var msg = 'Error parsing comment tag in file ' + file + ' - ' + e +
        ', comment text: ' + comment;
    console.error(msg);
    // throw new Error(msg);
    return [];
  }
}

/* parse tags from comments */
rules.push({
  match: function (node) {
    return typeof node.commentText === 'string' && node.commentText !== '';
  },
  transform: function (node, transform) {
    var tags = commentTransform(node, transform);
    node.commentTags = tags;
    node.commentTags.forEach(function (tag, i) {
      if (tag.name in commentTagFunctions) {
        commentTagFunctions[tag.name](tag.value, node);
      }
    });
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
      var param = {
        name: paramNode.value
      };
      if (node.paramTags) {
        if (node.paramTags[param.name]) {
          var tagValue = node.paramTags[param.name];
          Object.keys(tagValue).forEach(function (key, i) {
            if (key !== 'name') {
              param[key] = tagValue[key];
            }
          });
        }
      }
      node.params.push(param);
    });
  }
});

module.exports = rules;
