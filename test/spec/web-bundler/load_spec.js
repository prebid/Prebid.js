import {
  checkAndRun,
  getManifest,
  getManifests,
  loadModules,
  MANIFEST,
  METADATA_MANIFEST,
  provideManifest
} from 'web-bundler/load.mjs';

describe('web bundler load utils', () => {
  let loader, success, fail;
  beforeEach(() => {
    loader = sinon.stub().callsFake(() => new Promise((resolve, reject) => {
      success = resolve;
      fail = reject;
    }));
  });
  describe('getManifest', () => {
    let scope;
    beforeEach(() => {
      scope = {};
    });

    it('should load manifest.js, at a URL without a query string, so that it can be cached', () => {
      getManifest(loader, 'checksum', scope);
      sinon.assert.calledWith(loader, 'manifest.js', 'checksum');
    });

    [MANIFEST, METADATA_MANIFEST].forEach(file => {
      it(`should resolve to the data ${file} provides through the scope`, async () => {
        const p = getManifest(loader, 'checksum', scope, file);
        provideManifest({ src: `https://cdn.example/${file}`, __pbjsScope: scope }, file, 'manifest');
        success();
        expect(await p).to.eql('manifest');
        expect(Object.keys(scope)).to.eql([]);
      });
    });

    it('should reject if the script provides no manifest', async () => {
      const p = getManifest(loader, 'checksum', scope);
      success();
      try {
        await p;
        sinon.assert.fail('did not reject');
      } catch (e) {
        sinon.assert.match(e.message, /manifest.js/);
      }
    });

    it('should reject if the script fails to load', async () => {
      const p = getManifest(loader, 'checksum', scope);
      fail(new Error('failed'));
      try {
        await p;
        sinon.assert.fail('did not reject');
      } catch (e) {
        expect(e.message).to.eql('failed');
      }
    });
  });

  describe('provideManifest', () => {
    afterEach(() => {
      delete window.__pbjsTestCallback;
    });

    it('should call the JSONP callback of loaders before 11.48', () => {
      window.__pbjsTestCallback = sinon.spy();
      const scope = {};
      provideManifest({ src: 'https://cdn.example/manifest.js?callback=__pbjsTestCallback', __pbjsScope: scope }, MANIFEST, 'manifest');
      sinon.assert.calledWith(window.__pbjsTestCallback, 'manifest');
      expect(Object.keys(scope)).to.eql([]);
    });

    it('should do nothing for a script without a scope', () => {
      expect(() => provideManifest({ src: 'https://cdn.example/manifest.js' }, MANIFEST, 'manifest')).to.not.throw();
    });
  });

  describe('getManifests', () => {
    let scope, loaded;
    beforeEach(() => {
      scope = {};
      loaded = [];
      loader = sinon.stub().callsFake((file) => {
        loaded.push(file);
        provideManifest({ src: `https://cdn.example/${file}`, __pbjsScope: scope }, file, {
          [MANIFEST]: { dependencies: { 'a.js': [] }, checksums: { 'a.js': 'cs-a' } },
          [METADATA_MANIFEST]: { checksums: { 'a.metadata.js': 'cs-a-meta' } }
        }[file]);
        return Promise.resolve();
      });
    });
    const checksums = { [MANIFEST]: 'cs-manifest', [METADATA_MANIFEST]: 'cs-metadata-manifest' };

    it('should not load the metadata manifest when no module needs metadata', async () => {
      const manifest = await getManifests(loader, checksums, scope, ['a'], () => false);
      expect(loaded).to.eql([MANIFEST]);
      sinon.assert.calledWith(loader, MANIFEST, 'cs-manifest');
      expect(manifest).to.eql({ dependencies: { 'a.js': [] }, checksums: { 'a.js': 'cs-a' } });
    });

    it('should add the metadata checksums when a module needs metadata', async () => {
      const manifest = await getManifests(loader, checksums, scope, ['a', 'storageControl'], (m) => m === 'storageControl');
      expect(loaded).to.have.members([MANIFEST, METADATA_MANIFEST]);
      sinon.assert.calledWith(loader, METADATA_MANIFEST, 'cs-metadata-manifest');
      expect(manifest).to.eql({
        dependencies: { 'a.js': [] },
        checksums: { 'a.js': 'cs-a', 'a.metadata.js': 'cs-a-meta' }
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
    it('should reject after all chunk loads settle if one fails', async () => {
      const failure = new Error('chunk failed');
      let finishPendingLoad;
      loader.onFirstCall().returns(Promise.reject(failure));
      loader.onSecondCall().returns(new Promise(resolve => {
        finishPendingLoad = resolve;
      }));
      resolveDeps.returns(['failed', 'pending']);

      const load = doLoad([]);
      let settled = false;
      load.then(() => { settled = true; }, () => { settled = true; });
      await Promise.resolve();
      expect(settled).to.be.false;

      finishPendingLoad();
      try {
        await load;
        sinon.assert.fail('did not reject');
      } catch (e) {
        expect(e).to.equal(failure);
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

    it('should run load() synchronously', () => {
      // load() needs to be called synchronously so that when called by bundle.js, document.currentScript
      // still refers to the right element (with __pbjsScope)
      let ran = false;
      checkAndRun('pbGlobal', () => {
        ran = true;
        return Promise.resolve();
      });
      expect(ran).to.be.true;
    });

    it('should mark the global as loading', () => {
      checkAndRun('pbGlobal', () => Promise.resolve());
      expect(window.pbGlobal.__loading).to.be.true;
    });

    it('should unmark the global once loaded', async () => {
      await checkAndRun('pbGlobal', () => Promise.resolve().then(() => {
        window.pbGlobal.libLoaded = true;
        throw new Error();
      })).catch(() => {});
      expect(window.pbGlobal.__loading).to.not.exist;
    });

    it('should run load and call processQueue when it resolves', async () => {
      window.pbGlobal.processQueue = sinon.stub();
      load.returns(Promise.resolve());
      const p = checkAndRun('pbGlobal', load);
      sinon.assert.called(load);
      await p;
      sinon.assert.called(window.pbGlobal.processQueue);
    });

    Object.entries({
      loaded: 'libLoaded',
      loading: '__loading'
    }).forEach(([t, prop]) => {
      it(`should not run load if the global is ${t} already`, () => {
        window.pbGlobal[prop] = true;
        window.pbGlobal.getConfig = () => null;
        checkAndRun('pbGlobal', load);
        sinon.assert.notCalled(load);
        sinon.assert.notCalled(consoleWarn);
      });

      Object.entries({
        'debug is enabled': () => true,
        'debug flag cannot be determined': () => {
          throw new Error();
        }
      }).forEach(([t, getConfig]) => {
        it(`should log a warning if ${t}`, () => {
          window.pbGlobal[prop] = true;
          window.pbGlobal.getConfig = getConfig;
          checkAndRun('pbGlobal', load);
          sinon.assert.called(consoleWarn);
        });
      });
    });
  });
});
