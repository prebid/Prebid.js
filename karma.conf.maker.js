// This configures Karma, describing how to run the tests and where to output code coverage reports.
//
// For more information, see http://karma-runner.github.io/1.0/config/configuration-file.html

var _ = require('lodash');
var webpackConf = require('./webpack.conf');
var path = require('path')
var karmaConstants = require('karma').constants;

function newWebpackConfig(codeCoverage) {
  // Make a clone here because we plan on mutating this object, and don't want parallel tasks to trample each other.
  var webpackConfig = _.cloneDeep(webpackConf);

  // remove optimize plugin for tests
  webpackConfig.plugins.pop()

  webpackConfig.devtool = 'inline-source-map';

  if (codeCoverage) {
    webpackConfig.module.rules.push({
      enforce: 'post',
      exclude: /(node_modules)|(test)|(integrationExamples)|(build)|polyfill.js|(src\/adapters\/analytics\/ga.js)/,
      loader: 'istanbul-instrumenter-loader',
      test: /\.js$/
    })
  }
  return webpackConfig;
}

function newPluginsArray(browserstack) {
  var plugins = [
    'karma-chrome-launcher',
    'karma-coverage-istanbul-reporter',
    'karma-es5-shim',
    'karma-mocha',
    'karma-chai',
    'karma-requirejs',
    'karma-sinon',
    'karma-sourcemap-loader',
    'karma-spec-reporter',
    'karma-webpack',
    'karma-mocha-reporter'
  ];
  if (browserstack) {
    plugins.push('karma-browserstack-launcher');
    plugins.push('karma-firefox-launcher');
    plugins.push('karma-opera-launcher');
    plugins.push('karma-safari-launcher');
    plugins.push('karma-script-launcher');
    plugins.push('karma-ie-launcher');
  }
  return plugins;
}

function setReporters(karmaConf, codeCoverage, browserstack) {
  // In browserstack, the default 'progress' reporter floods the logs.
  // The karma-spec-reporter reports failures more concisely
  if (browserstack) {
    karmaConf.reporters = ['spec'];
    karmaConf.specReporter = {
      maxLogLines: 100,
      suppressErrorSummary: false,
      suppressSkipped: false,
      suppressPassed: true
    };
  }
  if (codeCoverage) {
    karmaConf.reporters.push('coverage-istanbul');
    karmaConf.coverageIstanbulReporter = {
      reports: ['html', 'lcovonly', 'text-summary'],
      dir: path.join(__dirname, 'build', 'coverage'),
      'report-config': {
        html: {
          subdir: 'karma_html',
          urlFriendlyName: true, // simply replaces spaces with _ for files/dirs
        }
      }
    }
  }
}

function setBrowsers(karmaConf, browserstack) {
  if (browserstack) {
    karmaConf.browserStack = {
      username: process.env.BROWSERSTACK_USERNAME,
      accessKey: process.env.BROWSERSTACK_ACCESS_KEY
    }
    if (process.env.TRAVIS) {
      karmaConf.browserStack.startTunnel = false;
      karmaConf.browserStack.tunnelIdentifier = process.env.BROWSERSTACK_LOCAL_IDENTIFIER;
    }
    karmaConf.customLaunchers = require('./browsers.json')
    karmaConf.browsers = Object.keys(karmaConf.customLaunchers);
  } else {
    karmaConf.browsers = ['ChromeHeadless'];
  }
}

module.exports = function(codeCoverage, browserstack, watchMode, file) {
  var webpackConfig = newWebpackConfig(codeCoverage);
  var plugins = newPluginsArray(browserstack);

  var files = file ? ['test/helpers/prebidGlobal.js', file] : ['test/test_index.js'];
  // This file opens the /debug.html tab automatically.
  // It has no real value unless you're running --watch, and intend to do some debugging in the browser.
  if (watchMode) {
    files.push('test/helpers/karma-init.js');
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
    frameworks: ['es5-shim', 'mocha', 'chai', 'sinon'],

    files: files,

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'test/test_index.js': ['webpack', 'sourcemap']
    },

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: karmaConstants.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    reporters: ['mocha'],
    mochaReporter: {
      showDiff: true
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: !watchMode,
    browserDisconnectTimeout: 10000, // default 2000
    browserDisconnectTolerance: 1, // default 0
    browserNoActivityTimeout: 4 * 60 * 1000, // default 10000
    captureTimeout: 4 * 60 * 1000, // default 60000

    plugins: plugins
  }
  setReporters(config, codeCoverage, browserstack);
  setBrowsers(config, browserstack);
  return config;
}
