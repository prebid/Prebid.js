/** Run `gulp serve` to serve files from this directory in development
 * Set two different entries in hosts to use x-domain iframes
 * AMP requires https
 */

var gulp = require('gulp');
var connect = require('gulp-connect');
var port = 5000;

gulp.task('serve', function() {
  connect.server({
    port: port,
    root: './',
    livereload: true,
    https: true
  });
});
