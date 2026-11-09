/* eslint-disable no-console */
// Runs in Node around the whole Vitest run.
// - With VITEST_COVERAGE=1, setup.mjs sends each spec file's Istanbul counters here through the `writeCoverage`
//   command (vitest.config.mjs); at the end of the run they become lcov, in build/coverage/chunks/<chunk or
//   shard>/lcov.info (coverage.js). Teardown runs even when tests fail, as karma-coverage still reported then.
// - With VITEST_BROWSERSTACK=1 and no tunnel already running, it starts and stops BrowserStack Local
//   (vitest.config.mjs names the tunnel and sets VITEST_BROWSERSTACK_TUNNEL).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { envFlag } from './env.mjs';

const require = createRequire(import.meta.url);
const { writeLcov } = require('./coverage.js');

const ROOT = path.resolve(import.meta.dirname, '../..');
export const RAW = path.join(ROOT, 'build/vitest-coverage');

let tunnel;

function startTunnel() {
  const { Local } = require('browserstack-local');
  const local = new Local();
  const logFile = path.resolve('build/browserstack-local.log');
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  console.log(`browserstack: starting BrowserStack Local "${process.env.BROWSERSTACK_LOCAL_IDENTIFIER}" (log: ${logFile})`);
  return new Promise((resolve, reject) => {
    local.start({
      key: process.env.BROWSERSTACK_ACCESS_KEY,
      localIdentifier: process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
      logFile,
    }, (err) => err ? reject(err) : resolve(local));
  });
}

export async function setup() {
  // drop coverage left over from an earlier run
  fs.rmSync(RAW, { recursive: true, force: true });
  if (process.env.VITEST_BROWSERSTACK_TUNNEL) tunnel = await startTunnel();
}

export async function teardown() {
  if (tunnel) await new Promise(resolve => tunnel.stop(resolve));
  if (!envFlag('VITEST_COVERAGE')) return;
  const files = await writeLcov({ raw: RAW, out: path.join(ROOT, 'build/coverage/chunks') });
  files.forEach(file => console.log(`coverage: wrote ${path.relative(process.cwd(), file)}`));
}
