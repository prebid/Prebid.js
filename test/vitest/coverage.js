/* eslint-disable no-console */
// Turn the browser coverage collected by setup.mjs (one JSON file per spec file, written by the `writeCoverage`
// command in vitest.config.mjs) into lcov, the way karma-coverage did: merge, remap through each file's
// inputSourceMap back to the original sources, and write an lcov report per chunk or CI shard to
// build/coverage/chunks/<label>/lcov.info. CI combines every build/coverage/chunks/**/lcov.info.
//
// globalSetup.mjs calls it at the end of a run with VITEST_COVERAGE=1.
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
 * Which chunk or CI shard a raw coverage file belongs to: vitest.config.mjs ends each file's name in it
 * (chunk-<n>_spec, chunk-shard-<i>_spec); anything else is reported as chunk 1.
 * @param {string} file raw coverage file name
 * @returns {string} chunk directory name
 */
function chunkOf(file) {
  const match = /chunk-(\d+|shard-\d+)_spec\.json$/.exec(file);
  return match ? match[1] : '1';
}

/**
 * Write lcov reports for the raw coverage collected in this run.
 * @param {object} [options]
 * @param {string} [options.raw] directory holding the raw coverage files
 * @param {string} [options.out] directory to write `<chunk>/lcov.info` into
 * @param {string} [options.root] directory the report's paths are relative to
 * @returns {Promise<string[]>} the lcov files written
 */
async function writeLcov({ raw = RAW, out = OUT, root = ROOT } = {}) {
  if (!fs.existsSync(raw)) return [];
  const byChunk = new Map();
  for (const file of fs.readdirSync(raw).filter(name => name.endsWith('.json'))) {
    const chunk = chunkOf(file);
    if (!byChunk.has(chunk)) byChunk.set(chunk, libCoverage.createCoverageMap({}));
    byChunk.get(chunk).merge(JSON.parse(fs.readFileSync(path.join(raw, file), 'utf8')));
  }
  const written = [];
  for (const [chunk, coverageMap] of byChunk) {
    const remapped = await libSourceMaps.createSourceMapStore().transformCoverage(coverageMap);
    const dir = path.join(out, chunk);
    fs.mkdirSync(dir, { recursive: true });
    // paths in the report are relative to the repository root, as in karma-coverage's output
    const context = libReport.createContext({ dir, coverageMap: remapped, defaultSummarizer: 'nested' });
    reports.create('lcovonly', { file: 'lcov.info', projectRoot: root }).execute(context);
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
