import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import cache from '../../gulp.cache.js';
import helpers from '../../gulpHelpers.js';

const { precompilationKey, writePrecompilationKey, readPrecompilationKey } = cache;

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
