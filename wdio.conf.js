const shared = require('./wdio.shared.conf.js');
const process = require('process');

const browsers = Object.fromEntries(
  Object.entries(require('./browsers-e2e.json'))
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
        buildName: process.env.BROWSERSTACK_BUILD_NAME
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
      browserstackLocal: true,
      testReporting: true,
      testReportingOptions: {
        projectName: "Prebid.js",
        buildName: process.env.BROWSERSTACK_BUILD_NAME
      },
      opts: {
        localIdentifier: process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
      }
    }]
  ],
  user: process.env.BROWSERSTACK_USERNAME,
  key: process.env.BROWSERSTACK_ACCESS_KEY,
  maxInstances: 5, // Do not increase this, since we have only 5 parallel tests in browserstack account
  maxInstancesPerCapability: 1,
  capabilities: getCapabilities(),
}
