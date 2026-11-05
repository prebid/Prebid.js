import { expect } from 'chai';
import { describe, it } from 'mocha';
import helpers from '../../gulpHelpers.js';
import matrices from '../../.github/workflows/scripts/browserMatrices.js';

const BROWSERS = {
  runner: { name: 'Runner', runsOn: 'macos-latest', wdioName: 'safari', vitest: { browser: 'safari', safari: true, shards: 2 } },
  device: { name: 'Phone', device: 'iPhone 14', os_version: '16', browser: 'safari', vitest: { shards: 2, maxParallel: 3 } },
  desktop: { os: 'Windows', os_version: '11', browser: 'edge', browser_version: 'latest' },
};

describe('browserstackTargets', () => {
  it('runs every BrowserStack entry, skipping runner entries', () => {
    expect(helpers.browserstackTargets([], BROWSERS)).to.eql([
      { key: 'device', env: { VITEST_DEVICE: 'iPhone 14', VITEST_OS: undefined, VITEST_OS_VERSION: '16', VITEST_BROWSER: 'safari', VITEST_BROWSER_VERSION: undefined } },
      { key: 'desktop', env: { VITEST_DEVICE: undefined, VITEST_OS: 'Windows', VITEST_OS_VERSION: '11', VITEST_BROWSER: 'edge', VITEST_BROWSER_VERSION: 'latest' } },
    ]);
  });

  it('selects entries by key', () => {
    expect(helpers.browserstackTargets(['desktop'], BROWSERS).map(({ key }) => key)).to.eql(['desktop']);
  });

  it('names the valid keys when one is unknown', () => {
    expect(() => helpers.browserstackTargets(['runner', 'desktop'], BROWSERS)).to.throw(/runner.*browsers\.json has device, desktop/);
  });

  it('reads browsers.json by default', () => {
    expect(helpers.browserstackTargets().length).to.be.greaterThan(0);
  });
});

describe('CI browser matrices', () => {
  it('runs e2e on runner entries with wdioName', () => {
    expect(matrices.e2eBrowsers(BROWSERS)).to.eql([{ name: 'Runner', wdioName: 'safari', runsOn: 'macos-latest', os: 'macos', version: 'latest' }]);
  });

  it('expands Vitest runner entries by shard', () => {
    expect(matrices.vitestRunners(BROWSERS)).to.eql([1, 2].map(shard => (
      { name: 'Runner', runsOn: 'macos-latest', browser: 'safari', safari: true, shards: 2, shard }
    )));
  });

  it('expands Vitest BrowserStack entries by shard', () => {
    expect(matrices.vitestBrowserstack(BROWSERS)).to.eql([1, 2].map(shard => (
      { name: 'Phone', browser: 'safari', device: 'iPhone 14', osVersion: '16', shards: 2, shard }
    )));
    expect(matrices.vitestBrowserstackMaxParallel(BROWSERS)).to.equal(3);
  });
});
