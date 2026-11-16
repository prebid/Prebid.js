import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Installed only in the isolated consumer fixture, not the root workspace.
// eslint-disable-next-line import/no-unresolved -- Resolved from test/consumer-smoke/node_modules.
import puppeteer from 'puppeteer-core';

const cwd = fileURLToPath(new URL('.', import.meta.url));
const dist = resolve(cwd, 'dist');
const published = JSON.parse(readFileSync(resolve(cwd, 'node_modules/prebid.js/package.json'), 'utf8'));
mkdirSync(dist, { recursive: true });

process.stdout.write('Testing published prebid.js ' + published.version + '\n');
execFileSync('bun', [
  'build', './entry.js', '--outfile=./dist/bun.js', '--minify', '--target=browser'
], { cwd, stdio: 'inherit' });

const bundle = readFileSync(resolve(dist, 'bun.js'), 'utf8');
assert.ok(bundle.length > 0, 'Bun bundle is empty');
assert.doesNotMatch(bundle, /\bFEATURES\.[A-Z_]+\b/, 'Unresolved FEATURES macro');
assert.doesNotMatch(bundle, /\$\$[A-Z][A-Z_]*\$\$/, 'Unresolved Prebid macro');
assert.doesNotMatch(bundle, /\$prebid\.version\$/, 'Unresolved Prebid version macro');

const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (pathname === '/bun.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(bundle);
  } else if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<!doctype html><html><body><script src="/bun.js"></script></body></html>');
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

let browser;
try {
  assert.ok(process.env.CHROME_BIN, 'CHROME_BIN must point to installed Chrome');
  browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().startsWith('http://127.0.0.1:' + server.address().port)) {
      void request.continue();
    } else {
      // Avoid depending on live bidder endpoints or making real bid requests.
      void request.respond({
        status: 200,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*'
        },
        body: JSON.stringify({ id: 'consumer-smoke', seatbid: [] })
      });
    }
  });

  try {
    await page.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil: 'load' });
    await page.waitForFunction(
      'window.pbjs && typeof window.pbjs.requestBids === "function"',
      { timeout: 15000 }
    );

    const result = await page.evaluate(async () => {
      const pbjs = window.pbjs;
      assertSupportedApi();

      function assertSupportedApi() {
        if (typeof pbjs.getUserIds !== 'function' || typeof pbjs.getUserIdsAsEids !== 'function') {
          throw new Error('User ID module APIs were not initialized');
        }
        if (typeof pbjs.onEvent !== 'function') {
          throw new Error('Prebid event listener API missing');
        }
      }

      // The userId parent provides getUserIdsAsEids, but only sharedIdSystem
      // supplies the pubcid.org EID. Verify the imported submodule actually
      // registered, rather than just checking that the parent API exists.
      const sharedId = 'prebid-npm-consumer-smoke-shared-id';
      pbjs.setConfig({
        bidderTimeout: 500,
        userSync: {
          syncEnabled: false,
          userIds: [{ name: 'sharedId', value: { pubcid: sharedId } }]
        }
      });
      await pbjs.refreshUserIds();
      const eids = pbjs.getUserIdsAsEids();
      const sharedIdEid = eids.find(eid => eid.source === 'pubcid.org');
      if (!sharedIdEid?.uids?.some(uid => uid.id === sharedId)) {
        throw new Error('sharedIdSystem did not register a matching pubcid.org EID: ' + JSON.stringify(eids));
      }

      const requested = new Set();
      pbjs.onEvent('bidRequested', request => requested.add(request.bidderCode));

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Auction did not complete')), 8000);
        pbjs.requestBids({
          timeout: 500,
          adUnits: [{
            code: 'consumer-smoke-ad',
            mediaTypes: { banner: { sizes: [[300, 250]] } },
            bids: [
              { bidder: 'magnite', params: { accountId: 14062, siteId: 70608, zoneId: 498816 } },
              { bidder: 'msft', params: { placement_id: 12345 } }
            ]
          }],
          bidsBackHandler: () => {
            clearTimeout(timeout);
            if (!requested.has('magnite') || !requested.has('msft')) {
              reject(new Error('Missing bidRequested events for Magnite or Microsoft: ' + [...requested]));
            } else {
              resolve({ version: pbjs.version, bidderCodes: [...requested] });
            }
          }
        });
      });
    });

    assert.match(result.version, /^v?\d+\.\d+\.\d+/, 'Missing Prebid version');
    assert.deepEqual(errors, [], 'Browser page errors');
    process.stdout.write('Bun browser smoke passed: Prebid ' + result.version +
      '; bidRequested events: ' + result.bidderCodes.join(', ') + '\n');
  } finally {
    await page.close();
  }
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
