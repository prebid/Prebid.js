import { checkAndRun, getManifest, loadModules } from 'web-bundler/load.mjs';

describe('web bundler load utils', () => {
  let loader, success, fail;
  beforeEach(() => {
    loader = sinon.stub().callsFake(() => new Promise((resolve, reject) => {
      success = resolve;
      fail = reject;
    }));
  });
  describe('getManifest', () => {
    it('should load manifest.js as JSONP', async () => {
      const p = getManifest(loader, 'checksum');
      const cb = /^manifest.js\?callback=(.*)$/.exec(loader.getCall(0).args[0])[1];
      window[cb]('manifest');
      success();
      expect(await p).to.eql('manifest');
    });

    Object.entries({
      success: () => success(),
      fail: () => fail()
    }).forEach(([t, fn]) => {
      it(`should clean up JSONP callback on ${t}`, async () => {
        const p = getManifest(loader, 'checksum');
        const cb = /^manifest.js\?callback=(.*)$/.exec(loader.getCall(0).args[0])[1];
        fn();
        await p.catch(() => {
        });
        expect(window[cb]).to.not.exist;
      });
    });
  });

  describe('loadModules', () => {
    let manifest, resolveDeps;
    beforeEach(() => {
      manifest = {
        dependencies: {},
        checksums: {}
      };
      resolveDeps = sinon.stub().returns([]);
    });

    function doLoad(modules) {
      return loadModules(loader, manifest, modules, resolveDeps);
    }

    it('should resolve dependencies using the given manifest', () => {
      Object.assign(manifest.checksums, {
        'someModule.js': 'checksum',
        'someModule.metadata.js': 'checksum'
      });
      doLoad(['someModule']);
      sinon.assert.calledWith(resolveDeps, ['someModule'], manifest.dependencies, sinon.match(arg => {
        expect(arg('someModule')).to.be.true;
        expect(arg('someOtherModule')).to.be.false;
        return true;
      }));
    });
    it('should load resolved dependencies using checksums from manifest', () => {
      Object.assign(manifest.checksums, {
        module1: 'cs1',
        module2: 'cs2'
      });
      resolveDeps.returns(['module1', 'module2']);
      doLoad([]);
      sinon.assert.calledWith(loader, 'module1', 'cs1');
      sinon.assert.calledWith(loader, 'module2', 'cs2');
    });
    it('should fail if requested modules do not have a checksum', async () => {
      try {
        await doLoad(['someModule']);
        sinon.assert.fail('did not reject');
      } catch (e) {
        sinon.assert.match(e.message, /someModule/);
      }
    });
  });

  describe('checkAdnRun', () => {
    let load, consoleWarn;
    beforeEach(() => {
      load = sinon.stub();
      window.pbGlobal = {};
      consoleWarn = sinon.spy(console, 'warn');
    });
    afterEach(() => {
      delete window.pbGlobal;
      consoleWarn.restore();
    });

    it('should run load and call processQueue when it resolves', async () => {
      window.pbGlobal.processQueue = sinon.stub();
      const p = Promise.resolve();
      load.returns(p);
      checkAndRun('pbGlobal', load);
      sinon.assert.called(load);
      await p;
      sinon.assert.called(window.pbGlobal.processQueue);
    });

    it('should not run load if the global is loaded already', () => {
      window.pbGlobal.libLoaded = true;
      window.pbGlobal.getConfig = () => null;
      checkAndRun('pbGlobal', load);
      sinon.assert.notCalled(load);
      sinon.assert.notCalled(consoleWarn);
    });

    Object.entries({
      'debug is enabled': () => true,
      'debug flag cannot be determined': () => { throw new Error(); }
    }).forEach(([t, getConfig]) => {
      it(`should log a warning if ${t}`, () => {
        window.pbGlobal.libLoaded = true;
        window.pbGlobal.getConfig = getConfig;
        checkAndRun('pbGlobal', load);
        sinon.assert.called(consoleWarn);
      });
    });
  });
});
