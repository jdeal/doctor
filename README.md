# doctor

Doctor converts JavaScript source to documentation, using rules to rely on
conventions so that comment tags are (mostly) not needed.

## Say what?

Maybe a picture will help:

![pipeline]()

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
