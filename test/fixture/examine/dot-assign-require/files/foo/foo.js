var a = {
  b: {
  }
};

a.b.c = require('./bar');

exports.bar = a.b.c;