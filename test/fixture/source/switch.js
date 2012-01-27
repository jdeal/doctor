/*global foo:false */

switch (foo) {
case 'foo':
  console.log('foo');
  break;
case 'bar':
  console.log('bar');
  break;
default:
  console.log('baz');
}

switch (foo) {
case 1:
  console.log('foo');
  break;
case 2:
  console.log('bar');
  break;
default:
  console.log('baz');
}

switch (foo) {
  case 'foo':
  {
    console.log('foo');
    break;
  }
  case 'bar':
  {
    console.log('bar');
    break;
  }
  default:
  {
    console.log('baz');
  }
}