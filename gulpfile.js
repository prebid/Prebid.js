'use strict';

var _ = require('lodash');
var argv = require('yargs').argv;
var gulp = require('gulp');
var gutil = require('gulp-util');
var connect = require('gulp-connect');
var webpack = require('webpack');
var webpackStream = require('webpack-stream');
var uglify = require('gulp-uglify');
var gulpClean = require('gulp-clean');
var KarmaServer = require('karma').Server;
var karmaConfMaker = require('./karma.conf.maker');
var opens = require('opn');
var webpackConfig = require('./webpack.conf');
var helpers = require('./gulpHelpers');
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
var port = 9999;

// these modules must be explicitly listed in --modules to be included in the build, won't be part of "all" modules
var explicitModules = [
  'pre1api'
];

// all the following functions are task functions
function bundleToStdout() {
  nodeBundle().then(file => console.log(file));
}
bundleToStdout.displayName = 'bundle-to-stdout';

function clean() {
  return gulp.src(['build'], {
    read: false,
    allowEmpty: true
  })
    .pipe(gulpClean());
}

function e2etestReport() {
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
};
e2etestReport.displayName = 'e2etest-report';

// Dependant task for building postbid. It escapes postbid-config file.
function escapePostbidConfig() {
  gulp.src('./integrationExamples/postbid/oas/postbid-config.js')
    .pipe(jsEscape())
    .pipe(gulp.dest('build/postbid/'));
};
escapePostbidConfig.displayName = 'escape-postbid-config';

function lint(done) {
  if (argv.nolint) {
    return done();
  }
  const isFixed = function(file) {
    return file.eslint != null && file.eslint.fixed;
  }
  return gulp.src(['src/**/*.js', 'modules/**/*.js', 'test/**/*.js'], {base: './'})
    .pipe(gulpif(argv.nolintfix, eslint(), eslint({fix: true})))
    .pipe(eslint.format('stylish'))
    .pipe(eslint.failAfterError())
    .pipe(gulpif(isFixed, gulp.dest('./')));
};

// View the code coverage report in the browser.
function viewCoverage(done) {
  var coveragePort = 1999;

  connect.server({
    port: coveragePort,
    root: 'build/coverage/karma_html',
    livereload: false
  });
  opens('http://localhost:' + coveragePort);
  done();
};

viewCoverage.displayName = 'view-coverage';

// Watch Task with Live Reload
function watch(done) {
  var mainWatcher = gulp.watch([
    'src/**/*.js',
    'modules/**/*.js',
    'test/spec/**/*.js',
    '!test/spec/loaders/**/*.js'
  ]);
  var loaderWatcher = gulp.watch([
    'loaders/**/*.js',
    'test/spec/loaders/**/*.js'
  ]);

  connect.server({
    https: argv.https,
    port: port,
    root: './',
    livereload: true
  });

  mainWatcher.on('all', gulp.series(clean, gulp.parallel(lint, 'build-bundle-dev', test)));
  loaderWatcher.on('all', gulp.series(lint));
  done();
};

function makeDevpackPkg() {
  var cloned = _.cloneDeep(webpackConfig);
  cloned.devtool = 'source-map';
  var externalModules = helpers.getArgModules();

  const analyticsSources = helpers.getAnalyticsSources();
  const moduleSources = helpers.getModulePaths(externalModules);

  return gulp.src([].concat(moduleSources, analyticsSources, 'src/prebid.js'))
    .pipe(helpers.nameModules(externalModules))
    .pipe(webpackStream(cloned, webpack))
    .pipe(gulp.dest('build/dev'))
    .pipe(connect.reload());
}

function makeWebpackPkg() {
  var cloned = _.cloneDeep(webpackConfig);
  delete cloned.devtool;

  var externalModules = helpers.getArgModules();

  const analyticsSources = helpers.getAnalyticsSources();
  const moduleSources = helpers.getModulePaths(externalModules);

  return gulp.src([].concat(moduleSources, analyticsSources, 'src/prebid.js'))
    .pipe(helpers.nameModules(externalModules))
    .pipe(webpackStream(cloned, webpack))
    .pipe(uglify())
    .pipe(gulpif(file => file.basename === 'prebid-core.js', header(banner, { prebid: prebid })))
    .pipe(optimizejs())
    .pipe(gulp.dest('build/dist'));
}

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

function bundle(dev, moduleArr) {
  var modules = moduleArr || helpers.getArgModules();
  var allModules = helpers.getModuleNames(modules);

  if (modules.length === 0) {
    modules = allModules.filter(module => explicitModules.indexOf(module) === -1);
  } else {
    var diff = _.difference(modules, allModules);
    if (diff.length !== 0) {
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
      done();
    }
  }
}

// Run the unit tests.
//
// By default, this runs in headless chrome.
//
// If --watch is given, the task will re-run unit tests whenever the source code changes
// If --file "<path-to-test-file>" is given, the task will only run tests in the specified file.
// If --browserstack is given, it will run the full suite of currently supported browsers.
// If --browsers is given, browsers can be chosen explicitly. e.g. --browsers=chrome,firefox,ie9
// If --notest is given, it will immediately skip the test task (useful for developing changes with `gulp serve --notest`)
function test(done) {
  if (argv.notest) {
    done();
  } else {
    var karmaConf = karmaConfMaker(false, argv.browserstack, argv.watch, argv.file);

    var browserOverride = helpers.parseBrowserArgs(argv).map(helpers.toCapitalCase);
    if (browserOverride.length > 0) {
      karmaConf.browsers = browserOverride;
    }

    new KarmaServer(karmaConf, newKarmaCallback(done)).start();
  }
}

// If --file "<path-to-test-file>" is given, the task will only run tests in the specified file.
function testCoverage(done) {
  new KarmaServer(karmaConfMaker(true, false, false, argv.file), newKarmaCallback(done)).start();
}

function coveralls() { // 2nd arg is a dependency: 'test' must be finished
  // first send results of istanbul's test coverage to coveralls.io.
  return gulp.src('gulpfile.js', { read: false }) // You have to give it a file, but you don't
  // have to read it.
    .pipe(shell('cat build/coverage/lcov.info | node_modules/coveralls/bin/coveralls.js'));
}

function e2eTest() {
  var cmdQueue = [];
  if (argv.browserstack) {
    var browsers = require('./browsers.json');
    delete browsers['bs_ie_9_windows_7'];

    var cmdStr = ' --config nightwatch.conf.js';
    if (argv.group) {
      cmdStr = cmdStr + ' --group ' + argv.group;
    }
    cmdStr = cmdStr + ' --reporter ./test/spec/e2e/custom-reporter/pbjs-html-reporter.js';

    var startWith = 'bs';

    Object.keys(browsers).filter(function(v) {
      return v.substring(0, startWith.length) === startWith && browsers[v].browser !== 'iphone';
    }).map(function(v, i, arr) {
      var newArr = (i % 2 === 0) ? arr.slice(i, i + 2) : null;
      if (newArr) {
        var cmd = 'nightwatch --env ' + newArr.join(',') + cmdStr;
        cmdQueue.push(cmd);
      }
    });
  }

  return gulp.src('')
    .pipe(shell(cmdQueue.join(';')));
}

// This task creates postbid.js. Postbid setup is different from prebid.js
// More info can be found here http://prebid.org/overview/what-is-post-bid.html

function buildPostbid() {
  var fileContent = fs.readFileSync('./build/postbid/postbid-config.js', 'utf8');

  return gulp.src('./integrationExamples/postbid/oas/postbid.js')
    .pipe(replace('\[%%postbid%%\]', fileContent))
    .pipe(gulp.dest('build/postbid/'));
}

// support tasks
gulp.task(lint);
gulp.task(watch);

gulp.task(clean);

gulp.task(escapePostbidConfig);

gulp.task('build-bundle-dev', gulp.series(makeDevpackPkg, gulpBundle.bind(null, true)));
gulp.task('build-bundle-prod', gulp.series(makeWebpackPkg, gulpBundle.bind(null, false)));

// public tasks (dependencies are needed for each task since they can be ran on their own)
gulp.task('test', gulp.series(clean, lint, test));

gulp.task('test-coverage', gulp.series(clean, testCoverage));
gulp.task(viewCoverage);

gulp.task('coveralls', gulp.series('test-coverage', coveralls));

gulp.task('build', gulp.series(clean, 'build-bundle-prod'));
gulp.task('build-postbid', gulp.series(escapePostbidConfig, buildPostbid));

gulp.task('serve', gulp.series(clean, lint, gulp.parallel('build-bundle-dev', watch, test)));
gulp.task('default', gulp.series(clean, makeWebpackPkg));

gulp.task(e2etestReport);
gulp.task('e2etest', gulp.series(clean, gulp.parallel(makeDevpackPkg, makeWebpackPkg), e2eTest));

// other tasks
gulp.task(bundleToStdout);
gulp.task('bundle', gulpBundle.bind(null, false)); // used for just concatenating pre-built files with no build step
gulp.task('serve-nw', gulp.parallel(lint, watch, 'e2etest'));

module.exports = nodeBundle;
