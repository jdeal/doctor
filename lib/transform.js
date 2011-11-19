var nast = require('./nice-ast');
var isArray = require('./util').isArray;
var findRules = require('./util').findRules;

var DEFAULT_RULES = ['default-transform'];

function transform(options, ast, cb) {

  function queueNodeWalk(node, cb) {
    if (options._walkQueue) {
      options._walkQueue.push(node);
    }
  }

  function eachNodeRule(node, rule) {
    if (rule.transform) {
      if (typeof rule.transform === 'function') {
        node._walk = queueNodeWalk;
        rule.transform(node);
        delete node._walk;
      }
    }
  }

  nast.walkWithRules(options, DEFAULT_RULES, ast, eachNodeRule, cb);
}

module.exports = transform;