'use strict';
/*global desc: false, task: false, fail: false */

var exec = require('child_process').exec;

desc('run doctor tests with tapr');
task('test', function () {
  var cmd = 'tapr ./test/*.js';
  exec(cmd, function (error, stdout, stderr) {
    if (error) {
      fail('tapr command failed - ' + error);
    } else {
      console.log('all tests passed');
    }
  });
});
