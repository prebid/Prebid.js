const browsers = Object.fromEntries(
  Object.entries(require('./browsers.json'))
    .filter(([k, v]) => {
      // run only on latest; exclude Safari
      // (Webdriver's `browser.url(...)` times out on Safari if the page loads a video; does it wait for playback to complete?)
      return v.browser_version === 'latest' && v.browser !== 'safari'
    })
);

function getCapabilities() {
  function getPlatform(os) {
    const platformMap = {
      'Windows': 'WINDOWS',
      'OS X': 'OS X',
    }
    return platformMap[os];
  }

  let capabilities = []
  Object.values(browsers).forEach(browser => {
    capabilities.push({
      browserName: browser.browser,
      browserVersion: browser.browser_version,
      'bstack:options': {
        os: getPlatform(browser.os),
        osVersion: browser.os_version,
        networkLogs: true,
        consoleLogs: 'verbose',
        buildName: `Prebidjs E2E (${browser.browser} ${browser.browser_version}) ${new Date().toLocaleString()}`
      },
      acceptInsecureCerts: true,
    });
  });
  return capabilities;
}

exports.config = {
  specs: [
    './test/spec/e2e/**/*.spec.js',
  ],
  exclude: [
    // TODO: decipher original intent for "longform" tests
    // they all appear to be almost exact copies
    './test/spec/e2e/longform/**/*'
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
  logLevel: 'info', // put option here: info | trace | debug | warn| error | silent
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
  reporters: ['spec']
}
