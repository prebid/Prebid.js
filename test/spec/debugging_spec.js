import {ready, loadSession, getConfig, reset, debuggingModuleLoader, debuggingControls} from '../../src/debugging.js';
import {getGlobal} from '../../src/prebidGlobal.js';
import {defer} from '../../src/utils/promise.js';
import funHooks from 'fun-hooks/no-eval/index.js';

describe('Debugging', () => {
  beforeEach(() => {
    reset();
  });

  after(() => {
    reset();
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

    it('should not call _installDebugging if load fails', () => {
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

  describe('debugging controls', () => {
    let debugging, loader, hook, hookRan;

    beforeEach(() => {
      loader = defer();
      hookRan = false;
      hook = funHooks()('sync', () => { hookRan = true });
      debugging = debuggingControls({load: sinon.stub().returns(loader.promise), hook});
    })

    it('should delay execution of hook until module is loaded', () => {
      debugging.enable();
      hook();
      expect(hookRan).to.be.false;
      loader.resolve();
      return loader.promise.then(() => {
        expect(hookRan).to.be.true;
      });
    });

    it('should restore hook behavior when disabled', () => {
      debugging.enable();
      debugging.disable();
      hook();
      expect(hookRan).to.be.true;
    })
  });
});
