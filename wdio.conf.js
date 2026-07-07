const shared = require('./wdio.shared.conf.js');
const process = require('process');

const browsers = require(`./${process.env.BROWSERS_JSON ?? 'browsers.json'}`);

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
      testReporting: true,
      testReportingOptions: {
        projectName: process.env.BROWSERSTACK_PROJECT_NAME,
        buildName: process.env.BROWSERSTACK_BUILD_NAME
      },
      opts: {
        localIdentifier: process.env.BROWSERSTACK_LOCAL_IDENTIFIER
      },
      browserstackLocal: true
    }]
  ],
  user: process.env.BROWSERSTACK_USERNAME,
  key: process.env.BROWSERSTACK_ACCESS_KEY,
  maxInstances: 5,
  maxInstancesPerCapability: 1,
  capabilities: getCapabilities(),
}
