'use strict';

var _ = require('lodash');
var argv = require('yargs').argv;
var gulp = require('gulp');
var argv = require('yargs').argv;
var gutil = require('gulp-util');
var connect = require('gulp-connect');
var webpack = require('webpack-stream');
var uglify = require('gulp-uglify');
var clean = require('gulp-clean');
var karma = require('gulp-karma');
var opens = require('open');
var webpackConfig = require('./webpack.conf.js');
var helpers = require('./gulpHelpers');
var del = require('del');
var gulpJsdoc2md = require('gulp-jsdoc-to-markdown');
var concat = require('gulp-concat');
var header = require('gulp-header');
var footer = require('gulp-footer');
var replace = require('gulp-replace');
var shell = require('gulp-shell');
var optimizejs = require('gulp-optimize-js');
var eslint = require('gulp-eslint');
var gulpif = require('gulp-if');
var sourcemaps = require('gulp-sourcemaps');
var fs = require('fs');

var CI_MODE = process.env.NODE_ENV === 'ci';
var prebid = require('./package.json');
var dateString = 'Updated : ' + (new Date()).toISOString().substring(0, 10);
var packageNameVersion = prebid.name + '_' + prebid.version;
var banner = '/* <%= prebid.name %> v<%= prebid.version %>\n' + dateString + ' */\n';
var analyticsDirectory = '../analytics';
var port = 9999;

// Tasks
gulp.task('default', ['webpack']);

gulp.task('serve', ['lint', 'build-bundle-dev', 'watch', 'test']);

gulp.task('serve-nw', ['lint', 'watch', 'e2etest']);

gulp.task('run-tests', ['lint', 'test']);

gulp.task('build', ['build-bundle-prod']);

gulp.task('clean', function () {
  return gulp.src(['build'], {
      read: false
    })
    .pipe(clean());
});

function bundle(dev) {
  var modules = helpers.getArgModules(),
      allModules = helpers.getModuleNames(modules);

  if(modules.length === 0) {
    modules = allModules;
  } else {
    var diff = _.difference(modules, allModules);
    if(diff.length !== 0) {
      throw new gutil.PluginError({
        plugin: 'bundle',
        message: 'invalid modules: ' + diff.join(', ')
      });
    }
  }

  var entries = [helpers.getBuiltPrebidCoreFile(dev)].concat(helpers.getBuiltModules(dev, modules));

  gutil.log('Concatenating files:\n', entries);
  gutil.log('Appending ' + prebid.globalVarName + '.processQueue();');

  return gulp.src(
      entries
    )
    .pipe(gulpif(dev, sourcemaps.init({loadMaps: true})))
    .pipe(concat(argv.bundleName ? argv.bundleName : 'prebid.js'))
    .pipe(gulpif(!argv.manualEnable, footer('\n<%= global %>.processQueue();', {
        global: prebid.globalVarName
      }
    )))
    .pipe(gulpif(dev, sourcemaps.write('.')))
    .pipe(gulp.dest('build/' + (dev ? 'dev' : 'dist')));
}

gulp.task('build-bundle-dev', ['devpack'], bundle.bind(null, true));
gulp.task('build-bundle-prod', ['webpack'], bundle.bind(null, false));
gulp.task('bundle', bundle.bind(null, false)); // used for just concatenating pre-built files with no build step

gulp.task('devpack', ['clean'], function () {
  webpackConfig.devtool = 'source-map';
  var externalModules = helpers.getArgModules();

  const analyticsSources = helpers.getAnalyticsSources(analyticsDirectory);
  const moduleSources = helpers.getModulePaths(externalModules);

  return gulp.src([].concat(moduleSources, analyticsSources, 'src/prebid.js'))
    .pipe(helpers.nameModules(externalModules))
    .pipe(webpack(webpackConfig))
    .pipe(replace('$prebid.version$', prebid.version))
    .pipe(gulp.dest('build/dev'))
    .pipe(connect.reload());
});

gulp.task('webpack', ['clean'], function () {

  // change output filename if argument --tag given
  if (argv.tag && argv.tag.length) {
    webpackConfig.output.filename = 'prebid.' + argv.tag + '.js';
  }

  webpackConfig.devtool = null;

  var externalModules = helpers.getArgModules();

  const analyticsSources = helpers.getAnalyticsSources(analyticsDirectory);
  const moduleSources = helpers.getModulePaths(externalModules);

  return gulp.src([].concat(moduleSources, analyticsSources, 'src/prebid.js'))
    .pipe(helpers.nameModules(externalModules))
    .pipe(webpack(webpackConfig))
    .pipe(replace('$prebid.version$', prebid.version))
    .pipe(uglify())
    .pipe(gulpif(file => file.basename === 'prebid.js', header(banner, { prebid: prebid })))
    .pipe(optimizejs())
    .pipe(gulp.dest('build/dist'))
    .pipe(connect.reload());
});

// Karma Continuous Testing
// Pass your browsers by using --browsers=chrome,firefox,ie9
// Run CI by passing --watch
gulp.task('test', ['clean'], function () {
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
      'bs_chrome_49_mac_mavericks',
      'bs_ios_7',
      'bs_ios_8',
      'bs_ios_9',
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

  gulp.watch([
    'src/**/*.js',
    'modules/**/*.js',
    'test/spec/**/*.js',
    '!test/spec/loaders/**/*.js'
  ], ['lint', 'build-bundle-dev', 'test']);
  gulp.watch([
    'loaders/**/*.js',
    'test/spec/loaders/**/*.js'
  ], ['lint']);
  connect.server({
    https: argv.https,
    port: port,
    root: './',
    livereload: true
  });
});

gulp.task('lint', () => {
  return gulp.src(['src/**/*.js', 'test/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format('stylish'))
    .pipe(eslint.failAfterError());
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

gulp.task('e2etest', ['devpack', 'webpack'], function() {
  var cmdQueue = [];
  if(argv.browserstack) {
    var browsers = require('./browsers.json');
    delete browsers['bs_ie_9_windows_7'];

    var cmdStr = ' --config nightwatch.conf.js';
    if (argv.group) {
      cmdStr = cmdStr + ' --group ' + argv.group;
    }
    cmdStr = cmdStr + ' --reporter ./test/spec/e2e/custom-reporter/pbjs-html-reporter.js';

    var startWith = 'bs';

    Object.keys(browsers).filter(function(v){
      return v.substring(0, startWith.length) === startWith && browsers[v].browser !== 'iphone';
    }).map(function(v,i,arr) {
      var newArr = (i%2 === 0) ? arr.slice(i,i+2) : null;
      if(newArr) {
        var cmd = 'nightwatch --env ' + newArr.join(',') + cmdStr;
        cmdQueue.push(cmd);
      }
    });
  }

  return gulp.src('')
    .pipe(shell(cmdQueue.join(';')));
});

gulp.task('e2etest-report', function() {
  var reportPort = 9010;
  var targetDestinationDir = './e2etest-report';
  helpers.createEnd2EndTestReport(targetDestinationDir);
  connect.server({
    port: reportPort,
    root: './',
    livereload: true
  });

  setTimeout(function() {
    opens('http://localhost:' + reportPort + '/' + targetDestinationDir.slice(2) + '/results.html');
  }, 5000);

});

gulp.task('build-postbid', function() {
  return gulp.src('./integrationExamples/postbid/oas/postbid.js')
    .pipe(uglify())
    .pipe(gulp.dest('build/dist'));
});
