import {ConsentHandler} from '../../../../src/consentHandler.js';

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

  it('should run onConsentChange listeners when consent data changes', () => {
    handler.setConsentData({consent: 'data'});
    const listener = sinon.stub();
    handler.onConsentChange(listener);
    handler.setConsentData({consent: 'data'});
    sinon.assert.notCalled(listener);
    const newConsent = {other: 'data'};
    handler.setConsentData(newConsent);
    sinon.assert.calledWith(listener, newConsent);
  });

  it('should not choke if listener throws', () => {
    handler.onConsentChange(sinon.stub().throws(new Error()));
    const listener = sinon.stub();
    handler.onConsentChange(listener);
    const consent = {consent: 'data'};
    handler.setConsentData(consent);
    sinon.assert.calledWith(listener, consent);
  });

  Object.entries({
    'undefined': undefined,
    'null': null
  }).forEach(([t, val]) => {
    it(`should run onConsentChange when consent is first set to ${t}`, () => {
      const listener = sinon.stub();
      handler.onConsentChange(listener);
      handler.setConsentData(val);
      handler.setConsentData(val);
      sinon.assert.calledOnce(listener);
      sinon.assert.calledWith(listener, val);
    })
  })
})
