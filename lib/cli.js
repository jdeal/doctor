/*
Command-line interface into doctor.
*/

var opt = require('optimist');
var util = require('util');

var doctor = require('./doctor');

/*
Map command-line arguments to doctor's examine function.
@param {Object} argv Just the command-line arguments. In other words,
process.argv.slice(2).
*/
module.exports = function cli(argv) {
  // optimist likes to use real args
  var saveArgv = process.argv;
  process.argv = argv;

  argv = opt
    .usage('Convert source to metadata.\nUsage: $0 <file ...> [options]\n\n' +
           'Deactivate default options with --no-<option-name>.')
    .demand(1)

    .describe('grammar', 'override grammar')

    .alias('transform', 't')
    .default('transform', true)
    .describe('transform', 'use transform rules')

    .alias('report', 'r')
    .default('report', true)
    .describe('report', 'use report rules')

    .default('render', true)
    .describe('render', 'use render module')

    .default('unknown', true)
    .describe('unknown', 'allow unknown comment tags')

    .boolean('ast')
    .default('ast', false)
    .describe('ast', 'return ast')

    .alias('output', 'o')
    .default('output', false)
    .describe('output', 'write to output dir')

    .alias('view', 'v')
    .default('view', false)
    .describe('view', 'copy view dir to output dir')

    .default('verbose', false)
    .describe('verbose', 'print progress')

    // .check(function (argv){
    //   return false
    // })

    .argv;

  // done with optimist
  process.argv = saveArgv;

  //console.log(argv);

  var options = {
    files: argv._,
    ast: argv.ast,
    report: argv.report,
    output: argv.output,
    view: argv.view,
    render: argv.render,
    transform: argv.transform,
    unknown: argv.unknown
  };

  if (argv.grammar) {
    options.grammar = argv.grammar;
  }

  Object.keys(argv).forEach(function (key, i) {
    if (key !== '_' && key !== '$0') {
      if (!(key in options)) {
        options[key] = argv[key];
      }
    }
  });

  doctor.examine(options, function (progress) {
    if (argv.verbose) {
      console.log(progress.message);
    }
  }, function (err, result) {
    //throw new Error('x')
    if (err) {
      //throw new Error(err)
      if (Object.keys(err).indexOf('stack') < 0 && err.stack) {
        console.log('stack:\n' + err.stack);
      }
      Object.keys(err).forEach(function (key) {
        console.log(key + ':\n' + err[key]);
      });
      process.exit(1);
    }
    if (!options.output) {
      if (!options.ast && options.render) {
        Object.keys(result).forEach(function (filename, i) {
          if (i > 0) {
            console.log("");
          }
          console.log((new Array(81)).join('-'));
          console.log("FILE: " + filename);
          console.log((new Array(81)).join('-'));
          //console.log(result[filename]);
          if (typeof result[filename] === 'string') {
            console.log(result[filename]);
          } else {
            console.log(JSON.stringify(result[filename], null, 2));
          }
        });
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
    }
  });
};
