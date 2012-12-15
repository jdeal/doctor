var Greeter = require('./greeter');
var version = require('./version');

/*
@returns {Greeter}
*/
function greeter(language) {
  language = language || 'en';
  return new Greeter(language);
}

greeter.version = version;

module.exports = greeter;