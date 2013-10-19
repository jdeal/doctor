# doctor

[![Build Status](https://secure.travis-ci.org/jdeal/doctor.png)](http://travis-ci.org/jdeal/doctor)

Doctor converts JavaScript source to documentation, using rules to rely on
conventions so that comment tags are (mostly) not needed.

## Say what?

Maybe a picture will help:

![pipeline](https://github.com/jdeal/doctor/raw/master/images/doctor-pipeline.png)

Okay, maybe that needs some explanation.

Source files are parsed using a JavaScript grammar. This pushes out a plain
Lisp-like AST. This is refined with some transform rules. The default transform
rules also use a grammar to parse the JSDoc-style comment tags. This is to add
in things that cannot be inferred from the JavaScript source, such as function
description and parameter types.

Rules are applied to the refined AST to output a report, which is just a flat
JSON object containing items and groups of items. The report is optionally run
through a render module to convert the report to some format other than a single
JSON file.

Doctor also provides an option that takes a number of view directories and
merges them together into a single output directory, along with the report
file(s). A default HTML/JavaScript view is provided to view the default report
as HTML.

Doctor has initial (rough) support for markdown as well, integrating that into
the report if passed along with the source.

Because of its modular and somewhat pluggable design, you can hack in your own
grammars, rules, etc. and use it as a general-purpose AST analysis tool.

## Installation

```bash
npm install doctor
```

or if you want the latest

```bash
npm install git:github.com/jdeal/doctor.git
```

## Examples, please!

Note that these examples assume a shell that expands wildcards.

This is how doctor documents itself from the command-line:

```bash
doctor lib/*.js *.md -v default -v doctor -o ../doc
```

You can see the documentation [here](http://jdeal.github.com/doctor/doc).

The above command (when run from inside doctor's repository directory) takes all
the .js files and all the .md files and runs them through the default transform
and default report rules. It puts the report into ../doc and merges the default
and doctor views into ../doc. For many of doctor's options, it will look for a
built-in resource first and then try to find it in the directory provided. In
this example, doctor has views named default and doctor, so it finds them in
itself. If an alternate view was provided, say my-view, it would look for that
path, whether it be local or absolute.

These and other options are described in more detail in the command-line section
below.

You can also look at the [examples](http://github.com/jdeal/doctor/tree/master/examples).

## Command-line usage

Dump a report file to the console:

```bash
doctor myfile1.js myfile2.js
```

If no output directory is provided, doctor will throw the report (or whatever is
requested, such as the raw AST) to the the console.

To write out the report file, give it a directory:

```bash
doctor myfile1.js myfile2.js -o output
```

Doctor will write the report to a file named report.json. If you prefer a
different name:

```bash
doctor myfile1.js myfile2.js -o output/myreport.json
```

When doctor sees the .json extension like this, it assumes you mean to rename
the report.

You can also pass package.json files to doctor. It will use the main property to
find the source file:

```bash
doctor package.json -o output
```

To output the default viewer along with your report:

```bash
doctor myfile1.js myfile2.js -o output -v default
```

The default viewer files will be located in the output directory along with your
report.

To merge your own files into the view, pass multiple views:

```bash
doctor myfile1.js myfile2.js -o output -v default -v ~/my-view
```

When multiple views are passed, they are processed in order. So, if a later view
can overwrite a previous view's files. This is useful when you want a view to
differ only slightly. This is how doctor documents itself, by overriding the
config file of the default view.

You can override the grammar if you feel adenturous:

```bash
doctor myfile1.js myfile2.js --grammar ~/my-better-grammar.pegjs
```

Note that the JavaScript grammar is pretty complicated, so you probably want to
use doctor's included grammar (in grammar/javascript.pegjs) as a starting point.

You can override the grammar for a specific file extension. This is necessary if
you want to alter the JavaScript grammar for .js while leaving the markdown
grammar registered for .md.

```bash
doctor source.js readme.md --grammar.js ~/my-js-gramar.pegjs
```

You can add your own transform rules:

```bash
doctor myfile1.js myfile2.js -t default -t ~/more-tranform-rules.js
```

Transform rules are useful for modifying the AST prior to creating reports.
They're powerful, but also easy to mess up. Look at doctor's own transform rules
(transform/default) for examples, or look in the examples directory for simpler
examples.

Perhaps most important, you can add your own report rules:

```bash
doctor myfile1.js myfile2.js -r default -r ~/more-report-rules.js
```

This is what doctor is all about. You can look at doctor's own rules
(report/default), but these are pretty complicated. Some simpler examples are
in the examples directory.

You can also use a custom renderer:

```bash
doctor myfile1.js myfile2.js --render ~/my-render.js
```

This allows you to modify the resulting JSON report or convert it to something
else entirely. Doctor's default renderer exists only to convert markdown to
HTML. You'll also find a markdown renderer (default/markdown) which is meant
to convert the JSON to markdown files, but this is not finished.

By default, doctor passes unknown JSDoc tags through to the report, but you can
have it complain if it sees unknown tags:

```bash
doctor myfile1.js --no-unknown
```

Any of the default enabled options (grammar, transform, report, render, and
unknown) can be disabled by prefixing the option with no-.

You can force doctor to return its AST like this:

```bash
doctor myfile1.js --no-transform --no-report --ast
```

Notice that we turned of the transform and report rules in this example. We
could leave the transform rules enabled if we wanted to see the AST after
transformation. If we leave the report active, we'll get an object returned
that contains the AST and the report.

## Programmatic usage

All the same options are available programmatically.

```js
var doctor = require('doctor');
var options = {
  files: ['myfile1.js', 'myfile2.js'],
  view: ['default', '~/my-view'],
  grammar: '~/my-better-grammar.pegjs',
  transform: ['default', '~/more-tranform-rules.js'],
  report: {js:
    ['default', '~/more-report-rules.js']
  },
  render: 'default',
  unknown: false,
  output: '~/documentation'
};
doctor.examine(options, function (err, report) {
  // done
});
```

## API

For writing transform and report rules, you'll need to learn doctor's API. You
can see doctor's own documentation for that:

http://jdeal.github.com/doctor/doc

## Conventions

The default rules supplied by doctor (report/default) will document the
following conventions in your code. (In this section, _doctor_ may refer to
doctor and its default rules.)

### CommonJS modules

Doctor only documents the public API, via CommonJS exports.

```js
exports.foo = function () {};
```

```js
module.exports = {foo: function () {}}
```

```js
module.exports = function () {}
```

Note that doctor can find many variations of the above patterns. For example,
it can generally see when you're setting variables and then exporting those
variables, even if you're setting the variables to other required modules. If
doctor can't figure out what you're exporting, there's a good chance humans also
can't figure it out.

### AMD modules

Doctor sees AMD-style exports as well.

```js
define(function () {
  return {foo: function () {}};
});
```

Again, it can see some variations of
this, although it may not be quite as resilient as node-style exports.

### Function parameters

Of course, doctor documents parameters of exported functions.

```js
function foo(bar) {}
```

### Optional parameters

Doctor can see where a parameter is given a default value.

```js
function foo(bar) {
  bar = bar || 'baz';
}
```

### Constructors

Doctor will assume upper-case functions are constructors.

```js
function Foo() {}

module.exports = Foo;
```

### Instances

Doctor can see when an instance is exported.

```js
function Foo() {}

Foo.prototype.bar = function () {};

module.exports = new Foo();
```

Given that export, doctor knows your module has exported a function named bar.

### Following dependencies

Doctor can follow require.

```js
var bar = require('./bar');

exports.bar = bar;
```

And it can follow AMD dependencies.

```js
define(['./bar'], function (bar) {
  return {bar: bar};
});
```

Note that doctor will only document what is passed to it. It will not document
dependent modules, except when they are exported from a passed-in module.

So, if the above code is part of foo.js, and you call doctor like this:

```bash
doctor lib/foo.js
```

bar.js will not be documented, even though doctor follows it.

### Literal prototypes

```js
function Foo() {
}

Foo.prototype = {
  bar: function () {
  }
}
```

## JSDoc tags

Where doctor cannot infer documentation from convention, JSDoc tags can be used
to annotate the code.

Note that you can use multi-line or single-line comment style.

### @description

Add a description to a function, using markdown.

```js
/*
@description Returns a greeting.
*/
function hello() {
  return "Hello!";
}
```

If a comment appears with no tag, it is assumed to be a description.

```js
/*
Returns a greeting.
*/
function hello() {
  return "Hello!";
}
```

### @param

Add a description and optional type to a function parameter.

```js
/*
@param {string} name - Name of a person.
*/
function greeting(name) {
  return "Hello, " + name + ".";
}
```

Note the optional dash (-) which can be used to visually separate the
description.

Note that doctor will match the parameters to the name of the function. So a
function like this:

```js
/*
@param {number} y - The y, of course.
*/
function foo(x, y, z) {
  return x * y + z;
}
```

will add a description to the y parameter. This is different from JSDoc which
matches the parameters by position.

If a parameter is an object with certain properties, you can document the
properties like this:

```js
/*
@param {object} car - The car.
@param {number} car.speed - The speed of the car.
*/
function drive(car) {
  console.log("The car is going " + car.speed + "mph.");
}
```

If a parameter is a function with certain parameters, you can document the
parameters like this:

```js
/*
@param {function(err, message)} callback - Function to call when finished.
*/
function waitAndThen(callback) {
  setTimeout(function () {
    callback(null, "hello");
  }, 1000);
}
```

Note that doctor's default view doesn't do anything except parrot these
parameters, but they are available in the report.

Optional parameters can be documented with brackets, and default values can be
documented with an assignment.

```js
/*
@param {string} [name = "you"] - Name of a person.
*/
function greeting(name) {
  name = name || "you";
  return "Hello, " + name + ".";
}
```

As noted above though, this is unnecessary, as doctor can see the convention for
optional parameters.

### @return, @returns

Document the return type of a function.

```js
/*
@returns string
*/
function foo() {
  return "bar";
}
```

### @class

Add a description for the class.

```js
/*
@class A useful widget.
*/
function UsefulWidget() {
  
}
```

### @constructor

Add a description for the constructor.

```js
/*
@constructor Makes a widget.
*/
function UsefulWidget() {
  
}
```

This is not really necessary since doctor sees upper-case functions as
constructors. In doctors default view, the constructor description just gets
concatenated to the description.

### @example

Adds example usage to a module or function.

```js
/*
@example
var msg = greeting();
*/
function greeting() {
  return "Hello!";
}
```

### @extends

Sets the base class for a class.

```js
/*
@extends Widget
*/
function UsefulWidget() {
  
}
```

(Yes, doctor should be support a convention for this.)

### @private, @public

Doctor's default rules assume that everything exported is public and everything
else is private.

You can explicitly set something to private to hide it in
doctor's default rules.

```js
/*
@private
*/
module.exports._foo = function () {
  return "Don't use me. I'm not documented!";
}
```

You can explicitly set something to public to force doctor to add it to the
report. For example, in some cases, you may export something (say, via a
return value of a function) that doctor doesn't see as public. If you mark a
constructor as public, doctor will automatically add all methods of that class
to the report as well.

```js
/*
Secret constructor.

@class Secret maker.

@public
*/
function Secret() {
}
```

### @signature

This allows documenting alternate signatures of a single function. For example,
a setter and getter can sometimes be the same function. The @signature parameter
set the description for these signatures and allows overriding parameter 
descriptions.

```js
/*
@param name - Attribute name.
*/
function attr(name, value) {
/*
@signature Get attribute value.
@param value - Attribute value.
*/
  if (typeof value === 'undefined') {

  }
/*
@signature Set attribute value.
*/
}
```

### @copy

This allows copying the tags from another function in the case that one
function shares parameters or descriptions with another function.

```js
/*
Create a TPS report.
@param name - Author of the report.
@param verbose - Add 
*/
function createTpsReport(name, verbose) {
  return {
    name: name,
    summary: "I didn't get any cake."
  }
  if (verbose) {
    console.log("wasting time...");
  }
}

/*
@copy createTpsReprot
*/
function createVerboseTpsReport(name) {
  createTpsReport(name, true);
}
```

### @abstract

Really? What, are you a Java programmer?

Fine, this marks a class as abstract.

## Writing custom rules

Doctor's default rules are useful for normal documentation tasks, but you can do
all kinds of neat things by writing your own rules.

A rules module should export an array of rules or an object with a "rules"
property. If multiple rules match the same AST node type, then they will fire
in the order in which they declare.

### Transform rules

Transform rules follow this pattern:

```js
{
  type: 'define-function',
  match: function (node) {
    var name = node.nodes[0].value;
    return name === 'foo';
  },
  transform: function (node, report) {
    node.remove();
  }
}
```

__type__

This property should be a string specifying the AST node type or an array of
node types. Note that you can use pseudo-end node types, for which rules will
fire after all descendent node rules have fired. For example, define-function
has a corresponding end-define-function which will fire after the entire body
of the function has been processed.

__match__ (optional)

This property is an optional function that can further filter the node.

__transform__

This property is a function that is called to transform the node.

### Report rules

Report rules follow this pattern:

```js
{
  type: 'define-function',
  match: function (node) {
    var name = node.nodes[0].value;
    return name === 'foo';
  },
  report: function (node, report) {
    var name = node.nodes[0].value;
    return {
      key: 'define-function:' + name,
      name: name
    }
  }
}
```

__type__

This property should be a string specifying the AST node type or an array of
node types. Note that you can use pseudo-end node types, for which rules will
fire after all descendent node rules have fired. For example, define-function
has a corresponding end-define-function which will fire after the entire body
of the function has been processed.

__match__ (optional)

This property is an optional function that can further filter the node.

__report__

This property is a function that manipulates the report, either via the report
parameter or by returning a report item or an array of report items.

## AST node types

If you write your own rules, you'll need to know the following AST node types.

As noted above, each AST node type has a corresponding end type. So
define-function has a matching end-define-function.

### files

A group of all files. Rules for this node type (and the corresponding end-files)
will fire only once.

### file

Each file.

### undefined

Undefined node. For example: if an else clause of an if statement is
undefined, the else clause will be an undefined node.

### name

An identifier. For example: a function name, a variable name.

### number

A number. For example: 3, 5.6.

### string

A string. For example: "hello".

### null

A null literal.

### boolean

A boolean literal (true or false).

### regex

A literal regular expression.

### regex-body

The body (between the slashes) of a regular expression.

### regex-flags

The flags (after the second slash) of a regular expression.

### this

The "this" keyword.

### object

A literal object.

### property

A key and value set of a literal object.

### get

Getter.

### set

Setter.

### new

Using new to instantiate an object with a constructor.

### dot

Using dot to access a property or method. For example: foo.bar, foo.baz().

### call

A function call.

### subscript

Using brackets to access a property or index. For example: foo[0], foo["bar"].

### expression

A parenthetical expression. For example: (3 + 5), (a || b).

### postfix

A postfix expression. For example: x--, i++.

### operator

The operator used in an expression.

### unary

A unary prefix expression. For example: --x, ++i;

### binary

An binary expression. For example: 3 + 5, a || b.

### conditional

A conditional expression.

### assign

Assignment of a value to a variable.

### vars

A group of variable declarations.

### var

A single variable declaration.

### empty

An empty statment, which basically means a semicolon by itself.

### if

An if statement.

### do-while

A do-while statement.

### while

A while statement.

### for

A for loop.

### for-in

A for-in loop.

### continue

A continue statement.

### break

A break statement.

### return

A return statement.

### with

A with statement.

### switch

A switch statement.

### case

A case statement of a switch statement.

### default

A default statement of a switch statement.

### nodes

A group of AST nodes, which is part of another node. For example, the body of a
function is a node of type "nodes" containing all the nodes of the body.

### labeled-statement

A labeled statement.

### throw

A throw.

### try

A try.

### catch

A catch clause of a try.

### finally

A finally clause of a try.

### debug

A debugger statement.

### define-function

A function definition.

### function

A function expression.

### parameters

The parameters of a function.

## FAQ

### Why did you do this? Don't you know [insert here] already exists.

Yeah, but [insert here] works off of comment tags and not off of coding
conventions. And [insert here] doesn't make it easy to add new conventions. And
[insert here] isn't a pure node module. And doctor aims to be a general purpose
code analysis tool.

### Seriously, why did you do this?

Some kind of OCD thing.

### Why isn't this split into two projects, one for the analysis tool and another for code documentation?

Maybe it should be. It grew up that way, and I haven't spent any thought or
effort on splitting it.

### Why is the code so ugly? What's with all these weird wrapping closures around fs and path?

That is thanks to synchronous require. I love node, but I hate synchronous
require. (Yes, I understand why it's synchronous.) Because I wanted doctor to
work asynchronously or synchronously, I had to make asynchronous signatures for
the synchronous functions and then swap them out as needed.

The rest of the ugliness is my fault.

### How do I contribute?

The usual: fork, add a (preferably discrete) fix/change with the necessary
tests, and do a pull request. I can't promise to respond immediately or even in
a reasonable timeframe, but I'll do my best to eventually get to it.

### Have these questions actually been frequently asked?

No, just being proactive.