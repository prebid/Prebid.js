'use strict';

var _ = require('lodash');
var argv = require('yargs').argv;
var gulp = require('gulp');
var gutil = require('gulp-util');
var connect = require('gulp-connect');
var path = require('path');
var webpack = require('webpack');
var webpackStream = require('webpack-stream');
var uglify = require('gulp-uglify');
var clean = require('gulp-clean');
var KarmaServer = require('karma').Server;
var karmaConfMaker = require('./karma.conf.maker');
var opens = require('open');
var webpackConfig = require('./webpack.conf');
var helpers = require('./gulpHelpers');
var del = require('del');
var gulpDocumentation = require('gulp-documentation');
var concat = require('gulp-concat');
var header = require('gulp-header');
var footer = require('gulp-footer');
var replace = require('gulp-replace');
var shell = require('gulp-shell');
var optimizejs = require('gulp-optimize-js');
var eslint = require('gulp-eslint');
var gulpif = require('gulp-if');
var sourcemaps = require('gulp-sourcemaps');
var through = require('through2');
var fs = require('fs');
var jsEscape = require('gulp-js-escape');

var prebid = require('./package.json');
var dateString = 'Updated : ' + (new Date()).toISOString().substring(0, 10);
var banner = '/* <%= prebid.name %> v<%= prebid.version %>\n' + dateString + ' */\n';
var analyticsDirectory = '../analytics';
var port = 9999;

// Tasks
gulp.task('default', ['webpack']);

gulp.task('serve', ['lint', 'build-bundle-dev', 'watch', 'test']);

gulp.task('serve-nw', ['lint', 'watch', 'e2etest']);

gulp.task('run-tests', ['lint', 'test-coverage']);

gulp.task('build', ['build-bundle-prod']);

gulp.task('clean', function () {
  return gulp.src(['build'], {
      read: false
    })
    .pipe(clean());
});

function gulpBundle(dev) {
  return bundle(dev).pipe(gulp.dest('build/' + (dev ? 'dev' : 'dist')));
}

function nodeBundle(modules) {
  return new Promise((resolve, reject) => {
    bundle(false, modules)
      .on('error', (err) => {
        reject(err);
      })
      .pipe(through.obj(function(file, enc, done) {
        resolve(file.contents.toString(enc));
        done();
      }));
  });
}

// these modules must be explicitly listed in --modules to be included in the build, won't be part of "all" modules
var explicitModules = [
  'pre1api'
];

function bundle(dev, moduleArr) {
  var modules = moduleArr || helpers.getArgModules(),
      allModules = helpers.getModuleNames(modules);

  if(modules.length === 0) {
    modules = allModules.filter(module => !explicitModules.includes(module));
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

  var outputFileName = argv.bundleName ? argv.bundleName : 'prebid.js';

  // change output filename if argument --tag given
  if (argv.tag && argv.tag.length) {
    outputFileName = outputFileName.replace(/\.js$/, `.${argv.tag}.js`);
  }

  gutil.log('Concatenating files:\n', entries);
  gutil.log('Appending ' + prebid.globalVarName + '.processQueue();');
  gutil.log('Generating bundle:', outputFileName);

  return gulp.src(
      entries
    )
    .pipe(gulpif(dev, sourcemaps.init({loadMaps: true})))
    .pipe(concat(outputFileName))
    .pipe(gulpif(!argv.manualEnable, footer('\n<%= global %>.processQueue();', {
        global: prebid.globalVarName
      }
    )))
    .pipe(gulpif(dev, sourcemaps.write('.')));
}

// Workaround for incompatibility between Karma & gulp callbacks.
// See https://github.com/karma-runner/gulp-karma/issues/18 for some related discussion.
function newKarmaCallback(done) {
  return function (exitCode) {
    if (exitCode) {
      done(new Error('Karma tests failed with exit code ' + exitCode));
    } else {
      if (argv.browserstack) {
        process.exit(0);
      } else {
        done();
      }
    }
  }
}

gulp.task('build-bundle-dev', ['devpack'], gulpBundle.bind(null, true));
gulp.task('build-bundle-prod', ['webpack'], gulpBundle.bind(null, false));
gulp.task('bundle', gulpBundle.bind(null, false)); // used for just concatenating pre-built files with no build step

gulp.task('bundle-to-stdout', function() {
  nodeBundle().then(file => console.log(file));
});

gulp.task('devpack', ['clean'], function () {
  var cloned = _.cloneDeep(webpackConfig);
  cloned.devtool = 'source-map';
  var externalModules = helpers.getArgModules();

  const analyticsSources = helpers.getAnalyticsSources(analyticsDirectory);
  const moduleSources = helpers.getModulePaths(externalModules);

  return gulp.src([].concat(moduleSources, analyticsSources, 'src/prebid.js'))
    .pipe(helpers.nameModules(externalModules))
    .pipe(webpackStream(cloned, webpack))
    .pipe(replace('$prebid.version$', prebid.version))
    .pipe(gulp.dest('build/dev'))
    .pipe(connect.reload());
});

gulp.task('webpack', ['clean'], function () {
  var cloned = _.cloneDeep(webpackConfig);

  delete cloned.devtool;

  var externalModules = helpers.getArgModules();

  const analyticsSources = helpers.getAnalyticsSources(analyticsDirectory);
  const moduleSources = helpers.getModulePaths(externalModules);

  return gulp.src([].concat(moduleSources, analyticsSources, 'src/prebid.js'))
    .pipe(helpers.nameModules(externalModules))
    .pipe(webpackStream(cloned, webpack))
    .pipe(replace('$prebid.version$', prebid.version))
    .pipe(uglify())
    .pipe(gulpif(file => file.basename === 'prebid-core.js', header(banner, { prebid: prebid })))
    .pipe(optimizejs())
    .pipe(gulp.dest('build/dist'))
    .pipe(connect.reload());
});

// Run the unit tests.
//
// By default, this runs in headless chrome.
//
// If --watch is given, the task will re-run unit tests whenever the source code changes
// If --file "<path-to-test-file>" is given, the task will only run tests in the specified file.
// If --browserstack is given, it will run the full suite of currently supported browsers.
// If --browsers is given, browsers can be chosen explicitly. e.g. --browsers=chrome,firefox,ie9
gulp.task('test', ['clean'], function (done) {
  var karmaConf = karmaConfMaker(false, argv.browserstack, argv.watch, argv.file);

  var browserOverride = helpers.parseBrowserArgs(argv).map(helpers.toCapitalCase);
  if (browserOverride.length > 0) {
    karmaConf.browsers = browserOverride;
  }

  new KarmaServer(karmaConf, newKarmaCallback(done)).start();
});

// If --file "<path-to-test-file>" is given, the task will only run tests in the specified file.
gulp.task('test-coverage', ['clean'], function(done) {
  new KarmaServer(karmaConfMaker(true, false, false, argv.file), newKarmaCallback(done)).start();
});

// View the code coverage report in the browser.
gulp.task('view-coverage', function (done) {
  var coveragePort = 1999;

  connect.server({
    port: coveragePort,
    root: 'build/coverage/karma_html',
    livereload: false
  });
  opens('http://localhost:' + coveragePort);
  done();
});

gulp.task('coveralls', ['test-coverage'], function() { // 2nd arg is a dependency: 'test' must be finished
  // first send results of istanbul's test coverage to coveralls.io.
  return gulp.src('gulpfile.js', { read: false }) // You have to give it a file, but you don't
  // have to read it.
    .pipe(shell('cat build/coverage/lcov.info | node_modules/coveralls/bin/coveralls.js'));
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
  return gulp.src(['src/**/*.js', 'modules/**/*.js', 'test/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format('stylish'))
    .pipe(eslint.failAfterError());
});

gulp.task('clean-docs', function () {
  del(['docs']);
});

gulp.task('docs', ['clean-docs'], function () {
  return gulp.src('src/prebid.js')
    .pipe(gulpDocumentation('md'))
    .on('error', function (err) {
      gutil.log('`gulp-documentation` failed:', err.message);
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

// This task creates postbid.js. Postbid setup is different from prebid.js
// More info can be found here http://prebid.org/overview/what-is-post-bid.html
gulp.task('build-postbid', ['escape-postbid-config'], function() {
  var fileContent = fs.readFileSync('./build/postbid/postbid-config.js', 'utf8');

  return gulp.src('./integrationExamples/postbid/oas/postbid.js')
    .pipe(replace('\[%%postbid%%\]', fileContent))
    .pipe(gulp.dest('build/postbid/'));
});

// Dependant task for building postbid. It escapes postbid-config file.
gulp.task('escape-postbid-config', function() {
  gulp.src('./integrationExamples/postbid/oas/postbid-config.js')
    .pipe(jsEscape())
    .pipe(gulp.dest('build/postbid/'));
});

module.exports = nodeBundle;
