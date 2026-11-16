const fs = require('fs');
const path = require('path');
const { PassThrough } = require('node:stream');
const Vinyl = require('vinyl');

/**
 * A module's metadata (metadata/modules/<name>.json), or null if it has none.
 */
function readModuleMetadata(moduleName) {
  const metadataPath = path.join(__dirname, 'metadata', 'modules', `${moduleName}.json`);
  if (fs.existsSync(metadataPath)) {
    return JSON.parse(fs.readFileSync(metadataPath).toString());
  } else {
    return null;
  }
}

/**
 * A stream with one file, `summaryFileName`: the storage disclosure summary for `modules`.
 * If the summary can't be built (for example, a module's metadata can't be read), the stream fails with the error.
 *
 * @param {string[]} modules
 * @param {string} summaryFileName
 * @param {object} [options] for tests
 * @param {function(): Promise<{getStorageDisclosureSummary: Function}>} [options.loadSummary]
 * @param {function(string): object|null} [options.getMetadata]
 */
function disclosureSummary(modules, summaryFileName, {
  loadSummary = () => import('./libraries/storageDisclosure/summary.mjs'),
  getMetadata = readModuleMetadata
} = {}) {
  const stream = new PassThrough({ objectMode: true });
  loadSummary().then(({ getStorageDisclosureSummary }) => {
    const summary = getStorageDisclosureSummary(modules, getMetadata);
    stream.push(new Vinyl({
      cwd: '',
      base: 'generated',
      path: summaryFileName,
      contents: Buffer.from(JSON.stringify(summary, null, 2), 'utf-8')
    }));
    stream.push(null);
  }).catch((err) => {
    // fail the bundle with the error, instead of leaving it waiting on a stream that never ends
    stream.destroy(err);
  });
  return stream;
}

module.exports = { disclosureSummary, readModuleMetadata };
