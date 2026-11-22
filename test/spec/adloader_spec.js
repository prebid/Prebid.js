import * as utils from 'src/utils.js';
import * as adLoader from 'test/mocks/adloaderStub.js';
import { ACTIVITY_LOAD_EXTERNAL_SCRIPT } from '../../src/activities/activities.js';
import { registerActivityControl } from '../../src/activities/rules.js';
import { MODULE_TYPE_PREBID } from '../../src/activities/modules.js';
import { preloadExternalScript } from '../../src/adloader.js';

function rejectionOf(promise) {
  return promise.then(() => { throw new Error('did not reject'); }, (e) => e);
}

function flush() {
  return new Promise(resolve => setTimeout(resolve));
}

describe('adLoader', function () {
  let sandbox;
  let utilsinsertElementStub;
  let utilsLogErrorStub;
  let scriptEl;

  function insertedScript() {
    expect(scriptEl, 'no script was inserted').to.exist;
    return scriptEl;
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    scriptEl = null;
    utilsinsertElementStub = sandbox.stub(utils, 'insertElement').callsFake((el) => {
      scriptEl = el;
    });
    utilsLogErrorStub = sandbox.stub(utils, 'logError');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('loadExternalScript', function () {
    it('requires moduleCode to be included on the request', async function () {
      adLoader.loadExternalScript('someURL');
      await flush();
      expect(utilsLogErrorStub.called).to.be.true;
      expect(utilsinsertElementStub.called).to.be.false;
    });

    it('loads the script when moduleType and moduleCode are given', async function () {
      adLoader.loadExternalScript('test-load', MODULE_TYPE_PREBID, 'debugging');
      await flush();
      expect(utilsLogErrorStub.called).to.be.false;
      expect(utilsinsertElementStub.called).to.be.true;
    });

    Object.entries({
      'createElement throws'() {
        sandbox.stub(document, 'createElement').throws(new Error());
      },
      'setAttribute throws'() {
        sandbox.stub(document, 'createElement').returns({
          setAttribute() {
            throw new Error();
          }
        });
      },
      'addEventListener throws'() {
        sandbox.stub(document, 'createElement').returns({
          setAttribute() {},
          addEventListener() {
            throw new Error();
          }
        });
      },
      'insertElement throws'() {
        utilsinsertElementStub.throws(new Error());
      }
    }).forEach(([desc, setup]) => {
      describe(`when ${desc}`, () => {
        beforeEach(setup);
        it('loadExternalScript throws', () => {
          expect(() => adLoader.loadExternalScript('test-element-throws', MODULE_TYPE_PREBID, 'test', null, null, { attr: 'value' })).to.throw();
        });
        it('fetchExternalScript rejects', async () => {
          await rejectionOf(adLoader.fetchExternalScript('test-element-throws', MODULE_TYPE_PREBID, 'test', null, null, { attr: 'value' }));
        });
      });
    });

    it('accepts null document', async () => {
      adLoader.loadExternalScript('test-null-doc', MODULE_TYPE_PREBID, 'test', null, null);
      await flush();
      sinon.assert.calledWith(utilsinsertElementStub, sinon.match.any, document);
    });

    it('returns the inserted script tag', function () {
      const result = adLoader.loadExternalScript('test-return', MODULE_TYPE_PREBID, 'debugging');
      expect(result).to.be.instanceOf(HTMLScriptElement);
      expect(result).to.equal(insertedScript());
    });

    it('should not load cached script again', async function () {
      adLoader.loadExternalScript('test-cached', MODULE_TYPE_PREBID, 'debugging');
      await flush();
      adLoader.loadExternalScript('test-cached', MODULE_TYPE_PREBID, 'debugging');
      await flush();
      sinon.assert.calledOnce(utilsinsertElementStub);
    });

    it('should run callback when script loads', async () => {
      const callback = sinon.stub();
      adLoader.loadExternalScript('test-1', MODULE_TYPE_PREBID, 'debugging', callback);
      await flush();
      insertedScript().dispatchEvent(new Event('load'));
      await flush();
      sinon.assert.called(callback);
    });

    it('cleans up script listeners once loaded', async () => {
      const added = sandbox.spy(EventTarget.prototype, 'addEventListener');
      const removed = sandbox.spy(EventTarget.prototype, 'removeEventListener');
      adLoader.loadExternalScript('test-cleanup', MODULE_TYPE_PREBID, 'debugging', sinon.stub());
      await flush();
      insertedScript().dispatchEvent(new Event('load'));
      await flush();
      expect(scriptEl.onload).to.equal(null);
      expect(scriptEl.onerror).to.equal(null);
      added.getCalls().filter(call => call.thisValue === scriptEl).forEach(({ args: [type, listener] }) => {
        const wasRemoved = removed.getCalls().some(call => call.thisValue === scriptEl && call.args[0] === type && call.args[1] === listener);
        expect(wasRemoved, `'${type}' listener was not removed`).to.be.true;
      });
    });

    it('settles when the caller sets onerror on the returned tag', async () => {
      const callback = { error: sinon.stub() };
      const onerror = sinon.stub();
      const tag = adLoader.loadExternalScript('test-caller-onerror', MODULE_TYPE_PREBID, 'debugging', callback);
      tag.onerror = onerror;
      tag.dispatchEvent(new Event('error'));
      await flush();
      sinon.assert.calledOnce(onerror);
      sinon.assert.calledOnce(callback.error);
      adLoader.loadExternalScript('test-caller-onerror', MODULE_TYPE_PREBID, 'debugging');
      await flush();
      sinon.assert.calledTwice(utilsinsertElementStub);
    });

    it('settles when the caller sets onload on the returned tag', async () => {
      const callback = sinon.stub();
      const onload = sinon.stub();
      const tag = adLoader.loadExternalScript('test-caller-onload', MODULE_TYPE_PREBID, 'debugging', callback);
      tag.onload = onload;
      tag.dispatchEvent(new Event('load'));
      await flush();
      sinon.assert.calledOnce(onload);
      sinon.assert.calledOnce(callback);
    });

    it('should run callback as an object', async () => {
      const callback = {
        success: sinon.stub()
      };
      adLoader.loadExternalScript('test-2', MODULE_TYPE_PREBID, 'debugging', callback);
      await flush();
      insertedScript().dispatchEvent(new Event('load'));
      await flush();
      sinon.assert.called(callback.success);
    });

    it('should run error callback once', async () => {
      const callback = {
        error: sinon.stub()
      };
      adLoader.loadExternalScript('test-3', MODULE_TYPE_PREBID, 'debugging', callback);
      await flush();
      const ev = new Event('error');
      insertedScript().dispatchEvent(ev);
      insertedScript().dispatchEvent(ev);
      await flush();
      sinon.assert.calledWith(callback.error, ev);
      sinon.assert.calledOnce(callback.error);
    });

    it('runs callback when the script was already loaded', async () => {
      adLoader.loadExternalScript('test-cached-loaded', MODULE_TYPE_PREBID, 'debugging', sinon.stub());
      await flush();
      insertedScript().dispatchEvent(new Event('load'));
      await flush();
      const callback = sinon.stub();
      adLoader.loadExternalScript('test-cached-loaded', MODULE_TYPE_PREBID, 'debugging', callback);
      await flush();
      sinon.assert.calledOnce(callback);
      sinon.assert.calledOnce(utilsinsertElementStub);
    });

    it('does not cache a load error', async () => {
      adLoader.loadExternalScript('test-retry', MODULE_TYPE_PREBID, 'debugging', { error: sinon.stub() });
      await flush();
      insertedScript().dispatchEvent(new Event('error'));
      await flush();
      const callback = { success: sinon.stub(), error: sinon.stub() };
      adLoader.loadExternalScript('test-retry', MODULE_TYPE_PREBID, 'debugging', callback);
      await flush();
      sinon.assert.calledTwice(utilsinsertElementStub);
      sinon.assert.notCalled(callback.error);
      scriptEl.dispatchEvent(new Event('load'));
      await flush();
      sinon.assert.calledOnce(callback.success);
    });

    it('runs error callback when denied by activity controls', async () => {
      const unregister = registerActivityControl(ACTIVITY_LOAD_EXTERNAL_SCRIPT, 'test', () => ({ allow: false }));
      try {
        const callback = { success: sinon.stub(), error: sinon.stub() };
        adLoader.loadExternalScript('test-denied', MODULE_TYPE_PREBID, 'debugging', callback);
        await flush();
        sinon.assert.calledOnce(callback.error);
        sinon.assert.notCalled(callback.success);
      } finally {
        unregister();
      }
    });

    it('runs every callback queued while the script is loading', async () => {
      const callbacks = [sinon.stub(), sinon.stub()];
      callbacks.forEach(cb => adLoader.loadExternalScript('test-queued', MODULE_TYPE_PREBID, 'debugging', cb));
      await flush();
      callbacks.forEach(cb => sinon.assert.notCalled(cb));
      insertedScript().dispatchEvent(new Event('load'));
      await flush();
      callbacks.forEach(cb => sinon.assert.calledOnce(cb));
      sinon.assert.calledOnce(utilsinsertElementStub);
    });

    it('runs remaining callbacks when one throws', async () => {
      const callback = sinon.stub();
      adLoader.loadExternalScript('test-throws-others', MODULE_TYPE_PREBID, 'debugging', () => { throw new Error(); });
      adLoader.loadExternalScript('test-throws-others', MODULE_TYPE_PREBID, 'debugging', callback);
      await flush();
      insertedScript().dispatchEvent(new Event('load'));
      await flush();
      sinon.assert.calledOnce(callback);
    });

    it('logs an error when a callback throws', async () => {
      adLoader.loadExternalScript('test-throws', MODULE_TYPE_PREBID, 'debugging', () => { throw new Error(); });
      await flush();
      insertedScript().dispatchEvent(new Event('load'));
      await flush();
      sinon.assert.called(utilsLogErrorStub);
    });

    it('does not call a plain function callback when the script fails to load', async () => {
      const callback = sinon.stub();
      adLoader.loadExternalScript('test-fn-error', MODULE_TYPE_PREBID, 'debugging', callback);
      await flush();
      insertedScript().dispatchEvent(new Event('error'));
      await flush();
      sinon.assert.notCalled(callback);
    });

    it('applies each url its own attributes', async () => {
      const doc = document.implementation.createHTMLDocument('');
      const tagA = adLoader.loadExternalScript('test-attrs-a', MODULE_TYPE_PREBID, 'debugging', undefined, doc, { 'data-a': '1' });
      const tagB = adLoader.loadExternalScript('test-attrs-b', MODULE_TYPE_PREBID, 'debugging', undefined, doc, { 'data-b': '2' });
      await flush();
      expect(tagA.getAttribute('data-a')).to.equal('1');
      expect(tagB.getAttribute('data-b')).to.equal('2');
      expect(tagB.getAttribute('data-a')).to.equal(null);
    });

    it('does not cache a synchronous load error', async () => {
      const doc = document.implementation.createHTMLDocument('');
      expect(() => adLoader.loadExternalScript('test-sync-error', MODULE_TYPE_PREBID, 'debugging', undefined, doc, { 'invalid name': 'x' })).to.throw();
      sinon.assert.notCalled(utilsinsertElementStub);
      adLoader.loadExternalScript('test-sync-error', MODULE_TYPE_PREBID, 'debugging', undefined, doc);
      await flush();
      sinon.assert.calledOnce(utilsinsertElementStub);
    });

    it('does not return a tag to a caller denied by activity controls', async () => {
      const unregister = registerActivityControl(ACTIVITY_LOAD_EXTERNAL_SCRIPT, 'test', (params) => {
        if (params.componentName === 'denied') return { allow: false };
      });
      try {
        const allowedTag = adLoader.loadExternalScript('test-denied-tag', MODULE_TYPE_PREBID, 'debugging');
        expect(allowedTag).to.exist;
        const deniedTag = adLoader.loadExternalScript('test-denied-tag', MODULE_TYPE_PREBID, 'denied');
        expect(deniedTag).to.not.exist;
      } finally {
        unregister();
      }
    });

    describe('when denied by activity controls', () => {
      let unregister;
      beforeEach(() => {
        unregister = registerActivityControl(ACTIVITY_LOAD_EXTERNAL_SCRIPT, 'test', () => ({ allow: false }));
      });
      afterEach(() => {
        unregister();
      });

      it('runs the error callback asynchronously', async () => {
        const callback = { error: sinon.stub() };
        adLoader.loadExternalScript('test-denied-async', MODULE_TYPE_PREBID, 'debugging', callback);
        sinon.assert.notCalled(callback.error);
        await flush();
        sinon.assert.calledOnce(callback.error);
      });

      it('logs an error callback that throws instead of propagating it', async () => {
        const callback = { error: () => { throw new Error(); } };
        expect(() => adLoader.loadExternalScript('test-denied-throws', MODULE_TYPE_PREBID, 'debugging', callback)).to.not.throw();
        await flush();
        sinon.assert.calledWith(utilsLogErrorStub, 'Error executing callback');
      });
    });

    it('requires a url to be included once per document', async function () {
      function getDocSpec() {
        return {
          createElement: function () {
            return {
              addEventListener() {
              }
            };
          },
          getElementsByTagName: function () {
            return {
              firstChild: {
                insertBefore: function () {
                }
              }
            };
          }

        };
      }

      const doc1 = getDocSpec();
      const doc2 = getDocSpec();
      adLoader.loadExternalScript('someURL', MODULE_TYPE_PREBID, 'debugging', () => {
      }, doc1);
      adLoader.loadExternalScript('someURL', MODULE_TYPE_PREBID, 'debugging', () => {
      }, doc1);
      adLoader.loadExternalScript('someURL', MODULE_TYPE_PREBID, 'debugging', () => {
      }, doc1);
      adLoader.loadExternalScript('someURL', MODULE_TYPE_PREBID, 'debugging', () => {
      }, doc2);
      adLoader.loadExternalScript('someURL', MODULE_TYPE_PREBID, 'debugging', () => {
      }, doc2);
      await flush();
      expect(utilsinsertElementStub.callCount).to.equal(2);
    });
  });

  describe('preloadExternalScript', () => {
    let ruleHandle, rule;
    beforeEach(() => {
      rule = sinon.stub();
      ruleHandle = registerActivityControl(ACTIVITY_LOAD_EXTERNAL_SCRIPT, 'test', rule);
      preloadExternalScript.clear();
    });
    afterEach(() => {
      ruleHandle();
    });
    it('should require moduleType and moduleCode', async () => {
      await rejectionOf(preloadExternalScript('url'));

      sinon.assert.notCalled(utilsinsertElementStub);
      sinon.assert.notCalled(rule);
    });

    it('should check activity controls', async () => {
      rule.callsFake(params => {
        if (params.component === 'bidder.example') return { allow: false };
      });
      await rejectionOf(preloadExternalScript('url', 'bidder', 'example'));
      sinon.assert.notCalled(utilsinsertElementStub);
    });

    it('should insert link element', () => {
      return new Promise((resolve, reject) => {
        utilsinsertElementStub.callsFake(elm => {
          try {
            expect(elm.rel).to.eql('preload');
            expect(elm.as).to.eql('script');
            expect(elm.href).to.eql('https://example.com/');
            resolve();
          } catch (e) {
            reject(e);
          }
        });
        preloadExternalScript('https://example.com/', 'type', 'code');
      });
    });

    it('should not insert the same element a second time', async () => {
      utilsinsertElementStub.callsFake(elm => elm.dispatchEvent(new Event('load')));
      await preloadExternalScript('https://example.com', 'type', 'code');
      await preloadExternalScript('https://example.com', 'type', 'otherCode');
      sinon.assert.calledOnce(utilsinsertElementStub);
    });

    it('should resolve returned promise on load', async () => {
      utilsinsertElementStub.callsFake(elm => elm.dispatchEvent(new Event('load')));
      await preloadExternalScript('url', 'type', 'code');
    });
    it('should reject returned promise on error', async () => {
      const ev = new Event('error');
      utilsinsertElementStub.callsFake(elm => elm.dispatchEvent(ev));
      expect(await rejectionOf(preloadExternalScript('url', 'type', 'code'))).to.equal(ev);
    });

    it('should not cache a load error', async () => {
      utilsinsertElementStub.callsFake(elm => setTimeout(() => elm.dispatchEvent(new Event('error'))));
      await rejectionOf(preloadExternalScript('url', 'type', 'code'));
      utilsinsertElementStub.callsFake(elm => elm.dispatchEvent(new Event('load')));
      await preloadExternalScript('url', 'type', 'code');
      sinon.assert.calledTwice(utilsinsertElementStub);
    });

    it('should allow loading after activities control change', async () => {
      rule.returns({ allow: false });
      await rejectionOf(preloadExternalScript('url', 'type', 'code'));
      sinon.assert.notCalled(utilsinsertElementStub);
      rule.returns(undefined);
      preloadExternalScript('url', 'type', 'code');
      await flush();
      sinon.assert.called(utilsinsertElementStub);
    });
  });

  it('attaches passed attributes to a script', async function () {
    const doc = {
      createElement: function () {
        return {
          setAttribute: function (key, value) {
            this[key] = value;
          },
          addEventListener() {
          }
        };
      },
      getElementsByTagName: function () {
        return {
          firstChild: {
            insertBefore: function () {
            }
          }
        };
      }
    };
    const attrs = { 'z': 'A', 'y': 2 };
    adLoader.loadExternalScript('someUrl', MODULE_TYPE_PREBID, 'debugging', undefined, doc, attrs);
    await flush();
    expect(insertedScript().z).to.equal('A');
    expect(scriptEl.y).to.equal(2);
  });

  it('should disable loading external script for activity rule set', async function () {
    let unregisterRule;
    try {
      const rule = sinon.stub().returns({ allow: false });
      unregisterRule = registerActivityControl(ACTIVITY_LOAD_EXTERNAL_SCRIPT, 'loadExternalScript config', rule);
      adLoader.loadExternalScript('url', 'prebid', 'debugging');
      await flush();
      sinon.assert.notCalled(utilsinsertElementStub);
      sinon.assert.calledWith(rule, sinon.match({ componentType: 'prebid', componentName: 'debugging' }));
    } finally {
      unregisterRule?.();
    }
  });
});
