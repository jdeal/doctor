/*global suite:false, test:false*/

var fs = require('fs');
var Path = require('path');
require('js-yaml');
var assert = require('assert');

var doctor = require('../lib/doctor');
var util = require('../lib/util');

var fixtureDirs = fs.readdirSync(Path.join(__dirname, 'fixture/examine'));

function isDirectory(path) {
  var stat = fs.statSync(path);
  if (stat.isDirectory()) {
    return true;
  }
  return false;
}

function testFixture(name) {
  var dir = Path.join(__dirname, 'fixture/examine', name);
  var files = fs.readdirSync(Path.join(dir, 'files'));
  files = files.filter(function (file) {
    var path = Path.join(dir, 'files', file);
    if (isDirectory(path) && !Path.existsSync(Path.join(path, 'package.json'))) {
      return false;
    }
    return true;
  });
  files = files.map(function (file) {
    var path = Path.join(dir, 'files', file);
    if (isDirectory(path)) {
      return Path.join(path, 'package.json');
    } else {
      return path;
    }
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
      var fixtureReport;
      try {
        fixtureReport = require(yamlReportPath).shift();
      } catch (e) {
        assert.ok(fixtureReport, e);
      }
      fixReport(fixtureReport);
      report = util.cleanUndefinedProperties(report);
      var message = "\n" + JSON.stringify(report, null, 2) + "\nequal to\n" + JSON.stringify(fixtureReport, null, 2);
      assert.deepEqual(report, fixtureReport, message);
      done();
    });
  });
}

suite('test doctor examine function');

fixtureDirs.forEach(function (dir, i) {
  if (dir.indexOf('__disabled__') < 0 && dir.indexOf('.') !== 0) {
    testFixture(dir);
  }
});