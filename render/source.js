var _ = require('underscore');

var source;

function comma(buffer, i) {
  if (i > 0) {
    buffer.push(', ');
  }
}

var sourceRules = {
  file: function (node) {
    return source(node.nodes);
  },
  'define-function': function (node) {
    return 'function ' + source(node.nodes);
  },
  name: function (node) {
    return node.value;
  },
  parameters: function (node) {
    var buffer = [];
    node.nodes.forEach(function (paramNode, i) {
      comma(buffer, i);
      buffer.push(source(paramNode));
    });
    return '(' + buffer.join('') + ')';
  },
  nodes: function (node) {
    return '{' + source(node.nodes) + '}';
    // var buffer = [];
    // node.nodes.forEach(function (childNode, i) {
    //   buffer.push(source(p))
    // });
    // return buffer.join('\n');
  },
  'return': function (node) {
    if (node.nodes[0].type !== 'undefined') {
      return 'return ' + source(node.nodes[0]);
    }
    return 'return';
  },
  vars: function (node) {
    var buffer = ['var '];
    node.nodes.forEach(function (varNode, i) {
      comma(buffer, i);
      buffer.push(source(varNode));
    });
    return buffer.join('');
  },
  'var': function (node) {
    var buffer = [node.nodes[0].value];
    if (node.nodes[1].type !== 'undefined') {
      buffer.push(' = ' + source(node.nodes[1]));
    }
    return buffer.join('');
  },
  call: function (node) {
    return source(node.nodes[0]) + '(' + source(node.nodes[1]) + ')';
  },
  dot: function (node) {
    return source(node.nodes[0]) + '.' + source(node.nodes[1]);
  },
  subscript: function (node) {
    return source(node.nodes[0]) + '[' + source(node.nodes[1]) + ']';
  },
  arguments: function (node) {
    var buffer = [];
    node.nodes.forEach(function (argNode, i) {
      comma(buffer, i);
      buffer.push(source(argNode));
    });
    return buffer.join('');
  },
  assign: function (node) {
    return source(node.nodes[1]) + ' ' + source(node.nodes[0]) + ' ' + source(node.nodes[2]);
  },
  operator: function (node) {
    return node.value;
  },
  'new': function (node) {
    return 'new ' + node.nodes[0].value + '(' + source(node.nodes[1]) + ')';
  },
  postfix: function (node) {
    return source(node.nodes[1]) + node.nodes[0].value;
  },
  unary: function (node) {
    return source(node.nodes[0]) + node.nodes[1].value;
  },
  'switch': function (node) {
    return 'switch (' + source(node.nodes[0]) + ') {' + source(node.nodes[1].nodes) + '}';
  },
  'case': function (node) {
    return 'case ' + source(node.nodes[0]) + ': ' + source(node.nodes[1].nodes);
  },
  block: function (node) {
    return '{' + source(node.nodes) + '}';
  },
  regex: function (node) {
    return '/' + node.nodes[0].value + '/' + node.nodes[1].value;
  },
  string: function (node) {
    return '"' + node.value.replace('"', '\\"') + '"';
  },
  number: function (node) {
    return node.value;
  },
  object: function (node) {
    var buffer = ['{'];
    node.nodes.forEach(function (propNode, i) {
      if (i > 0) {
        buffer.push(', ');
      }
      buffer.push(source(propNode));
    });
    buffer.push('}');
    return buffer.join('');
  },
  property: function (node) {
    return source(node.nodes[0]) + ': ' + source(node.nodes[1]);
  },
  key: function (node) {
    return node.value;
  },
  binary: function (node) {
    return source(node.nodes[1]) + ' ' + node.nodes[0].value + ' ' + source(node.nodes[2]);
  }
};

function source(ast) {
  if (ast.type) {
    return sourceRules[ast.type](ast);
  } else {
    var sources = [];
    _(ast).each(function (node) {
      sources.push(source(node));
    });
    return sources.join('\n');
  }
}

module.exports = function render(options, files, cb) {
  var sourceFiles = {};
  _(files).each(function (report) {
    if (report.items) {
      _(report.items).each(function (item, key) {
        if (item.ast) {
          sourceFiles[key] = source(item.ast);
        }
      });
    }
  });
  cb(null, sourceFiles);
};