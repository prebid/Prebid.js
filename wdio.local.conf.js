const shared = require('./wdio.shared.conf.js');

exports.config = {
  ...shared.config,
  capabilities: [
    {
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: ['headless', 'disable-gpu'],
      },
    },
  ],
};
