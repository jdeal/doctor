/* bar */
function a() {

}

var thing = {
  a: {
    /* baz */
    f: function () {}
  }
};

var b, c;

b = a;

c = thing.a.f;

exports.bar = b;
exports.baz = c;