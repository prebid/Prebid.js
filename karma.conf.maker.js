// This configures Karma, describing how to run the tests and where to output code coverage reports.
//
// For more information, see http://karma-runner.github.io/1.0/config/configuration-file.html

var path = require('path')
var karmaConstants = require('karma').constants;

module.exports = function(codeCoverage, browserstack) {
  var webpackConfig = require('./webpack.conf');

  // remove optimize plugin for tests
  webpackConfig.plugins.pop()

  if (codeCoverage) {
    webpackConfig.module.rules.push({
      enforce: 'post',
      exclude: /(node_modules)|(test)|(integrationExamples)|(build)|polyfill.js|(src\/adapters\/analytics\/ga.js)/,
      loader: 'istanbul-instrumenter-loader',
      test: /\.js$/
    })
  }

  var plugins = [
    'karma-chrome-launcher',
    'karma-coverage-istanbul-reporter',
    'karma-es5-shim',
    'karma-expect',
    'karma-mocha',
    'karma-requirejs',
    'karma-sinon-ie',
    'karma-webpack',
  ];
  if (browserstack) {
    plugins.push('karma-browserstack-launcher');
    plugins.push('karma-sauce-launcher');
    plugins.push('karma-firefox-launcher');
    plugins.push('karma-opera-launcher');
    plugins.push('karma-safari-launcher');
    plugins.push('karma-script-launcher');
    plugins.push('karma-ie-launcher');
  }

  var config = {
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: './',

    webpack: webpackConfig,
    webpackMiddleware: {
      noInfo: true
    },

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['es5-shim', 'mocha', 'expect', 'sinon'],

    // list of files / patterns to load in the browser
    files: [
      'test/helpers/prebidGlobal.js',
      'test/**/*_spec.js',
      'test/helpers/karma-init.js'
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'test/**/*_spec.js': ['webpack'],
      'test/helpers/prebidGlobal.js': ['webpack'],
      'src/**/*.js': ['webpack']
    },

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: karmaConstants.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,
    browserDisconnectTimeout: 10000, // default 2000
    browserDisconnectTolerance: 1, // default 0
    browserNoActivityTimeout: 4 * 60 * 1000, // default 10000
    captureTimeout: 4 * 60 * 1000, // default 60000

    plugins: plugins
  }

  if (codeCoverage) {
    config.reporters = ['coverage-istanbul']
    config.coverageIstanbulReporter = {
      reports: ['html', 'lcovonly', 'text-summary'],
      dir: path.join(__dirname, 'build', 'coverage'),
      'report-config': {
        html: {
          subdir: 'karma_html',
          urlFriendlyName: true, // simply replaces spaces with _ for files/dirs
          // reportName: 'report' // report summary filename; browser info by default
        }
      }
    }
  }

  if (browserstack) {
    config.browserStack = {
      username: process.env.BROWSERSTACK_USERNAME,
      accessKey: process.env.BROWSERSTACK_KEY
    }

    config.customLaunchers = require('./browsers.json')
    config.browsers = [
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
  } else {
    config.browsers = ['ChromeHeadless']
  }

  return config;
}
