// Karma configuration
// Generated on Thu Aug 07 2014 09:45:28 GMT-0700 (PDT)
var webpackConfig = require('./webpack.conf');
var helpers = require('./gulpHelpers');
var argv = require('yargs').argv;
// Pass your browsers by using --browsers=chrome,firefox,ie9
// Run CI by passing --watch
var defaultBrowsers = CI_MODE ? ['PhantomJS'] : ['Chrome']
var browserArgs = helpers.parseBrowserArgs(argv).map(helpers.toCapitalCase);

webpackConfig.module.postLoaders = [
  {
    test: /\.js$/,
    exclude: /(node_modules)|(test)|(integrationExamples)|(build)/,
    loader: 'istanbul-instrumenter'
  }
];

var CI_MODE = process.env.NODE_ENV === 'ci';

module.exports = function (config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: './',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['es5-shim', 'mocha', 'expect', 'sinon'],

    // list of files / patterns to load in the browser
    files: [
      'test/**/*_spec.js'
    ],

    // list of files to exclude
    exclude: [],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'test/**/*_spec.js': ['webpack'],
      'src/**/*.js': ['webpack', 'coverage']
    },

    // WebPack Related
    webpack: webpackConfig,

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: CI_MODE ? ['junit', 'coverage'] : ['progress', 'html', 'nyan', 'coverage'],

    // junit reporter config
    junitReporter: {
      outputDir: 'test'
    },

    // optionally, configure the reporter
    coverageReporter: {
      reporters: [
        { type: 'html', dir: './build/coverage/' },
        { type: 'text', dir: './build/coverage/' },
        { type: 'lcov', dir: './build/coverage/lcov', subdir: '.' }
      ]
    },

    htmlReporter: {
      outputDir: 'build/coverage/karma_html', // where to put the reports
      urlFriendlyName: true, // simply replaces spaces with _ for files/dirs
      reportName: 'report' // report summary filename; browser info by default
    },

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: (argv.watch) ? true : false,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: (browserArgs.length > 0) ? browserArgs : defaultBrowsers,

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: (argv.watch) ? false : true,

    plugins: [
      'karma-phantomjs-launcher',
      'karma-nyan-reporter',
      'karma-coverage',
      'karma-es5-shim',
      'karma-mocha',
      'karma-expect',
      'karma-sinon',
      'karma-webpack',
      'karma-junit-reporter',
      'karma-html-reporter',
      'karma-chrome-launcher',
      'karma-sauce-launcher',
      'karma-firefox-launcher',
      'karma-opera-launcher',
      'karma-safari-launcher',
      'karma-script-launcher',
      'karma-requirejs',
      'karma-ie-launcher'
    ]
  });
};
