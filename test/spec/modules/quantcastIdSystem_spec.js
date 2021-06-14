import { quantcastIdSubmodule, storage, firePixel, hasGDPRConsent, checkTCFv2 } from 'modules/quantcastIdSystem.js';
import * as utils from 'src/utils.js';
import {coppaDataHandler, gdprDataHandler, uspDataHandler} from 'src/adapterManager';

describe('QuantcastId module', function () {
  beforeEach(function() {
    storage.setCookie('__qca', '', 'Thu, 01 Jan 1970 00:00:00 GMT');
    sinon.stub(window, 'addEventListener');
    sinon.stub(coppaDataHandler, 'getCoppa');
    sinon.stub(utils, 'triggerPixel');
  });

  afterEach(function () {
    utils.triggerPixel.restore();
    window.addEventListener.restore();
    coppaDataHandler.getCoppa.restore();
  });

  it('getId() should return a quantcast id when the Quantcast first party cookie exists', function () {
    storage.setCookie('__qca', 'P0-TestFPA');

    const id = quantcastIdSubmodule.getId();
    expect(id).to.be.deep.equal({id: {quantcastId: 'P0-TestFPA'}});
  });

  it('getId() should return an empty id when the Quantcast first party cookie is missing', function () {
    const id = quantcastIdSubmodule.getId();
    expect(id).to.be.deep.equal({id: undefined});
  });
});

describe('QuantcastId fire pixel', function () {
  beforeEach(function () {
    storage.setCookie('__qca', '', 'Thu, 01 Jan 1970 00:00:00 GMT');
    sinon.stub(utils, 'triggerPixel');
    sinon.stub(uspDataHandler, 'getConsentData');
    sinon.stub(gdprDataHandler, 'getConsentData');
  });

  afterEach(function () {
    utils.triggerPixel.restore();
    uspDataHandler.getConsentData.restore();
    gdprDataHandler.getConsentData.restore();
  });

  it('fpa should be set when not present on this call', function () {
    firePixel();
    let urlString = utils.triggerPixel.getCall(0).args[0];
    let url = new URL(urlString);
    let urlSearchParams = new URLSearchParams(url.search);
    assert.equal(urlSearchParams.get('fpan'), '0');
    assert.notEqual(urlSearchParams.get('fpa'), null);
  });

  it('fpa should be extracted from the Quantcast first party cookie when present on this call', function () {
    storage.setCookie('__qca', 'P0-TestFPA');
    firePixel();
    let urlString = utils.triggerPixel.getCall(0).args[0];
    let url = new URL(urlString);
    let urlSearchParams = new URLSearchParams(url.search);
    assert.equal(urlSearchParams.get('fpan'), '0');
    assert.equal(urlSearchParams.get('fpa'), 'P0-TestFPA');
  });

  it('called once', function () {
    storage.setCookie('__qca', 'P0-TestFPA');
    firePixel();
    expect(utils.triggerPixel.calledOnce).to.equal(true);
  });
});

describe('Quantcast GDPR consent check', function() {
  it("returns true when GDPR doesn't apply", function() {
    expect(hasGDPRConsent({gdprApplies: false})).to.equal(true);
  });

  it('returns false if denied consent, even if special purpose 1 treatment is true in DE', function() {
    expect(checkTCFv2({
      gdprApplies: true,
      publisherCC: 'DE',
      purposeOneTreatment: true,
      vendor: {
        consents: { '11': false }
      },
      purpose: {
        consents: { '1': false }
      },
      publisher: {
        restrictions: {
          '1': {
            '11': 0 // flatly disallow Quantcast
          }
        }
      }
    })).toBe(false);
  });

  it('returns false if publisher flatly denies required purpose', function() {
    expect(checkTCFv2({
      gdprApplies: true,
      vendor: {
        consents: { '11': true }
      },
      purpose: {
        consents: { '1': true }
      },
      publisher: {
        restrictions: {
          '1': {
            '11': 0 // flatly disallow Quantcast
          }
        }
      }
    })).toBe(false);
  });

  it('returns true if positive consent for required purpose', function() {
    expect(checkTCFv2({
      gdprApplies: true,
      vendor: {
        consents: { '11': true }
      },
      purpose: {
        consents: { '1': true }
      }
    })).toBe(true);
  });

  it('returns false if positive consent but publisher requires legitimate interest for required purpose', function() {
    expect(checkTCFv2({
      gdprApplies: true,
      vendor: {
        consents: { '11': true }
      },
      purpose: {
        consents: { '1': true }
      },
      publisher: {
        restrictions: {
          '1': {
            '11': 2 // require legitimate interest for Quantcast
          }
        }
      }
    })).toBe(false);
  });

  it('returns false if no vendor consent and no legitimate interest', function() {
    expect(checkTCFv2({
      gdprApplies: true,
      vendor: {
        consents: { '11': false }
      },
      purpose: {
        consents: { '1': true }
      }
    })).toBe(false);
  });

  it('returns false if no purpose consent and no legitimate interest', function() {
    expect(checkTCFv2({
      gdprApplies: true,
      vendor: {
        consents: { '11': true }
      },
      purpose: {
        consents: { '1': false }
      }
    })).toBe(false);
  });

  it('returns false if no consent, but legitimate interest for consent-first purpose, and no restrictions specified', function() {
    expect(checkTCFv2({
      gdprApplies: true,
      vendor: {
        consents: { '11': true },
        legitimateInterests: { '11': true }
      },
      purpose: {
        consents: { '1': false },
        legitimateInterests: { '1': true }
      }
    })).toBe(false);
  });

  it('returns false if consent, but no legitimate interest for legitimate-interest-first purpose, and no restrictions specified', function() {
    expect(checkTCFv2({
      gdprApplies: true,
      vendor: {
        consents: { '11': true },
        legitimateInterests: { '11': true }
      },
      purpose: {
        consents: { '10': true },
        legitimateInterests: { '10': false }
      }
    })).toBe(false);
  });

  it('returns true if consent, but no legitimate interest for legitimate-interest-first purpose, and corresponding consent restriction specified', function() {
    expect(checkTCFv2({
      gdprApplies: true,
      vendor: {
        consents: { '11': true },
        legitimateInterests: { '11': true }
      },
      purpose: {
        consents: { '10': true },
        legitimateInterests: { '10': false }
      },
      publisher: {
        restrictions: {
          '10': {
            '11': 1 // require consent for Quantcast
          }
        }
      }
    })).toBe(true);
  });

  it('returns false if no consent but legitimate interest for required purpose other than 1, but publisher requires consent', function() {
    expect(checkTCFv2({
      gdprApplies: true,
      vendor: {
        consents: { '11': false },
        legitimateInterests: { '11': true }
      },
      purpose: {
        consents: { '10': false },
        legitimateInterests: { '10': true }
      },
      publisher: {
        restrictions: {
          '10': {
            '11': 1 // require consent for Quantcast
          }
        }
      }
    })).toBe(false);
  });

  it('returns false if no consent and no legitimate interest for vendor for required purpose other than 1', function() {
    expect(checkTCFv2({
      gdprApplies: true,
      vendor: {
        consents: { '11': false },
        legitimateInterests: { '11': false }
      },
      purpose: {
        consents: { '10': false },
        legitimateInterests: { '10': true }
      }
    })).toBe(false);
  });
});
