const browsers = require('./browsers.json');

function getCapabilities() {
  function getPlatform(os) {
    const platformMap = {
      'Windows': 'WINDOWS',
      'OS X': 'MAC',
    }
    return platformMap[os];
  }

  // only IE 11, Chrome 80 & Firefox 73 run as part of functional tests
  // rest of the browsers are discarded.
  delete browsers['bs_chrome_79_windows_10'];
  delete browsers['bs_firefox_72_windows_10'];
  delete browsers['bs_safari_11_mac_catalina'];
  delete browsers['bs_safari_12_mac_mojave'];
  // disable all edge browsers due to wdio bug for switchToFrame: https://github.com/webdriverio/webdriverio/issues/3880
  delete browsers['bs_edge_18_windows_10'];
  delete browsers['bs_edge_17_windows_10'];

  let capabilities = []
  Object.keys(browsers).forEach(key => {
    let browser = browsers[key];
    capabilities.push({
      browserName: browser.browser,
      os: getPlatform(browser.os),
      os_version: browser.os_version,
      browser_version: browser.browser_version,
      acceptSslCerts: true,
      'browserstack.networkLogs': true,
      'browserstack.console': 'verbose',
      build: 'Prebidjs E2E ' + new Date().toLocaleString()
    });
  });
  return capabilities;
}

exports.config = {
    specs: [
        './test/spec/e2e/**/*.spec.js'
    ],
    services: [
      ['browserstack', {
        browserstackLocal: true
      }]
    ],
    user: process.env.BROWSERSTACK_USERNAME,
    key: process.env.BROWSERSTACK_ACCESS_KEY,
    maxInstances: 5, // Do not increase this, since we have only 5 parallel tests in browserstack account
    capabilities: getCapabilities(),
    logLevel: 'silent', // put option here: info | trace | debug | warn| error | silent
    bail: 0,
    waitforTimeout: 60000, // Default timeout for all waitFor* commands.
    connectionRetryTimeout: 60000, // Default timeout in milliseconds for request if Selenium Grid doesn't send response
    connectionRetryCount: 3, // Default request retries count
    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000,
        compilers: ['js:babel-register'],
    },
    // if you see error, update this to spec reporter and logLevel above to get detailed report.
    reporters: ['concise']
}
