var gulp = require('gulp');
var argv = require('yargs').argv;
var gutil = require('gulp-util');
var connect = require('gulp-connect');
var webpack = require('webpack-stream');
var uglify = require('gulp-uglify');
var clean = require('gulp-clean');
var karma = require('gulp-karma');
var mocha = require('gulp-mocha');
var opens = require('open');
var webpackConfig = require('./webpack.conf.js');
var helpers = require('./gulpHelpers');
var del = require('del');
var gulpJsdoc2md = require('gulp-jsdoc-to-markdown');
var concat = require('gulp-concat');
var header = require('gulp-header');
var zip = require('gulp-zip');
var replace = require('gulp-replace');
var shell = require('gulp-shell');
var optimizejs = require('gulp-optimize-js');
const eslint = require('gulp-eslint');

var CI_MODE = process.env.NODE_ENV === 'ci';
var prebid = require('./package.json');
var dateString = 'Updated : ' + (new Date()).toISOString().substring(0, 10);
var packageNameVersion = prebid.name + '_' + prebid.version;
var banner = '/* <%= prebid.name %> v<%= prebid.version %>\n' + dateString + ' */\n';
var analyticsDirectory = '../analytics';
var port = 9999;

// Tasks
gulp.task('default', ['clean', 'lint', 'webpack']);

gulp.task('serve', ['clean', 'lint', 'devpack', 'webpack', 'watch', 'test']);

gulp.task('serve-nw', ['clean', 'lint', 'devpack', 'webpack', 'watch', 'e2etest']);

gulp.task('run-tests', ['clean', 'lint', 'webpack', 'test', 'mocha']);

gulp.task('build', ['webpack']);

gulp.task('clean', function () {
  return gulp.src(['build'], {
      read: false
    })
    .pipe(clean());
});

gulp.task('devpack', ['clean'], function () {
  webpackConfig.devtool = 'source-map';
  const analyticsSources = helpers.getAnalyticsSources(analyticsDirectory);
  return gulp.src([].concat(analyticsSources, 'src/prebid.js'))
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

  const analyticsSources = helpers.getAnalyticsSources(analyticsDirectory);
  return gulp.src([].concat(analyticsSources, 'src/prebid.js'))
    .pipe(webpack(webpackConfig))
    .pipe(replace('$prebid.version$', prebid.version))
    .pipe(uglify())
    .pipe(header(banner, { prebid: prebid }))
    .pipe(optimizejs())
    .pipe(gulp.dest('build/dist'))
    .pipe(connect.reload());
});

//zip up for release
gulp.task('zip', ['clean', 'webpack'], function () {
  return gulp.src(['build/dist/*', 'integrationExamples/gpt/*'])
    .pipe(zip(packageNameVersion + '.zip'))
    .pipe(gulp.dest('./'));
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

//
// Making this task depend on lint is a bit of a hack. The `run-tests` command is the entrypoint for the CI process,
// and it needs to run all these tasks together. However, the "lint" and "mocha" tasks explode when used in parallel,
// resulting in some mysterious "ShellJS: internal error TypeError: Cannot read property 'isFile' of undefined"
// errors.
//
// Gulp doesn't support serial dependencies (until gulp 4.0... which is most likely never coming out)... so we have
// to trick it by declaring 'lint' as a dependency here. See https://github.com/gulpjs/gulp/blob/master/docs/recipes/running-tasks-in-series.md
//
gulp.task('mocha', ['webpack', 'lint'], function() {
    return gulp.src(['test/spec/loaders/**/*.js'], { read: false })
        .pipe(mocha({
          reporter: 'spec',
          globals: {
            expect: require('chai').expect
          }
        }))
        .on('error', gutil.log);
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
    'test/spec/**/*.js',
    '!test/spec/loaders/**/*.js'
  ], ['clean', 'lint', 'webpack', 'devpack', 'test']);
  gulp.watch([
    'loaders/**/*.js',
    'test/spec/loaders/**/*.js'
  ], ['lint', 'mocha']);
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

gulp.task('e2etest', function() {
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
