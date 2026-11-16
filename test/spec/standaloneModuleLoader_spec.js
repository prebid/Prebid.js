import { standaloneModuleLoader } from '../../src/standaloneModuleLoader.js';
import { getGlobal } from '../../src/prebidGlobal.js';
import { MODULE_TYPE_PREBID } from '../../src/activities/modules.js';
import { fetchExternalScriptStub } from 'test/mocks/adloaderStub.js';

describe('standaloneModuleLoader', () => {
  const installProp = '_standaloneModuleLoaderTest';
  const deps = { dep: 'value' };

  function load() {
    return standaloneModuleLoader({
      moduleName: 'testModule',
      installProp,
      bundle: 'testModule.js',
      deps,
      alreadyInstalled: () => false
    })();
  }

  afterEach(() => {
    delete getGlobal()[installProp];
  });

  it('loads the bundle with fetchExternalScript and installs it', async () => {
    const install = sinon.stub();
    fetchExternalScriptStub.callsFake(() => {
      getGlobal()[installProp] = install;
      return Promise.resolve();
    });
    await load();
    sinon.assert.calledWith(fetchExternalScriptStub, sinon.match(/testModule\.js$/), MODULE_TYPE_PREBID, 'testModule');
    sinon.assert.calledWith(install, deps);
  });

  it('rejects when the bundle fails to load', async () => {
    const err = new Error('load failed');
    fetchExternalScriptStub.rejects(err);
    const result = await load().then(() => null, (e) => e);
    expect(result).to.equal(err);
  });
});
