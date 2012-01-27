f[0]();
var a = b[1];
f[0][1]();
var b = c[0][1];
a[0] = c;
a[0][1] = c[2];

f['g']();
var a = b['c'];
f['g']['h']();
var b = c['d']['e'];
a['b'] = c;
a['b'] = c['d'];

f[g]();
var a = b[c];
f[g][h]();
var b = c[d][e];
a[b] = c;
a[b] = c[d];