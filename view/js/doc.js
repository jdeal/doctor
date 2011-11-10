'use strict';
/*global alert: false */

var doc = {}; // namespace

doc.configure = function (config) {
  if (config.title) {
    $('head').append('<title>' + config.title + '</title>');
    $('header > span').text(config.title);
  }
  if (config.logo) {
    var img = $('<img>',
      {id: 'logo', src: config.logo, alt: 'logo'});
    $('header').append(img);
  }
};

doc.load = function () {
  doc.loadConfig();
  doc.loadReport();
};

doc.loadConfig = function () {
  doc.loadJSON('config.json', doc.configure);
};

doc.loadJSON = function (url, success) {
  $.ajax({
    dataType: 'json',
    error: function (err) {
      alert('problem loading ' + url);
      console.log(err);
    },
    success: success,
    url: url
  });
};

doc.loadReport = function () {
  doc.loadJSON('report.json', doc.render);
};

doc.render = function (report) {
  // TODO: When does report sometimes have a property named "report"?
  report = report.report ? report.report : report;

  // Note that root is a "group".
  var root = report.items.root;
  doc.renderToc(report, root, $('#toc'));
};

doc.renderItems = function (report, itemKeys) {
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

doc.renderToc = function (report, group, element) {
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
              doc.renderToc(report, item, li);
              a.data('rendered', true);
            }
          }

          doc.renderItems(report, item.items);
        });
      }
    });
  }
};

$(doc.load);
