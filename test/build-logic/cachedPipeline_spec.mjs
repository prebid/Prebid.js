import { describe, it, before, after, beforeEach } from 'mocha';
import { expect } from 'chai';
import { Transform } from 'node:stream';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import gulp from 'gulp';
import cache from '../../gulp.cache.js';

const { cachedPipeline } = cache;

describe('cachedPipeline', () => {
  // a namespace of our own, so that these runs cannot see or disturb a real build's cache
  const namespace = `test-cachedPipeline-${process.pid}`;
  let root, transformed;

  function sourcePath(name) {
    return path.join(root, 'src', name);
  }

  function destPath(name) {
    return path.join(root, 'out', name);
  }

  function write(name, contents) {
    fs.writeFileSync(sourcePath(name), contents);
  }

  /**
   * Stands in for babel: renames the file, rewrites its contents, and leaves a source map -
   * everything the cache has to be able to reproduce without running the transform again.
   */
  function upcase() {
    return new Transform({
      objectMode: true,
      transform(file, enc, cb) {
        const source = file.relative;
        transformed.push(source);
        file.contents = Buffer.from(file.contents.toString().toUpperCase());
        file.path = file.path.replace(/\.txt$/, '.out');
        file.sourceMap = { version: 3, sources: [source], names: [], mappings: '' };
        cb(null, file);
      }
    });
  }

  /** A transform that emits a file the pipeline never gave it - the one thing the cache cannot track. */
  function fabricate() {
    return new Transform({
      objectMode: true,
      transform(file, enc, cb) {
        const clone = file.clone();
        delete clone.precompileCacheEntry;
        cb(null, clone);
      }
    });
  }

  function run({ key = 'k1', transform = upcase } = {}) {
    return new Promise((resolve, reject) => {
      cachedPipeline({
        namespace,
        key,
        transform,
        src: gulp.src([path.join(root, 'src', '**', '*.txt')], { base: root, sourcemaps: true }),
        dest: gulp.dest(path.join(root, 'out'), { sourcemaps: '.' })
      }).on('error', reject).on('end', resolve).resume();
    });
  }

  function outputs() {
    const dir = path.join(root, 'out', 'src');
    return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
  }

  before(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'pbjs-cache-'));
    fs.mkdirSync(path.join(root, 'src'));
  });

  after(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(path.join(cache.CACHE_ROOT, namespace), { recursive: true, force: true });
  });

  beforeEach(() => {
    transformed = [];
  });

  describe('with two files already transformed once', () => {
    before(async () => {
      write('a.txt', 'file a');
      write('b.txt', 'file b');
      await run();
    });

    it('should not run the transform again when nothing changed', async () => {
      await run();
      expect(transformed).to.eql([]);
    });

    it('should produce the same output from the cache as it did from the transform', async () => {
      const fresh = fs.readFileSync(destPath('src/a.out'));
      fs.rmSync(path.join(root, 'out'), { recursive: true });
      await run();
      expect(transformed).to.eql([]);
      expect(fs.readFileSync(destPath('src/a.out'))).to.eql(fresh);
    });

    it('should keep the source map across a cache hit', async () => {
      fs.rmSync(path.join(root, 'out'), { recursive: true });
      await run();
      const map = JSON.parse(fs.readFileSync(destPath('src/a.out.map'), 'utf8'));
      expect(map.sources).to.eql(['src/a.txt']);
    });

    it('should re-run the transform only for a file whose contents changed', async () => {
      write('a.txt', 'file a, edited');
      await run();
      expect(transformed).to.eql(['src/a.txt']);
      expect(fs.readFileSync(destPath('src/a.out'), 'utf8')).to.contain('EDITED');
    });

    it('should re-run the transform for a different key, and not mix the two', async () => {
      await run({
        key: 'k2',
        transform: () => new Transform({
          objectMode: true,
          transform(file, enc, cb) {
            transformed.push(file.relative);
            file.contents = Buffer.from('other');
            file.path = file.path.replace(/\.txt$/, '.out');
            cb(null, file);
          }
        })
      });
      expect(transformed.sort()).to.eql(fs.readdirSync(path.join(root, 'src')).sort().map(f => path.join('src', f)));
      expect(fs.readFileSync(destPath('src/a.out'), 'utf8')).to.contain('other');
      // back to the first key: its own output, still cached
      transformed = [];
      await run();
      expect(transformed).to.eql([]);
      expect(fs.readFileSync(destPath('src/a.out'), 'utf8')).to.contain('FILE A');
    });

    it('should not resurrect the output of a source that no longer exists', async () => {
      expect(outputs()).to.include('b.out');
      fs.rmSync(sourcePath('b.txt'));
      fs.rmSync(path.join(root, 'out'), { recursive: true });
      await run();
      expect(outputs()).to.not.include('b.out');
      expect(outputs()).to.include('a.out');
    });
  });

  // mocha runs a suite's own tests before its nested suites, so this one has to leave the
  // source directory as it found it
  it('should fail rather than silently skip caching when the transform replaces a file', async () => {
    write('c.txt', 'file c');
    let err;
    await run({ key: 'fabricate', transform: fabricate }).catch(e => {
      err = e;
    });
    fs.rmSync(sourcePath('c.txt'));
    expect(err).to.exist;
    expect(err.message).to.contain('exactly one file');
  });
});
