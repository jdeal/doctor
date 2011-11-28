# doctor

Doctor converts JavaScript source to documentation, using rules to rely on
conventions so that comment tags are (mostly) not needed.

## Say what?

Maybe a picture will help:

![pipeline](https://github.com/jdeal/doctor/raw/master/README/doctor-pipeline.png)

Okay, maybe that needs some explanation.

Source files are parsed using a JavaScript grammar. This pushes out a plain
Lisp-like AST. This is refined with some transform rules. The default transform
rules also use a grammar to parse the JSDoc-style comment tags. This is to add
in things that cannot be inferred from the JavaScript source, such as function
description and parameter types.

Rules are applied to the refined AST to output a report, which is just a hash
table of items and groups of items. The report is optionally run through a
render module to convert the report to some format other than a single JSON
file.

As a service, doctor also takes a number of view directories and merges them
together into a single output directory, along with the report file(s). If the
default single-file JSON is used, the view will be a JavaScript-based viewer
that converts the report items into HTML.

## Installation

```
npm install doctor
```

or if you want the latest

```
npm install git:github.com/jdeal/doctor.git
```

## Command-line usage

Dump a report file to the console:

```
doctor myfile1.js myfile2.js
```

To write out the report file, give it a directory:

```
doctor myfile1.js myfile2.js -o output
```

And it will write the report to a file named report.json. If you prefer a
different name:

```
doctor myfile1.js myfile2.js -o output/myreport.json
```

To output the default viewer along with your report:

```
doctor myfile1.js myfile2.js -o output -v default
```

To merge in your own files into the view, pass multiple views:

```
doctor myfile1.js myfile2.js -o output -v default -v ~/my-view
```

You can override the grammar if you feel adenturous:

```
doctor myfile1.js myfile2.js --grammar ~/my-better-grammar.pegjs
```

You can add your own transform rules:

```
doctor myfile1.js myfile2.js -t default -t ~/more-tranform-rules.js
```

Or your own report rules:

```
doctor myfile1.js myfile2.js -r default -r ~/more-report-rules.js
```

You can use a renderer:

```
doctor myfile1.js myfile2.js --render render/markdown.js
```

## Programmatic usage

All the same options are available programmatically.

```js
var doctor = require('doctor');
var options = {
  files: ['myfile1.js', 'myfile2.js'],
  view: ['default', '~/my-view'],
  grammar: '~/my-better-grammar.pegjs',
  transform: ['default', '~/more-tranform-rules.js'],
  report: ['default', '~/more-report-rules.js'],
  render: 'render/markdown.js'
};
doctor.examine(options, function (err, report) {
  // done
});
```


## Misc

To serve dynamically generated documentation:

```
cp output/report.json view
node lib/server.js
open http://localhost:3000
```

To automatically generate doc.css when doc.scss is modified:

```
cd view
sass --watch .:.
```
