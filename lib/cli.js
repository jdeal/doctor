var opt = require('optimist');
var util = require('util');

var doctor = require('./doctor');

module.exports = function cli(argv){
  // optimist likes to use real args
  var saveArgv = process.argv;
  process.argv = argv;

  argv = opt
    .usage('Convert source to metadata.\nUsage: $0 [options] <file ...>')
    .demand(1)
    .alias('d', 'debug')
    .default('d', false)
    .boolean('d', 'debug')
    .boolean('raw', 'ast', 'report')
    .describe('d', 'Print out pretty debugging JSON.')
    .describe('ast', 'Return ast in results.')
    .describe('raw', 'Return raw uglify ast for each file.')
    .describe('report', 'Return report in results.')
    .argv;

  // done with optimist
  process.argv = saveArgv;

  if (argv.raw){
    argv.ast = true;
  }

  if (argv.d && !argv.ast && !argv.report){
    argv.ast = true;
    argv.report = true;
  }

  var options = {
    files: argv._,
    debug: argv.d,
    raw: argv.raw,
    ast: argv.ast,
    report: argv.report
  };

  doctor.examine(options, function (err, result){
    if (err) throw err;
    if (options.debug){
      console.log(util.inspect(result, false, Infinity, true));
    }    
  });
};