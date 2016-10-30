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
