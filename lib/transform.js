var nast = require('./nice-ast');
var isArray = require('./util').isArray;
var findRules = require('./util').findRules;

var DEFAULT_RULES = ['default-transform'];

function transform(options, ast, cb) {

  function eachNode(node, rule) {
    if (rule.transform) {
      if (typeof rule.transform === 'function') {
        rule.transform(node);
      }
    }
  }

  nast.walkWithRules(options, DEFAULT_RULES, ast, eachNode, cb);
}

module.exports = transform;