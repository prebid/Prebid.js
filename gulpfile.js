var gulp = require('gulp');
var path = require('path');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');
var jshint = require('gulp-jshint');
var preprocess = require('gulp-preprocess');
var strip = require('gulp-strip-comments');
var beautify = require('gulp-beautify');
var jscs = require('gulp-jscs');
var notify = require('gulp-notify');
var header = require('gulp-header');
var del = require('del');
var ecstatic = require('ecstatic');
var browserify = require('gulp-browserify');


var fs = require('fs');


var releaseDir = './dist/';
var csaSrcLocation = './src/prebid.js';

var pkg = require('./package.json');

var distFilenameBase = "prebid";
var distFilenameVersionSuffix = "-" + pkg.version;
var distFilenameDebugExtname = ".debug.js";
var distFilenameMaxVersionExtname = ".max.js";
var distFilenameReleaseVersionExtname = ".js";
var numberedVersionsDir = "versionNumbered/";

//var banner = ['/**',
//   ' * @version v<%= pkg.version %>',
//  ' */',
//    ''].join('\n');
var banner = '/* <%= pkg.name %> v<%= pkg.version %> */\n';


//copy a full version of to our dist folder
gulp.task('copyFullVersion', function() {

    return gulp.src([csaSrcLocation])
        .pipe(preprocess({
            context: {
                NODE_ENV: 'production',
                TRACK_LATENCY: true
            }
        })) //To set environment variables in-line
        .pipe(strip())
        .pipe(beautify({
            indentSize: 2,
            preserveNewlines: false
        }))
        .pipe(header(banner, {
            pkg: pkg
        }))
        .pipe(rename({
            basename: distFilenameBase,
            extname: distFilenameMaxVersionExtname
        }))
        .pipe(gulp.dest(releaseDir))
        .pipe(rename({
            dirname: numberedVersionsDir,
            basename: distFilenameBase,
            suffix: distFilenameVersionSuffix,
            extname: distFilenameMaxVersionExtname
        }))
        .pipe(gulp.dest(releaseDir));

});

gulp.task('buildFullDebugVersion', function() {

    return gulp.src([csaSrcLocation])
        .pipe(preprocess({
            context: {
                NODE_ENV: 'debug',
                TRACK_LATENCY: true

            }
        })) //To set environment variables in-line       
        .pipe(beautify({
            indentSize: 2,
            preserveNewlines: false
        }))
        .pipe(header(banner, {
            pkg: pkg
        }))
        .pipe(rename({
            basename: distFilenameBase,
            extname: distFilenameDebugExtname
        }))
        .pipe(gulp.dest(releaseDir))
        .pipe(rename({
            dirname: numberedVersionsDir,
            basename: distFilenameBase,
            suffix: distFilenameVersionSuffix,
            extname: distFilenameDebugExtname
        }))
        .pipe(gulp.dest(releaseDir));

});


//create a sourcemap and minify
gulp.task('minify', function() {
    return gulp.src(csaSrcLocation)
        .pipe(preprocess({
            context: {
                NODE_ENV: 'production',
                TRACK_LATENCY: true

            }
        })) //To set environment variables in-line
        //create our sourceemap

    //.pipe(sourcemaps.init({loadMaps:true}))
    //now that our sourcemap has been created, transform the code however we want
    .pipe(uglify({
            'preserveComments': 'some'
        }))
        //.pipe(sourcemaps.write('./'))
        .pipe(header(banner, {
            pkg: pkg
        }))
        .pipe(rename({
            basename: distFilenameBase,
            extname: distFilenameReleaseVersionExtname
        }))
        .pipe(gulp.dest(releaseDir))
        .pipe(rename({
            dirname: numberedVersionsDir,
            basename: distFilenameBase,
            suffix: distFilenameVersionSuffix,
            extname: distFilenameReleaseVersionExtname
        }))
        .pipe(gulp.dest(releaseDir));
});



//basic/quick tests go here, to be run on every build
gulp.task('runBasicTests', function() {});


gulp.task('jscs', function() {
    return gulp.src(csaSrcLocation)
        .pipe(jscs({
            'configPath': 'styleRules.jscs.json'
        }));


});

//run code quality checks here
gulp.task('jshint', function() {

    gulp.src(csaSrcLocation)
        .pipe(jshint({
            'bitwise': 'true',
            'curly': 'true',
            'scripturl': 'false',
            //'enforceall':'false',
            //since we are never orriding Prootype (we control all this code)
            //I am ok letting this be false in the name of faster code execution
            'forin': false,
            'eqeqeq': true,
            //'es3':true,
            //'es5':true,
            'freeze': true,
            'futurehostile': true,
            'latedef': true,
            'maxerr': '1000',
            'noarg': true,
            'nocomma': true,
            'nonbsp': true,
            'nonew': true,
            'notypeof': true,
            //excessive parens are ok as long as they increase code readability
            //and help to prevent errors, especially when helping to provide
            //structure to long conditonal statements
            'singleGroups': false,
            'undef': true,
            'unused': true,
            'globals': {
                'apn_csa': true,
                'pbjs' : true,
                'googletag': true,
                'ActiveXObject': true
            },
            'browser': true,
            'devel': true,

        }))
        .pipe(jshint.reporter());

});

gulp.task('clean-dist', function() {
    del([releaseDir + '']);

});

//longer tests go here, to be run only when specfcifcally testing
gulp.task('runAdvancedTests', function() {

});

gulp.task('codeQuality', ['jshint', 'jscs'], function() {});

gulp.task('testAll', ['runBasicTests', 'runAdvancedTests'], function() {});

gulp.task('default', ['clean-dist', 'codeQuality', 'runBasicTests', 'buildFullDebugVersion', 'copyFullVersion', 'minify'], function() {});

gulp.task('serve', ['build-dev', 'watch'], function () {
	var port = 9999;
	require('http').createServer(ecstatic({
		root: __dirname
	})).listen(port);
	console.log('Server started at http://localhost:' + port + '/');
});

gulp.task('build-dev', ['clean-dist'], function () {
	gulp.src(['src/prebid.js'])
	.pipe(browserify({
		debug: true
	}))
	.pipe(gulp.dest(path.join(releaseDir, 'build')));

});

gulp.task('build', ['clean-dist'], function () {
	gulp.src(['src/prebid.js'])
	.pipe(browserify())
	.pipe(uglify())
    .pipe(header(banner, {
            pkg: pkg
        }))
	.pipe(gulp.dest(path.join(releaseDir, 'build')));

});

gulp.task('watch', function () {
	gulp.watch(['src/**/*.js'], ['build-dev'])
});
