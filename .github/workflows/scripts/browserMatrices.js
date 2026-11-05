const os = (runsOn) => runsOn.startsWith('windows') ? 'windows' : runsOn.startsWith('macos') ? 'macos' : 'linux';

const byShard = (entry) => Array.from({length: entry.shards}, (_, i) => ({...entry, shard: i + 1}));

function e2eBrowsers(browsers) {
  return Object.values(browsers)
    .filter(def => def.runner?.wdio)
    .map(({name, runner: {wdio, runsOn}}) => ({name, wdioName: wdio, runsOn, os: os(runsOn), version: 'latest'}));
}

function vitestRunners(browsers) {
  return Object.values(browsers)
    .filter(def => def.runner?.vitest)
    .flatMap(({name, runner: {runsOn, vitest}}) => byShard({name, runsOn, ...vitest}));
}

function vitestBrowserstack(browsers) {
  return Object.values(browsers)
    .filter(def => def.browserstack?.vitest)
    .flatMap(({name, browserstack: bs}) => byShard({
      name,
      browser: bs.browserName,
      ...(bs.deviceName
        ? {device: bs.deviceName, osVersion: bs.osVersion}
        : {os: bs.os, osVersion: bs.osVersion, browserVersion: bs.browserVersion}),
      shards: bs.vitest.shards,
    }));
}

// GitHub can't vary max-parallel per matrix entry, so the BrowserStack job takes the strictest entry's
function vitestBrowserstackMaxParallel(browsers) {
  const limits = Object.values(browsers).map(def => def.browserstack?.vitest?.maxParallel).filter(Boolean);
  return limits.length ? Math.min(...limits) : vitestBrowserstack(browsers).length || 1;
}

module.exports = {e2eBrowsers, vitestRunners, vitestBrowserstack, vitestBrowserstackMaxParallel};
