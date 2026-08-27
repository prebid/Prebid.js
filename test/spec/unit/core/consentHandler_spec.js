import { consentHandler, coppaDataHandler, gvlidRegistry, multiHandler } from '../../../../src/consentHandler.js';
import { config } from 'src/config.js';

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
    it('does not change when non-hashFields are updated', () => {
      handler = consentHandler({ hashFields: ['field', 'enabled'] });
      handler.setConsentData({ field: 'value', enabled: true });
      const h1 = handler.hash;
      handler.setConsentData({ field: 'value', enabled: true, other: 'data' });
      expect(handler.hash).to.eql(h1);
    });
  });
});

describe('multiHandler', () => {
  let handlers, multi;
  beforeEach(() => {
    handlers = {
      h1: {
        onChange: sinon.stub()
      },
      h2: {
        onChange: sinon.stub()
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
  });
  describe('onChange', () => {
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

  it('returns undef when id cannoot be found', () => {
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
});
