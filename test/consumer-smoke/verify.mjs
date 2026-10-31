import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';
import puppeteer from 'puppeteer-core';

const cwd = fileURLToPath(new URL('.', import.meta.url));
const dist = resolve(cwd, 'dist');
const entry = resolve(cwd, 'entry.js');
const published = JSON.parse(readFileSync(resolve(cwd, 'node_modules/prebid.js/package.json'), 'utf8'));
mkdirSync(dist, { recursive: true });

console.log('Testing published prebid.js ' + published.version);

const webpackConfig = {
  mode: 'production',
  target: 'web',
  entry,
  output: {
    path: dist,
    filename: 'webpack.js'
  },
  module: {
    rules: [{
      test: /\.m?js$/,
      // npm already contains transpiled Prebid; the consumer needs no Prebid Babel plugins.
      exclude: /node_modules[\\/]prebid\.js[\\/]/,
      use: {
        loader: 'swc-loader',
        options: { jsc: { target: 'es2020', parser: { syntax: 'ecmascript' } } }
      }
    }]
  }
};

await new Promise((done, fail) => {
  webpack(webpackConfig, (err, stats) => {
    if (err || !stats || stats.hasErrors()) {
      fail(err || new Error(stats?.toString({ all: false, errors: true })));
    } else {
      console.log('Webpack + SWC bundle passed');
      done();
    }
  });
});

execFileSync('bun', [
  'build', './entry.js', '--outfile=./dist/bun.js', '--minify', '--target=browser'
], { cwd, stdio: 'inherit' });
console.log('Bun bundle passed');

for (const name of ['webpack', 'bun']) {
  const bundle = readFileSync(resolve(dist, name + '.js'), 'utf8');
  assert.ok(bundle.length > 0, name + ': bundle is empty');
  assert.doesNotMatch(bundle, /\bFEATURES\.[A-Z_]+\b/, name + ': unresolved FEATURES macro');
  assert.doesNotMatch(bundle, /\$\$[A-Z][A-Z_]*\$\$/, name + ': unresolved Prebid macro');
}

const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  if (path === '/webpack.js' || path === '/bun.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(readFileSync(resolve(dist, path.slice(1))));
  } else if (path === '/webpack.html' || path === '/bun.html') {
    const script = path.replace('.html', '.js');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<!doctype html><html><body><script type="module" src="' + script + '"></script></body></html>');
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = 'http://127.0.0.1:' + server.address().port;

let browser;
try {
  assert.ok(process.env.CHROME_BIN, 'CHROME_BIN must point to installed Chrome');
  browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  for (const name of ['webpack', 'bun']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().startsWith(origin)) {
        void request.continue();
      } else {
        // No live bidder traffic: return an empty OpenRTB response.
        void request.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
          body: JSON.stringify({ id: 'consumer-smoke', seatbid: [] })
        });
      }
    });

    try {
      await page.goto(origin + '/' + name + '.html', { waitUntil: 'load' });
      await page.waitForFunction(
        'window.pbjs && typeof window.pbjs.requestBids === "function"',
        { timeout: 15000 }
      );

      const result = await page.evaluate(() => {
        const pbjs = window.pbjs;
        const codes = pbjs.getBidderCodes();
        if (!codes.includes('appnexus') || !codes.includes('rubicon')) {
          throw new Error('Expected both imported bidder adapters to be registered: ' + codes);
        }
        if (typeof pbjs.getUserIds !== 'function') {
          throw new Error('userId parent and sharedIdSystem submodule were not initialized');
        }
        pbjs.setConfig({ bidderTimeout: 500, userSync: { syncEnabled: false } });

        return new Promise((resolveAuction, rejectAuction) => {
          const timeout = setTimeout(() => rejectAuction(new Error('Auction did not complete')), 8000);
          pbjs.requestBids({
            timeout: 500,
            adUnits: [{
              code: 'consumer-smoke-ad',
              mediaTypes: { banner: { sizes: [[300, 250]] } },
              bids: [
                { bidder: 'appnexus', params: { placementId: 13144370 } },
                { bidder: 'rubicon', params: { accountId: 12345, siteId: 12345, zoneId: 12345 } }
              ]
            }],
            bidsBackHandler: () => {
              clearTimeout(timeout);
              resolveAuction({ version: pbjs.version, codes });
            }
          });
        });
      });
      assert.match(result.version, /^v?\d+\.\d+\.\d+/, name + ': missing version');
      assert.deepEqual(errors, [], name + ': page errors');
      console.log(name + ': browser loaded Prebid ' + result.version + ', registered adapters, and completed an auction');
    } finally {
      await page.close();
    }
  }
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}
