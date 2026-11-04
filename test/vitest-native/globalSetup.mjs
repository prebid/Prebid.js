/* eslint-disable no-console */
// With VITEST_COVERAGE=1, writes the native run's coverage as lcov, the way ../vitest-webpack/globalSetup.mjs
// does for the bridge, to build/coverage/chunks/native/<chunk>/lcov.info. The bridge writes
// build/coverage/chunks/<chunk>/lcov.info, so a CI job can run both on one chunk and keep both reports.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { writeLcov } = require('../vitest-webpack/coverage.js');

const ROOT = path.resolve(import.meta.dirname, '../..');
export const RAW = path.join(ROOT, 'build/vitest-coverage-native');

export function setup() {
  fs.rmSync(RAW, { recursive: true, force: true });
}

export async function teardown() {
  if (!process.env.VITEST_COVERAGE) return;
  const files = await writeLcov({ raw: RAW, out: path.join(ROOT, 'build/coverage/chunks/native') });
  files.forEach(file => console.log(`coverage: wrote ${path.relative(process.cwd(), file)}`));
}
