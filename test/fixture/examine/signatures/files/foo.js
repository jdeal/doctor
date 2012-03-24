var items = {};

/*
gets/sets item
@param key key of item
@param value default description
*/
function item(key, value) {
/*
@signature gets item value
*/
  if (typeof value === 'undefined') {
    return items[key];
  }
/*
@signature sets item value
@param value value of item
*/
  items[key] = value;
}

exports.item = item;