import {ConsentHandler, gvlidRegistry, multiHandler} from '../../../../src/consentHandler.js';

describe('Consent data handler', () => {
  let handler;
  beforeEach(() => {
    handler = new ConsentHandler();
  })

  it('should be disabled, return null data on init', () => {
    expect(handler.enabled).to.be.false;
    expect(handler.getConsentData()).to.equal(null);
  })

  it('should resolve promise to null when disabled', () => {
    return handler.promise.then((data) => {
      expect(data).to.equal(null);
    });
  });

  it('should return data after setConsentData', () => {
    const data = {consent: 'string'};
    handler.enable();
    handler.setConsentData(data);
    expect(handler.getConsentData()).to.equal(data);
  });

  it('should resolve .promise to data after setConsentData', (done) => {
    let actual = null;
    const data = {consent: 'string'};
    handler.enable();
    handler.promise.then((d) => actual = d);
    setTimeout(() => {
      expect(actual).to.equal(null);
      handler.setConsentData(data);
      setTimeout(() => {
        expect(actual).to.equal(data);
        done();
      })
    })
  });

  it('should resolve .promise to new data if setConsentData is called a second time', (done) => {
    let actual = null;
    const d1 = {data: '1'};
    const d2 = {data: '2'};
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
      })
    })
  });

  describe('getHash', () => {
    it('is defined when null', () => {
      expect(handler.hash).be.a('string');
    });
    it('changes when a field is updated', () => {
      const h1 = handler.hash;
      handler.setConsentData({field: 'value', enabled: false});
      const h2 = handler.hash;
      expect(h2).to.not.eql(h1);
      handler.setConsentData({field: 'value', enabled: true});
      const h3 = handler.hash;
      expect(h3).to.not.eql(h2);
      expect(h3).to.not.eql(h1);
    });
    it('does not change when fields are unchanged', () => {
      handler.setConsentData({field: 'value', enabled: true});
      const h1 = handler.hash;
      handler.setConsentData({field: 'value', enabled: true});
      expect(handler.hash).to.eql(h1);
    });
    it('does not change when non-hashFields are updated', () => {
      handler.hashFields = ['field', 'enabled'];
      handler.setConsentData({field: 'value', enabled: true});
      const h1 = handler.hash;
      handler.setConsentData({field: 'value', enabled: true, other: 'data'});
      expect(handler.hash).to.eql(h1);
    })
  })
});

describe('multiHandler', () => {
  let handlers, multi;
  beforeEach(() => {
    handlers = {h1: {}, h2: {}};
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
        })
      });
    });
  });

  describe('.promise', () => {
    it('resolves all underlying promises', (done) => {
      handlers.h1.promise = Promise.resolve('one');
      let resolver, result;
      handlers.h2.promise = new Promise((resolve) => { resolver = resolve });
      multi.promise.then((val) => {
        result = val;
        expect(result).to.eql({
          h1: 'one',
          h2: 'two'
        });
        done();
      })
      handlers.h1.promise.then(() => {
        expect(result).to.not.exist;
        resolver('two');
      });
    })
  });

  describe('.hash', () => {
    ['h1', 'h2'].forEach((handler, i) => {
      it(`changes when handler #${i + 1} changes hash`, () => {
        handlers.h1.hash = 'one';
        handlers.h2.hash = 'two'
        const first = multi.hash;
        handlers[handler].hash = 'new';
        expect(multi.hash).to.not.eql(first);
      })
    })
  })
})

describe('gvlidRegistry', () => {
  let registry;
  beforeEach(() => {
    registry = gvlidRegistry();
  });

  it('returns undef when id cannoot be found', () => {
    expect(registry.get('name')).to.eql({modules: {}})
  });

  it('does not register null ids', () => {
    registry.register('type', 'name', null);
    expect(registry.get('type', 'name')).to.eql({modules: {}});
  })

  it('can retrieve registered GVL IDs', () => {
    registry.register('type', 'name', 123);
    registry.register('otherType', 'name', 123);
    expect(registry.get('name')).to.eql({gvlid: 123, modules: {type: 123, otherType: 123}});
  });

  it('does not return `gvlid` if there is more than one', () => {
    registry.register('type', 'name', 123);
    registry.register('otherType', 'name', 321);
    expect(registry.get('name')).to.eql({modules: {type: 123, otherType: 321}})
  });
})
