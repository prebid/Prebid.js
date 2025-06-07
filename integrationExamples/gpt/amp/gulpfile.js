/** Run `gulp serve` to serve files from this directory in development
 * Set two different entries in hosts to use x-domain iframes
 * AMP requires https
 */

var gulp = require('gulp');
var express = require('express');
var http = require('http');
var port = 5000;

gulp.task('serve', function() {
  var app = express();
  app.use(express.static('./'));
  http.createServer(app).listen(port);
});
