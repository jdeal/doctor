'use strict';
/*global alert: false */

var aa = {}; // APTO API namespace

aa.loadReport = function () {
  $.ajax({
    dataType: 'json',
    error: function (err) {
      alert('problem loading report');
      console.log(err);
    },
    success: aa.render,
    url: 'report.json'
  });
};

aa.render = function (report) {
  // TODO: When does report sometimes have a property named "report"?
  report = report.report ? report.report : report;

  // Note that root is a "group".
  var root = report.items.root;
  aa.renderToc(report, root, $('#toc'));
};

aa.renderItems = function (report, itemKeys) {
  var content = $('#content');
  content.html('');

  itemKeys.forEach(function (itemKey) {
    var item = report.items[itemKey];

    var div = $('<div id="' + itemKey + '" class="item">');
    div.text(item.name);
    content.append(div);

    var type = item.type;
    if (!item.api) {
      type = 'private ' + type;
    }
    div = $('<div class="type">');
    div.text(type);
    content.append(div);
  });
};

aa.renderToc = function (report, group, element) {
  var ul = $('<ul>');
  element.append(ul);

  if (group.items) {
    group.items.forEach(function (itemKey, i) {
      var item = report.items[itemKey];
      if (item.type !== 'function') {
        var li = $('<li>');
        ul.append(li);
        //var a = $('<a href="javascript:void(0)">' + item.name + '</a>');
        var a = $('<a href="#">' + item.name + '</a>');
        li.append(a);

        a.click(function () {
          if (item.items) {
            if (a.data('rendered')) {
              a.nextAll().toggle();
            } else {
              aa.renderToc(report, item, li);
              a.data('rendered', true);
            }
          }

          aa.renderItems(report, item.items);
        });
      }
    });
  }
};

$(aa.loadReport);
