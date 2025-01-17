const shared = require('./wdio.shared.conf.js');

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
  ...shared.config,
  services: [
    ['browserstack', {
      browserstackLocal: true
    }]
  ],
  user: process.env.BROWSERSTACK_USERNAME,
  key: process.env.BROWSERSTACK_ACCESS_KEY,
  maxInstances: 5, // Do not increase this, since we have only 5 parallel tests in browserstack account
  maxInstancesPerCapability: 1,
  capabilities: getCapabilities(),
}
