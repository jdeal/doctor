var opt = require('optimist');
var util = require('util');

var doctor = require('./doctor');

module.exports = function cli(argv) {
  // optimist likes to use real args
  var saveArgv = process.argv;
  process.argv = argv;

  argv = opt
    .usage('Convert source to metadata.\nUsage: $0 <file ...> [options]')
    .demand(1)

    .alias('debug', 'd')
    .boolean('debug', 'd')
    .describe('debug', 'Print out pretty debugging JSON.')

    .boolean('json')
    .default('json', false)
    .describe('json', 'Print out plain debugging JSON.')

    .boolean('transform')
    .describe('transform', 'Run transform rules on ast.')
    
    .alias('report')
    .boolean('report')
    .describe('report', 'Return report in results.')
    
    .boolean('ast')
    .describe('ast', 'Return ast in results.')
    
    .boolean('raw')
    .describe('raw', 'Return raw uglify ast for each file.')

    .alias('output', 'o')
    .default('output', 'output')
    .describe('output', 'Output directory for report.')

    .alias('view', 'v')
    .describe('view', 'View directory to copy to output directory.')

    .describe('render', 'Module to use to render report.')
    
    // .check(function (argv){
    //   return false
    // })
    
    .argv;

  // done with optimist
  process.argv = saveArgv;

  if (argv.raw) {
    argv.ast = true;
  }

  if (!argv.debug && argv.json) {
    argv.debug = true;
  }

  if (!argv.debug || (!argv.ast && !argv.raw && !argv.report)) {
    argv.transform = true;
  } else {
    argv.transform = argv.transform || false;
  }

  if (!argv.ast && !argv.raw) {
    argv.report = true;
  }

  var options = {
    files: argv._,
    debug: argv.debug,
    raw: argv.raw,
    ast: argv.ast,
    report: argv.report,
    output: argv.output,
    view: argv.view,
    render: argv.render || null,
    transform: argv.transform
  };

  doctor.examine(options, function (err, result) {
    //throw new Error('x')
    if (err) {
      //throw new Error(err)
      Object.keys(err).forEach(function (key) {
        console.log(key + ':\n' + err[key]);
      });
      process.exit(1);
    }
    if (options.debug) {
      if (argv.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(util.inspect(result, false, Infinity, true));
      }
    }
  });
};
