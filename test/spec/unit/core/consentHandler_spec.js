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
})
