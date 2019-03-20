const browsers = require('./browsers.json');

function getCapabilities() {
  function getPlatform(os) {
    const platformMap = {
      'Windows': 'WINDOWS',
      'OS X': 'MAC',
    }
    return platformMap[os];
  }

  let capabilities = []
  Object.keys(browsers).forEach(key => {
    let browser = browsers[key];
    capabilities.push({
      browserName: browser.browser,
      platform: getPlatform(browser.os),
      version: browser.browser_version,
      acceptSslCerts: true,
      'browserstack.networkLogs': true,
      'browserstack.console': 'verbose',
      build: 'UC ' + new Date().toLocaleString()
    });
  });
  return capabilities;
}

exports.config = {
  specs: [
    './test/spec/lfe2e/specs/*.js'
  ],
  services: ['browserstack'],
  user: process.env.BROWSERSTACK_USERNAME,
  key: process.env.BROWSERSTACK_ACCESS_KEY,
  browserstackLocal: true,
  // Do not increase this, since we have only 5 parallel tests in browserstack account
  maxInstances: 5,
  capabilities: getCapabilities(),
  logLevel: 'silent', // Level of logging verbosity: silent | verbose | command | data | result | error
  coloredLogs: true,
  waitforTimeout: 30000, // Default timeout for all waitFor* commands.
  connectionRetryTimeout: 30000, // Default timeout in milliseconds for request if Selenium Grid doesn't send response
  connectionRetryCount: 3, // Default request retries count
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 30000,
    compilers: ['js:babel-register'],
  },
  // if you see error, update this to spec reporter and logLevel above to get detailed report.
  reporters: ['concise']
};
