const os = (runsOn) => runsOn.startsWith('windows') ? 'windows' : runsOn.startsWith('macos') ? 'macos' : 'linux';

const byShard = (entry) => Array.from({length: entry.shards}, (_, i) => ({...entry, shard: i + 1}));

function e2eBrowsers(browsers) {
  return Object.values(browsers)
    .filter(def => def.runsOn && def.wdioName)
    .map(({name, wdioName, runsOn}) => ({name, wdioName, runsOn, os: os(runsOn), version: 'latest'}));
}

function vitestRunners(browsers) {
  return Object.values(browsers)
    .filter(def => def.runsOn && def.vitest)
    .flatMap(({name, runsOn, vitest}) => byShard({name, runsOn, ...vitest}));
}

function vitestBrowserstack(browsers) {
  return Object.values(browsers)
    .filter(def => !def.runsOn && def.vitest)
    .flatMap(def => byShard({
      name: def.name,
      browser: def.browser,
      ...(def.device
        ? {device: def.device, osVersion: def.os_version}
        : {os: def.os, osVersion: def.os_version, browserVersion: def.browser_version}),
      shards: def.vitest.shards,
    }));
}

// GitHub can't vary max-parallel per matrix entry, so the BrowserStack job takes the strictest entry's
function vitestBrowserstackMaxParallel(browsers) {
  const limits = Object.values(browsers).filter(def => !def.runsOn && def.vitest?.maxParallel).map(def => def.vitest.maxParallel);
  return limits.length ? Math.min(...limits) : vitestBrowserstack(browsers).length || 1;
}

module.exports = {e2eBrowsers, vitestRunners, vitestBrowserstack, vitestBrowserstackMaxParallel};
