/* eslint-disable no-console */
// Runs in Node around the whole Vitest run. With VITEST_COVERAGE=1, setup.mjs sends each test file's
// Istanbul counters here through the `writeCoverage` command; at the end of the run they are turned into
// lcov (see coverage.js). Teardown runs even when tests fail, as karma-coverage still reports then.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { writeLcov, RAW } = require('./coverage.js');

export function setup() {
  // drop coverage left over from an earlier run
  fs.rmSync(RAW, { recursive: true, force: true });
}

export async function teardown() {
  if (!process.env.VITEST_COVERAGE) return;
  const files = await writeLcov();
  files.forEach(file => console.log(`coverage: wrote ${path.relative(process.cwd(), file)}`));
}
