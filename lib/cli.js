var opt = require('optimist');
var util = require('util');

var doctor = require('./doctor');

module.exports = function cli(argv) {
  // optimist likes to use real args
  var saveArgv = process.argv;
  process.argv = argv;

  argv = opt
    .usage('Convert source to metadata.\nUsage: $0 <file ...> [options]\n\n' +
           'Deactivate default options with --no-<option-name>.')
    .demand(1)

    .alias('debug', 'd')
    .boolean('debug', 'd')
    .default('debug', false)
    .describe('debug', 'pretty debugging json')

    .boolean('json')
    .default('json', false)
    .describe('json', 'plain debugging json')

    .alias('transform', 't')
    .default('transform', true)
    .describe('transform', 'use transform rules')
    
    .alias('report', 'r')
    .default('report', true)
    .describe('report', 'use report rules and return report')
    
    .boolean('ast')
    .default('ast', false)
    .describe('ast', 'return ast')
    
    .alias('output', 'o')
    .default('output', false)
    .describe('output', 'write report to output directory')

    .alias('view', 'v')
    .default('view', false)
    .describe('view', 'copy view directory to output directory')

    .default('render', null)
    .describe('render', 'use render module')

    // .check(function (argv){
    //   return false
    // })
    
    .argv;

  // done with optimist
  process.argv = saveArgv;

  if (!argv.debug && argv.json) {
    argv.debug = true;
  }

  var options = {
    files: argv._,
    debug: argv.debug,
    ast: argv.ast,
    report: argv.report,
    output: argv.output,
    view: argv.view,
    render: argv.render || null,
    transform: argv.transform
  };

  Object.keys(argv).forEach(function (key, i) {
    if (key !== '_' && key !== '$0') {
      if (!(key in options)) {
        options[key] = argv[key];
      }
    }
  });

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
    } else if (!options.output) {
      console.log(JSON.stringify(result, null, 2));
    }
  });
};
