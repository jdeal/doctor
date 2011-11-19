var nast = require('./nice-ast');
var u = require('./util');
var findRules = require('./util').findRules;

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

  var rules = u.toArray(options.transform || 'default');

  nast.walkWithRules(options, rules, 'transform', ast, eachNodeRule, cb);
}

module.exports = transform;