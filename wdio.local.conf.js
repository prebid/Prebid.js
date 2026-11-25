const shared = require('./wdio.shared.conf.js');
const process = require('process');

exports.config = {
  ...shared.config,
  capabilities: [
    {
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: ['headless', 'disable-gpu'],
      },
    },
    {
      browserName: 'firefox',
      'moz:firefoxOptions': {
        args: ['-headless']
      }
    },
    {
      browserName: 'msedge',
      'ms:edgeOptions': {
        args: ['--headless']
      }
    },
    {
      browserName: 'safari'
    }
  ].filter((cap) => cap.browserName === (process.env.BROWSER ?? 'chrome'))
    // test/helpers/testing-utils.js switches frames with `switchFrame`, which throws in a WebDriver BiDi session
    .map((cap) => ({ ...cap, 'wdio:enforceWebDriverClassic': true })),
  maxInstancesPerCapability: 1
};
