// Karma configuration
// Generated on Thu Aug 07 2014 09:45:28 GMT-0700 (PDT)
var webpackConfig = require('./webpack.conf');
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

    // BrowserStack Config
    browserStack: {
      username: process.env.BROWSERSTACK_USERNAME,
      accessKey: process.env.BROWSERSTACK_KEY
    },

    // define browsers
    customLaunchers: {
      bs_ie_13_windows_10: {
        base: 'BrowserStack',
        os_version: '10',
        browser: 'edge',
        browser_version: '13.0',
        device: null,
        os: 'Windows'
      },
      bs_ie_11_windows_10: {
        base: 'BrowserStack',
        os_version: '10',
        browser: 'ie',
        browser_version: '11.0',
        device: null,
        os: 'Windows'
      },
      bs_firefox_46_windows_10: {
        base: 'BrowserStack',
        os_version: '10',
        browser: 'firefox',
        browser_version: '46.0',
        device: null,
        os: 'Windows'
      },
      bs_chrome_51_windows_10: {
        base: 'BrowserStack',
        os_version: '10',
        browser: 'chrome',
        browser_version: '51.0',
        device: null,
        os: 'Windows'
      },
      'bs_ie_11_windows_8.1': {
        base: 'BrowserStack',
        os_version: '8.1',
        browser: 'ie',
        browser_version: '11.0',
        device: null,
        os: 'Windows'
      },
      'bs_firefox_46_windows_8.1': {
        base: 'BrowserStack',
        os_version: '8.1',
        browser: 'firefox',
        browser_version: '46.0',
        device: null,
        os: 'Windows'
      },
      'bs_chrome_51_windows_8.1': {
        base: 'BrowserStack',
        os_version: '8.1',
        browser: 'chrome',
        browser_version: '51.0',
        device: null,
        os: 'Windows'
      },
      bs_ie_10_windows_8: {
        base: 'BrowserStack',
        os_version: '8',
        browser: 'ie',
        browser_version: '10.0',
        device: null,
        os: 'Windows'
      },
      bs_firefox_46_windows_8: {
        base: 'BrowserStack',
        os_version: '8',
        browser: 'firefox',
        browser_version: '46.0',
        device: null,
        os: 'Windows'
      },
      bs_chrome_51_windows_8: {
        base: 'BrowserStack',
        os_version: '8',
        browser: 'chrome',
        browser_version: '51.0',
        device: null,
        os: 'Windows'
      },
      bs_ie_11_windows_7: {
        base: 'BrowserStack',
        os_version: '7',
        browser: 'ie',
        browser_version: '11.0',
        device: null,
        os: 'Windows'
      },
      bs_ie_10_windows_7: {
        base: 'BrowserStack',
        os_version: '7',
        browser: 'ie',
        browser_version: '10.0',
        device: null,
        os: 'Windows'
      },
      bs_ie_9_windows_7: {
        base: 'BrowserStack',
        os_version: '7',
        browser: 'ie',
        browser_version: '9.0',
        device: null,
        os: 'Windows'
      },
      bs_firefox_46_windows_7: {
        base: 'BrowserStack',
        os_version: '7',
        browser: 'firefox',
        browser_version: '46.0',
        device: null,
        os: 'Windows'
      },
      bs_chrome_51_windows_7: {
        base: 'BrowserStack',
        os_version: '7',
        browser: 'chrome',
        browser_version: '51.0',
        device: null,
        os: 'Windows'
      },
      'bs_safari_9.1_mac_elcapitan': {
        base: 'BrowserStack',
        os_version: 'El Capitan',
        browser: 'safari',
        browser_version: '9.1',
        device: null,
        os: 'OS X'
      },
      bs_firefox_46_mac_elcapitan: {
        base: 'BrowserStack',
        os_version: 'El Capitan',
        browser: 'firefox',
        browser_version: '46.0',
        device: null,
        os: 'OS X'
      },
      bs_chrome_51_mac_elcapitan: {
        base: 'BrowserStack',
        os_version: 'El Capitan',
        browser: 'chrome',
        browser_version: '51.0',
        device: null,
        os: 'OS X'
      },
      bs_safari_8_mac_yosemite: {
        base: 'BrowserStack',
        os_version: 'Yosemite',
        browser: 'safari',
        browser_version: '8.0',
        device: null,
        os: 'OS X'
      },
      bs_firefox_46_mac_yosemite: {
        base: 'BrowserStack',
        os_version: 'Yosemite',
        browser: 'firefox',
        browser_version: '46.0',
        device: null,
        os: 'OS X'
      },
      bs_chrome_51_mac_yosemite: {
        base: 'BrowserStack',
        os_version: 'Yosemite',
        browser: 'chrome',
        browser_version: '51.0',
        device: null,
        os: 'OS X'
      },
      'bs_safari_7.1_mac_mavericks': {
        base: 'BrowserStack',
        os_version: 'Mavericks',
        browser: 'safari',
        browser_version: '7.1',
        device: null,
        os: 'OS X'
      },
      bs_firefox_46_mac_mavericks: {
        base: 'BrowserStack',
        os_version: 'Mavericks',
        browser: 'firefox',
        browser_version: '46.0',
        device: null,
        os: 'OS X'
      },
      bs_chrome_49_mac_mavericks: {
        base: 'BrowserStack',
        os_version: 'Mavericks',
        browser: 'chrome',
        browser_version: '49.0',
        device: null,
        os: 'OS X'
      },
      Chrome_travis_ci: {
        base: 'Chrome',
        flags: ['--no-sandbox']
      }
    },

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
      '!test/**/*_spec.js': 'coverage',
      'src/**/*.js': ['webpack', 'coverage']
    },

    // WebPack Related
    webpack: webpackConfig,
    webpackMiddleware: {
      noInfo: true
    },

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
    autoWatch: true,

    // start these browsers
    // NOTE: these get defined again in gulpfile.js for the gulp tasks
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome', 'Firefox'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    plugins: [
      'karma-browserstack-launcher',
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
