var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var header = require('gulp-header');
var del = require('del');
var ecstatic = require('ecstatic');
var browserify = require('gulp-browserify');
var gutil = require("gulp-util");
var gulpJsdoc2md = require("gulp-jsdoc-to-markdown");
var concat = require("gulp-concat");
var zip = require('gulp-zip');
var mocha = require('gulp-mocha');

var releaseDir = './dist/';
var csaSrcLocation = './src/prebid.js';

var pkg = require('./package.json');

var dateString = 'Updated : ' + (new Date()).toISOString().substring(0, 10);
var packageNameVersion = pkg.name + '_' + pkg.version;

var banner = '/* <%= pkg.name %> v<%= pkg.version %> \n' + dateString + ' */\n';

//basic/quick tests go here, to be run on every build
gulp.task('runBasicTests', function() {
    return gulp.src('test/*', {read: false})
        .pipe(mocha());
});


gulp.task('jscs', function() {
    return gulp.src(csaSrcLocation)
        .pipe(jscs({
            'configPath': 'styleRules.jscs.json'
        }));


});

//run code quality checks here
gulp.task('jshint', function() {

    gulp.src(['./src/*.js', './src/adapters/*.js'])
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
                'require': false,
                'module' : true,
                'exports' : true,
                'pbjs' : true,
                'googletag': true,
                'ActiveXObject': true
            },
            'browser': true,
            'devel': true

        }))
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jshint.reporter('fail'));

});

gulp.task('clean-dist', ['quality'], function(cb) {
    del([releaseDir + '']);
    cb();

});

//longer tests go here, to be run only when specfcifcally testing
gulp.task('runAdvancedTests', function() {

});

gulp.task('codeQuality', ['jshint', 'jscs'], function() {});

gulp.task('testAll', ['runBasicTests', 'runAdvancedTests'], function() {});

gulp.task('default', ['build'], function() {});

gulp.task('serve', ['build-dev', 'watch'], function () {
	var port = 9999;
	require('http').createServer(ecstatic({
		root: __dirname
	})).listen(port);
	console.log('Server started at http://localhost:' + port + '/');
});

gulp.task('build-dev', ['jscs', 'clean-dist'], function () {
	gulp.src(['src/prebid.js'])
	.pipe(browserify({
		debug: false
	}))
    .pipe(header(banner, {
            pkg: pkg
    }))
	.pipe(gulp.dest(releaseDir));

});

gulp.task('minify', ['quality', 'clean-dist', 'build-dev'], function(cb){
    gulp.src(['src/prebid.js'])
    .pipe(browserify())
    .pipe(uglify())
    .pipe(header(banner, {
            pkg: pkg
        }))
    .pipe(rename({
            basename: 'prebid.min',
            extname: '.js'
        }))
    .pipe(gulp.dest(releaseDir));
    //notify that release is ready
    cb();
});

gulp.task('build', ['quality', 'clean-dist', 'minify', 'zip']);

gulp.task('quality', ['jscs'], function(cb){
    cb();
});

gulp.task('watch', function () {
	gulp.watch(['src/**/*.js'], ['build-dev']);
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
 
//zip up for release
gulp.task('zip', ['quality', 'clean-dist', 'minify'], function () {
    return gulp.src(['dist/*', 'integrationExamples/gpt/*'])
        .pipe(zip(packageNameVersion + '.zip'))
        .pipe(gulp.dest('./'));
});

