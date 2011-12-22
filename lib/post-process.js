'use strict';

var u = require('./util');
var _ = require('underscore');

function renamePackageItems(report) {
  _(report.items).each(function (item, key) {
    if (item.package && item.package.name) {
      item.name = item.package.name;
    }
  });
}

var util = require('util');

function getParent(report, item) {
  return report.items[item.groups[0]];
}

function hoistRequiredItems(report) {
  _(report.items).each(function (item, key) {
    if (item.required && item.items && item.items.length === 1 && item.groups.length === 1) {
      var parent = getParent(report, item);
      var subModule = report.items[item.items[0]];

      if (subModule.type === 'module') {
        // remove item from parents list of items
        parent.items.splice(parent.items.indexOf(key));

        // add sub module to parents list of items
        parent.items.push(subModule.items[0]);

        // item is now orphaned; remove item from report
        delete report.items[key];

        // change sub module's group to point to its new parent
        subModule.groups[0] = parent.key;
      }
    }
  });
}

function hoistMethods(report) {
  _(report.items).each(function (item, key) {
    if (item.constructor === true) {
      console.error(util.inspect(item));
      var parent = getParent(report, item);

      var methodKeys = _(item.items).select(function (itemKey) {
        return report.items[itemKey].method;
      });

      var methodItems = _(methodKeys).map(function (methodKey) {
        return report.items[methodKey];
      });

      parent.items = parent.items.concat(methodKeys);
    }
  });
}

function postProcessReport(inputReport) {
  var outputReport = u.clone(inputReport);
  var items = outputReport.items;

  renamePackageItems(outputReport);
  hoistRequiredItems(outputReport);
//  hoistMethods(outputReport);

  return outputReport;
}

module.exports.postProcessReport = postProcessReport;
