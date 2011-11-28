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
doctor myfile.js myfile2.js -o output
```

And it will write the report to a file named report.json. If you prefer a
different name:

```
doctor myfile.js myfile2.js -o output/myreport.json
```




This will 

To generate a report.json file in the output subdirectory:

```
doctor --debug myfile1.js myfile2.js
```

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
