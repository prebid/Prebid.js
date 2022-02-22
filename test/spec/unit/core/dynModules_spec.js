import {moduleLoader} from '../../../../src/dynModules.js';

describe('Dynamic module loading', () => {
  let getUrl, url, loadUrl, loadResult, isInstalled, loadModule;

  beforeEach(() => {
    url = null;
    loadResult = null;
    getUrl = sinon.stub();
    getUrl.callsFake(() => url);
    loadUrl = sinon.stub();
    loadUrl.callsFake(() => loadResult);
    isInstalled = sinon.stub();
    isInstalled.returns(false);
    loadModule = moduleLoader({getUrl, loadUrl, isInstalled});
  });

  it('should resolve when loadUrl resolves', (done) => {
    let resolver, loaded = false;
    url = 'testUrl';
    loadResult = new Promise((resolve) => {
      resolver = resolve;
    });
    loadModule('testModule').then(() => {
      loaded = true;
    });
    setTimeout(() => {
      expect(loaded).to.be.false;
      resolver();
      setTimeout(() => {
        expect(loaded).to.be.true;
        done();
      });
    });
  });

  it('should load the url returned by getUrl', () => {
    url = 'testUrl';
    loadResult = Promise.resolve();
    return loadModule('testModule').then(() => {
      sinon.assert.calledWith(getUrl, 'testModule');
      sinon.assert.calledWith(loadUrl, url);
    });
  });

  it('should reject when loadUrl rejects', (done) => {
    let rejecter, loaded = false;
    loadResult = new Promise((resolve, reject) => {
      rejecter = reject;
    });
    loadModule('testModule').catch(() => {
      loaded = true;
    });
    setTimeout(() => {
      expect(loaded).to.be.false;
      rejecter(new Error());
      setTimeout(() => {
        expect(loaded).to.be.true;
        done();
      });
    })
  });

  it('should not attempt to load a module that is already installed', () => {
    isInstalled.returns(true);
    return loadModule('testModule').finally(() => {
      sinon.assert.calledWith(isInstalled, 'testModule');
      expect(loadUrl.called).to.be.false;
    });
  });

  it('should not attempt to load the same module twice', () => {
    loadResult = Promise.resolve();
    const p1 = loadModule('testModule');
    const p2 = loadModule('testModule');
    return Promise.all([p1, p2]).then(() => {
      expect(loadUrl.callCount).to.equal(1);
    });
  });

  it('should throw if the module name does not look innocuous', () => {
    expect(() => loadModule('../../evil.js')).to.throw();
    expect(() => loadModule('//www.evil.com/evil.js')).to.throw();
  })
});
