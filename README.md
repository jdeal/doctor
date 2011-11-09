# doctor

Creates documentation from a JavaScript AST.

## Installation

npm install doctor

## Usage

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
