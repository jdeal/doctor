var _ = require('underscore');

function comma(buffer, i) {
  if (i > 0) {
    buffer.push(', ');
  }
}

var sourceRules = {
  file: function (node) {
    return this.source(node.nodes);
  },
  'define-function': function (node) {
    return 'function ' + this.source(node.nodes);
  },
  name: function (node) {
    return node.value;
  },
  parameters: function (node) {
    var self = this;
    var buffer = [];
    node.nodes.forEach(function (paramNode, i) {
      comma(buffer, i);
      buffer.push(self.source(paramNode));
    });
    return '(' + buffer.join('') + ')';
  },
  nodes: function (node) {
    return '{' + this.source(node.nodes) + '}';
    // var buffer = [];
    // node.nodes.forEach(function (childNode, i) {
    //   buffer.push(source(p))
    // });
    // return buffer.join('\n');
  },
  'return': function (node) {
    if (node.nodes[0].type !== 'undefined') {
      return 'return ' + this.source(node.nodes[0]) + ';';
    }
    return 'return;';
  },
  vars: function (node) {
    var self = this;
    var buffer = ['var '];
    node.nodes.forEach(function (varNode, i) {
      comma(buffer, i);
      buffer.push(self.source(varNode));
    });
    return buffer.join('') + ';';
  },
  'var': function (node) {
    var buffer = [node.nodes[0].value];
    console.log(node)
    if (node.nodes[1].type !== 'undefined') {
      buffer.push(' = ' + this.source(node.nodes[1]));
    }
    return buffer.join('');
  },
  call: function (node) {
    return this.source(node.nodes[0]) + '(' + this.source(node.nodes[1]) + ')';
  },
  dot: function (node) {
    return this.source(node.nodes[0]) + '.' + this.source(node.nodes[1]);
  },
  subscript: function (node) {
    return this.source(node.nodes[0]) + '[' + this.source(node.nodes[1]) + ']';
  },
  arguments: function (node) {
    var self = this;
    var buffer = [];
    node.nodes.forEach(function (argNode, i) {
      comma(buffer, i);
      buffer.push(self.source(argNode));
    });
    return buffer.join('');
  },
  assign: function (node) {
    return this.source(node.nodes[1]) + ' ' + this.source(node.nodes[0]) + ' ' + this.source(node.nodes[2]) + ';';
  },
  operator: function (node) {
    return node.value;
  },
  'new': function (node) {
    return 'new ' + node.nodes[0].value + '(' + this.source(node.nodes[1]) + ')';
  },
  postfix: function (node) {
    return this.source(node.nodes[1]) + node.nodes[0].value;
  },
  unary: function (node) {
    return this.source(node.nodes[0]) + node.nodes[1].value;
  },
  'switch': function (node) {
    return 'switch (' + this.source(node.nodes[0]) + ') {' + this.source(node.nodes[1].nodes) + '}';
  },
  'case': function (node) {
    return 'case ' + this.source(node.nodes[0]) + ': ' + this.source(node.nodes[1].nodes);
  },
  block: function (node) {
    return '{' + this.source(node.nodes) + '}';
  },
  regex: function (node) {
    return '/' + this.source(node.nodes[0]) + '/' + this.source(node.nodes[1]);
  },
  'regex-body': function (node) {
    return node.value;
  },
  'regex-flags': function (node) {
    return node.value;
  },
  string: function (node) {
    return '"' + node.value.replace('"', '\\"') + '"';
  },
  number: function (node) {
    return node.value;
  },
  object: function (node) {
    var self = this;
    var buffer = ['{'];
    node.nodes.forEach(function (propNode, i) {
      if (i > 0) {
        buffer.push(', ');
      }
      buffer.push(self.source(propNode));
    });
    buffer.push('}');
    return buffer.join('');
  },
  property: function (node) {
    return this.source(node.nodes[0]) + ': ' + this.source(node.nodes[1]);
  },
  key: function (node) {
    return node.value;
  },
  binary: function (node) {
    return this.source(node.nodes[1]) + ' ' + this.source(node.nodes[0]) + ' ' + this.source(node.nodes[2]);
  },
  array: function (node) {
    var self = this;
    var buffer = ['['];
    node.nodes.forEach(function (itemNode, i) {
      if (i > 0) {
        buffer.push(', ');
      }
      buffer.push(self.source(itemNode));
    });
    buffer.push(']');
    return buffer.join('');
  },
  'default': function (node) {
    return 'default: ' + this.source(node.nodes[0]);
  },
  'undefined': function (node) {
    return '';
  },
  'null': function (node) {
    return 'null';
  },
  'boolean': function (node) {
    return node.value;
  },
  'this': function (node) {
    return 'this';
  },
  'get': function (node) {
    return 'get ' + this.source(node.nodes[0]) + '()' + this.source(node.nodes[1]);
  },
  'set': function (node) {
    return 'set ' + this.source(node.nodes[0]) + '(' + this.source(node.nodes[1]) + ')' + this.source(node.nodes[2]);
  },
  'conditional': function (node) {
    return this.source(node.nodes[0]) + ' ? ' + this.source(node.nodes[1]) + ' : ' + this.source(node.nodes[2]);
  },
  'empty': function (node) {
        
  },
  'if': function (node) {
    return 'if (' + this.source(node.nodes[0]) + ') ' + this.source(node.nodes[1]) +
      (node.nodes[2].type === 'undefined' ? '' : ' else ' + this.source(node.nodes[2]));
  },
  'while': function (node) {
    return 'while (' + this.source(node.nodes[0]) + ') ' + this.source(node.nodes[1]);
  },
  'for': function (node) {
    console.log(node)
    return 'for (' +
      this.source(node.nodes[0]) + ';' +
      this.source(node.nodes[1]) + ';' +
      this.source(node.nodes[2]) + ') ' +
      this.source(node.nodes[3]);
  },
  'for-in': function (node) {
    return 'for (' + this.soure(node.nodes[0]) + ' in ' + this.source(node.nodes[1]) +
      ') ' + this.source(node.nodes[2]);
  },
  'continue': function (node) {
    return 'continue' +
      (this.nodes[1].type === 'undefined' ? '' : ' ' + this.source(node.nodes[2])) +
      ';';
  },
  'break': function (node) {
    return 'break' +
      (this.nodes[1].type === 'undefined' ? '' : ' ' + this.source(node.nodes[2])) +
      ';';
  },
  'with': function (node) {
    return 'with (' + this.source(node.nodes[0]) + ') ' + this.source(node.nodes[1]);
  },
  'labeled-statement': function (node) {
    return this.source(node.nodes[0]) + ': ' + this.source(node.nodes[1]);
  },
  'throw': function (node) {
    return 'throw ' + this.source(node.nodes) + ';';
  },
  'try': function (node) {
    return 'try ' + this.source(node.nodes);
  },
  'catch': function (node) {
    return 'catch (' + this.source(node.nodes[0]) + ')' + this.source(node.nodes[1]);
  },
  'finally': function (node) {
    return 'finally ' + this.source(node.nodes);
  },
  'debug': function (node) {
    return 'debug;';
  },
  'function': function (node) {
    return 'function ' + this.source(node.nodes);
  }
};

function lines(node, lastLine) {
  if (node.line && lastLine && node.line > lastLine) {
    return (new Array(node.line - lastLine + 1)).join('\n');
  }
  return "";
}

function source(ast) {
  var self = this;
  if (ast.type) {
    var gap = lines(ast, self.line);
    if (ast.line && ast.line > self.line) {
      self.line = ast.line;
    }
    return gap + sourceRules[ast.type].call(self, ast);
  } else {
    var sources = [];
    _(ast).each(function (node) {
      sources.push(self.source(node));
    });
    return sources.join('');
  }
}

module.exports = function render(options, files, cb) {
  var sourceFiles = {};
  _(files).each(function (report) {
    if (report.items) {
      _(report.items).each(function (item, key) {
        if (item.ast) {
          var context = {source: source, line: 1};
          sourceFiles[key] = context.source(item.ast);
        }
      });
    }
  });
  cb(null, sourceFiles);
};