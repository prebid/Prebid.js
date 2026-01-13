import { locIdSubmodule } from 'modules/locIdSystem.js';
import * as ajax from 'src/ajax.js';
import { uspDataHandler, gppDataHandler } from 'src/adapterManager.js';
import { expect } from 'chai/index.mjs';
import sinon from 'sinon';

const TEST_ID = 'SYybozbTuRaZkgGqCD7L7EE0FncoNUcx-om4xTfhJt36TFIAES2tF1qPH';
const TEST_ENDPOINT = 'https://id.example.com/locid';

describe('LocID System', () => {
  let sandbox;
  let ajaxStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(uspDataHandler, 'getConsentData').returns(null);
    sandbox.stub(gppDataHandler, 'getConsentData').returns(null);
    ajaxStub = sandbox.stub(ajax, 'ajax');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('module properties', () => {
    it('should expose correct module name', () => {
      expect(locIdSubmodule.name).to.equal('locid');
    });

    it('should have gvlid set to Digital Envoy IAB TCF vendor ID', () => {
      expect(locIdSubmodule.gvlid).to.equal(3384);
    });

    it('should have eids configuration with correct defaults', () => {
      expect(locIdSubmodule.eids).to.be.an('object');
      expect(locIdSubmodule.eids.locid).to.be.an('object');
      expect(locIdSubmodule.eids.locid.source).to.equal('locid.com');
      // atype 3384 = LocID vendor identifier for demand partner recognition
      expect(locIdSubmodule.eids.locid.atype).to.equal(3384);
    });

    it('should have getValue function that extracts ID', () => {
      const getValue = locIdSubmodule.eids.locid.getValue;
      expect(getValue('test-id')).to.equal('test-id');
      expect(getValue({ locid: 'test-id' })).to.equal('test-id');
    });
  });

  describe('decode', () => {
    it('should decode valid ID correctly', () => {
      const result = locIdSubmodule.decode(TEST_ID);
      expect(result).to.deep.equal({ locid: TEST_ID });
    });

    it('should decode ID passed as object', () => {
      const result = locIdSubmodule.decode({ id: TEST_ID });
      expect(result).to.deep.equal({ locid: TEST_ID });
    });

    it('should return undefined for invalid values', () => {
      [null, undefined, '', {}, [], 123].forEach(value => {
        expect(locIdSubmodule.decode(value)).to.be.undefined;
      });
    });

    it('should return undefined for IDs exceeding max length', () => {
      const longId = 'a'.repeat(513);
      expect(locIdSubmodule.decode(longId)).to.be.undefined;
    });
  });

  describe('getId', () => {
    it('should return callback for async endpoint fetch', () => {
      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };
      const result = locIdSubmodule.getId(config, {});
      expect(result).to.have.property('callback');
      expect(result.callback).to.be.a('function');
    });

    it('should call endpoint and return tx_cloc on success', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.equal(TEST_ID);
        expect(ajaxStub.calledOnce).to.be.true;
        done();
      });
    });

    it('should fallback to stable_cloc when tx_cloc is missing', (done) => {
      const stableId = 'stable-cloc-id-12345';
      ajaxStub.callsFake((url, callbacks, body, options) => {
        callbacks.success(JSON.stringify({ stable_cloc: stableId }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.equal(stableId);
        done();
      });
    });

    it('should prefer tx_cloc over stable_cloc when both present', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        callbacks.success(JSON.stringify({
          tx_cloc: TEST_ID,
          stable_cloc: 'stable-fallback'
        }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.equal(TEST_ID);
        done();
      });
    });

    it('should return undefined on endpoint error', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        callbacks.error('Network error');
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.be.undefined;
        done();
      });
    });

    it('should reuse storedId when valid', () => {
      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };
      const result = locIdSubmodule.getId(config, {}, 'existing-id');
      expect(result).to.deep.equal({ id: 'existing-id' });
      expect(ajaxStub.called).to.be.false;
    });

    it('should pass x-api-key header when apiKey is configured', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        expect(options.customHeaders).to.deep.equal({ 'x-api-key': 'test-api-key' });
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT,
          apiKey: 'test-api-key'
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => done());
    });

    it('should not include customHeaders when apiKey is not configured', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        expect(options.customHeaders).to.not.exist;
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => done());
    });

    it('should pass withCredentials when configured', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        expect(options.withCredentials).to.be.true;
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT,
          withCredentials: true
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => done());
    });

    it('should default withCredentials to false', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        expect(options.withCredentials).to.be.false;
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => done());
    });

    it('should use default timeout of 800ms when timeoutMs is not configured', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        expect(options.timeout).to.equal(800);
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => done());
    });

    it('should use custom timeout when timeoutMs is configured', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        expect(options.timeout).to.equal(1500);
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT,
          timeoutMs: 1500
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => done());
    });

    it('should always use GET method', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        expect(options.method).to.equal('GET');
        expect(body).to.be.null;
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => done());
    });

    it('should append alt_id query parameter when altId is configured', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        expect(url).to.equal(TEST_ENDPOINT + '?alt_id=user123');
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT,
          altId: 'user123'
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => done());
    });

    it('should use & separator when endpoint already has query params', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        expect(url).to.equal(TEST_ENDPOINT + '?existing=param&alt_id=user456');
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT + '?existing=param',
          altId: 'user456'
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => done());
    });

    it('should URL-encode altId value', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        expect(url).to.equal(TEST_ENDPOINT + '?alt_id=user%40example.com');
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT,
          altId: 'user@example.com'
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => done());
    });

    it('should not append alt_id when altId is not configured', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        expect(url).to.equal(TEST_ENDPOINT);
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => done());
    });

    it('should preserve URL fragment when appending alt_id', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        expect(url).to.equal('https://id.example.com/locid?alt_id=user123#frag');
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID }));
      });

      const config = {
        params: {
          endpoint: 'https://id.example.com/locid#frag',
          altId: 'user123'
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => done());
    });

    it('should preserve URL fragment when endpoint has existing query params', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        expect(url).to.equal('https://id.example.com/locid?x=1&alt_id=user456#frag');
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID }));
      });

      const config = {
        params: {
          endpoint: 'https://id.example.com/locid?x=1#frag',
          altId: 'user456'
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => done());
    });
  });

  describe('privacy framework handling', () => {
    const config = {
      params: {
        endpoint: TEST_ENDPOINT
      }
    };

    // --- Tests for no privacy signals (LI-based operation) ---
    // LocID operates under Legitimate Interest and should proceed when no
    // privacy framework is present, unless requirePrivacySignals is enabled.

    it('should proceed when no consentData provided at all (default LI-based operation)', () => {
      // When no privacy signals are present, module should proceed by default
      const result = locIdSubmodule.getId(config, undefined);
      expect(result).to.have.property('callback');
    });

    it('should proceed when consentData is null (default LI-based operation)', () => {
      const result = locIdSubmodule.getId(config, null);
      expect(result).to.have.property('callback');
    });

    it('should proceed when consentData is empty object (default LI-based operation)', () => {
      // Empty object has no privacy signals, so should proceed
      const result = locIdSubmodule.getId(config, {});
      expect(result).to.have.property('callback');
    });

    it('should return undefined when no consentData and requirePrivacySignals=true', () => {
      const strictConfig = {
        params: {
          endpoint: TEST_ENDPOINT,
          requirePrivacySignals: true
        }
      };
      const result = locIdSubmodule.getId(strictConfig, undefined);
      expect(result).to.be.undefined;
      expect(ajaxStub.called).to.be.false;
    });

    it('should return undefined when empty consentData and requirePrivacySignals=true', () => {
      const strictConfig = {
        params: {
          endpoint: TEST_ENDPOINT,
          requirePrivacySignals: true
        }
      };
      const result = locIdSubmodule.getId(strictConfig, {});
      expect(result).to.be.undefined;
      expect(ajaxStub.called).to.be.false;
    });

    it('should return undefined when no consentData and privacyMode=requireSignals', () => {
      const strictConfig = {
        params: {
          endpoint: TEST_ENDPOINT,
          privacyMode: 'requireSignals'
        }
      };
      const result = locIdSubmodule.getId(strictConfig, undefined);
      expect(result).to.be.undefined;
      expect(ajaxStub.called).to.be.false;
    });

    it('should proceed when no consentData and privacyMode=allowWithoutSignals', () => {
      const permissiveConfig = {
        params: {
          endpoint: TEST_ENDPOINT,
          privacyMode: 'allowWithoutSignals'
        }
      };
      const result = locIdSubmodule.getId(permissiveConfig, undefined);
      expect(result).to.have.property('callback');
    });

    it('should proceed with privacy signals present and requirePrivacySignals=true when vendor permission is available', () => {
      const strictConfig = {
        params: {
          endpoint: TEST_ENDPOINT,
          requirePrivacySignals: true
        }
      };
      const consentData = {
        gdprApplies: true,
        consentString: 'valid-consent-string',
        vendorData: {
          vendor: {
            consents: { 3384: true }
          }
        }
      };
      const result = locIdSubmodule.getId(strictConfig, consentData);
      expect(result).to.have.property('callback');
    });

    it('should detect privacy signals from uspDataHandler and block on processing restriction', () => {
      // Restore and re-stub to return USP processing restriction signal
      uspDataHandler.getConsentData.restore();
      sandbox.stub(uspDataHandler, 'getConsentData').returns('1YY-');

      // Even with empty consentData, handler provides privacy signal
      const result = locIdSubmodule.getId(config, {});
      expect(result).to.be.undefined;
      expect(ajaxStub.called).to.be.false;
    });

    it('should detect privacy signals from gppDataHandler and block on processing restriction', () => {
      // Restore and re-stub to return GPP processing restriction signal
      gppDataHandler.getConsentData.restore();
      sandbox.stub(gppDataHandler, 'getConsentData').returns({
        applicableSections: [7],
        parsedSections: {
          usnat: {
            KnownChildSensitiveDataConsents: [1]
          }
        }
      });

      // Even with empty consentData, handler provides privacy signal
      const result = locIdSubmodule.getId(config, {});
      expect(result).to.be.undefined;
      expect(ajaxStub.called).to.be.false;
    });

    it('should proceed when uspDataHandler returns non-restrictive value', () => {
      // Restore and re-stub to return non-restrictive USP
      uspDataHandler.getConsentData.restore();
      sandbox.stub(uspDataHandler, 'getConsentData').returns('1NN-');

      const result = locIdSubmodule.getId(config, {});
      expect(result).to.have.property('callback');
    });

    // --- Tests for gdprApplies edge cases (LI-based operation) ---
    // gdprApplies alone does NOT constitute a privacy signal.
    // A GDPR signal requires actual CMP artifacts (consentString or vendorData).

    it('should proceed when gdprApplies=true but no consentString/vendorData (default LI mode)', () => {
      // gdprApplies alone is not a signal - allows LI-based operation without CMP
      const consentData = {
        gdprApplies: true
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should proceed when gdprApplies=true with empty consentString (no CMP artifact)', () => {
      // Empty consentString is falsy, so it is treated as not present and does not count as a CMP artifact.
      const consentData = {
        gdprApplies: true,
        consentString: ''
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should return undefined when gdprApplies=true, no CMP artifacts, and strict mode', () => {
      const strictConfig = {
        params: {
          endpoint: TEST_ENDPOINT,
          requirePrivacySignals: true
        }
      };
      const consentData = {
        gdprApplies: true
      };
      const result = locIdSubmodule.getId(strictConfig, consentData);
      expect(result).to.be.undefined;
      expect(ajaxStub.called).to.be.false;
    });

    it('should return undefined when gdprApplies=true, vendorData present but no consentString', () => {
      // vendorData presence = CMP is present, so signals ARE present
      // GDPR applies + signals present + no consentString → deny
      const consentData = {
        gdprApplies: true,
        vendorData: {
          vendor: {
            consents: { 3384: true }
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.be.undefined;
      expect(ajaxStub.called).to.be.false;
    });

    it('should deny when gdprApplies=false and strict mode is enabled (gdprApplies alone is not a signal)', () => {
      // gdprApplies=false alone is not a signal, so strict mode blocks
      const strictConfig = {
        params: {
          endpoint: TEST_ENDPOINT,
          requirePrivacySignals: true
        }
      };
      const consentData = {
        gdprApplies: false
      };
      const result = locIdSubmodule.getId(strictConfig, consentData);
      // gdprApplies=false is not a signal, so strict mode denies
      expect(result).to.be.undefined;
      expect(ajaxStub.called).to.be.false;
    });

    // --- Original tests for when privacy signals ARE present ---

    it('should proceed with valid GDPR framework data', () => {
      const consentData = {
        gdprApplies: true,
        consentString: 'valid-consent-string'
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should proceed when GDPR does not apply (no CMP artifacts)', () => {
      // gdprApplies=false alone is not a signal - LI operation allowed
      const consentData = {
        gdprApplies: false
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should return undefined when GDPR applies with consentString and vendor denied', () => {
      // consentString present = CMP signal exists, GDPR enforcement applies
      const consentData = {
        gdprApplies: true,
        consentString: 'valid-consent-string',
        vendorData: {
          vendor: {
            consents: { 3384: false },
            legitimateInterests: { 3384: false }
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.be.undefined;
      expect(ajaxStub.called).to.be.false;
    });

    it('should return undefined on US Privacy processing restriction and not call ajax', () => {
      const consentData = {
        uspConsent: '1YY-'
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.be.undefined;
      expect(ajaxStub.called).to.be.false;
    });

    it('should return undefined on GPP processing restriction and not call ajax', () => {
      const consentData = {
        gppConsent: {
          applicableSections: [7],
          parsedSections: {
            usnat: {
              KnownChildSensitiveDataConsents: [1]
            }
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.be.undefined;
      expect(ajaxStub.called).to.be.false;
    });

    it('should proceed when nested GDPR applies but no CMP artifacts (LI operation)', () => {
      // Empty consentString in nested gdpr object is not a signal - LI operation allowed
      const consentData = {
        gdpr: {
          gdprApplies: true,
          consentString: ''
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should proceed with valid nested GDPR framework data', () => {
      const consentData = {
        gdpr: {
          gdprApplies: true,
          consentString: 'valid-consent-string'
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should return undefined when GDPR applies and vendor permission is denied', () => {
      const consentData = {
        gdprApplies: true,
        consentString: 'valid-consent-string',
        vendorData: {
          vendor: {
            consents: { 3384: false },
            legitimateInterests: { 3384: false }
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.be.undefined;
      expect(ajaxStub.called).to.be.false;
    });

    it('should return undefined when GDPR applies and vendor is missing from consents', () => {
      const consentData = {
        gdprApplies: true,
        consentString: 'valid-consent-string',
        vendorData: {
          vendor: {
            consents: { 1234: true },
            legitimateInterests: { 1234: true }
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.be.undefined;
      expect(ajaxStub.called).to.be.false;
    });

    it('should proceed when GDPR applies and vendor permission is granted', () => {
      const consentData = {
        gdprApplies: true,
        consentString: 'valid-consent-string',
        vendorData: {
          vendor: {
            consents: { 3384: true }
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should proceed when GDPR applies and vendor legitimate interest is granted', () => {
      const consentData = {
        gdprApplies: true,
        consentString: 'valid-consent-string',
        vendorData: {
          vendor: {
            consents: { 3384: false },
            legitimateInterests: { 3384: true }
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should proceed when vendorData is not available (cannot determine vendor permission)', () => {
      const consentData = {
        gdprApplies: true,
        consentString: 'valid-consent-string'
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should check nested vendorData when using gdpr object shape', () => {
      const consentData = {
        gdpr: {
          gdprApplies: true,
          consentString: 'valid-consent-string',
          vendorData: {
            vendor: {
              consents: { 3384: true }
            }
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should deny when nested vendorData lacks vendor permission', () => {
      const consentData = {
        gdpr: {
          gdprApplies: true,
          consentString: 'valid-consent-string',
          vendorData: {
            vendor: {
              consents: { 3384: false },
              legitimateInterests: {}
            }
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.be.undefined;
      expect(ajaxStub.called).to.be.false;
    });

    it('should proceed when vendor consents is a function returning true for gvlid', () => {
      const consentData = {
        gdprApplies: true,
        consentString: 'valid-consent-string',
        vendorData: {
          vendor: {
            consents: (id) => id === 3384,
            legitimateInterests: {}
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should proceed when vendor legitimateInterests is a function returning true for gvlid', () => {
      const consentData = {
        gdprApplies: true,
        consentString: 'valid-consent-string',
        vendorData: {
          vendor: {
            consents: (id) => false,
            legitimateInterests: (id) => id === 3384
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should deny when vendor consents and legitimateInterests are functions returning false and not call ajax', () => {
      const consentData = {
        gdprApplies: true,
        consentString: 'valid-consent-string',
        vendorData: {
          vendor: {
            consents: (id) => false,
            legitimateInterests: (id) => false
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.be.undefined;
      expect(ajaxStub.called).to.be.false;
    });
  });

  describe('response parsing', () => {
    it('should parse JSON string response', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        callbacks.success('{"tx_cloc":"parsed-id"}');
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.equal('parsed-id');
        done();
      });
    });

    it('should return undefined for invalid JSON', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        callbacks.success('not valid json');
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.be.undefined;
        done();
      });
    });

    it('should reject empty ID in response', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        callbacks.success(JSON.stringify({ tx_cloc: '' }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.be.undefined;
        done();
      });
    });

    it('should return undefined when neither tx_cloc nor stable_cloc present', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        callbacks.success(JSON.stringify({ other_field: 'value' }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.be.undefined;
        done();
      });
    });
  });
});
