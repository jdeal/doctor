var items = {};

/* item */
function item(key, value) {
  /* @signature gets item value */
  if (typeof value === 'undefined') {
    return items[key];
  }
  /* @signature sets item value */
  items[key] = value;
}

exports.item = item;