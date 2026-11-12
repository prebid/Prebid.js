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

// the account's parallel sessions; keep in sync with maxInstances in wdio.conf.js
const BROWSERSTACK_SESSIONS = 5;

// Lanes are concurrency groups shared by every BrowserStack job in every run, so the strictest entry's limit applies to all.
// The ES5 e2e job holds a session per browser in browsers-es5.json at once.
function vitestBrowserstackLanes(browsers, es5Browsers) {
  const limits = Object.values(browsers).map(def => def.browserstack?.vitest?.maxParallel).filter(Boolean);
  return Math.max(1, Math.min(...limits, BROWSERSTACK_SESSIONS - Object.keys(es5Browsers).length));
}

function vitestBrowserstack(browsers, es5Browsers, listSpecs = specsMatching) {
  const jobs = Object.values(browsers)
    .filter(def => def.browserstack?.vitest)
    .flatMap(({name, browserstack: bs}) => {
      const entry = {
        name,
        browser: bs.browserName,
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
  const lanes = vitestBrowserstackLanes(browsers, es5Browsers);
  return jobs.map((job, i) => ({...job, lane: i % lanes + 1}));
}

module.exports = {e2eBrowsers, vitestRunners, vitestBrowserstack, specsMatching};
