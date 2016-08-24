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
      'bs_ie_11_windows_8.1'
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
    port: 9999,
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

  return gulp.src('')
    .pipe(shell('nightwatch ' + cmd));

});

var jv = require('junit-viewer');
// this will have all of a copy of the normal fs methods as well
var fs = require('fs.extra');
var _ = require('lodash');

const execSync = require('child_process').execSync;
const exec = require('child_process').exec;


gulp.task('test-report',function(){
  var dir = './build/coverage/e2e/reports/testcase1';
  if(argv.group) {
    var grp = argv.group;
    dir = dir + '/' + grp;
  } else {
    var files = fs.readdirSync(dir);
    var result = _.find(files, function(item) {
      return !/^\..*/.test(item);
    });
    dir = dir + '/' + result;
  }

  if(!argv.spec) {
    //report error and return
  }
  var spec = argv.spec;

  //get all environments from xml filenames
  var env = [];
  var files = fs.readdirSync(dir);

  files.forEach(item => {
      if(! /^\..*/.test(item)) {
        var temp = item.substr(0,item.search(spec));
        if(temp !== "") {
          if(env.indexOf(temp) === -1) {
            env.push(temp);
          }
        }
      }
    }
  );

  //create new directory structure
  var targetDestinationDir = './c3';
  fs.rmrfSync(targetDestinationDir);
  env.forEach(item => {
    fs.mkdirpSync(targetDestinationDir + '/' + item);
  });


  //move xml files to newly created directory
  var walker = fs.walk('./build/coverage/e2e/reports');
  walker.on("file", function (root, stat, next) {
    env.forEach(item => {
      if(stat.name.search(item) !== -1) {
        var src = root + '/' + stat.name;
        var dest = targetDestinationDir + '/' + item + '/' + stat.name;
        fs.copy(src, dest, {replace: true}, function(err) {
          if(err) {
            throw err;
          }
        });
      }
    });
    next();
  });

  //run junit-viewer to read xml and create html
  env.forEach(item => {
    //junit-viewer --results="./custom-reports/chrome51" --save="./chrome.html"
    var cmd = 'junit-viewer --results="' + targetDestinationDir + '/' + item + '" --save="' + targetDestinationDir + '/' + item +'.html"';
    exec(cmd);
  });

  //create e2e-results.html
  var html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>End to End Testing Result</title><link rel="stylesheet" href="//code.jquery.com/ui/1.12.0/themes/base/jquery-ui.css"><script src="https://code.jquery.com/jquery-1.12.4.js"></script><script src="https://code.jquery.com/ui/1.12.0/jquery-ui.js"></script><script>$( function() {$( "#tabs" ).tabs({heightStyle: "fill"});});</script></head><body><div id="tabs" style="height:2000px;">';
  var li = '';
  var tabs = '';
  env.forEach(function(item,i) {
    i++;
    li = li + '<li><a href="#tabs-'+i+'">'+item+'</a></li>';
    tabs = tabs + '<div id="tabs-'+i+'"><iframe name="'+item+'" src="http://localhost:9999/c3/'+item+'.html?i=123" frameborder="0" style="overflow:hidden;overflow-x:hidden;overflow-y:hidden;height:100%;width:100%;position:absolute;top:50px;left:0px;right:0px;bottom:0px" height="100%" width="100%"></iframe></div>';
  });
  html = html + '<ul>' + li + '</ul>' + tabs;
  html = html + '</div></body></html>';

  var filepath = './c3/results.html';
  fs.openSync(filepath, 'w+');

  fs.writeFileSync(filepath, html);

  connect.server({
    port: 9999,
    root: './',
    livereload: true
  });

  var port = '9999';
  setTimeout(function() {
    opens('http://localhost:' + port + '/c3/results.html')
  }, 2000);

  //var parsedData = jv.parse('./custom-reports');
  //var renderedData = jv.render(parsedData);
});
