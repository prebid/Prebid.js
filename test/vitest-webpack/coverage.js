/* eslint-disable no-console */
// Turn the browser coverage collected by setup.mjs (one JSON file per Vitest test file, written by the
// `writeCoverage` command in vitest.config.mjs) into lcov, the way karma-coverage does: merge, remap
// through each file's inputSourceMap back to the original sources, and write an lcov report per Karma
// chunk to build/coverage/chunks/<n>/lcov.info. The CI coverage job (.github/actions/combine-coverage)
// combines every build/coverage/chunks/**/lcov.info, so it consumes this output unchanged.
//
// Usage: `node test/vitest-webpack/coverage.js` after a run with VITEST_COVERAGE=1; globalSetup.mjs
// also calls it at the end of such a run.
const fs = require('fs');
const path = require('path');
const libCoverage = require('istanbul-lib-coverage');
const libSourceMaps = require('istanbul-lib-source-maps');
const libReport = require('istanbul-lib-report');
const reports = require('istanbul-reports');

const ROOT = path.resolve(__dirname, '../..');
const RAW = path.join(ROOT, 'build/vitest-coverage');
const OUT = path.join(ROOT, 'build/coverage/chunks');

/**
 * Which Karma chunk a raw coverage file belongs to: chunk bundles are named chunks/chunk-<n>_spec;
 * anything else (VITEST_FILES or VITEST_ISOLATE_SPECS runs) is reported as chunk 1, as a single-file
 * Karma run is.
 * @param {string} file raw coverage file name
 * @returns {string} chunk directory name
 */
function chunkOf(file) {
  const match = /chunk-(\d+)_spec\.json$/.exec(file);
  return match ? match[1] : '1';
}

/**
 * Write lcov reports for the raw coverage collected in this run.
 * @returns {Promise<string[]>} the lcov files written
 */
async function writeLcov() {
  if (!fs.existsSync(RAW)) return [];
  const byChunk = new Map();
  for (const file of fs.readdirSync(RAW).filter(name => name.endsWith('.json'))) {
    const chunk = chunkOf(file);
    if (!byChunk.has(chunk)) byChunk.set(chunk, libCoverage.createCoverageMap({}));
    byChunk.get(chunk).merge(JSON.parse(fs.readFileSync(path.join(RAW, file), 'utf8')));
  }
  const written = [];
  for (const [chunk, coverageMap] of byChunk) {
    const remapped = await libSourceMaps.createSourceMapStore().transformCoverage(coverageMap);
    const dir = path.join(OUT, chunk);
    fs.mkdirSync(dir, { recursive: true });
    // paths in the report are relative to the repository root, as in karma-coverage's output
    const context = libReport.createContext({ dir, coverageMap: remapped, defaultSummarizer: 'nested' });
    reports.create('lcovonly', { file: 'lcov.info', projectRoot: ROOT }).execute(context);
    written.push(path.join(dir, 'lcov.info'));
  }
  return written;
}

module.exports = { writeLcov, chunkOf, RAW };

if (require.main === module) {
  writeLcov().then(files => {
    files.forEach(file => console.log(`wrote ${path.relative(ROOT, file)}`));
  }, (err) => {
    console.error(err);
    process.exit(1);
  });
}
