import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect } from 'chai';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const { writeLcov, chunkOf } = require('../vitest/coverage.js');

const ORIGINAL = [
  'export function diff(a, b) {',
  '  if (a > b) {',
  '    return a - b;',
  '  }',
  '  return b - a;',
  '}',
  ''
].join('\n');

/**
 * Coverage for ORIGINAL the way the Vitest runner collects it: "precompiled" with a source map, instrumented by
 * babel-plugin-istanbul with that map as its input (as Karma's webpack config did), then run once.
 */
function collectCoverage(root, args) {
  const precompiled = babel.transformSync(ORIGINAL, {
    filename: path.join(root, 'src/diff.js'),
    sourceFileName: path.join(root, 'src/diff.js'),
    sourceMaps: true,
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const instrumented = babel.transformSync(precompiled.code, {
    filename: path.join(root, 'dist/diff.js'),
    inputSourceMap: precompiled.map,
    // babel only reads the input map when producing maps (the Vitest build turns on devtool for coverage)
    sourceMaps: true,
    babelrc: false,
    configFile: false,
    plugins: [['babel-plugin-istanbul', { cwd: root, exclude: [] }]],
  });
  delete globalThis.__coverage__;
  const exports = {};
  // eslint-disable-next-line no-new-func
  new Function('exports', instrumented.code)(exports);
  exports.diff(...args);
  const coverage = globalThis.__coverage__;
  delete globalThis.__coverage__;
  return coverage;
}

function readLcov(file) {
  const records = {};
  let current;
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach(line => {
    const [key, value] = line.split(/:(.*)/);
    if (key === 'SF') {
      current = records[value.split(path.sep).join('/')] = { lines: {} };
    } else if (key === 'DA') {
      const [lineNo, hits] = value.split(',').map(Number);
      current.lines[lineNo] = hits;
    } else if (['LF', 'LH', 'BRF', 'BRH'].includes(key)) {
      current[key] = Number(value);
    }
  });
  return records;
}

describe('Vitest coverage (test/vitest/coverage.js)', function () {
  let root, raw, out;

  beforeEach(function () {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'vitest-coverage-'));
    raw = path.join(root, 'raw');
    out = path.join(root, 'out');
    fs.mkdirSync(raw);
  });

  afterEach(function () {
    fs.rmSync(root, { recursive: true, force: true });
  });

  function writeRaw(name, coverage) {
    fs.writeFileSync(path.join(raw, name), JSON.stringify(coverage));
  }

  describe('chunkOf', function () {
    it('reads the chunk or CI shard a spec file ran in from its name', function () {
      expect(chunkOf('test__spec__modules__appnexusBidAdapter_spec.chunk-3_spec.json')).to.equal('3');
      expect(chunkOf('test__spec__modules__appnexusBidAdapter_spec.chunk-12_spec.json')).to.equal('12');
      expect(chunkOf('test__spec__modules__appnexusBidAdapter_spec.chunk-shard-2_spec.json')).to.equal('shard-2');
    });

    it('reports a file without one as chunk 1', function () {
      expect(chunkOf('modules__appnexusBidAdapter_spec.json')).to.equal('1');
    });
  });

  describe('writeLcov', function () {
    it('writes nothing when no coverage was collected', async function () {
      expect(await writeLcov({ raw: path.join(root, 'missing'), out, root })).to.eql([]);
      expect(fs.existsSync(out)).to.equal(false);
    });

    it('reports the original source, mapped through the input source map', async function () {
      writeRaw('chunks__chunk-3_spec.json', collectCoverage(root, [5, 2]));
      const written = await writeLcov({ raw, out, root });
      expect(written).to.eql([path.join(out, '3', 'lcov.info')]);
      const lcov = readLcov(written[0]);
      expect(Object.keys(lcov)).to.eql(['src/diff.js']);
      // a > b: the `if` branch ran (line 3), the other return (line 5) did not. Only the `if` branch has a
      // location in the original source (there's no `else`), so the remap (the same one karma-coverage does) reports one branch
      expect(lcov['src/diff.js'].lines).to.include({ 2: 1, 3: 1, 5: 0 });
      expect(lcov['src/diff.js']).to.include({ BRF: 1, BRH: 1 });
    });

    it('merges the coverage of files reported as the same chunk', async function () {
      writeRaw('modules__a_spec.json', collectCoverage(root, [5, 2]));
      writeRaw('modules__b_spec.json', collectCoverage(root, [2, 5]));
      const [file] = await writeLcov({ raw, out, root });
      expect(file).to.equal(path.join(out, '1', 'lcov.info'));
      const lcov = readLcov(file)['src/diff.js'];
      expect(lcov.lines).to.include({ 2: 2, 3: 1, 5: 1 });
      expect(lcov).to.include({ BRF: 1, BRH: 1 });
    });

    it('writes one report per chunk', async function () {
      writeRaw('chunks__chunk-1_spec.json', collectCoverage(root, [5, 2]));
      writeRaw('chunks__chunk-2_spec.json', collectCoverage(root, [2, 5]));
      const written = await writeLcov({ raw, out, root });
      expect(written.toSorted()).to.eql([path.join(out, '1', 'lcov.info'), path.join(out, '2', 'lcov.info')]);
      expect(readLcov(path.join(out, '1', 'lcov.info'))['src/diff.js'].lines).to.include({ 3: 1, 5: 0 });
      expect(readLcov(path.join(out, '2', 'lcov.info'))['src/diff.js'].lines).to.include({ 3: 0, 5: 1 });
    });
  });
});
