import {ready, loadSession, getConfig, reset, debuggingModuleLoader} from '../../src/debugging.js';
import {getGlobal} from '../../src/prebidGlobal.js';

describe('Debugging', () => {
  beforeEach(() => {
    reset();
  });

  after(() => {
    reset();
  });

  describe('automatic loading', () => {
    let load;
    beforeEach(() => {
      load = sinon.stub();
    });

    Object.entries({
      'session': () => loadSession({storage: {getItem: () => 'someConfig'}, load}),
      'setConfig': () => getConfig({debugging: {enabled: true}}, {load})
    }).forEach(([test, action]) => {
      it(`should load debugging module on configuration from ${test}`, (done) => {
        let resolver, loaded = false;
        load.returns(new Promise((resolve) => {
          resolver = resolve;
        }));
        ready().then(() => { loaded = true; });
        action();
        expect(load.called).to.be.true;
        expect(loaded).to.be.false;
        resolver();
        setTimeout(() => {
          expect(loaded).to.be.true;
          done();
        });
      })
    });
  });

  describe('module loader', () => {
    let script, scriptResult, alreadyInstalled, loader;
    beforeEach(() => {
      script = sinon.stub().callsFake(() => {
        getGlobal()._installDebugging = sinon.stub();
        return scriptResult;
      });
      alreadyInstalled = sinon.stub();
      loader = debuggingModuleLoader({alreadyInstalled, script});
    });

    afterEach(() => {
      delete getGlobal()._installDebugging;
    })

    it('should not attempt to load if debugging module is already installed', () => {
      alreadyInstalled.returns(true);
      return loader().then(() => {
        expect(script.called).to.be.false;
      });
    });

    it('should not attempt to load twice', () => {
      alreadyInstalled.returns(false);
      scriptResult = Promise.resolve();
      return Promise.all([loader(), loader()]).then(() => {
        expect(script.callCount).to.equal(1);
      });
    });

    it('should call _installDebugging after loading', () => {
      alreadyInstalled.returns(false);
      scriptResult = Promise.resolve();
      return loader().then(() => {
        expect(getGlobal()._installDebugging.called).to.be.true;
      });
    });

    it('should not call _intallDebugging if load fails', () => {
      const error = new Error();
      alreadyInstalled.returns(false);
      scriptResult = Promise.reject(error)
      return loader().then(() => {
        throw new Error('loader should not resolve');
      }).catch((err) => {
        expect(err).to.equal(error);
        expect(getGlobal()._installDebugging.called).to.be.false;
      });
    });
  });
});
