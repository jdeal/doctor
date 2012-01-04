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

function getParent(report, item) {
  return report.items[item.groups[0]];
}

function hoistRequiredItems(report) {
  _(report.items).each(function (item, key) {
    var util = require('util');

    if (item.required && item.items && item.items.length === 1 && item.groups.length === 1) {
      var parent = getParent(report, item);
      var subModule = report.items[item.items[0]];

      if (subModule && subModule.type === 'module') {
        // remove item from parents list of items
        parent.items.splice(parent.items.indexOf(key), 1);

        // add sub module to parents list of items
        var subItem = subModule.items.length === 1 ? subModule.items[0] : subModule.key;
        parent.items.push(subItem);

        // item is now orphaned; remove item from report
        delete report.items[key];

        // change sub module's group to point to its new parent
        subModule.groups[0] = parent.key;
      }
    }
  });
}

function postProcessReport(inputReport) {
  var outputReport = u.clone(inputReport);
  var items = outputReport.items;

  renamePackageItems(outputReport);
  hoistRequiredItems(outputReport);

  return outputReport;
}

module.exports.postProcessReport = postProcessReport;
