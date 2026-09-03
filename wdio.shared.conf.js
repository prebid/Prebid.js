// Collected per worker and printed by `after` below. The run log is long - a failing
// browserstack run is easily ten thousand lines, of which fewer than a hundred say
// anything about the tests - and webdriverio reports each spec as its worker finishes,
// so failures end up scattered rather than gathered anywhere. This gives one block per
// browser that can be found by searching for E2E FAILURES.
const failures = new Map();

exports.config = {
  specs: [
    './test/spec/e2e/**/*.spec.js',
  ],
  logLevel: 'info', // put option here: info | trace | debug | warn| error | silent
  bail: 1,
  waitforTimeout: 60000, // Default timeout for all waitFor* commands.
  connectionRetryTimeout: 60000, // Default timeout in milliseconds for request if Selenium Grid doesn't send response
  connectionRetryCount: 3, // additional retries for transient session issues
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
  // if you see error, update this to spec reporter and logLevel above to get detailed report.
  reporters: ['spec'],

  afterTest(test, context, {error, passed}) {
    if (passed) return;
    // keyed by test, because mocha calls this once per retry and we only want the
    // outcome, not one entry per attempt
    failures.set(`${test.parent} > ${test.title}`,
      String((error && error.message) || error || 'unknown error').split('\n')[0].trim());
  },

  after() {
    if (!failures.size) return;
    let label = 'unknown browser';
    try {
      const caps = browser.capabilities || {};
      label = [caps.browserName, caps.browserVersion || caps.version].filter(Boolean).join(' ');
    } catch (e) { /* capabilities are not always readable once a session has gone away */ }

    const block = [`\n======== E2E FAILURES on ${label} (${failures.size}) ========`];
    let n = 0;
    failures.forEach((message, name) => block.push(`  ${++n}) ${name}\n     ${message}`));
    block.push(`======== END E2E FAILURES on ${label} ========\n`);
    // one write: the browserstack service logs asynchronously on the same stream and
    // will happily interleave itself between separate console.log calls
    // eslint-disable-next-line no-console
    console.log(block.join('\n'));

    if (process.env.GITHUB_ACTIONS) {
      // annotations have to be one per line; these surface at the top of the run
      // instead of only thousands of lines into the step log
      failures.forEach((message, name) => {
        // eslint-disable-next-line no-console
        console.log(`::error title=e2e: ${label}::${name} - ${message}`);
      });
    }
  }
}
