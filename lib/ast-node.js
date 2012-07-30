var nast = require('./nice-ast');
var util = require('util');

/*
Creates an AST node from a plain object.

@class Represents an AST node.

@param {Object} node
  Plain object to use as template for node.
@param {AstNode} [parent]
  Parent node of this node.

@example
var node = new AstNode({type: 'string', value: 'Hello, world!'});
*/
function AstNode(node, parent) {
  /* {AstNode} Parent of this node.*/
  this.parent = parent || null;
  /* {AstNode} Previous sibling of this node. */
  this.prev = null;
  /* {AstNode} Next sibling of this node. */
  this.next = null;
  this._items = {};
  var self = this;
  Object.keys(node).forEach(function (key, i) {
    self[key] = node[key];
  });
}

function getNodeItem(key) {
  if (key in this._items) {
    return this._items[key];
  }
  if (this.parent) {
    return getNodeItem.call(this.parent, key);
  }
  return null;
}

/*
@param key Item key.
@param value Item value.
*/
AstNode.prototype.item = function (key, value) {
/*
@signature Gets an item value from a node. If the node doesn't have the item
key, a recursive search will continue up through the parents.
@returns Value for this item.
*/
  if (typeof value === 'undefined') {
    return getNodeItem.call(this, key);
  }
/*
@signature Sets an item value for a particular node. Node items act like scoped
variables. Values set for a parent node can be seen by children nodes.
*/
  this._items[key] = value;
};

/*
Properly connect siblings to this node.
@param Index of this node.
*/
AstNode.prototype.fix = function (index) {
  var nodes = this.parent.nodes;
  if (index > 0) {
    var prev = nodes[index - 1];
    prev.next = this;
    this.prev = prev;
  } else {
    this.prev = null;
  }
  if (index < nodes.length - 1) {
    var next = nodes[index + 1];
    next.prev = this;
    this.next = next;
  } else {
    this.next = null;
  }
};

/*
Get the index of a node.
@returns {integer}
*/
AstNode.prototype.index = function () {
  if (!this.parent || !this.parent.nodes) {
    return 0;
  }
  var nodes = this.parent.nodes;
  for (var i = 0; i < nodes.length; i++) {
    var child = nodes[i];
    if (child === this) {
      return i;
    }
  }
  return 0;
};

/*
Walk this node and its children, using the registered walk method. When a
node is appended, this is used to run all the rules for the appended node and
its children.
@param {AstNode} node Node to walk.
*/
AstNode.prototype.walk = function (node) {
  if (this._walk) {
    this._walk(node);
  }
}

/*
Insert node after this one.
@param {AstNode} node Node to insert.
*/
AstNode.prototype.after = function (node) {
  node = nast.extendAst(node);
  node.parent = this.parent;
  var nodes = this.parent.nodes;
  var index = this.index();
  nodes.splice(index + 1, 0, node);
  node.fix(index + 1);
  this.walk(node);
};

/*
Insert node before this one.
@param {AstNode} node Node to insert.
*/
AstNode.prototype.before = function (node) {
  if (this.prev) {
    this.prev.after(node);
  } else {
    this.parent.prepend(node);
  }
};

/*
Insert a new child node before any other child nodes.
@param {AstNode} node Node to prepend.
*/
AstNode.prototype.prepend = function (node) {
  node = nast.extendAst(node);
  this.nodes.unshift(node);
  node.parent = this;
  node.fix(0);
  this.walk(node);
};

/*
Insert a new child node after any other child nodes.
@param {AstNode} node Node to append.
*/
AstNode.prototype.append = function (node) {
  node = nast.extendAst(node);
  this.nodes.push(node);
  node.parent = this;
  node.fix(this.nodes.length - 1);
  this.walk(node);
};

/*
Remove this node.
*/
AstNode.prototype.remove = function () {
  this._removed = true;
  var index = this.index();
  this.parent.nodes.splice(index, 1);
  if (this.prev) {
    this.prev.fix(index - 1);
  }
  if (this.next) {
    this.next.fix(index);
  }
};

/*
Return a lisp-like representation of this node. Useful for debugging rules.
Gives you a terse look at the AST.
@returns {string}
*/
AstNode.prototype.lispify = function () {
  return nast.lispify(this);
};

/*
Returns true if this node has everything that node has.
@param {AstNode} node Node that has a subset of nodes/properties.
@returns {boolean}
*/
AstNode.prototype.like = function (node) {
  return nast.like(this, node);
};

/*
Return true if this node is idential to node.
@param {AstNode} node Node that has identical nodes/properties.
@returns {boolean}
*/
AstNode.prototype.equal = function (node) {
  return nast.equal(this, node);
};

/*
Get the PEG parser used to create this AST.
@return PEG parser.
*/
AstNode.prototype.parser = function () {
  var parser = null;
  if (this.grammarFile) {
    parser = nast.parserForGrammar(this.grammarFile);
  } else if (this.parent) {
    return this.parent.parser();
  }
  return parser;
};

/*
Compare this node to some arbitrary source. The source string will be
compiled to an AST, using the same grammar that was used to create this node.
@param {string} source Source code to parse and compare to this node.
*/
AstNode.prototype.likeSource = function (source) {
  var parser = this.parser();
  if (!parser) {
    return false;
  }
  var ast = parser.parse(source);
  var nodes = ast.nodes;
  if (nodes.length !== 1) {
    return false;
  }
  return this.like(nodes[0]);
};

/*
Return an AST without the sibling and parent references.
@returns {Object} Plain object.
*/
AstNode.prototype.ast = function () {
  return nast.cleanAst(this);
};

/*
Create an AST from source code.
@param {string} source Source code.
@returns {Object} AST.
*/
AstNode.prototype.fromSource = function (source) {
  var parser = this.parser();
  var ast = parser.parse(source);
  var node = ast.nodes[0];
  nast.walk(node, function (node) {
    delete node.pos;
    delete node.comments;
  });
  return node;
};

/*
Create an AST node from source code.
@param {string} source Source code.
@returns {Object} AST node.
*/
AstNode.prototype.nodeFromSource = function (source) {
  var node = this.fromSource(source);
  return nast.extendAst(node);
};

module.exports = AstNode;