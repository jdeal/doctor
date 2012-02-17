/*global suite:false, test:false*/

var postProcessReport = require('../lib/post-process').postProcessReport;
var _ = require('underscore');

var assert = require('chai').assert;

var inputReport = {
  "items": {
    "root": {
      "type": "group",
      "items": [
        "modules"
      ]
    },
    "modules": {
      "type": "group",
      "key": "modules",
      "name": "Modules",
      "items": [
        "index.js"
      ]
    },
    "index.js": {
      "type": "module",
      "key": "index.js",
      "name": "index.js",
      "groups": [
        "modules"
      ],
      "package": {
        "name": "apto-collection"
      },
      "items": [
        "index.js.Set"
      ]
    },
    "index.js.Set": {
      "type": "module-function",
      "constructor": true,
      "key": "index.js.Set",
      "groups": [
        "index.js"
      ],
      "required": true,
      "items": [
        "lib/set.js"
      ],
      "name": "Set"
    },
    "lib/set.js": {
      "type": "module",
      "key": "lib/set.js",
      "name": "lib/set.js",
      "groups": [
        "index.js.Set"
      ],
      "items": [
        "lib/set.js.Set"
      ]
    },
    "lib/set.js.Set": {
      "type": "module-function",
      "constructor": true,
      "key": "lib/set.js.Set",
      "params": [],
      "groups": [
        "lib/set.js"
      ],
      "name": "Set",
      "items": [
        "lib/set.js.Set.add",
        "lib/set.js.Set.clear",
        "lib/set.js.Set.contains",
      ],
      "api": true
    },
    "lib/set.js.Set.add": {
      "type": "function",
      "method": true,
      "key": "lib/set.js.Set.add",
      "params": [
        {
          "name": "value"
        }
      ],
      "groups": [
        "lib/set.js.Set"
      ],
      "name": "add"
    },
    "lib/set.js.Set.clear": {
      "type": "function",
      "method": true,
      "key": "lib/set.js.Set.clear",
      "params": [],
      "groups": [
        "lib/set.js.Set"
      ],
      "name": "clear"
    },
    "lib/set.js.Set.contains": {
      "type": "function",
      "method": true,
      "key": "lib/set.js.Set.contains",
      "params": [
        {
          "name": "value"
        }
      ],
      "groups": [
        "lib/set.js.Set"
      ],
      "name": "contains"
    },
  }
};

test('postProcessReport', function () {
  var report = postProcessReport(inputReport);
  assert.ok(report);

  var items = report.items;
  assert.ok(items);

  // renames package items with package name
  assert.equal(items['index.js'].name, 'apto-collection');

  // hoists required items
  assert.equal(items['index.js'].items[0], 'lib/set.js.Set');
});


