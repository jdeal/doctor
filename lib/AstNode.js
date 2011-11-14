var nast = require('./nice-ast');
var util = require('util');

function AstNode(node, parent) {
  this.parent = parent || null;
  this.prev = null;
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

AstNode.prototype.item = function (key, value) {
  if (typeof value === 'undefined') {
    return getNodeItem.call(this, key);
  }
  this._items[key] = value;
};

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

AstNode.prototype.append = function (node) {
  node = nast.extendAst(node);
  this.nodes.push(node);
  node.parent = this;
  node.fix(this.nodes.length - 1);
};

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

AstNode.prototype.after = function (node) {
  node = nast.extendAst(node);
  node.parent = this.parent;
  var nodes = this.parent.nodes;
  var index = this.index();
  nodes.splice(index + 1, 0, node);
  node.fix(index + 1);
};

AstNode.prototype.remove = function (node) {
  var index = this.index();
  this.parent.nodes.splice(index, 1);
  if (this.prev) {
    this.prev.fix(index - 1);
  }
  if (this.next) {
    this.next.fix(index);
  }
};

module.exports = AstNode;