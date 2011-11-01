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
    .describe('d', 'Print out pretty AST.')
    .argv;

  // done with optimist
  process.argv = saveArgv;

  var options = {
    files: argv._,
    debug: argv.d
  };

  doctor = doctor(options);
  doctor.examine(function (err, ast){
    if (options.debug){
      console.log(util.inspect(ast, false, Infinity, true));
    }
  });
};