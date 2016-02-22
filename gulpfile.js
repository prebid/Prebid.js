var fs = require('fs');
var argv = require('yargs').argv;
var gulp = require('gulp');
var gutil = require('gulp-util');
var connect = require('gulp-connect');
var webpack = require('gulp-webpack');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var clean = require('gulp-clean');
var karma = require('gulp-karma');
var replace = require('gulp-replace');
var rename = require('gulp-rename');
var opens = require('open');
var webpackConfig = require('./webpack.conf.js');
var helpers = require('./gulpHelpers');
var path = require('path');
var del = require('del');
var gulpJsdoc2md = require("gulp-jsdoc-to-markdown");
var concat = require("gulp-concat");
var jscs = require('gulp-jscs');
var header = require('gulp-header');
var zip = require('gulp-zip');

var CI_MODE = process.env.NODE_ENV === 'ci';
var prebidSrcLocation = './src/prebid.js';
var pkg = require('./package.json');
var dateString = 'Updated : ' + (new Date()).toISOString().substring(0, 10);
var packageNameVersion = pkg.name + '_' + pkg.version;
var banner = '/* <%= pkg.name %> v<%= pkg.version %> \n' + dateString + ' */\n';

// Tasks
gulp.task('default', ['clean', 'quality', 'webpack']);

gulp.task('serve', ['clean', 'quality', 'webpack', 'watch', 'test']);

gulp.task('build', ['clean', 'quality', 'webpack', 'zip']);

gulp.task('clean', function() {
    return gulp.src(['build', 'test/app/**/*.js', 'test/app/index.html'], {
            read: false
        })
        .pipe(clean());
});

gulp.task('webpack', function() {

    // change output filename if argument --tag given
    if (argv.tag && argv.tag.length) {
        webpackConfig.output.filename = 'prebid.' + argv.tag + '.js';
    }

    return gulp.src('src/*.js')
        .pipe(webpack(webpackConfig))
        .pipe(header(banner, {pkg: pkg}))
        .pipe(gulp.dest('build/dev'))
        .pipe(uglify())
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
gulp.task('test', function() {
    var defaultBrowsers = CI_MODE ? ['PhantomJS'] : ['Chrome'];
    var browserArgs = helpers.parseBrowserArgs(argv).map(helpers.toCapitalCase);

    return gulp.src('lookAtKarmaConfJS')
        .pipe(karma({
            browsers: (browserArgs.length > 0) ? browserArgs : defaultBrowsers,
            configFile: 'karma.conf.js',
            action: (argv.watch) ? 'watch' : 'run'
        }));
});

// Small task to load coverage reports in the browser
gulp.task('coverage', function(done) {
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
gulp.task('watch', function() {

    gulp.watch(['test/spec/**/*.js'], ['webpack', 'test']);
    gulp.watch(['integrationExamples/gpt/*.html'], ['test']);
    gulp.watch(['src/**/*.js'], ['webpack', 'test']);
    connect.server({
        port: 9999,
        root: './',
        livereload: true
    });
});

gulp.task('quality', ['hint', 'jscs'], function() {});

gulp.task('hint', function() {
    return gulp.src('src/**/*.js')
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter('default'));
});

gulp.task('jscs', function() {
    return gulp.src(prebidSrcLocation)
        .pipe(jscs({
            'configPath': 'styleRules.jscs.json'
        }));
});

gulp.task('clean-docs', function(){
    del(['docs']);
});

gulp.task("docs", ['clean-docs'], function() {
    return gulp.src("src/prebid.js")
        .pipe(concat("readme.md"))
        .pipe(gulpJsdoc2md())
        .on("error", function(err){
            gutil.log("jsdoc2md failed:", err.message);
        })
        .pipe(gulp.dest("docs"));
});

