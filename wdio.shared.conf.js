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
