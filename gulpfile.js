/* eslint-disable no-console */
'use strict';

var _ = require('lodash');
var argv = require('yargs').argv;
var gulp = require('gulp');
var gutil = require('gulp-util');
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
var eslint = require('gulp-eslint');
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
bundleToStdout.displayName = 'bundle-to-stdout';

function clean() {
  return gulp.src(['build'], {
    read: false,
    allowEmpty: true
  })
    .pipe(gulpClean());
}

function requireNodeVersion(version) {
  return (done) => {
    const [major] = process.versions.node.split('.');

    if (major < version) {
      throw new Error(`This task requires Node v${version}`)
    }

    done();
  }
}

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
  const isFixed = function (file) {
    return file.eslint != null && file.eslint.fixed;
  }
  return gulp.src([
    'src/**/*.js',
    'modules/**/*.js',
    'libraries/**/*.js',
    'creative/**/*.js',
    'test/**/*.js',
    'plugins/**/*.js',
    '!plugins/**/node_modules/**',
    './*.js'
  ], { base: './' })
    .pipe(eslint({ fix: !argv.nolintfix, quiet: !(typeof argv.lintWarnings === 'boolean' ? argv.lintWarnings : true) }))
    .pipe(eslint.format('stylish'))
    .pipe(eslint.failAfterError())
    .pipe(gulpif(isFixed, gulp.dest('./')));
};

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

viewCoverage.displayName = 'view-coverage';

// View the reviewer tools page
function viewReview(done) {
  var mylocalhost = (argv.host) ? argv.host : 'localhost';
  var reviewUrl = 'http://' + mylocalhost + ':' + port + '/integrationExamples/reviewerTools/index.html'; // reuse the main port from 9999

  // console.log(`stdout: opening` + reviewUrl);

  opens(reviewUrl);
  done();
};

viewReview.displayName = 'view-review';

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
    /* gu-mod-start */
    // Surface exceptions from webpack
    .on('error', (err) => {
      console.error(err);
    })
    /* gu-mod-end */
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
      /* gu-mod-start */
      // Surface exceptions from webpack
      .on('error', (err) => {
        console.error(err);
      })
      /* gu-mod-end */
      .pipe(gulp.dest('build/dist'));
  }
}

function buildCreative(mode = 'production') {
  const opts = {mode};
  if (mode === 'development') {
    opts.devtool = 'inline-source-map'
  }
  return function() {
    return gulp.src(['**/*'])
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
      throw new gutil.PluginError({
        plugin: 'bundle',
        message: 'invalid modules: ' + diff.join(', ')
      });
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
  gutil.log('Concatenating files:\n', entries);
  gutil.log('Appending ' + prebid.globalVarName + '.processQueue();');
  gutil.log('Generating bundle:', outputFileName);
  const wrap = wrapWithHeaderAndFooter(dev, modules);
  return wrap(gulp.src(entries))
    .pipe(gulpif(sm, sourcemaps.init({ loadMaps: true })))
    .pipe(concat(outputFileName))
    .pipe(gulpif(sm, sourcemaps.write('.')));
}

/* gu-mod-start */
/* Custom Guardian gulp functions to build separate versions of Prebid for different regions */

function guMakeWebpackPkg(version = 'uk', config = webpackConfig) {
  var cloned = _.cloneDeep(config)
  if (!argv.sourceMaps) {
    delete cloned.devtool;
  }

  return function buildBundle() {
    return prebidSource(cloned)
      /* gu-mod-start */
      // Surface exceptions from webpack
      .on('error', (err) => {
        console.error(err);
      })
      /* gu-mod-end */
      .pipe(gulp.dest(`build/dist/${version}`));
  }
}

function guClean() {
  return gulp.src(['build/dist/' + argv.version], {
    read: false,
    allowEmpty: true
  })
    .pipe(gulpClean());
}

function guGulpBundle(dev, version) {
  return guBundle(dev, version).pipe(gulp.dest('build/' + (dev ? 'dev/' : 'dist/') + version));
}

function guBundle(dev, version, moduleArr) {
  var modules = moduleArr || helpers.getArgModules();
  var allModules = helpers.getModuleNames(modules);
  const sm = dev || argv.sourceMaps;

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
  const coreFile = helpers.guGetBuiltPrebidCoreFile(dev, version);
  const moduleFiles = helpers.guGetBuiltModules(dev, modules, version);
  const depGraph = require(helpers.guGetBuiltPath(dev, 'dependencies.json', version));
  const dependencies = new Set();
  [coreFile].concat(moduleFiles).map(name => path.basename(name)).forEach((file) => {
    (depGraph[file] || []).forEach((dep) => dependencies.add(helpers.guGetBuiltPath(dev, dep, version)));
  });
  const entries = _.uniq([coreFile].concat(Array.from(dependencies), moduleFiles));

  var outputFileName = argv.bundleName ? argv.bundleName : 'prebid.js';

  // change output filename if argument --tag given
  if (argv.tag && argv.tag.length) {
    outputFileName = outputFileName.replace(/\.js$/, `.${argv.tag}.js`);
  }

  gutil.log('Concatenating files:\n', entries);
  gutil.log('Appending ' + prebid.globalVarName + '.processQueue();');
  gutil.log('Generating bundle:', outputFileName);

  const wrap = wrapWithHeaderAndFooter(dev, modules);
  return wrap(gulp.src(entries))
    .pipe(gulpif(sm, sourcemaps.init({ loadMaps: true })))
    .pipe(concat(outputFileName))
    .pipe(gulpif(sm, sourcemaps.write('.')));
}

/* gu-mod-end */

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
  const child = fork('./karmaRunner.js', null, {
    env: Object.assign({}, options.env, process.env)
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

const watch = watchTaskMaker({alsoWatch: ['test/**/*.js'], task: () => gulp.series(clean, gulp.parallel(lint, 'build-bundle-dev', test))});
const watchFast = watchTaskMaker({livereload: false, task: () => gulp.series('build-bundle-dev')});

// support tasks
gulp.task(lint);
gulp.task(watch);

gulp.task(clean);

gulp.task(escapePostbidConfig);

gulp.task('build-creative-dev', gulp.series(buildCreative(argv.creativeDev ? 'development' : 'production'), updateCreativeRenderers));
gulp.task('build-creative-prod', gulp.series(buildCreative(), updateCreativeRenderers));

gulp.task('build-bundle-dev', gulp.series('build-creative-dev', makeDevpackPkg(standaloneDebuggingConfig), makeDevpackPkg(), gulpBundle.bind(null, true)));
gulp.task('build-bundle-prod', gulp.series('build-creative-prod', makeWebpackPkg(standaloneDebuggingConfig), makeWebpackPkg(), gulpBundle.bind(null, false)));

/* gu-mod-start */
gulp.task('gu-build-bundle-prod', gulp.series('build-creative-prod', guMakeWebpackPkg(argv.version, standaloneDebuggingConfig), guMakeWebpackPkg(argv.version), guGulpBundle.bind(null, false, argv.version)));
/* gu-mod-end */

// build-bundle-verbose - prod bundle except names and comments are preserved. Use this to see the effects
// of dead code elimination.
gulp.task('build-bundle-verbose', gulp.series('build-creative-dev', makeWebpackPkg(makeVerbose(standaloneDebuggingConfig)), makeWebpackPkg(makeVerbose()), gulpBundle.bind(null, true)));

// public tasks (dependencies are needed for each task since they can be ran on their own)
gulp.task('test-only', test);
gulp.task('test-all-features-disabled', testTaskMaker({disableFeatures: require('./features.json'), oneBrowser: 'chrome', watch: false}));
gulp.task('test', gulp.series(clean, lint, 'test-all-features-disabled', 'test-only'));

gulp.task('test-coverage', gulp.series(clean, testCoverage));
gulp.task(viewCoverage);

gulp.task('coveralls', gulp.series('test-coverage', coveralls));

gulp.task('build', gulp.series(clean, 'build-bundle-prod', updateCreativeExample));

/* gu-mod-start */
gulp.task('gu-build', gulp.series(guClean, 'gu-build-bundle-prod', updateCreativeExample));
/* gu-mod-end */

gulp.task('build-postbid', gulp.series(escapePostbidConfig, buildPostbid));

gulp.task('serve', gulp.series(clean, lint, gulp.parallel('build-bundle-dev', watch, test)));
gulp.task('serve-fast', gulp.series(clean, gulp.parallel('build-bundle-dev', watchFast)));
gulp.task('serve-prod', gulp.series(clean, gulp.parallel('build-bundle-prod', startLocalServer)));
gulp.task('serve-and-test', gulp.series(clean, gulp.parallel('build-bundle-dev', watchFast, testTaskMaker({watch: true}))));
gulp.task('serve-e2e', gulp.series(clean, 'build-bundle-prod', gulp.parallel(() => startIntegServer(), startLocalServer)));
gulp.task('serve-e2e-dev', gulp.series(clean, 'build-bundle-dev', gulp.parallel(() => startIntegServer(true), startLocalServer)));

gulp.task('default', gulp.series(clean, 'build-bundle-prod'));

gulp.task('e2e-test-only', gulp.series(requireNodeVersion(16), () => runWebdriver({file: argv.file})));
gulp.task('e2e-test', gulp.series(requireNodeVersion(16), clean, 'build-bundle-prod', e2eTestTaskMaker()));

// other tasks
gulp.task(bundleToStdout);
gulp.task('bundle', gulpBundle.bind(null, false)); // used for just concatenating pre-built files with no build step

// build task for reviewers, runs test-coverage, serves, without watching
gulp.task(viewReview);
gulp.task('review-start', gulp.series(clean, lint, gulp.parallel('build-bundle-dev', watch, testCoverage), viewReview));

module.exports = nodeBundle;
