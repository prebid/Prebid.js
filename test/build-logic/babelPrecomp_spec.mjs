import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
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
  let root, sandbox, sourceSpy, enabled, disabled;

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

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'pbjs-precompilation-'));
    sandbox = sinon.createSandbox();
    sandbox.stub(helpers, 'getSourcePatterns').returns([source]);
    sandbox.stub(helpers, 'getPrecompiledPath').callsFake((...parts) => path.join(root, ...parts));
    sourceSpy = sandbox.spy(gulp, 'src');
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
    expect(sourceSpy.lastCall.args[1].since).to.equal(undefined);
  });

  it('keeps incremental filtering within the active configuration and includes edited files', async () => {
    await run(enabled);
    await run(enabled);
    expect(sourceSpy.lastCall.args[1].since).to.be.a('number');

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
    expect(sourceSpy.lastCall.args[1].since).to.equal(undefined);
    expect(output()).to.contain('video = true');
    expect(output()).to.contain('recovered = true');
  });
});
