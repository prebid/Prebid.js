const shared = require('./wdio.shared.conf.js');
const process = require('process');

exports.config = {
  ...shared.config,
  capabilities: [
    {
      browserName: 'chrome',
      browserVersion: process.env.BROWSER_VERSION !== 'latest' ? process.env.BROWSER_VERSION : undefined,
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
      browserName: 'safari technology preview'
    }
  ].filter((cap) => cap.browserName === (process.env.BROWSER ?? 'chrome')),
  maxInstancesPerCapability: 1
};
