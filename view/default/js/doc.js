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

doc.typesHtml = function (types) {
  if (types && types.length > 0) {
    return '<span class="types">{' + types.join(', ') + '}</span> ';
  }
  return '';
};

doc.paramHtml = function (param) {
  var html = '<dl class="param"><dt>' + doc.typesHtml(param.types) +
      '<span class="paramName">' + param.name + '</span>';

  if (param.optional) {
    html += ' Optional';
  }
  if (param.defaultValue) {
    html += ', Default: ' + param.defaultValue;
  }
  
  var description = param.description || '';
  html += '</dt><dd>' + description + '</dd>';
  return html;
};

doc.renderItemTags = function (item, parent) {
  var html = '<dl class="itemTags">';

  if (item.params && item.params.length > 0) {
    html += '<dt>Parameters:</dt><dd>';
    item.params.forEach(function (param) {
      html += doc.paramHtml(param);
    });
    html += '</dd>';
  }

  if (item.returnTag) {
    html += '<dt>Returns:</dt><dd>' + doc.typesHtml(item.returnTag.types) +
        item.returnTag.description + '</dd>';
  }

  html += '</dl>';

  $(parent).append(html);
};

doc.renderExamples = function (item, parent) {
  if (item.examples && item.examples.length > 0) {
    var html = '<dl class="examples"><dt>Examples:</dt><dd>';

    item.examples.forEach(function (example) {
      example = '\n ' + example; // TODO - why the space?
      html += '<code class="example">' + example + '</code>';
    });

    html += '</dd></dl>';

    $(parent).append(html);
  }
};

doc.renderClassDescription = function (item, parent) {
  $(parent).append('<span class="classLabel">class ' + item.name + '</span>');

  if (item.extends) {
    doc.addDiv(parent, 'extends ' + item.extends, 'itemType');
  }

  var classDiv = doc.addDiv(parent, '', 'classDescription');

  if (item.classDescription) {
    $(classDiv).append(item.classDescription.description);
  }

  if (item.properties && item.properties.length > 0) {
    var html = '<dl class="itemTags">';
    html += '<dt>Properties:</dt><dd>';
    item.properties.forEach(function (type) {
      html += doc.paramHtml(type);
    });
    html += '</dd>';
    html += '</dl>';

    $(classDiv).append(html);
  }

  doc.renderExamples(item, parent);
};

doc.itemDescription = function (item) {
  var description = '';
  if (item.description) {
    description += item.description;
  }
  if (item.constructorDescription && item.constructorDescription.description) {
    description += item.constructorDescription.description;
  }
  return description;
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

  var description = doc.itemDescription(item);
  $(descriptionDiv).append(description);

  doc.renderItemTags(item, parent);
  doc.renderExamples(item, parent);
};

doc.isPrivate = function (report, item) {
  return !doc.isVisible(item) && !doc.isPublicMethod(report, item);
};

doc.getParentItem = function (report, item) {
  return report.items[item.groups[0]];
};

doc.isPublicMethod = function (report, item) {
  return item.method && item.visibility === 'public' ||
      doc.isVisible(doc.getParentItem(report, item));
};

doc.isVisible = function (item) {
  return item.api || item.visibility === 'public';
};

doc.hasVisibleChildren = function (report, item) {
  var result = false;

  if (item.items) {
    item.items.forEach(function (subItemKey) {
      var subItem = report.items[subItemKey];
      if (doc.isVisible(subItem)) {
        result = true;
      }
    });
  }

  return result;
};

doc.showClass = function (report, item) {
  if (item.constructorFunction) {
    return doc.isVisible(item) || doc.hasVisibleChildren(report, item);
  }
  return false;
};

doc.renderContent = function (report, item, nested) {
  var content = $('#content');
  content.html('');

  if (!nested) {
    return;
  }

  doc.addDiv(content, doc.itemDisplayName(item), 'contentTitle');

  var itemKeys = item.items;
  
  if (item.constructorFunction || item.type === 'module-function') {
    itemKeys = [item.key].concat(itemKeys);
  }

  if (!itemKeys || itemKeys.length === 0) {
    doc.addDiv(content, 'defines no functions', 'missing');
    return;
  }

  var items = [];
  itemKeys.forEach(function (key) {
    items.push(report.items[key]);
  });

  items.sort(function (a, b) {
    var nameA = doc.itemDisplayName(a);
    var nameB = doc.itemDisplayName(b);
    if (nameA < nameB) {
      return -1;
    } else if (nameA > nameB) {
      return 1;
    } else {
      return 0;
    }
  });

  var parentItem = item;
  items.forEach(function (contentItem) {
    var visible = doc.isVisible(contentItem);
    var showClass = doc.showClass(report, contentItem);

    if (showClass) {
      doc.renderClassDescription(contentItem, content);
    }

    if (visible) {
      var itemDiv = doc.addDiv(content, '', 'item');
      doc.renderFunction(report, contentItem, itemDiv);
    }

    if (showClass && contentItem.items) {
      contentItem.items.forEach(function (subItemKey) {
        var subItemDiv = doc.addDiv(content, '', 'item');
        var subItem = report.items[subItemKey];
        if (doc.isPublicMethod(report, subItem)) {
          doc.renderFunction(report, subItem, subItemDiv);
        }
      });
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

doc.isTocItem = function (item) {
  var isModulesGroup = item.type === 'group' && item.name === 'Modules';
  return isModulesGroup || item.type === 'module';
};

doc.renderToc = function (report, group, element, nested) {
  var ul = $('<ul>');
  element.append(ul);

  if (group.items) {
    group.items.sort();

    group.items.forEach(function (itemKey, i) {
      var item = report.items[itemKey];
      if (doc.isTocItem(item)) {
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
