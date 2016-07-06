'use strict';

var argv = require('yargs').argv;
var gulp = require('gulp');
var gutil = require('gulp-util');
var connect = require('gulp-connect');
var webpack = require('webpack-stream');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var clean = require('gulp-clean');
var karma = require('gulp-karma');
var opens = require('open');
var webpackConfig = require('./webpack.conf.js');
var helpers = require('./gulpHelpers');
var del = require('del');
var gulpJsdoc2md = require('gulp-jsdoc-to-markdown');
var concat = require('gulp-concat');
var jscs = require('gulp-jscs');
var header = require('gulp-header');
var zip = require('gulp-zip');
var replace = require('gulp-replace');

var CI_MODE = process.env.NODE_ENV === 'ci';
var prebid = require('./package.json');
var dateString = 'Updated : ' + (new Date()).toISOString().substring(0, 10);
var packageNameVersion = prebid.name + '_' + prebid.version;
var banner = '/* <%= prebid.name %> v<%= prebid.version %>\n' + dateString + ' */\n';
var analyticsDirectory = '../analytics';

// Tasks
gulp.task('default', ['clean', 'quality', 'webpack']);

gulp.task('serve', ['clean', 'quality', 'devpack', 'webpack', 'watch', 'test']);

gulp.task('build', ['clean', 'quality', 'webpack', 'devpack', 'zip']);

gulp.task('clean', function () {
  return gulp.src(['build'], {
      read: false
    })
    .pipe(clean());
});

gulp.task('devpack', function () {
  webpackConfig.devtool = 'source-map';
  const analyticsSources = helpers.getAnalyticsSources(analyticsDirectory);
  return gulp.src([].concat(analyticsSources, 'src/prebid.js'))
    .pipe(webpack(webpackConfig))
    .pipe(replace('$prebid.version$', prebid.version))
    .pipe(gulp.dest('build/dev'))
    .pipe(connect.reload());
});

gulp.task('webpack', function () {

  // change output filename if argument --tag given
  if (argv.tag && argv.tag.length) {
    webpackConfig.output.filename = 'prebid.' + argv.tag + '.js';
  }

  webpackConfig.devtool = null;

  const analyticsSources = helpers.getAnalyticsSources(analyticsDirectory);
  return gulp.src([].concat(analyticsSources, 'src/prebid.js'))
    .pipe(webpack(webpackConfig))
    .pipe(replace('$prebid.version$', prebid.version))
    .pipe(uglify())
    .pipe(header(banner, { prebid: prebid }))
    .pipe(gulp.dest('build/dist'))
    .pipe(connect.reload());
});

//zip up for release
gulp.task('zip', ['jscs', 'clean', 'webpack'], function () {
  return gulp.src(['build/dist/*', 'integrationExamples/gpt/*'])
    .pipe(zip(packageNameVersion + '.zip'))
    .pipe(gulp.dest('./'));
});

// Karma Continuous Testing
// Pass your browsers by using --browsers=chrome,firefox,ie9
// Run CI by passing --watch
gulp.task('test', function () {
  var defaultBrowsers = CI_MODE ? ['PhantomJS'] : ['Chrome'];
  var browserArgs = helpers.parseBrowserArgs(argv).map(helpers.toCapitalCase);

  if (argv.browserstack) {
    browserArgs = [
      'bs_ie_13_windows_10',
      'bs_ie_12_windows_10',
      'bs_ie_11_windows_10',
      'bs_firefox_46_windows_10',
      'bs_chrome_51_windows_10',
      'bs_ie_11_windows_8.1',
      'bs_firefox_46_windows_8.1',
      'bs_chrome_51_windows_8.1',
      'bs_ie_10_windows_8',
      'bs_firefox_46_windows_8',
      'bs_chrome_51_windows_8',
      'bs_ie_11_windows_7',
      'bs_ie_10_windows_7',
      'bs_ie_9_windows_7',
      'bs_firefox_46_windows_7',
      'bs_chrome_51_windows_7',
      'bs_safari_9.1_mac_elcapitan',
      'bs_firefox_46_mac_elcapitan',
      'bs_chrome_51_mac_elcapitan',
      'bs_safari_8_mac_yosemite',
      'bs_firefox_46_mac_yosemite',
      'bs_chrome_51_mac_yosemite',
      'bs_safari_7.1_mac_mavericks',
      'bs_safari_6.2_mac_mavericks',
      'bs_firefox_46_mac_mavericks',
      'bs_chrome_49_mac_mavericks'
    ];
  }

  return gulp.src('lookAtKarmaConfJS')
    .pipe(karma({
      browsers: (browserArgs.length > 0) ? browserArgs : defaultBrowsers,
      configFile: 'karma.conf.js',
      action: (argv.watch) ? 'watch' : 'run'
    }));
});

// Small task to load coverage reports in the browser
gulp.task('coverage', function (done) {
  var coveragePort = 1999;

  connect.server({
    port: 1999,
    root: 'build/coverage',
    livereload: false
  });
  opens('http://localhost:' + coveragePort + '/coverage/');
  done();
});

// Watch Task with Live Reload
gulp.task('watch', function () {

  gulp.watch(['test/spec/**/*.js'], ['quality', 'webpack', 'devpack', 'test']);
  gulp.watch(['integrationExamples/gpt/*.html'], ['test']);
  gulp.watch(['src/**/*.js'], ['quality', 'webpack', 'devpack', 'test']);
  connect.server({
    port: 9999,
    root: './',
    livereload: true
  });
});

gulp.task('quality', ['hint', 'jscs']);

gulp.task('hint', function () {
  return gulp.src('src/**/*.js')
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'));
});

gulp.task('jscs', function () {
  return gulp.src('src/**/*.js')
    .pipe(jscs({
      configPath: '.jscsrc'
    }))
    .pipe(jscs.reporter());
});

gulp.task('clean-docs', function () {
  del(['docs']);
});

gulp.task('docs', ['clean-docs'], function () {
  return gulp.src('src/prebid.js')
    .pipe(concat('readme.md'))
    .pipe(gulpJsdoc2md())
    .on('error', function (err) {
      gutil.log('jsdoc2md failed:', err.message);
    })
    .pipe(gulp.dest('docs'));
});
