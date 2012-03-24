/* bar */
function a() {

}

var thing = {
  a: {
    /* baz */
    f: function () {}
  }
};

var b = {
};

var c = {
  cc: {

  }
};

b.bb = a;

c.cc.ccc = thing.a.f;

exports.bar = b.bb;
exports.baz = c.cc.ccc;