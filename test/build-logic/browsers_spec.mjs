import { expect } from 'chai';
import { describe, it } from 'mocha';
import helpers from '../../gulpHelpers.js';
import matrices from '../../.github/workflows/scripts/browserMatrices.js';

const BROWSERS = {
  runner: {
    name: 'Runner',
    runner: { runsOn: 'macos-latest', wdio: 'safari', vitest: { browser: 'safari', safari: true, shards: 2 } },
  },
  both: {
    name: 'Both',
    runner: { runsOn: 'ubuntu-latest', wdio: 'chrome' },
    browserstack: { browserName: 'chrome', browserVersion: 'latest', os: 'Windows', osVersion: '11' },
  },
  device: {
    name: 'Phone',
    browserstack: { deviceName: 'iPhone 14', osVersion: '16', browserName: 'safari', vitest: { shards: 2, maxParallel: 3 } },
  },
};

const DESKTOP_ENV = { VITEST_DEVICE: undefined, VITEST_OS: 'Windows', VITEST_OS_VERSION: '11', VITEST_BROWSER: 'chrome', VITEST_BROWSER_VERSION: 'latest' };

describe('browserstackTargets', () => {
  it('runs every entry with BrowserStack settings', () => {
    expect(helpers.browserstackTargets([], BROWSERS)).to.eql([
      { key: 'both', shards: 1, env: DESKTOP_ENV },
      { key: 'device', shards: 2, env: { VITEST_DEVICE: 'iPhone 14', VITEST_OS: undefined, VITEST_OS_VERSION: '16', VITEST_BROWSER: 'safari', VITEST_BROWSER_VERSION: undefined } },
    ]);
  });

  it('selects entries by key', () => {
    expect(helpers.browserstackTargets(['both'], BROWSERS)).to.eql([{ key: 'both', shards: 1, env: DESKTOP_ENV }]);
  });

  it('names the valid keys when one has no BrowserStack settings', () => {
    expect(() => helpers.browserstackTargets(['runner', 'both'], BROWSERS)).to.throw(/runner.*browsers\.json has them for both, device/);
  });

  it('names the valid keys when one is unknown', () => {
    expect(() => helpers.browserstackTargets(['nope'], BROWSERS)).to.throw(/nope.*both, device/);
  });

  it('runs Chrome latest on Windows 11 for --browsers=chrome', () => {
    expect(helpers.browserstackTargets(['chrome'])).to.eql([{ key: 'chrome', shards: 1, env: DESKTOP_ENV }]);
  });
});

describe('CI browser matrices', () => {
  it('runs e2e on runner entries with wdio', () => {
    expect(matrices.e2eBrowsers(BROWSERS)).to.eql([
      { name: 'Runner', wdioName: 'safari', runsOn: 'macos-latest', os: 'macos', version: 'latest' },
      { name: 'Both', wdioName: 'chrome', runsOn: 'ubuntu-latest', os: 'linux', version: 'latest' },
    ]);
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
