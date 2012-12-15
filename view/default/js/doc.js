'use strict';

/*global alert: false, $: false, SyntaxHighlighter: false */

SyntaxHighlighter.defaults.gutter = false;

var doc = {}; // namespace

doc.capitalize = function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

doc.idify = function idify(key) {
  return key.replace(/\//g, '__').replace(/\./g, '--');
};

doc.addChild = function (parent, childName, text, cssClass) {
  var child = $('<' + childName + '>');
  if (text) {
    child.html(text);
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
    $('.title').text(config.title);
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
  // if (root.items.length === 1) {
  //   var firstLink  = $('#toc a:first');
  //   firstLink.click();
  // }
};

doc.getDisplayType = function (item) {
  if (item.isMethod) {
    return "method";
  } else if (item.isConstructor) {
    return "constructor";
  } else {
    return item.type;
  }
};

doc.typesHtml = function (types) {
  if (types && types.length > 0) {
    var html = '<span class="types">{';
    types.forEach(function (type, i) {
      if (i > 0) {
        html += ', ';
      }
      var typeString = type;
      if (type.type) {
        typeString = type.type;
        if (type.params) {
          typeString += '(';
          type.params.forEach(function (param, i) {
            if (i > 0) {
              typeString += ', ';
            }
            typeString += param;
          });
          typeString += ')';
        }
      }
      html += '<span class="class-link" data-class-name="' + typeString + '">' + typeString + '</span>';
    });
    html += '}</span>';
    return html;
  }
  return '';
};

doc.paramHtml = function (param) {
  var html = '<dl class="param"><dt>' +
    '<span class="paramName">' + param.name + '</span> ' +
    doc.typesHtml(param.types);

  // if (param.optional) {
  //   html += ' Optional';
  // }
  if (param.defaultValue) {
    html += '<div>Default: ' + param.defaultValue + '</div>';
  }
  var description = '<div>' + (param.description || '') + '</div>';
  if (param.properties) {
    description += '<dl>';
    param.properties.forEach(function (property) {
      description += '<dt><span class="paramName">' + property.name + '</span> ' +
        doc.typesHtml(property.types) + '</dt><dd>' + property.description + '</dd>';
    });
    description += '</dl>';
  }
  html += '</dt><dd>' + description + '</dd>';
  return html;
};

doc.renderItemTags = function (item, parent) {
  var html = ''; //<dl class="itemTags">';

  if (item.params && item.params.length > 0) {
    //html += '<dt>Parameters:</dt><dd>';
    html += '<h3>Parameters:</h3>';
    item.params.forEach(function (param) {
      html += doc.paramHtml(param);
    });
    //html += '</dd>';
  }

  if (item.returns) {
    //html += '<dt>Returns:</dt><dd>' + doc.typesHtml(item.returns.types) +
    //    item.returns.description + '</dd>';
    html += '<h3>Returns:</h3>';
    html += doc.typesHtml(item.returns.types) + item.returns.description;
  }

  //html += '</dl>';

  $(parent).append(html);
};

doc.renderExamples = function (item, parent) {
  if (item.examples && item.examples.length > 0) {
    //var html = '<dl class="itemTags"><dt>Examples:</dt><dd>';
    var html = '<h3>Examples:</h3>';

    item.examples.forEach(function (example) {
      //example = '\n ' + example; // TODO - why the space?
      html += '<pre class="brush: js">' + example + '</pre>';
    });

    //html += '</dd></dl>';

    $(parent).append(html);
  }
};

doc.renderClassDescription = function (item, parent) {
  //$(parent).append('<span class="classLabel">class ' + item.name + '</span>');

  if (item.extends) {
    doc.addChild(parent, 'p', 'extends ' + item.extends, 'itemType');
  }

  if (item.classDescription) {
    doc.addChild(parent, 'p', item.classDescription, 'classDescription');
  }
  if (item.properties && item.properties.length > 0) {
    var html = '';
    item.properties.forEach(function (prop) {
      if (doc.isVisible(prop)) {
        html += doc.paramHtml(prop);
      }
    });
    if (html !== '') {
      html = '<h3>Properties:</h3>' + html;
    }
    parent.append(html);
  }

  doc.renderExamples(item, parent);
};

doc.itemDescription = function (item) {
  var description = '';
  if (item.description) {
    description += item.description;
  }
  // if (item.constructorDescription && item.constructorDescription.description) {
  //   description += item.constructorDescription.description;
  // }
  return description;
};

doc.renderFunction = function (report, group, item, parent) {
  var signatures = [];
  if (!item.signatures || item.signatures.length < 2) {
    signatures.push(item);
  } else {
    item.signatures.forEach(function (sig) {
      var sigItem = $.extend({}, item);
      $.extend(sigItem, sig);
      signatures.push(sigItem);
    });
  }
  signatures.forEach(function (item) {
    // var paramNames = item.params ? item.params.map(function (param) {
    //   return param.name;
    // }) : [];
    var paramsString = '';
    //paramNames ? paramNames.join(', ') :
    var params = item.params ? item.params : [];
    params.forEach(function (param, i) {
      if (param.optional) {
        paramsString += ' [';
      }
      if (i > 0) {
        paramsString += ',';
        if (param.optional) {
          paramsString += '&nbsp;';
        } else {
          paramsString += ' ';
        }
      }
      paramsString += param.name;
      if (param.optional) {
        paramsString += ']';
      }
    });
    if (params.length > 0) {
      paramsString = ' ' + paramsString + '&nbsp;';
    }
    //var nameDiv = doc.addDiv(parent, '', 'itemName');
    var nameDiv = doc.addChild(parent, 'h2', '', 'itemName');

    var type = doc.getDisplayType(item);

    if (type !== 'var') {
      if (item.type === 'module-function' && group.type === 'module') {
        doc.addSpan(nameDiv, 'exports ', 'exportsTag');
      }
      doc.addSpan(nameDiv, item.name + '(', 'function');
      doc.addSpan(nameDiv, paramsString, 'arg');
      doc.addSpan(nameDiv, ')', 'function');
    } else {
      doc.addSpan(nameDiv, item.name, 'var');
    }

    if (doc.isPrivate(item)) {
      type = 'private ' + type;
    }
    doc.addChild(parent, 'p', type, 'itemType');

    var descriptionDiv = doc.addDiv(parent, '', 'itemDescription');

    var description = doc.itemDescription(item);
    $(descriptionDiv).append(description);

    doc.renderItemTags(item, parent);
    doc.renderExamples(item, parent);
  });
};

doc.isPrivate = function (item) {
  return !doc.isVisible(item) && !doc.isPublicMethod(item);
};

// doc.getParentItem = function (report, item) {
//   return report.items[item.groups[0]];
// };

doc.isPublicMethod = function (item) {
  return item.isMethod && (!item.visibility || item.visibility === 'public');
      // || doc.isVisible(doc.getParentItem(report, item));
};

doc.isVisible = function (item) {
  return !item.isPrivate || doc.isPublicMethod(item);
  // || item.visibility === 'public';
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
  if (item.isConstructor) {
    return doc.isVisible(item) || doc.hasVisibleChildren(report, item);
  }
  return false;
};

doc.togglePrivate = function () {
  var privateShow = $('#privateShow');
  var privateHide = $('#privateHide');
  if (!privateShow.is(':visible') && !privateHide.is(':visible')) {
    privateShow.show();
  } else if (privateShow.is(':visible')) {
    privateShow.hide();
    privateHide.show();
    $(".privateProperty").show();
  } else {
    privateHide.hide();
    privateShow.show();
    $(".privateProperty").hide();
  }
};

doc.renderContent = function (report, item, nested) {
  var content = $('#content');


  if (!nested || item.type === 'group') {
    // if (item.items) {
    //   item.items.forEach(function (key) {
    //     var item = report.items[key];
    //     var title = doc.addChild(content, 'h2', doc.itemDisplayName(item), 'contentTitle');
    //     title.wrapInner('<a></a>');
    //     title.click(function () {
    //       $('#' + doc.idify(item.key)).click();
    //     });
    //     doc.addChild(content, 'p', item.type, 'contentType');
    //   });
    // }

    return;
  }

  content.html('');

  //doc.addDiv(content, doc.itemDisplayName(item), 'contentTitle');
  if (item.type !== 'document') {
    doc.addChild(content, 'h1', doc.itemDisplayName(item), 'contentTitle');
  }

  if (item.type === 'document') {
    var brushes = ['bash', 'shell', 'cpp', 'c', 'css', 'diff', 'patch',
                   'js', 'jscript', 'javascript', 'plain', 'text', 'ps',
                   'powershell', 'sql', 'xml', 'xhtml', 'xslt', 'html',
                   'xhtml'];
    content.append(item.content);
    $('.highlight pre').each(function (i, pre) {
      var brush = $(pre).attr('lang');
      if (brushes.indexOf(brush) < 0) {
        brush = 'plain';
      }
      $(pre).addClass('brush:' + brush);
    });
    $('pre > code').each(function (i, code) {
      code = $(code);
      var brush;
      if (code.attr('class')) {
        brush = code.attr('class');
        brush = brush.substring(brush.indexOf('lang-') + 'lang-'.length);
      }
      if (brushes.indexOf(brush) < 0) {
        brush = 'plain';
      }
      code.parent().addClass('brush:' + brush);
      code.contents().unwrap();
    });
    SyntaxHighlighter.highlight();
    return;
  }


  doc.addChild(content, 'p', item.type, 'contentType');
  if (item.module) {
    var moduleItem = report.items[item.module];
    doc.addChild(content, 'p', 'Defined in module: ' + moduleItem.name);
  }
  if (item.description) {
    var descriptionDiv = doc.addDiv(content, '', 'moduleDescription');
    $(descriptionDiv).append(item.description);
  }
  doc.renderExamples(item, content);
  var privateShow = $('<a href="#" id="privateShow" class="privateToggle">[show private]</a>');
  privateShow.hide();
  privateShow.click(doc.togglePrivate);
  var privateHide = $('<a href="#" id="privateHide" class="privateToggle">[hide private]</a>');
  privateHide.hide();
  privateHide.click(doc.togglePrivate);

  content.append(privateShow);
  content.append(privateHide);

  var itemKeys = item.items;
  
  if (item.isConstructor || item.type === 'module-function') {
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

  if (item.key !== 'root') {
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
  }

  var parentItem = item;
  var showPrivateToggle = false;
  items.forEach(function (contentItem) {
    var visible = doc.isVisible(contentItem);
    var showClass = doc.showClass(report, contentItem);

    if (showClass && item.type === 'class') {
      doc.renderClassDescription(contentItem, content);
    }

    //if (visible) {
      var itemDiv = doc.addDiv(content, '', 'item');
      if (!visible) {
        itemDiv.hide();
        itemDiv.addClass('privateProperty');
        showPrivateToggle = true;
      }
      doc.renderFunction(report, parentItem, contentItem, itemDiv);
    //}

    if (showClass && contentItem.items) {
      contentItem.items.forEach(function (subItemKey) {
        var subItemDiv = doc.addDiv(content, '', 'item');
        var subItem = report.items[subItemKey];
        if (doc.isPublicMethod(subItem)) {
          doc.renderFunction(report, parentItem, subItem, subItemDiv);
        }
      });
    }
  });
  if (showPrivateToggle) {
    privateShow.show();
  }
};

/*
  Get the display name for an item.  Return the item package name
  if the item is a package, else return the item name.
*/
doc.itemDisplayName = function (item) {
  return item.package ? item.package.name : item.name;
};

doc.tocTypeSet = {
  'group': true,
  'module': true,
  'class': true,
  'document': true
};

doc.isTocItem = function (item) {
  return doc.tocTypeSet[item.type] ? true : false;
};

doc.hasTocItems = function (item) {
  if (item.itemTypeCounts) {
    for (var itemType in item.itemTypeCounts) {
      if (item.itemTypeCounts[itemType]) {
        if (itemType in doc.tocTypeSet) {
          return true;
        }
      }
    }
  }
};

doc.classNavMap = {};

doc.classNav = function (className) {
  if (className in doc.classNavMap) {
    return doc.classNavMap[className];
  }
  var nav = $('.nav-' + className);
  if (nav.length === 1) {
    doc.classNavMap[className] = nav;
  } else {
    doc.classNavMap[className] = null;
  }
  return doc.classNavMap[className];
};

doc.renderToc = function (report, group, element, nested, hide) {
  var ul = $('<ul>');
  if (nested) {
    ul.css('margin-left', '15px');
  }
  element.append(ul);

  if (group.items) {
    if (!group.isSorted) {
      group.items.sort();
    }

    group.items.forEach(function (itemKey, i) {
      var item = report.items[itemKey];
      if (doc.isTocItem(item)) {
        var li = $('<li>');
        ul.append(li);

        var expander = '&nbsp;';
        if (item.items && item.items.length > 0) {
          expander = '&#9656;&nbsp;';
        }

        var chevronStyle = "";
        if (!doc.hasTocItems(item)) {
          chevronStyle = "visibility:hidden";
        }

        var a = $('<a id="' + doc.idify(itemKey) + '" class="nav-' +
          doc.itemDisplayName(item) +
          ' expanded" + " href="#"><span class="chevron" style="' +
          chevronStyle + '">&nbsp;<span id="expand_' + itemKey +
          '">&#9656;</span><span id="contract_' + itemKey +
          '" style="display:none">&#9662;</span></span>&nbsp;' +
          doc.itemDisplayName(item) + '</a>');
        if (hide) {
          a.nextAll();
        }
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
            if (a.data('expanded')) {
              a.nextAll().hide();
              a.data('expanded', false);
              $('#contract_' + itemKey).hide();
              $('#expand_' + itemKey).show();
            } else {
              //if (a.data('rendered')) {
                a.nextAll().show();
              //} else {
              //  console.log("*");
              //  doc.renderToc(report, item, li, true);
              //}
              a.data('expanded', true);
              $('#expand_' + itemKey).hide();
              $('#contract_' + itemKey).show();
            }
          }
          doc.renderContent(report, item, nested);
          SyntaxHighlighter.highlight();

          $('.class-link').each(function (i, linkNode) {
            var link = $(linkNode);
            var className = link.data('class-name');
            var classNav = doc.classNav(className);
            if (classNav) {
              link.wrap('<a href="#"></a>');
              link.click(function () {
                if (!$('#classes').data('expanded')) {
                  $('#classes').click();
                }
                setTimeout(function () {
                  $('.nav-' + link.data('class-name')).click();
                });
              });
            }
          });
        });
        if (!a.data('rendered')) {
          doc.renderToc(report, item, li, true, true);
          a.nextAll().hide();
          a.data('rendered', true);
        }
        if (item.isHomePath && !item.clickedHomePath) {
          item.clickedHomePath = true;
          setTimeout(function () {
            a.click();
          }, 0);
        }
      }
    });
  }
};

$(doc.load);
