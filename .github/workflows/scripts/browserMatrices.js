const fs = require('fs');
const path = require('path');

const os = (runsOn) => runsOn.startsWith('windows') ? 'windows' : runsOn.startsWith('macos') ? 'macos' : 'linux';

const byShard = (entry) => Array.from({length: entry.shards}, (_, i) => ({...entry, shard: i + 1}));

/**
 * The spec files under test/spec whose source matches `pattern` (a regular expression), sorted.
 */
function specsMatching(pattern, root = process.cwd()) {
  const re = new RegExp(pattern);
  return fs.readdirSync(path.join(root, 'test/spec'), {recursive: true})
    .map(file => `test/spec/${file.split(path.sep).join('/')}`)
    .filter(file => /_spec\.js$/.test(file) && re.test(fs.readFileSync(path.join(root, file), 'utf8')))
    .sort();
}

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

function vitestBrowserstack(browsers, listSpecs = specsMatching) {
  return Object.values(browsers)
    .filter(def => def.browserstack?.vitest)
    .flatMap(({name, browserstack: bs}) => {
      const entry = {
        name,
        browser: bs.browserName,
        pages: bs.vitest.pages ?? 3,
        ...(bs.deviceName
          ? {device: bs.deviceName, osVersion: bs.osVersion}
          : {os: bs.os, osVersion: bs.osVersion, browserVersion: bs.browserVersion}),
      };
      if (bs.vitest.specsMatching) {
        const files = listSpecs(bs.vitest.specsMatching);
        // an empty Vitest run fails
        return files.length ? [{...entry, label: bs.vitest.specsLabel ?? `specs matching /${bs.vitest.specsMatching}/`, files: files.join(' ')}] : [];
      }
      return byShard({...entry, shards: bs.vitest.shards}).map(e => ({...e, label: `shard ${e.shard}/${e.shards}`}));
    });
}

// GitHub can't vary max-parallel per matrix entry, so the BrowserStack job takes the strictest entry's
function vitestBrowserstackMaxParallel(browsers) {
  const limits = Object.values(browsers).map(def => def.browserstack?.vitest?.maxParallel).filter(Boolean);
  return limits.length ? Math.min(...limits) : vitestBrowserstack(browsers).length || 1;
}

module.exports = {e2eBrowsers, vitestRunners, vitestBrowserstack, vitestBrowserstackMaxParallel, specsMatching};
