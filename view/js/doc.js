$(function () {
  function renderItems(report, itemKeys) {
    $("#page").html('');
    itemKeys.forEach(function (itemKey, i) {
      var item = report.items[itemKey];
      console.log(itemKey);
      $("#page").append('<h3 id="' + itemKey + '">' + item.name + '</h3>');
      if (!item.api) {
        $("#page").append('<span style="color:red">private</span>');
      }
    });
  }

  function renderToc(report, group, element) {
    var ul = $("<ul>");
    element.append(ul);
    if (group.items) {
      group.items.forEach(function (itemKey, i) {
        var item = report.items[itemKey];
        var li = $("<li>");
        ul.append(li);
        var a = $('<a href="JavaScript:void(0)">' + item.name + '</a>');
        li.append(a);
        a.click(function () {
          if (item.items) {
            if (!a.data('rendered')) {
              renderToc(report, item, li);
            }
            a.data('rendered', true);
            renderItems(report, item.items);
          }
        });
      });
    }
  }

  function render(report) {
    report = report.report ? report.report : report;

    var items = report.items;
    var root = items.root;

    renderToc(report, root, $("#toc"));
  }

  $.ajax({
    dataType: 'json',
    error: function (x) {
      alert("problem loading report");
    },
    success: function (report) {
      render(report);
    },
    url: "report.json"
  });
});