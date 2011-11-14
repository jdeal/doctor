'use strict';

var doc = {}; // namespace

doc.addChild = function (parent, childName, text, cssClass) {
  var child = $('<' + childName + '>');
  if (text) {
    child.text(text);
  }
  if (cssClass) {
    child.addClass(cssClass);
  }
  parent.append(child);
  return child;
};

doc.addDiv = function (parent, text, cssClass) {
  return doc.addChild(parent, 'div', text, cssClass);
};

doc.addSpan = function (parent, text, cssClass) {
  return doc.addChild(parent, 'span', text, cssClass);
};

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

  // Expand the first group.
  $('#toc a:first').click();
};

doc.renderContent = function (report, item, nested) {
  var content = $('#content');
  content.html('');

  if (!nested) {
    return;
  }

  doc.addDiv(content, item.name, 'contentTitle');

  var itemKeys = item.items;
  if (!itemKeys || itemKeys.length === 0) {
    doc.addDiv(content, 'defines no functions', 'missing');
    return;
  }

  itemKeys.forEach(function (itemKey) {
    var item = report.items[itemKey];

    var args = item.args ? item.args.join(', ') : '';
    var div = doc.addDiv(content, '', 'item');
    doc.addSpan(div, item.name + '(', 'function');
    doc.addSpan(div, args, 'arg');
    doc.addSpan(div, ')', 'function');

    var type = item.type;
    if (!item.api) {
      type = 'private ' + type;
    }
    doc.addDiv(content, type, 'type');
  });
};

doc.renderToc = function (report, group, element, nested) {
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
              doc.renderToc(report, item, li, true);
              a.data('rendered', true);
            }
          }

          doc.renderContent(report, item, nested);
        });
      }
    });
  }
};

$(doc.load);
