import { allConsent, consentHandler, coppaDataHandler, gcmDataHandler, gdprDataHandler, gppDataHandler, gvlidList, gvlidRegistry, multiHandler, normalizeGvlid, uspDataHandler, VENDORLESS_GVLID } from '../../../../src/consentHandler.js';
import { cyrb53Hash } from '../../../../src/utils.js';
import { config } from 'src/config.js';
import * as events from 'src/events.js';
import { EVENTS } from 'src/constants.js';
import { getGlobal } from 'src/prebidGlobal.js';
import 'src/prebid.js';

describe('Consent data handler', () => {
  let handler;
  beforeEach(() => {
    handler = consentHandler();
  });

  it('should be disabled, return null data on init', () => {
    expect(handler.enabled).to.be.false;
    expect(handler.getConsentData()).to.equal(null);
  });

  it('should resolve promise to null when disabled', () => {
    return handler.promise.then((data) => {
      expect(data).to.equal(null);
    });
  });

  it('should reject promise on reject', async () => {
    const err = new Error();
    handler.promise.catch(() => null);
    handler.error(err);
    expect(handler.getConsentData()).to.equal(null);
    expect(handler.ready).to.be.true;
    try {
      await handler.promise;
      sinon.assert.fail('promise did not reject');
    } catch (e) {
      expect(e).to.equal(err);
    }
  });

  describe('onChange', () => {
    let listener;
    beforeEach(() => {
      listener = sinon.stub();
    });
    it('should trigger on consent data changes', () => {
      handler.onChange(listener);
      handler.setConsentData(true);
      sinon.assert.calledWith(listener, true);
    });
    it('should not trigger when consent data does not change', () => {
      handler.setConsentData(true);
      handler.onChange(listener);
      handler.setConsentData(true);
      sinon.assert.notCalled(listener);
    });
    it('should keep listeners across reset', () => {
      handler.onChange(listener);
      handler.reset();
      handler.enable();
      handler.setConsentData('after reset');
      sinon.assert.calledWith(listener, 'after reset');
    });
    describe('using hashFields', () => {
      beforeEach(() => {
        handler = consentHandler({ hashFields: ['tcString'] });
      });
      it('should trigger when hashFields change', () => {
        handler.setConsentData({ tcString: 'initial' });
        handler.onChange(listener);
        handler.setConsentData({ tcString: 'updated' });
        sinon.assert.calledWith(listener, { tcString: 'updated' });
      });
      it('should not trigger when non-hashFields change', () => {
        handler.setConsentData({ tcString: 'constant' });
        handler.onChange(listener);
        handler.setConsentData({ tcString: 'constant', other: 'ignored' });
        sinon.assert.notCalled(listener);
      });
    });
  });

  describe('onMetaChange', () => {
    let listener;
    beforeEach(() => {
      listener = sinon.stub();
      handler.onMetaChange(listener);
    });
    it('should trigger when consent data is first set', () => {
      handler.setConsentData('data', 1);
      sinon.assert.calledOnceWithExactly(listener, { generatedAt: 1 });
    });
    it('should trigger when the same data is set again at a different time', () => {
      handler.setConsentData('data', 1);
      handler.setConsentData('data', 2);
      sinon.assert.calledTwice(listener);
      sinon.assert.calledWith(listener, { generatedAt: 2 });
    });
    it('should not trigger when metadata does not change', () => {
      handler.setConsentData('data', 1);
      handler.setConsentData('other', 1);
      sinon.assert.calledOnce(listener);
    });
    it('should not trigger when null data is set', () => {
      handler.setConsentData(null, 1);
      sinon.assert.notCalled(listener);
    });
    it('should trigger on error, when there was metadata', () => {
      handler.setConsentData('data', 1);
      handler.promise.catch(() => null);
      handler.error(new Error());
      sinon.assert.calledTwice(listener);
      sinon.assert.calledWith(listener.secondCall, undefined);
    });
    it('should trigger on reset, when there was metadata', () => {
      handler.setConsentData('data', 1);
      handler.reset();
      sinon.assert.calledTwice(listener);
      sinon.assert.calledWith(listener.secondCall, undefined);
    });
    it('should not trigger on reset when there was no metadata', () => {
      handler.reset();
      sinon.assert.notCalled(listener);
    });
    it('should keep listeners across reset', () => {
      handler.reset();
      handler.enable();
      handler.setConsentData('after reset', 1);
      sinon.assert.calledWith(listener, { generatedAt: 1 });
    });
    it('should not trigger when changes do not affect metadata', () => {
      handler = consentHandler({ getMeta: (data) => ({ size: data.length }) });
      handler.onMetaChange(listener);
      handler.setConsentData('aaa', 1);
      handler.setConsentData('bbb', 2);
      sinon.assert.calledOnceWithExactly(listener, { size: 3 });
    });
  });

  it('should return data after setConsentData', () => {
    const data = { consent: 'string' };
    handler.enable();
    handler.setConsentData(data);
    expect(handler.getConsentData()).to.equal(data);
  });

  it('should resolve .promise to data after setConsentData', (done) => {
    let actual = null;
    const data = { consent: 'string' };
    handler.enable();
    handler.promise.then((d) => actual = d);
    setTimeout(() => {
      expect(actual).to.equal(null);
      handler.setConsentData(data);
      setTimeout(() => {
        expect(actual).to.equal(data);
        done();
      });
    });
  });

  it('should resolve .promise to new data if setConsentData is called a second time', (done) => {
    let actual = null;
    const d1 = { data: '1' };
    const d2 = { data: '2' };
    handler.enable();
    handler.promise.then((d) => actual = d);
    handler.setConsentData(d1);
    setTimeout(() => {
      expect(actual).to.equal(d1);
      handler.setConsentData(d2);
      handler.promise.then((d) => actual = d);
      setTimeout(() => {
        expect(actual).to.equal(d2);
        done();
      });
    });
  });

  describe('getHash', () => {
    it('is defined when null', () => {
      expect(handler.hash).be.a('string');
    });
    it('changes when a field is updated', () => {
      const h1 = handler.hash;
      handler.setConsentData({ field: 'value', enabled: false });
      const h2 = handler.hash;
      expect(h2).to.not.eql(h1);
      handler.setConsentData({ field: 'value', enabled: true });
      const h3 = handler.hash;
      expect(h3).to.not.eql(h2);
      expect(h3).to.not.eql(h1);
    });
    it('does not change when fields are unchanged', () => {
      handler.setConsentData({ field: 'value', enabled: true });
      const h1 = handler.hash;
      handler.setConsentData({ field: 'value', enabled: true });
      expect(handler.hash).to.eql(h1);
    });
    it('is included in the combined hash by default', () => {
      expect(handler.includeHash).to.be.true;
    });
    it('can decide whether it is included in the combined hash', () => {
      handler = consentHandler({ includeHash: ({ enabled }) => enabled });
      expect(handler.includeHash).to.be.false;
      handler.enable();
      expect(handler.includeHash).to.be.true;
      handler.reset();
      expect(handler.includeHash).to.be.false;
    });
    it('does not change when non-hashFields are updated', () => {
      handler = consentHandler({ hashFields: ['field', 'enabled'] });
      handler.setConsentData({ field: 'value', enabled: true });
      const h1 = handler.hash;
      handler.setConsentData({ field: 'value', enabled: true, other: 'data' });
      expect(handler.hash).to.eql(h1);
    });
  });
});

describe('gdprDataHandler', () => {
  const consent = { gdprApplies: true, consentString: 'tcString', addtlConsent: '2~1.2~dv.' };

  beforeEach(() => {
    gdprDataHandler.reset();
    gdprDataHandler.enable();
    gdprDataHandler.setConsentData(consent);
  });

  afterEach(() => {
    gdprDataHandler.reset();
  });

  it('should detect changes to addtlConsent alone', () => {
    const h1 = gdprDataHandler.hash;
    const listener = sinon.stub();
    gdprDataHandler.onChange(listener);
    gdprDataHandler.setConsentData({ ...consent, addtlConsent: '2~1~dv.2' });
    sinon.assert.calledOnce(listener);
    expect(gdprDataHandler.hash).to.not.eql(h1);
  });
});

describe('multiHandler', () => {
  let handlers, multi;
  beforeEach(() => {
    handlers = {
      h1: {
        onChange: sinon.stub(),
        includeHash: true
      },
      h2: {
        onChange: sinon.stub(),
        includeHash: true
      }
    };
    multi = multiHandler(handlers);
  });

  ['getConsentData', 'getConsentMeta'].forEach(method => {
    describe(method, () => {
      it('combines results from underlying handlers', () => {
        handlers.h1[method] = () => 'one';
        handlers.h2[method] = () => 'two';
        expect(multi[method]()).to.eql({
          h1: 'one',
          h2: 'two',
        });
      });
    });
  });

  describe('.promise', () => {
    it('resolves all underlying promises', (done) => {
      handlers.h1.promise = Promise.resolve('one');
      let resolver, result;
      handlers.h2.promise = new Promise((resolve) => { resolver = resolve; });
      multi.promise.then((val) => {
        result = val;
        expect(result).to.eql({
          h1: 'one',
          h2: 'two'
        });
        done();
      });
      handlers.h1.promise.then(() => {
        expect(result).to.not.exist;
        resolver('two');
      });
    });
  });

  describe('.hash', () => {
    ['h1', 'h2'].forEach((handler, i) => {
      it(`changes when handler #${i + 1} changes hash`, () => {
        handlers.h1.hash = 'one';
        handlers.h2.hash = 'two';
        const first = multi.hash;
        handlers[handler].hash = 'new';
        expect(multi.hash).to.not.eql(first);
      });
    });
    it('leaves out handlers that do not include their hash', () => {
      handlers.h1.hash = 'one';
      handlers.h2.hash = 'two';
      handlers.h2.includeHash = false;
      const first = multi.hash;
      handlers.h2.hash = 'new';
      expect(multi.hash).to.eql(first);
      handlers.h2.includeHash = true;
      expect(multi.hash).to.not.eql(first);
    });
  });
  describe('onChange', () => {
    it('does not forward changes twice after reset', () => {
      handlers.h1.reset = sinon.stub();
      handlers.h2.reset = sinon.stub();
      handlers.h1.getConsentData = () => 'one';
      handlers.h2.getConsentData = () => 'two';
      multi.reset();
      const listener = sinon.stub();
      multi.onChange(listener);
      handlers.h1.onChange.args.forEach(([fn]) => fn());
      sinon.assert.calledOnce(listener);
    });
    ['h1', 'h2'].forEach((handler, i) => {
      it(`triggers when handler #${i + 1} changes`, () => {
        handlers.h1.getConsentData = () => 'one';
        handlers.h2.getConsentData = () => 'two';
        const listener = sinon.stub();
        multi.onChange(listener);
        handlers[handler].onChange.args[0][0]();
        sinon.assert.calledWith(listener, {
          h1: 'one',
          h2: 'two'
        });
      });
    });
  });
});

describe('consentHandler hash', () => {
  let handler;
  beforeEach(() => {
    handler = consentHandler();
    handler.enable();
  });

  it('reflects a change even if the same data is set again before the hash is read', () => {
    const before = handler.hash;
    handler.setConsentData({ a: 1 });
    handler.setConsentData({ a: 1 });
    expect(handler.hash).to.not.be.null;
    expect(handler.hash).to.not.equal(before);
  });

  it('is computed after reset, even when the first data set is null', () => {
    handler.setConsentData({ a: 1 });
    const withData = handler.hash;
    handler.reset();
    handler.enable();
    handler.setConsentData(null);
    expect(handler.hash).to.not.be.null;
    expect(handler.hash).to.not.equal(withData);
  });
});

describe('allConsent', () => {
  afterEach(() => gcmDataHandler.reset());

  [['gdpr', gdprDataHandler], ['gpp', gppDataHandler], ['gcm', gcmDataHandler]].forEach(([name, handler]) => {
    it(`keeps forwarding ${name} changes after the handler is reset (module disabled and re-enabled)`, () => {
      const listener = sinon.stub();
      allConsent.onChange(listener);
      try {
        handler.reset();
        handler.enable();
        handler.setConsentData({ marker: name });
        sinon.assert.calledWith(listener, sinon.match({ [name]: { marker: name } }));
      } finally {
        handler.reset();
      }
    });
  });

  describe('consentMetadataChanged event', () => {
    let listener;
    beforeEach(() => {
      listener = sinon.stub();
      events.on(EVENTS.CONSENT_METADATA_CHANGED, listener);
    });
    afterEach(() => {
      events.off(EVENTS.CONSENT_METADATA_CHANGED, listener);
      gppDataHandler.reset();
    });

    it('fires with the new result of getConsentMetadata when it changes', () => {
      gppDataHandler.enable();
      gppDataHandler.setConsentData({ gppString: 'gpp' }, 123);
      sinon.assert.calledOnce(listener);
      const meta = listener.args[0][0];
      expect(meta.gpp).to.eql({ generatedAt: 123 });
      expect(meta).to.eql(getGlobal().getConsentMetadata());
    });

    it('fires when consent data is reset', () => {
      gppDataHandler.enable();
      gppDataHandler.setConsentData({ gppString: 'gpp' }, 123);
      gppDataHandler.reset();
      sinon.assert.calledTwice(listener);
      expect(listener.secondCall.args[0].gpp).to.be.undefined;
    });

    it('does not fire when getConsentMetadata does not change', () => {
      gdprDataHandler.enable();
      try {
        gdprDataHandler.setConsentData({ gdprApplies: true, consentString: 'abc' }, 123);
        sinon.assert.notCalled(listener);
      } finally {
        gdprDataHandler.reset();
      }
    });

    it('keeps firing after allConsent.reset()', () => {
      allConsent.reset();
      gppDataHandler.enable();
      gppDataHandler.setConsentData({ gppString: 'gpp' }, 123);
      sinon.assert.calledOnce(listener);
    });

    it('fires on coppa config changes', () => {
      try {
        config.setConfig({ coppa: true });
        sinon.assert.calledOnce(listener);
        expect(listener.args[0][0].coppa).to.be.true;
      } finally {
        config.resetConfig();
      }
    });
  });

  it('includes gcm', () => {
    expect(allConsent.getConsentData()).to.have.property('gcm');
  });

  it('leaves gcm out of the hash until it is enabled', () => {
    const legacyHash = () => cyrb53Hash([gdprDataHandler, uspDataHandler, gppDataHandler, coppaDataHandler].map(h => h.hash).join(':'));
    expect(allConsent.hash).to.equal(legacyHash());
    gcmDataHandler.enable();
    gcmDataHandler.setConsentData({ ad_storage: 'denied' });
    expect(allConsent.hash).to.not.equal(legacyHash());
  });
});

describe('coppaDataHandler', () => {
  after(() => {
    config.resetConfig();
  });
  it('should default to false', () => {
    expect(coppaDataHandler.getCoppa()).to.be.false;
  });

  it('should reflect configuration updates', () => {
    config.setConfig({ coppa: true });
    expect(coppaDataHandler.getCoppa()).to.be.true;
    config.setConfig({ coppa: false });
    expect(coppaDataHandler.getCoppa()).to.be.false;
  });
  it('should be enabled and ready on reset', () => {
    config.setConfig({ coppa: true });
    coppaDataHandler.reset();
    expect(coppaDataHandler.enabled).to.be.true;
    expect(coppaDataHandler.getConsentData()).to.be.true;
  });
});

describe('gvlidRegistry', () => {
  let registry;
  beforeEach(() => {
    registry = gvlidRegistry();
  });

  it('returns undef when id cannot be found', () => {
    expect(registry.get('name')).to.eql({ modules: {} });
  });

  it('does not register null ids', () => {
    registry.register('type', 'name', null);
    expect(registry.get('type', 'name')).to.eql({ modules: {} });
  });

  it('can retrieve registered GVL IDs', () => {
    registry.register('type', 'name', 123);
    registry.register('otherType', 'name', 123);
    expect(registry.get('name')).to.eql({ gvlid: 123, modules: { type: 123, otherType: 123 } });
  });

  it('does not return `gvlid` if there is more than one', () => {
    registry.register('type', 'name', 123);
    registry.register('otherType', 'name', 321);
    expect(registry.get('name')).to.eql({ modules: { type: 123, otherType: 321 } });
  });

  describe('lists of GVL IDs', () => {
    it('can register a list', () => {
      registry.register('type', 'name', [321, 123, 321]);
      expect(registry.get('name')).to.eql({ gvlid: [123, 321], modules: { type: [123, 321] } });
    });

    it('returns `gvlid` when the same list is registered by more than one module', () => {
      registry.register('type', 'name', [123, 321]);
      registry.register('otherType', 'name', [321, 123]);
      expect(registry.get('name').gvlid).to.eql([123, 321]);
    });

    it('does not return `gvlid` when different lists are registered', () => {
      registry.register('type', 'name', [123, 321]);
      registry.register('otherType', 'name', [123]);
      expect(registry.get('name')).to.eql({ modules: { type: [123, 321], otherType: 123 } });
    });

    it('does not register empty lists', () => {
      registry.register('type', 'name', []);
      expect(registry.get('name')).to.eql({ modules: {} });
    });
  });
});

describe('normalizeGvlid', () => {
  Object.entries({
    'null': [null, null],
    'undefined': [undefined, null],
    'a number': [123, 123],
    'VENDORLESS_GVLID': [VENDORLESS_GVLID, VENDORLESS_GVLID],
    'an empty list': [[], null],
    'a list with a single element': [[123], 123],
    'a list with duplicates': [[3, 1, 3, 2], [1, 2, 3]],
    'a list with non-numbers': [[2, 'x', null, 1], [1, 2]],
  }).forEach(([t, [input, expected]]) => {
    it(`handles ${t}`, () => {
      expect(normalizeGvlid(input)).to.eql(expected);
    });
  });
});

describe('gvlidList', () => {
  Object.entries({
    'null': [null, []],
    'a number': [123, [123]],
    'a list': [[1, 2], [1, 2]],
  }).forEach(([t, [input, expected]]) => {
    it(`handles ${t}`, () => {
      expect(gvlidList(input)).to.eql(expected);
    });
  });
});
