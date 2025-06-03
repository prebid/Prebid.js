/* eslint-disable no-console */
'use strict';

var _ = require('lodash');
var argv = require('yargs').argv;
var gulp = require('gulp');
var connect = require('gulp-connect');
var webpack = require('webpack');
var webpackStream = require('webpack-stream');
var gulpClean = require('gulp-clean');
var opens = require('opn');
var webpackConfig = require('./webpack.conf.js');
const standaloneDebuggingConfig = require('./webpack.debugging.js');
var helpers = require('./gulpHelpers.js');
var concat = require('gulp-concat');
var replace = require('gulp-replace');
var shell = require('gulp-shell');
var gulpif = require('gulp-if');
var sourcemaps = require('gulp-sourcemaps');
var through = require('through2');
var fs = require('fs');
var jsEscape = require('gulp-js-escape');
const path = require('path');
const execa = require('execa');
const {minify} = require('terser');
const Vinyl = require('vinyl');
const wrap = require('gulp-wrap');
const rename = require('gulp-rename');


var prebid = require('./package.json');
var port = 9999;
const INTEG_SERVER_HOST = argv.host ? argv.host : 'localhost';
const INTEG_SERVER_PORT = 4444;
const { spawn, fork } = require('child_process');
const TerserPlugin = require('terser-webpack-plugin');

// these modules must be explicitly listed in --modules to be included in the build, won't be part of "all" modules
var explicitModules = [
  'pre1api'
];

// all the following functions are task functions
function bundleToStdout() {
  nodeBundle().then(file => console.log(file));
}
exports['bundle-to-stdout'] = bundleToStdout;

function clean() {
  return gulp.src(['build', 'dist'], {
    read: false,
    allowEmpty: true
  })
    .pipe(gulpClean());
}
exports.clean = clean;

function requireNodeVersion(version) {
  return (done) => {
    const [major] = process.versions.node.split('.');

    if (major < version) {
      throw new Error(`This task requires Node v${version}`)
    }

    done();
  }
}
// requireNodeVersion is a helper, not a task to be exported directly unless used as such.

// Dependant task for building postbid. It escapes postbid-config file.
function escapePostbidConfig() {
  gulp.src('./integrationExamples/postbid/oas/postbid-config.js')
    .pipe(jsEscape())
    .pipe(gulp.dest('build/postbid/'));
};
exports['escape-postbid-config'] = escapePostbidConfig;

function lint(done) {
  if (argv.nolint) {
    return done();
  }
  const args = ['eslint'];
  if (!argv.nolintfix) {
    args.push('--fix');
  }
  if (!(typeof argv.lintWarnings === 'boolean' ? argv.lintWarnings : true)) {
    args.push('--quiet')
  }
  return shell.task(args.join(' '))().then(() => {
    done();
  }, (err) => {
    done(err);
  });
};
exports.lint = lint;

// View the code coverage report in the browser.
function viewCoverage(done) {
  var coveragePort = 1999;
  var mylocalhost = (argv.host) ? argv.host : 'localhost';

  connect.server({
    port: coveragePort,
    root: 'build/coverage/lcov-report',
    livereload: false,
    debug: true
  });
  opens('http://' + mylocalhost + ':' + coveragePort);
  done();
};
exports['view-coverage'] = viewCoverage;

// View the reviewer tools page
function viewReview(done) {
  var mylocalhost = (argv.host) ? argv.host : 'localhost';
  var reviewUrl = 'http://' + mylocalhost + ':' + port + '/integrationExamples/reviewerTools/index.html'; // reuse the main port from 9999

  // console.log(`stdout: opening` + reviewUrl);

  opens(reviewUrl);
  done();
};
exports['view-review'] = viewReview;

function makeVerbose(config = webpackConfig) {
  return _.merge({}, config, {
    optimization: {
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            mangle: false,
            format: {
              comments: 'all'
            }
          },
          extractComments: false,
        }),
      ],
    }
  });
}

function prebidSource(webpackCfg) {
  var externalModules = helpers.getArgModules();

  const analyticsSources = helpers.getAnalyticsSources();
  const moduleSources = helpers.getModulePaths(externalModules);

  return gulp.src([].concat(moduleSources, analyticsSources, 'src/prebid.js'))
    .pipe(helpers.nameModules(externalModules))
    .pipe(webpackStream(webpackCfg, webpack));
}

function makeDevpackPkg(config = webpackConfig) {
  return function() {
    var cloned = _.cloneDeep(config);
    Object.assign(cloned, {
      devtool: 'source-map',
      mode: 'development'
    })

    const babelConfig = require('./babelConfig.js')({disableFeatures: helpers.getDisabledFeatures(), prebidDistUrlBase: argv.distUrlBase || '/build/dev/'});

    // update babel config to set local dist url
    cloned.module.rules
      .flatMap((rule) => rule.use)
      .filter((use) => use.loader === 'babel-loader')
      .forEach((use) => use.options = Object.assign({}, use.options, babelConfig));

    return prebidSource(cloned)
      .pipe(gulp.dest('build/dev'))
      .pipe(connect.reload());
  }
}

function makeWebpackPkg(config = webpackConfig) {
  var cloned = _.cloneDeep(config)
  if (!argv.sourceMaps) {
    delete cloned.devtool;
  }

  return function buildBundle() {
    return prebidSource(cloned)
      .pipe(through.obj(function(file, enc, callback) {
        console.log('webpackStream output file:', file.path, 'base:', file.base, 'cwd:', file.cwd);
        this.push(file);
        callback();
      }))
      .pipe(gulp.dest('build/dist'));
  }
}

function buildCreative(mode = 'production') {
  const opts = {mode};
  if (mode === 'development') {
    opts.devtool = 'inline-source-map'
  }
  return function() {
    // Scope src to the 'creative' directory to avoid reading too many files
    return gulp.src(['creative/**/*'])
      .pipe(webpackStream(Object.assign(require('./webpack.creative.js'), opts)))
      .pipe(gulp.dest('build/creative'))
  }
}

function updateCreativeRenderers() {
  return gulp.src(['build/creative/renderers/**/*'])
    .pipe(wrap('// this file is autogenerated, see creative/README.md\nexport const RENDERER = <%= JSON.stringify(contents.toString()) %>'))
    .pipe(rename(function (path) {
      return {
        dirname: `creative-renderer-${path.basename}`,
        basename: 'renderer',
        extname: '.js'
      }
    }))
    .pipe(gulp.dest('libraries'))
}

function updateCreativeExample(cb) {
  const CREATIVE_EXAMPLE = 'integrationExamples/gpt/x-domain/creative.html';
  const root = require('node-html-parser').parse(fs.readFileSync(CREATIVE_EXAMPLE));
  root.querySelectorAll('script')[0].textContent = fs.readFileSync('build/creative/creative.js')
  fs.writeFileSync(CREATIVE_EXAMPLE, root.toString())
  cb();
}

function getModulesListToAddInBanner(modules) {
  if (!modules || modules.length === helpers.getModuleNames().length) {
    return 'All available modules for this version.'
  } else {
    return modules.join(', ')
  }
}

function gulpBundle(dev) {
  return bundle(dev).pipe(gulp.dest('build/' + (dev ? 'dev' : 'dist')));
}

function nodeBundle(modules, dev = false) {
  return new Promise((resolve, reject) => {
    bundle(dev, modules)
      .on('error', (err) => {
        reject(err);
      })
      .pipe(through.obj(function (file, enc, done) {
        resolve(file.contents.toString(enc));
        done();
      }));
  });
}

function wrapWithHeaderAndFooter(dev, modules) {
  // NOTE: gulp-header, gulp-footer & gulp-wrap do not play nice with source maps.
  // gulp-concat does; for that reason we are prepending and appending the source stream with "fake" header & footer files.
  function memoryVinyl(name, contents) {
    return new Vinyl({
      cwd: '',
      base: 'generated',
      path: name,
      contents: Buffer.from(contents, 'utf-8')
    });
  }
  return function wrap(stream) {
    const wrapped = through.obj();
    const placeholder = '$$PREBID_SOURCE$$';
    const tpl = _.template(fs.readFileSync('./bundle-template.txt'))({
      prebid,
      modules: getModulesListToAddInBanner(modules),
      enable: !argv.manualEnable
    });
    (dev ? Promise.resolve(tpl) : minify(tpl, {format: {comments: true}}).then((res) => res.code))
      .then((tpl) => {
        // wrap source placeholder in an IIFE to make it an expression (so that it works with minify output)
        const parts = tpl.replace(placeholder, `(function(){$$${placeholder}$$})()`).split(placeholder);
        if (parts.length !== 2) {
          throw new Error(`Cannot parse bundle template; it must contain exactly one instance of '${placeholder}'`);
        }
        const [header, footer] = parts;
        wrapped.push(memoryVinyl('prebid-header.js', header));
        stream.pipe(wrapped, {end: false});
        stream.on('end', () => {
          wrapped.push(memoryVinyl('prebid-footer.js', footer));
          wrapped.push(null);
        });
      })
      .catch((err) => {
        wrapped.destroy(err);
      });
    return wrapped;
  }
}

function bundle(dev, moduleArr) {
  var modules = moduleArr || helpers.getArgModules();
  var allModules = helpers.getModuleNames(modules);
  const sm = dev || argv.sourceMaps;

  if (modules.length === 0) {
    modules = allModules.filter(module => explicitModules.indexOf(module) === -1);
  } else {
    var diff = _.difference(modules, allModules);
    if (diff.length !== 0) {
      // Assuming gutil.PluginError is still available or a similar error object can be used.
      // If gutil is removed, this needs replacement. For now, let's assume it might come from 'gulp-util' if kept,
      // or a new error object should be instantiated.
      // For the purpose of this refactoring, we'll keep it and address gutil removal if it becomes a problem later.
      throw new Error('PluginError: invalid modules: ' + diff.join(', '));
    }
  }
  const coreFile = helpers.getBuiltPrebidCoreFile(dev);
  const moduleFiles = helpers.getBuiltModules(dev, modules);
  const depGraph = require(helpers.getBuiltPath(dev, 'dependencies.json'));
  const dependencies = new Set();
  [coreFile].concat(moduleFiles).map(name => path.basename(name)).forEach((file) => {
    (depGraph[file] || []).forEach((dep) => dependencies.add(helpers.getBuiltPath(dev, dep)));
  });
  const entries = _.uniq([coreFile].concat(Array.from(dependencies), moduleFiles));

  var outputFileName = argv.bundleName ? argv.bundleName : 'prebid.js';

  // change output filename if argument --tag given
  if (argv.tag && argv.tag.length) {
    outputFileName = outputFileName.replace(/\.js$/, `.${argv.tag}.js`);
  }

  console.log('Concatenating files:\n', entries);
  console.log('Appending ' + prebid.globalVarName + '.processQueue();');
  console.log('Generating bundle:', outputFileName);

  const wrap = wrapWithHeaderAndFooter(dev, modules);
  return wrap(gulp.src(entries))
    .pipe(gulpif(sm, sourcemaps.init({ loadMaps: true })))
    .pipe(concat(outputFileName))
    .pipe(gulpif(sm, sourcemaps.write('.')));
}

function setupDist() {
  return gulp.src(['build/dist/**/*'])
    .pipe(rename(function (path) {
      if (path.dirname === '.' && path.basename === 'prebid') {
        path.dirname = 'not-for-prod';
      }
    }))
    .pipe(gulp.dest('dist'))
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

function testTaskMaker(options = {}) {
  ['watch', 'file', 'browserstack', 'notest'].forEach(opt => {
    options[opt] = options.hasOwnProperty(opt) ? options[opt] : argv[opt];
  })

  options.disableFeatures = options.disableFeatures || helpers.getDisabledFeatures();

  return function test(done) {
    if (options.notest) {
      done();
    } else {
      runKarma(options, done)
    }
  }
}

const test = testTaskMaker();

function e2eTestTaskMaker() {
  return function test(done) {
    const integ = startIntegServer();
    startLocalServer();
    runWebdriver({})
      .then(stdout => {
        // kill fake server
        integ.kill('SIGINT');
        done();
        process.exit(0);
      })
      .catch(err => {
        // kill fake server
        integ.kill('SIGINT');
        done(new Error(`Tests failed with error: ${err}`));
        process.exit(1);
      });
  }
}

function runWebdriver({file}) {
  process.env.TEST_SERVER_HOST = argv.host || 'localhost';

  let local = argv.local || false;

  let wdioConfFile = local === true ? 'wdio.local.conf.js' : 'wdio.conf.js';
  let wdioCmd = path.join(__dirname, 'node_modules/.bin/wdio');
  let wdioConf = path.join(__dirname, wdioConfFile);
  let wdioOpts;

  if (file) {
    wdioOpts = [
      wdioConf,
      `--spec`,
      `${file}`
    ]
  } else {
    wdioOpts = [
      wdioConf
    ];
  }
  return execa(wdioCmd, wdioOpts, { stdio: 'inherit' });
}

function runKarma(options, done) {
  // the karma server appears to leak memory; starting it multiple times in a row will run out of heap
  // here we run it in a separate process to bypass the problem
  options = Object.assign({browsers: helpers.parseBrowserArgs(argv)}, options)
  const env = Object.assign({}, options.env, process.env);
  if (!env.TEST_CHUNKS) {
    env.TEST_CHUNKS = '4';
  }
  const child = fork('./karmaRunner.js', null, {
    env
  });
  child.on('exit', (exitCode) => {
    if (exitCode) {
      done(new Error('Karma tests failed with exit code ' + exitCode));
    } else {
      done();
    }
  })
  child.send(options);
}

// If --file "<path-to-test-file>" is given, the task will only run tests in the specified file.
function testCoverage(done) {
  runKarma({
    coverage: true,
    browserstack: false,
    watch: false,
    file: argv.file,
    env: {
      NODE_OPTIONS: '--max-old-space-size=8096'
    }
  }, done);
}

function coveralls() { // 2nd arg is a dependency: 'test' must be finished
  // first send results of istanbul's test coverage to coveralls.io.
  return gulp.src('gulpfile.js', { read: false }) // You have to give it a file, but you don't
    // have to read it.
    .pipe(shell('cat build/coverage/lcov.info | node_modules/coveralls/bin/coveralls.js'));
}

// This task creates postbid.js. Postbid setup is different from prebid.js
// More info can be found here http://prebid.org/overview/what-is-post-bid.html

function buildPostbid() {
  var fileContent = fs.readFileSync('./build/postbid/postbid-config.js', 'utf8');

  return gulp.src('./integrationExamples/postbid/oas/postbid.js')
    .pipe(replace('\[%%postbid%%\]', fileContent))
    .pipe(gulp.dest('build/postbid/'));
}

function startIntegServer(dev = false) {
  const args = ['./test/fake-server/index.js', `--port=${INTEG_SERVER_PORT}`, `--host=${INTEG_SERVER_HOST}`];
  if (dev) {
    args.push('--dev=true')
  }
  const srv = spawn('node', args);
  srv.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });
  srv.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });
  return srv;
}

function startLocalServer(options = {}) {
  connect.server({
    https: argv.https,
    port: port,
    host: INTEG_SERVER_HOST,
    root: './',
    livereload: options.livereload,
    middleware: function () {
      return [
        function (req, res, next) {
          res.setHeader('Ad-Auction-Allowed', 'True');
          next();
        }
      ];
    }
  });
}

// Watch Task with Live Reload
function watchTaskMaker(options = {}) {
  if (options.livereload == null) {
    options.livereload = true;
  }
  options.alsoWatch = options.alsoWatch || [];

  return function watch(done) {
    var mainWatcher = gulp.watch([
      'src/**/*.js',
      'libraries/**/*.js',
      '!libraries/creative-renderer-*/**/*.js',
      'creative/**/*.js',
      'modules/**/*.js',
    ].concat(options.alsoWatch));

    startLocalServer(options);

    mainWatcher.on('all', options.task());
    done();
  }
}

const watch = watchTaskMaker({alsoWatch: ['test/**/*.js'], task: () => gulp.series(clean, gulp.parallel(lint, buildBundleDev, test))});
const watchFast = watchTaskMaker({livereload: false, task: () => buildBundleDev}); // Assuming buildBundleDev is a named function after refactor

// Define named functions for tasks used in series/parallel
const buildCreativeDev = gulp.series(buildCreative(argv.creativeDev ? 'development' : 'production'), updateCreativeRenderers);
const buildCreativeProd = gulp.series(buildCreative(), updateCreativeRenderers);

const buildBundleDev = gulp.series(buildCreativeDev, makeDevpackPkg(standaloneDebuggingConfig), makeDevpackPkg(), gulpBundle.bind(null, true));
const buildBundleProd = gulp.series(buildCreativeProd, makeWebpackPkg(standaloneDebuggingConfig), makeWebpackPkg(), gulpBundle.bind(null, false));
const buildBundleVerbose = gulp.series(buildCreativeDev, makeWebpackPkg(makeVerbose(standaloneDebuggingConfig)), makeWebpackPkg(makeVerbose()), gulpBundle.bind(null, false));

const testOnly = test; // test is already a named function
const testAllFeaturesDisabled = testTaskMaker({disableFeatures: require('./features.json'), oneBrowser: 'chrome', watch: false});
const testCombined = gulp.series(clean, lint, testAllFeaturesDisabled, testOnly);

const testCoverageSeries = gulp.series(clean, testCoverage); // testCoverage is a named function
const coverallsSeries = gulp.series(testCoverageSeries, coveralls); // coveralls is a named function

const setupNpmIgnore = shell.task("sed 's/^\\/\\?dist\\/\\?$//g;w .npmignore' .gitignore", {quiet: true});
// Ensure updateCreativeExample and setupDist are named functions if they are not already.
// For now, assuming they are or will be.
const buildSeries = gulp.series(clean, buildBundleProd, updateCreativeExample, setupDist);
const buildReleaseSeries = gulp.series(buildSeries, setupNpmIgnore);
const buildPostbidSeries = gulp.series(escapePostbidConfig, buildPostbid); // buildPostbid is a named function

const serveSeries = gulp.series(clean, lint, gulp.parallel(buildBundleDev, watch, testCombined));
const serveFastSeries = gulp.series(clean, gulp.parallel(buildBundleDev, watchFast));
const serveProdSeries = gulp.series(clean, gulp.parallel(buildBundleProd, startLocalServer)); // startLocalServer is a named function
const serveAndTestSeries = gulp.series(clean, gulp.parallel(buildBundleDev, watchFast, testTaskMaker({watch: true})));
const serveE2ESeries = gulp.series(clean, buildBundleProd, gulp.parallel(() => startIntegServer(), startLocalServer));
const serveE2EDevSeries = gulp.series(clean, buildBundleDev, gulp.parallel(() => startIntegServer(true), startLocalServer));

const defaultTask = gulp.series(clean, buildBundleProd);

const e2eTestOnlySeries = gulp.series(requireNodeVersion(16), () => runWebdriver({file: argv.file}));
const e2eTestSeries = gulp.series(requireNodeVersion(16), clean, buildBundleProd, e2eTestTaskMaker());

const bundleTask = gulpBundle.bind(null, false);

const reviewStartSeries = gulp.series(clean, lint, gulp.parallel(buildBundleDev, watch, testCoverageSeries), viewReview);

// Export tasks
exports.lint = lint;
exports.watch = watch;
exports.clean = clean; // Already exported above, ensure consistency
exports.escapePostbidConfig = escapePostbidConfig; // Already exported

exports['build-creative-dev'] = buildCreativeDev;
exports['build-creative-prod'] = buildCreativeProd;

exports['build-bundle-dev'] = buildBundleDev;
exports['build-bundle-prod'] = buildBundleProd;
exports['build-bundle-verbose'] = buildBundleVerbose;

exports['test-only'] = testOnly;
exports['test-all-features-disabled'] = testAllFeaturesDisabled;
exports.test = testCombined;

exports['test-coverage'] = testCoverageSeries;
exports['view-coverage'] = viewCoverage; // Already exported

exports.coveralls = coverallsSeries;

exports['setup-npmignore'] = setupNpmIgnore;
exports.build = buildSeries;
exports['build-release'] = buildReleaseSeries;
exports['build-postbid'] = buildPostbidSeries;

exports.serve = serveSeries;
exports['serve-fast'] = serveFastSeries;
exports['serve-prod'] = serveProdSeries;
exports['serve-and-test'] = serveAndTestSeries;
exports['serve-e2e'] = serveE2ESeries;
exports['serve-e2e-dev'] = serveE2EDevSeries;

exports.default = defaultTask;

exports['e2e-test-only'] = e2eTestOnlySeries;
exports['e2e-test'] = e2eTestSeries;

// bundleToStdout is already exported
exports.bundle = bundleTask;

// viewReview is already exported
exports['review-start'] = reviewStartSeries;

exports.nodeBundle = nodeBundle; // Export nodeBundle alongside other tasks
