import {ConsentHandler, gvlidRegistry} from '../../../../src/consentHandler.js';

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
