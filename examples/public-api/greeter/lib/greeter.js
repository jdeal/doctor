var greetings = {
  en: "Hello!",
  es: "Hola!"
};

/*
Greeter constructor.

@param {string} language - The language code.

@class The Greeter class.

@public
*/
function Greeter(language) {
  this.language = language;
}

/*
Write out a greeting to the console, based on the language for this greeter.
*/
Greeter.prototype.greet = function () {
  console.log(greetings[this.language]);
};

module.exports = Greeter;