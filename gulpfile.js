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
var shell = require('gulp-shell');

var CI_MODE = process.env.NODE_ENV === 'ci';
var prebid = require('./package.json');
var dateString = 'Updated : ' + (new Date()).toISOString().substring(0, 10);
var packageNameVersion = prebid.name + '_' + prebid.version;
var banner = '/* <%= prebid.name %> v<%= prebid.version %>\n' + dateString + ' */\n';
var analyticsDirectory = '../analytics';
var port = 9999;

// Tasks
gulp.task('default', ['clean', 'quality', 'webpack']);

gulp.task('serve', ['clean', 'quality', 'devpack', 'webpack', 'watch', 'test']);

gulp.task('serve-nw', ['clean', 'quality', 'devpack', 'webpack', 'watch', 'e2etest']);

gulp.task('run-tests', ['clean', 'quality', 'webpack', 'test']);

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

  if (process.env.TRAVIS) {
    browserArgs = ['Chrome_travis_ci'];
  }

  if (argv.browserstack) {
    browserArgs = [
      'bs_ie_13_windows_10',
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

gulp.task('coveralls', ['test'], function() { // 2nd arg is a dependency: 'test' must be finished
  // first send results of istanbul's test coverage to coveralls.io.
  return gulp.src('gulpfile.js', { read: false }) // You have to give it a file, but you don't
  // have to read it.
    .pipe(shell('cat build/coverage/lcov/lcov.info | node_modules/coveralls/bin/coveralls.js'));
});

// Watch Task with Live Reload
gulp.task('watch', function () {

  gulp.watch(['test/spec/**/*.js'], ['quality', 'webpack', 'devpack', 'test']);
  gulp.watch(['integrationExamples/gpt/*.html'], ['test']);
  gulp.watch(['src/**/*.js'], ['quality', 'webpack', 'devpack', 'test']);
  connect.server({
    port: port,
    root: './',
    livereload: true
  });
});

gulp.task('quality', ['hint', 'jscs']);

gulp.task('hint', function () {
  return gulp.src('src/**/*.js')
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
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

gulp.task('e2etest', function() {
  var cmd = '--env default';
  if(argv.browserstack) {
    var browsers = require('./browsers.json');
    var env = [];
    var input = 'bs';
    for(var key in browsers) {
      if(key.substring(0, input.length) === input) {
        env.push(key);
      }
    }
    cmd = '--env default,' + env.join(',');
  }

  if(argv.browserstack) {
    cmd = cmd + ' --config nightwatch.conf.js';
  } else {
    cmd = cmd + ' --config nightwatch.json';
  }

  if (argv.group) {
    cmd = cmd + ' --group ' + argv.group;
  }

  cmd = cmd + ' --reporter ./test/spec/e2e/custom-reporter/pbjs-html-reporter.js';
  return gulp.src('')
    .pipe(shell('nightwatch ' + cmd));
});

gulp.task('e2etest-report', function() {
  var targetDestinationDir = './e2etest-report';
  helpers.createEnd2EndTestReport(targetDestinationDir);
  connect.server({
    port: port,
    root: './',
    livereload: true
  });

  setTimeout(function() {
    opens('http://localhost:' + port + '/' + targetDestinationDir.slice(2) + '/results.html');
  }, 5000);

});
