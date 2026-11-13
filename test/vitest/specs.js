// Which spec files a run includes (vitest.config.mjs).
const path = require('path');
// glob is a devDependency; this is test tooling, not shipped code.
// eslint-disable-next-line import/no-extraneous-dependencies
const glob = require('glob');

const ROOT = path.resolve(__dirname, '../..');

/**
 * @param {string} [pat] spec file pattern, as TEST_PAT (default *_spec.js)
 * @returns {string[]} every spec, sorted, as Karma's chunking saw them
 */
function allSpecFiles (pat = '*_spec.js') {
  return glob.sync('test/spec/**/' + pat, { cwd: ROOT }).map(f => f.split(path.sep).join('/')).sort();
}

/**
 * The suite split into chunks the way Karma's runner did it. CI splits it with Vitest's `--shard` instead; this
 * stays for running one of Karma's chunks locally (TEST_CHUNKS, TEST_CHUNK).
 * @param {object} [options]
 * @param {number|string} [options.chunks] number of chunks, or 'MAX' (TEST_CHUNKS, default 8)
 * @param {string} [options.pat] spec file pattern (TEST_PAT)
 * @returns {string[][]} the chunks
 */
function karmaChunks ({ chunks = process.env.TEST_CHUNKS ?? 8, pat = process.env.TEST_PAT } = {}) {
  const tests = allSpecFiles(pat);
  const chunkLen = chunks === 'MAX' ? 0 : Math.floor(tests.length / Number(chunks));
  let out = [[]];
  tests.forEach((fn) => {
    out[out.length - 1].push(fn);
    if (out[out.length - 1].length > chunkLen) out.push([]);
  });
  out = out.filter(c => c.length > 0);
  return out;
}

/**
 * @returns {string[]} the specs to run: those of Karma chunk TEST_CHUNK (of TEST_CHUNKS) when it is set, else every
 * spec matching TEST_PAT
 */
function specFiles () {
  const n = process.env.TEST_CHUNK ? Number(process.env.TEST_CHUNK) : null;
  return n ? karmaChunks()[n - 1] ?? [] : allSpecFiles(process.env.TEST_PAT);
}

module.exports = { allSpecFiles, karmaChunks, specFiles };
