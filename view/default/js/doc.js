'use strict';

/*global alert: false */

function capitalise(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

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
  if (config.footer) {
    $('footer').html(config.footer);
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
  var firstLink  = $('#toc a:first');
  firstLink.click();
};

doc.getDisplayType = function (item) {
  if (item.method) {
    return "method";
  } else if (item.constructorFunction) {
    return "constructor";
  } else {
    return item.type;
  }
};

doc.renderFunction = function (report, item, parent) {
  var paramNames = item.params ? item.params.map(function (param) {
    return param.name;
  }) : [];
  var params = paramNames ? paramNames.join(', ') : '';
  var nameDiv = doc.addDiv(parent, '', 'itemName');

  doc.addSpan(nameDiv, item.name + '(', 'function');
  doc.addSpan(nameDiv, params, 'arg');
  doc.addSpan(nameDiv, ')', 'function');

  var type = doc.getDisplayType(item);
  if (doc.isPrivate(report, item)) {
    type = 'private ' + type;
  }
  doc.addDiv(parent, type, 'itemType');

  var descriptionDiv = doc.addDiv(parent, '', 'itemDescription');
  $(descriptionDiv).append(item.description);
};

doc.isPrivate = function (report, item) {
  return !item.api && !doc.isPublicMethod(report, item);
};

doc.getParentItem = function (report, item) {
  return report.items[item.groups[0]];
};

doc.isPublicMethod = function (report, item) {
  return item.method === true && doc.getParentItem(report, item).api === true;
};

doc.renderContent = function (report, item, nested) {
  var content = $('#content');
  content.html('');

  if (!nested) {
    return;
  }

  doc.addDiv(content, doc.itemDisplayName(item), 'contentTitle');

  var itemKeys = item.items;
  
  if (item.constructorFunction) {
    itemKeys = [item.key].concat(itemKeys);
  }

  if (!itemKeys || itemKeys.length === 0) {
    doc.addDiv(content, 'defines no functions', 'missing');
    return;
  }

  var parentItem = item;
  itemKeys.forEach(function (itemKey) {
    var item = report.items[itemKey];
    var displayableConstructor =
        item.constructorFunction && item.api && parentItem.type !== 'module';
    
    if (item.type === 'function' || displayableConstructor) {
      var itemDiv = doc.addDiv(content, '', 'item');
      doc.renderFunction(report, item, itemDiv);
    }
  });
};

/*
  Get the display name for an item.  Return the item package name
  if the item is a package, else return the item name.
*/
doc.itemDisplayName = function (item) {
  return item.package ? item.package.name : item.name;
};

doc.renderToc = function (report, group, element, nested) {
  var ul = $('<ul>');
  element.append(ul);

  if (group.items) {
    group.items.sort();

    group.items.forEach(function (itemKey, i) {
      var item = report.items[itemKey];
      if (item.type !== 'function' && item.type !== 'method') {
        var li = $('<li>');
        ul.append(li);

        var a = $('<a href="#">' + doc.itemDisplayName(item) + '</a>');
        li.append(a);

        a.click(function () {
          if (nested) {
            if (doc.selectedLink) {
              doc.selectedLink.removeClass('selected');
            }
            a.addClass('selected');
            doc.selectedLink = a;
          }

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
