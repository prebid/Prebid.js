import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import sinon from 'sinon';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import gulp from 'gulp';
import { babelPrecomp } from '../../gulp.precompilation.js';
import helpers from '../../gulpHelpers.js';
import cache from '../../gulp.cache.js';

describe('babelPrecomp configuration switches', function () {
  this.timeout(15000);

  const relativeSource = path.join('test', 'build-logic', 'fixtures', `zzBabelPrecompSpec${process.pid}.js`);
  const source = path.resolve(relativeSource);
  const past = new Date('2000-01-01T00:00:00Z');
  let root, sandbox, sourceReader, enabled, disabled;

  // Gulp also emits task failures; the task callback below propagates them to the test.
  function onTaskError() {}

  function write(contents = 'export const video = FEATURES.VIDEO;') {
    fs.writeFileSync(source, contents);
    fs.utimesSync(source, past, past);
  }

  function output() {
    return fs.readFileSync(path.join(root, relativeSource), 'utf8');
  }

  function run(options) {
    return new Promise((resolve, reject) => {
      gulp.series(babelPrecomp(options))(err => err ? reject(err) : resolve());
    });
  }

  function runStream(options) {
    const stream = babelPrecomp(options)();
    const completion = finished(stream);
    stream.resume();
    return completion;
  }

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'pbjs-precompilation-'));
    sandbox = sinon.createSandbox();
    sandbox.stub(helpers, 'getSourcePatterns').returns([source]);
    sandbox.stub(helpers, 'getPrecompiledPath').callsFake((...parts) => path.join(root, ...parts));
    sourceReader = sandbox.stub(gulp, 'src').callThrough();
    // Unique keys prevent this fixture from seeing or replacing another build's cached output.
    enabled = { disableFeatures: [], distUrlBase: root };
    disabled = { ...enabled, disableFeatures: ['VIDEO'] };
    gulp.on('error', onTaskError);
    write();
  });

  afterEach(() => {
    sandbox.restore();
    gulp.removeListener('error', onTaskError);
    fs.rmSync(source, { force: true });
    fs.rmSync(root, { recursive: true, force: true });
    const cacheRoot = path.join(cache.CACHE_ROOT, 'precompile');
    if (fs.existsSync(cacheRoot)) {
      for (const key of fs.readdirSync(cacheRoot)) {
        fs.rmSync(path.join(cacheRoot, key, `${relativeSource}.pbcache`), { force: true });
      }
    }
  });

  it('restores unchanged files when returning to an earlier configuration', async () => {
    await run(enabled);
    const original = output();
    expect(original).to.contain('video = true');

    await run(disabled);
    expect(output()).to.contain('video = false');

    await run(enabled);
    expect(output()).to.equal(original);
    expect(sourceReader.lastCall.args[1].since).to.equal(undefined);
  });

  it('keeps incremental filtering within the active configuration and includes edited files', async () => {
    await run(enabled);
    await run(enabled);
    expect(sourceReader.lastCall.args[1].since).to.be.a('number');

    write('export const video = FEATURES.VIDEO; export const edited = true;');
    const future = new Date(Date.now() + 1000);
    fs.utimesSync(source, future, future);
    await run(enabled);
    expect(output()).to.contain('edited = true');
  });

  it('does not reuse an earlier configuration timestamp after a failed switch', async () => {
    await run(enabled);
    write('export const broken = ;');
    let failure;
    try {
      await run(disabled);
    } catch (err) {
      failure = err;
    }
    expect(failure).to.exist;

    write('export const video = FEATURES.VIDEO; export const recovered = true;');
    await run(enabled);
    expect(sourceReader.lastCall.args[1].since).to.equal(undefined);
    expect(output()).to.contain('video = true');
    expect(output()).to.contain('recovered = true');
  });

  describe('polyfill builds', () => {
    beforeEach(() => {
      if (Object.hasOwn(helpers.argv, 'polyfills')) {
        sandbox.stub(helpers.argv, 'polyfills').value(true);
      } else {
        sandbox.define(helpers.argv, 'polyfills', true);
      }
    });

    it('propagates source errors to the returned stream', async () => {
      sourceReader.callsFake(() => new Readable({
        objectMode: true,
        read() {
          this.destroy(new Error('source error'));
        }
      }));
      await assert.rejects(runStream(enabled), /source error/);
    });

    it('propagates Babel errors to the returned stream', async () => {
      write('export const broken = ;');
      await assert.rejects(runStream(enabled), /Unexpected token/);
    });

    it('rebuilds the earlier configuration after a failed polyfill build', async () => {
      helpers.argv.polyfills = false;
      await run(enabled);

      helpers.argv.polyfills = true;
      write('export const broken = ;');
      await assert.rejects(run(disabled), /Unexpected token/);

      helpers.argv.polyfills = false;
      write('export const video = FEATURES.VIDEO; export const recovered = true;');
      await run(enabled);
      expect(sourceReader.lastCall.args[1].since).to.equal(undefined);
      expect(output()).to.contain('video = true');
      expect(output()).to.contain('recovered = true');
    });
  });
});
