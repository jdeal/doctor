'use strict';
var express = require('express');

var PORT = 3000;
var PUBLIC_DIR = __dirname + '/../view';
console.log('serving files from', PUBLIC_DIR);

// Create a static file server.
var app = express.createServer();
var statik = express['static'];
app.use(statik(PUBLIC_DIR));
app.listen(PORT);

console.log('server listening on ' + app.address().port);
