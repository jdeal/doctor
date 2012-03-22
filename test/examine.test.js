/*global suite:false, test:false*/

var fs = require('fs');
var Path = require('path');
require('js-yaml');
var assert = require('assert');

var doctor = require('../lib/doctor');
var util = require('../lib/util');

var fixtureDirs = fs.readdirSync(Path.join(__dirname, 'fixture/examine'));

function testFixture(name) {
  var dir = Path.join(__dirname, 'fixture/examine', name);
  var files = fs.readdirSync(Path.join(dir, 'files'));
  files = files.map(function (file) {
    return Path.join(dir, 'files', file);
  });
  var yamlOptionsPath = Path.join(dir, 'options.yaml');
  var options = {files: files};
  if (Path.existsSync(yamlOptionsPath)) {
    var fixtureOptions = require(yamlOptionsPath).shift();
    Object.keys(fixtureOptions).forEach(function (key) {
      options[key] = fixtureOptions[key];
    });
  }
  var reportFixPath = Path.join(dir, 'report.fix.js');
  var fixReport = function () {};
  if (Path.existsSync(reportFixPath)) {
    fixReport = require(reportFixPath);
  }
  test(name, function (done) {
    doctor.examine(options, function (err, report) {
      assert.equal(err, null);
      assert.notEqual(report, null);
      assert.equal(Object.keys(report).length, 1);
      report = report['report.json'];
      assert.notEqual(report, undefined);
      var yamlReportPath = Path.join(dir, 'report.yaml');
      var fixtureReport = require(yamlReportPath).shift();
      fixReport(fixtureReport);
      report = util.cleanUndefinedProperties(report);
      var message = "\n" + JSON.stringify(report, null, 2) + "\nequal to\n" + JSON.stringify(fixtureReport, null, 2);
      assert.deepEqual(report, fixtureReport, message);
      done();
    });
  });
}

fixtureDirs.forEach(function (dir, i) {
  if (dir.indexOf('__disabled__') < 0) {
    testFixture(dir);
  }
});