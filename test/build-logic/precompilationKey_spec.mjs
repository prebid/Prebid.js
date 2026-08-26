import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import cache from '../../gulp.cache.js';
import helpers from '../../gulpHelpers.js';

const { precompilationKey, externalInputsDigest, writePrecompilationKey, readPrecompilationKey } = cache;

/**
 * The key decides which cached output a build may reuse - the babel cache directory, and the
 * `version` on every webpack filesystem cache. Two builds that emit different code and agree on
 * the key will serve each other's modules, silently, so each input the output depends on needs a
 * test here.
 */
describe('precompilationKey', () => {
  it('should not depend on the order a feature list was typed in', () => {
    expect(precompilationKey({ disableFeatures: ['VIDEO', 'NATIVE'] }))
      .to.equal(precompilationKey({ disableFeatures: ['NATIVE', 'VIDEO'] }));
  });

  it('should differ when the disabled features differ', () => {
    expect(precompilationKey({ disableFeatures: ['VIDEO'] }))
      .to.not.equal(precompilationKey({ disableFeatures: ['NATIVE'] }));
  });

  it('should differ when one build disables a feature the other does not', () => {
    expect(precompilationKey({ disableFeatures: ['VIDEO', 'GREEDY'] }))
      .to.not.equal(precompilationKey({ disableFeatures: ['GREEDY'] }));
  });

  it('should differ between a development and a production build', () => {
    expect(precompilationKey({ dev: true })).to.not.equal(precompilationKey({ dev: false }));
  });

  it('should differ when the chunk URL base differs', () => {
    expect(precompilationKey({ distUrlBase: '/one/' }))
      .to.not.equal(precompilationKey({ distUrlBase: '/two/' }));
  });

  // plugins/pbjsGlobals.js substitutes this into the output, so it is part of what was built
  it('should differ when LiveConnectMode differs', () => {
    const original = process.env.LiveConnectMode;
    try {
      process.env.LiveConnectMode = 'one';
      const one = precompilationKey();
      process.env.LiveConnectMode = 'two';
      expect(precompilationKey()).to.not.equal(one);
    } finally {
      if (original == null) {
        delete process.env.LiveConnectMode;
      } else {
        process.env.LiveConnectMode = original;
      }
    }
  });
});

/**
 * `package.json` and `metadata/modules/*.json` are read by the babel plugins rather than by the
 * file being transformed - `pbjsGlobals` substitutes the version, `callerContext` and
 * `gvlPurposes` read the metadata - so a change to either leaves every source hash untouched.
 * Without them in the key, a release build on a warm cache emits the previous version number.
 *
 * The paths are injected so that this exercises the real digest without touching tracked files.
 */
describe('externalInputsDigest', () => {
  let root, inputs;

  before(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'pbjs-extinputs-'));
    inputs = { manifest: path.join(root, 'package.json'), metadataDir: path.join(root, 'modules') };
    fs.mkdirSync(inputs.metadataDir);
    fs.writeFileSync(inputs.manifest, '{"version":"1.0.0"}');
    fs.writeFileSync(path.join(inputs.metadataDir, 'a.json'), '{"components":[]}');
  });

  after(() => fs.rmSync(root, { recursive: true, force: true }));

  it('should be stable when nothing changes', () => {
    expect(externalInputsDigest(inputs)).to.equal(externalInputsDigest(inputs));
  });

  it('should change when the manifest changes', () => {
    const before = externalInputsDigest(inputs);
    fs.writeFileSync(inputs.manifest, '{"version":"1.0.1"}');
    expect(externalInputsDigest(inputs)).to.not.equal(before);
  });

  it('should change when a metadata file is added', () => {
    const before = externalInputsDigest(inputs);
    fs.writeFileSync(path.join(inputs.metadataDir, 'b.json'), '{"components":[]}');
    expect(externalInputsDigest(inputs)).to.not.equal(before);
  });

  it('should change when a metadata file changes', () => {
    const before = externalInputsDigest(inputs);
    fs.writeFileSync(path.join(inputs.metadataDir, 'b.json'), '{"components":[{"gvlid":1}]}');
    expect(externalInputsDigest(inputs)).to.not.equal(before);
  });

  it('should change when a metadata file is renamed but its contents are not', () => {
    const before = externalInputsDigest(inputs);
    fs.renameSync(path.join(inputs.metadataDir, 'b.json'), path.join(inputs.metadataDir, 'c.json'));
    expect(externalInputsDigest(inputs)).to.not.equal(before);
  });

  it('should be carried in the precompilation key', () => {
    // the wiring, checked without mutating anything: the real digest appears in the real key
    expect(JSON.parse(precompilationKey()).externalInputs).to.equal(externalInputsDigest());
  });
});

/**
 * The stamp is how the webpack configurations learn which variant is sitting in `dist/src`. They
 * cannot work it out from `argv` - `test-all-features-disabled` and `serve-and-test` pass their
 * options directly - and they cannot work it out from the tree, whose paths and timestamps are the
 * same for every variant.
 */
describe('the precompilation stamp', () => {
  const stamp = helpers.getPrecompiledPath('.precompilation-key');
  let original;

  before(() => {
    original = fs.existsSync(stamp) ? fs.readFileSync(stamp, 'utf8') : null;
  });

  after(() => {
    if (original == null) {
      fs.rmSync(stamp, { force: true });
    } else {
      fs.writeFileSync(stamp, original);
    }
  });

  it('should read back the key it was given', () => {
    writePrecompilationKey('a-key');
    expect(readPrecompilationKey()).to.equal('a-key');
  });

  it('should read as null when the tree carries no stamp', () => {
    // karma turns its filesystem cache off entirely in this case, rather than key on nothing
    fs.rmSync(stamp, { force: true });
    expect(readPrecompilationKey()).to.equal(null);
  });
});
