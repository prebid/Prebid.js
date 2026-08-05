import { CORE_MOD, resolveDependencies } from 'web-bundler/dependencies.mjs';

describe('resolveDependencies', () => {
  let depGraph, coreDeps, hasMetadata, requiresMetadata;
  beforeEach(() => {
    coreDeps = [];
    depGraph = {
      [`${CORE_MOD}.js`]: coreDeps
    };
    hasMetadata = sinon.stub();
    requiresMetadata = sinon.stub();
  });

  function resolve(modules) {
    return resolveDependencies(modules, depGraph, hasMetadata, requiresMetadata);
  }

  it('should always include core and its dependencies', () => {
    coreDeps.push('testDependency.js');
    expect(resolve([])).to.have.members([
      `${CORE_MOD}.js`,
      'testDependency.js'
    ]);
  });

  it('should include metadata modules if a module that requires metadata is included', () => {
    hasMetadata.callsFake((mod) => mod === 'testModule');
    requiresMetadata.callsFake((mod) => mod === 'metaModule');
    expect(resolve(['metaModule', 'testModule', 'modWithoutMeta'])).to.have.members([
      `${CORE_MOD}.js`,
      'testModule.js',
      'metaModule.js',
      'testModule.metadata.js',
      'modWithoutMeta.js'
    ]);
  });

  it('should not include metadata modules if no module require them', () => {
    hasMetadata.returns(true);
    expect(resolve(['testModule'])).to.not.include('testModule.metadata.js');
  });
});
