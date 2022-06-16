const karma = require('karma');
const process = require('process');
const karmaConfMaker = require('./karma.conf.maker.js');

process.on('message', function(options) {
  try {
    let cfg = karmaConfMaker(options.coverage, options.browserstack, options.watch, options.file, options.disableFeatures);
    if (options.browsers && options.browsers.length) {
      cfg.browsers = options.browsers;
    }
    if (options.oneBrowser) {
      cfg.browsers = [cfg.browsers.find((b) => b.toLowerCase().includes(options.oneBrowser.toLowerCase())) || cfg.browsers[0]]
    }
    cfg = karma.config.parseConfig(null, cfg);
    new karma.Server(cfg, (exitCode) => {
      process.exit(exitCode);
    }).start();
  } catch (e) {
    // eslint-disable-next-line
    console.error(e);
    process.exit(1);
  }
});
