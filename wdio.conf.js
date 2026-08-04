const shared = require('./wdio.shared.conf.js');
const process = require('process');

// BROWSERS_JSON lets CI point the e2e suite at an explicit browser set - e.g. the
// older browsers that the --ES5 build targets. Use `||` rather than `??`: an unset
// workflow input reaches us as the empty string, not as undefined.
const browsersFile = process.env.BROWSERS_JSON || 'browsers.json';
const allBrowsers = require(`./${browsersFile}`);

// An explicitly requested set is used as-is; the default matrix gets filtered.
const browsers = process.env.BROWSERS_JSON ? allBrowsers : Object.fromEntries(
  Object.entries(allBrowsers)
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
        buildName: process.env.BROWSERSTACK_BUILD_NAME,
        projectName: process.env.BROWSERSTACK_PROJECT_NAME,
        // Bind each session to *our* tunnel explicitly. Leaving this to the service to
        // inject is not reliable: its SDK bootstrap fails on CI runners, and a session
        // with no binding is free to pick any tunnel open on the account. That is not
        // theoretical - in run 30960151279 chrome and firefox loaded the page while the
        // safari session logged no messages at all, i.e. it never reached the local
        // server, and it can equally well attach to an unrelated concurrent run.
        local: true,
        localIdentifier: process.env.BROWSERSTACK_LOCAL_IDENTIFIER
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
      // `testReporting`/`testReportingOptions` are accepted aliases for
      // `testObservability`/`testObservabilityOptions`; the service maps them itself.
      // These names carry the values run-tests.yml exports via the browserstack
      // setup-env action, which would otherwise go unused - observability is on by
      // default, so without them sessions just show up unnamed.
      testReporting: true,
      testReportingOptions: {
        projectName: process.env.BROWSERSTACK_PROJECT_NAME,
        buildName: process.env.BROWSERSTACK_BUILD_NAME
      },
      opts: {
        // reuse the tunnel that setup-local already started in CI rather than
        // opening a second one with an unrelated identifier
        localIdentifier: process.env.BROWSERSTACK_LOCAL_IDENTIFIER
      },
      // CI's run-tests.yml already starts BrowserStackLocal (setup-local, which exports
      // BROWSERSTACK_LOCAL_IDENTIFIER); starting a second binary against the same
      // identifier is at best redundant. Manage the tunnel ourselves only when nobody
      // else has.
      browserstackLocal: !process.env.BROWSERSTACK_LOCAL_IDENTIFIER
    }]
  ],
  user: process.env.BROWSERSTACK_USERNAME,
  key: process.env.BROWSERSTACK_ACCESS_KEY,
  maxInstances: 5, // Do not increase this, since we have only 5 parallel tests in browserstack account
  maxInstancesPerCapability: 1,
  capabilities: getCapabilities(),
}
