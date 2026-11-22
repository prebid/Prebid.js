import { devtoolsMcpLoader, shouldLoadDevtoolsMcp, initDevtoolsMcp } from '../../src/devtoolsMcp.js';
import { getGlobal } from '../../src/prebidGlobal.js';
import { config } from '../../src/config.js';

describe('devtoolsMcp loader', () => {
  describe('module loader', () => {
    let script, scriptResult, alreadyInstalled, deps, loader;

    beforeEach(() => {
      deps = { marker: 'deps' };
      script = sinon.stub().callsFake(() => {
        getGlobal()._installDevtoolsMcp = sinon.stub();
        return scriptResult;
      });
      alreadyInstalled = sinon.stub();
      loader = devtoolsMcpLoader({ alreadyInstalled, script, deps });
    });

    afterEach(() => {
      delete getGlobal()._installDevtoolsMcp;
    });

    it('does not load if the module is already installed', () => {
      alreadyInstalled.returns(true);
      return loader().then(() => {
        expect(script.called).to.equal(false);
      });
    });

    it('does not load twice', () => {
      alreadyInstalled.returns(false);
      scriptResult = Promise.resolve();
      return Promise.all([loader(), loader()]).then(() => {
        expect(script.callCount).to.equal(1);
      });
    });

    it('installs with the injected deps after loading, planting a sentinel first', () => {
      alreadyInstalled.returns(false);
      scriptResult = Promise.resolve();
      return loader().then(() => {
        expect(getGlobal()._installDevtoolsMcp.calledOnceWith(deps)).to.equal(true);
      });
    });

    it('does not install if the load fails', () => {
      const error = new Error('boom');
      alreadyInstalled.returns(false);
      scriptResult = Promise.reject(error);
      scriptResult.catch(() => null);
      return loader().then(() => {
        throw new Error('loader should not resolve');
      }, (err) => {
        expect(err).to.equal(error);
        expect(getGlobal()._installDevtoolsMcp.called).to.equal(false);
      });
    });
  });

  describe('shouldLoadDevtoolsMcp', () => {
    afterEach(() => {
      config.setConfig({ debug: false });
    });

    it('is true when debug is on, regardless of automation', () => {
      config.setConfig({ debug: true });
      expect(shouldLoadDevtoolsMcp()).to.equal(true);

      config.setConfig({ debug: false });
      expect(shouldLoadDevtoolsMcp()).to.equal(false);
    });
  });

  describe('initDevtoolsMcp', () => {
    it('loads immediately when the condition already holds', () => {
      const load = sinon.stub().returns(Promise.resolve());
      const unsubscribe = initDevtoolsMcp({ load, shouldLoad: () => true });
      expect(load.calledOnce).to.equal(true);
      unsubscribe();
    });

    it('does not load when the condition does not hold', () => {
      const load = sinon.stub().returns(Promise.resolve());
      const unsubscribe = initDevtoolsMcp({ load, shouldLoad: () => false });
      expect(load.called).to.equal(false);
      unsubscribe();
    });

    it('loads (once) when debug is enabled later via config', () => {
      const load = sinon.stub().returns(Promise.resolve());
      let ready = false;
      const unsubscribe = initDevtoolsMcp({ load, shouldLoad: () => ready });
      expect(load.called).to.equal(false);

      ready = true;
      config.setConfig({ debug: true });
      expect(load.calledOnce).to.equal(true);
      // a further change does not load again
      config.setConfig({ debug: false });
      expect(load.calledOnce).to.equal(true);

      unsubscribe();
      config.setConfig({ debug: false });
    });
  });
});
