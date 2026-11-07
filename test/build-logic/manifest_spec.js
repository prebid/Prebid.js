import { describe, it } from 'mocha';
import { expect } from 'chai';
import { CORE_MOD } from '../../web-bundler/dependencies.mjs';
import { BO_CHUNK, cleanDependencies } from '../../web-bundler/manifest.mjs';
import sinon from 'sinon';

describe('cleanDependencies', () => {
  let deps, coreFile, requiresMeta;
  beforeEach(() => {
    coreFile = `${CORE_MOD}.js`;
    deps = {
      [coreFile]: []
    };
    requiresMeta = sinon.stub();
  });

  function clean() {
    return cleanDependencies(deps, requiresMeta);
  }

  it('should exclude core dependencies', () => {
    deps[coreFile].push('dep.js');
    deps.testModule = [coreFile, 'dep.js', 'other.js'];
    expect(clean().testModule).to.eql(['other.js']);
  });

  it(`should exclude ${BO_CHUNK}`, () => {
    deps.testModule = [BO_CHUNK];
    expect(clean().testModule).to.not.include(BO_CHUNK);
  });

  it('should omit metadata modules', () => {
    deps['module.metadata.js'] = ['metadata.js'];
    expect(clean()['module.metadata.js']).to.not.exist;
  });

  describe('should throw if', () => {
    afterEach(() => {
      expect(clean).to.throw();
    });

    it('metadata modules have different dependencies', () => {
      deps['module1.metadata.js'] = ['meta1.js'];
      deps['module2.metadata.js'] = ['meta2.js'];
    });

    it('modules that require metadata do not have the same dependency metadata modules have', () => {
      deps['module.metadata.js'] = ['meta1.js'];
      deps['metaModule.js'] = ['otherDep.js'];
      requiresMeta.callsFake((mod) => mod === 'metaModule');
    });
  });
});
