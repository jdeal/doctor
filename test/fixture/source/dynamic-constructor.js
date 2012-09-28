var Temp = function () {};
Temp.prototype = String.prototype;
var obj = new Temp();
String.apply(obj, []);
