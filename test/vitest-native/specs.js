// Which specs run natively and which stay on the webpack bridge. Shared by vitest.config.mjs and
// ../vitest-webpack/build.js so that the two together run every spec exactly once.
const path = require('path');
// glob is a devDependency; this is test tooling, not shipped code.
// eslint-disable-next-line import/no-extraneous-dependencies
const glob = require('glob');

const ROOT = path.resolve(__dirname, '../..');
const BRIDGE = require('./bridge-specs.json');

/**
 * @param {string} [pat] spec file pattern, as TEST_PAT (default *_spec.js)
 * @returns {string[]} every spec, sorted, as Karma's chunking sees them
 */
function allSpecFiles (pat = '*_spec.js') {
  return glob.sync('test/spec/**/' + pat, { cwd: ROOT }).map(f => f.split(path.sep).join('/')).sort();
}

/**
 * The full suite split into chunks the way Karma's runner did it (and CI's 8 chunks still are).
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
 * @returns {Set<string>} the specs listed in bridge-specs.json
 * @throws if one isn't a spec file: a renamed spec would otherwise silently move to the native project
 */
function bridgeSet () {
  const listed = Object.values(BRIDGE).flat();
  const all = new Set(allSpecFiles());
  const stale = listed.filter(f => !all.has(f));
  if (stale.length) throw new Error(`test/vitest-native/bridge-specs.json lists specs that don't exist: ${stale.join(', ')}`);
  return new Set(listed);
}

/**
 * The specs the native project runs: those of Karma chunk TEST_CHUNK (of TEST_CHUNKS) when it is set, else
 * the whole suite, less bridge-specs.json.
 * @param {object} [options]
 * @param {boolean} [options.all] ignore bridge-specs.json
 * @returns {string[]} spec paths
 */
function nativeSpecFiles ({ all = false } = {}) {
  const bridge = bridgeSet();
  const n = process.env.TEST_CHUNK ? Number(process.env.TEST_CHUNK) : null;
  const specs = n ? karmaChunks()[n - 1] ?? [] : allSpecFiles(process.env.TEST_PAT);
  return specs.filter(f => all || !bridge.has(f));
}

/**
 * @param {string[]} specs candidate specs
 * @returns {string[]} those that stay on the bridge
 */
function bridgeOnly (specs) {
  const bridge = bridgeSet();
  return specs.filter(f => bridge.has(f));
}

module.exports = { allSpecFiles, karmaChunks, nativeSpecFiles, bridgeOnly };
