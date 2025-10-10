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

  describe('removeCmpEventListener', () => {
    let cmpApiStub;

    beforeEach(() => {
      cmpApiStub = sinon.stub();
      handler.setCmpApi(cmpApiStub);
    });

    it('should not call CMP API when no listener ID is set', () => {
      handler.setCmpListenerId(undefined);
      handler.removeCmpEventListener();
      sinon.assert.notCalled(cmpApiStub);
    });

    it('should not call CMP API when listener ID is null', () => {
      handler.setCmpListenerId(null);
      handler.removeCmpEventListener();
      sinon.assert.notCalled(cmpApiStub);
    });

    it('should not call CMP API when CMP API is not set', () => {
      handler.setCmpApi(null);
      handler.setCmpListenerId(123);
      handler.removeCmpEventListener();
      sinon.assert.notCalled(cmpApiStub);
    });

    it('should call CMP API with correct parameters when both API and listener ID are set', () => {
      const listenerId = 123;
      handler.setCmpListenerId(listenerId);

      // Create spy for addApiVersionToParams
      const addApiVersionToParamsSpy = sinon.spy(handler, 'addApiVersionToParams');

      handler.removeCmpEventListener();

      // Verify addApiVersionToParams was called with correct parameters
      sinon.assert.calledOnce(addApiVersionToParamsSpy);
      const params = addApiVersionToParamsSpy.firstCall.args[0];
      expect(params).to.have.property('command', 'removeEventListener');
      expect(params).to.have.property('parameter', listenerId);
      expect(params.callback).to.be.a('function');

      // Verify CMP API was called with the same parameters
      sinon.assert.calledOnce(cmpApiStub);
      sinon.assert.calledWith(cmpApiStub, params);

      // Clean up spy
      addApiVersionToParamsSpy.restore();
    });

    it('should reset CMP APIs when callback is called with success=true', () => {
      const listenerId = 123;
      handler.setCmpListenerId(listenerId);

      handler.removeCmpEventListener();

      // Get the callback that was passed to the CMP API
      const callback = cmpApiStub.firstCall.args[0].callback;

      // Call the callback with success=true
      callback({}, true);

      // Verify CMP API and listener ID are reset
      expect(handler.getCmpApi()).to.be.null;
      expect(handler.getCmpListenerId()).to.be.undefined;
    });

    it('should not reset CMP APIs when callback is called with success=false', () => {
      const listenerId = 123;
      handler.setCmpListenerId(listenerId);

      handler.removeCmpEventListener();

      // Get the callback that was passed to the CMP API
      const callback = cmpApiStub.firstCall.args[0].callback;

      // Call the callback with success=false
      callback(null, false);

      // Verify CMP API and listener ID are not reset
      expect(handler.getCmpApi()).to.equal(cmpApiStub);
      expect(handler.getCmpListenerId()).to.equal(listenerId);
    });

    it('should call addApiVersionToParams to allow subclasses to customize parameters', () => {
      // Create a subclass that overrides addApiVersionToParams
      class TestConsentHandler extends ConsentHandler {
        addApiVersionToParams(params) {
          params.version = 2;
        }
      }

      const testHandler = new TestConsentHandler();
      const testCmpApiStub = sinon.stub();
      testHandler.setCmpApi(testCmpApiStub);
      testHandler.setCmpListenerId(456);

      testHandler.removeCmpEventListener();

      // Verify CMP API was called with the customized parameters
      sinon.assert.calledOnce(testCmpApiStub);
      expect(testCmpApiStub.firstCall.args[0]).to.have.property('version', 2);
    });
  });
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
