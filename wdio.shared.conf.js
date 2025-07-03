const path = require('path');
const fs = require('fs');

if (!process.env.BABEL_CACHE_PATH) {
  const cacheFile = path.resolve(__dirname, '.cache', 'babel-register.json');
  fs.mkdirSync(path.dirname(cacheFile), {recursive: true});
  process.env.BABEL_CACHE_PATH = cacheFile;
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
  logLevel: 'info', // put option here: info | trace | debug | warn| error | silent
  bail: 1,
  waitforTimeout: 60000, // Default timeout for all waitFor* commands.
  connectionRetryTimeout: 60000, // Default timeout in milliseconds for request if Selenium Grid doesn't send response
  connectionRetryCount: 1, // Default request retries count
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
    compilers: ['js:@babel/register'],
  },
  // if you see error, update this to spec reporter and logLevel above to get detailed report.
  reporters: ['spec']
}
