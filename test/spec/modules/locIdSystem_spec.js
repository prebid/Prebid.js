/**
 * This file is licensed under the Apache 2.0 license.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { locIdSubmodule, storage } from 'modules/locIdSystem.js';
import { createEidsArray } from 'modules/userId/eids.js';
import { attachIdSystem } from 'modules/userId/index.js';
import * as ajax from 'src/ajax.js';
import { VENDORLESS_GVLID } from 'src/consentHandler.js';
import { uspDataHandler, gppDataHandler } from 'src/adapterManager.js';
import { expect } from 'chai/index.mjs';
import sinon from 'sinon';

const TEST_ID = 'SYybozbTuRaZkgGqCD7L7EE0FncoNUcx-om4xTfhJt36TFIAES2tF1qPH';
const TEST_ENDPOINT = 'https://id.example.com/locid';
const TEST_CONNECTION_IP = '203.0.113.42';

describe('LocID System', () => {
  let sandbox;
  let ajaxStub;
  let ajaxBuilderStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(uspDataHandler, 'getConsentData').returns(null);
    sandbox.stub(gppDataHandler, 'getConsentData').returns(null);
    sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
    sandbox.stub(storage, 'setDataInLocalStorage');
    ajaxStub = sandbox.stub();
    ajaxBuilderStub = sandbox.stub(ajax, 'ajaxBuilder').returns(ajaxStub);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('module properties', () => {
    it('should expose correct module name', () => {
      expect(locIdSubmodule.name).to.equal('locId');
    });

    it('should have eids configuration with correct defaults', () => {
      expect(locIdSubmodule.eids).to.be.an('object');
      expect(locIdSubmodule.eids.locId).to.be.an('object');
      expect(locIdSubmodule.eids.locId.source).to.equal('locid.com');
      // atype 1 = AdCOM AgentTypeWeb
      expect(locIdSubmodule.eids.locId.atype).to.equal(1);
    });

    it('should register as a vendorless TCF module', () => {
      expect(locIdSubmodule.gvlid).to.equal(VENDORLESS_GVLID);
    });

    it('should have getValue function that extracts ID', () => {
      const getValue = locIdSubmodule.eids.locId.getValue;
      expect(getValue('test-id')).to.equal('test-id');
      expect(getValue({ id: 'id-shape' })).to.equal('id-shape');
      expect(getValue({ locId: 'test-id' })).to.equal('test-id');
      expect(getValue({ locid: 'legacy-id' })).to.equal('legacy-id');
    });
  });

  describe('decode', () => {
    it('should decode valid ID correctly', () => {
      const result = locIdSubmodule.decode({ id: TEST_ID, connectionIp: TEST_CONNECTION_IP });
      expect(result).to.deep.equal({ locId: TEST_ID });
    });

    it('should decode ID passed as object', () => {
      const result = locIdSubmodule.decode({ id: TEST_ID, connectionIp: TEST_CONNECTION_IP });
      expect(result).to.deep.equal({ locId: TEST_ID });
    });

    it('should return undefined for invalid values', () => {
      [null, undefined, '', {}, [], 123, TEST_ID].forEach(value => {
        expect(locIdSubmodule.decode(value)).to.be.undefined;
      });
    });

    it('should return undefined when connection_ip is missing', () => {
      expect(locIdSubmodule.decode({ id: TEST_ID })).to.be.undefined;
    });

    it('should return undefined for IDs exceeding max length', () => {
      const longId = 'a'.repeat(513);
      expect(locIdSubmodule.decode({ id: longId, connectionIp: TEST_CONNECTION_IP })).to.be.undefined;
    });

    it('should accept ID at exactly MAX_ID_LENGTH (512 characters)', () => {
      const maxLengthId = 'a'.repeat(512);
      const result = locIdSubmodule.decode({ id: maxLengthId, connectionIp: TEST_CONNECTION_IP });
      expect(result).to.deep.equal({ locId: maxLengthId });
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
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.be.an('object');
        expect(id.id).to.equal(TEST_ID);
        expect(id.connectionIp).to.equal(TEST_CONNECTION_IP);
        expect(ajaxStub.calledOnce).to.be.true;
        done();
      });
    });

    it('should cache entry with null id when tx_cloc is missing but connection_ip is present', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        callbacks.success(JSON.stringify({ stable_cloc: 'stable-cloc-id-12345', connection_ip: TEST_CONNECTION_IP }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.be.an('object');
        expect(id.id).to.be.null;
        expect(id.connectionIp).to.equal(TEST_CONNECTION_IP);
        done();
      });
    });

    it('should prefer tx_cloc over stable_cloc when both present', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        callbacks.success(JSON.stringify({
          tx_cloc: TEST_ID,
          stable_cloc: 'stable-fallback',
          connection_ip: TEST_CONNECTION_IP
        }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.be.an('object');
        expect(id.id).to.equal(TEST_ID);
        expect(id.connectionIp).to.equal(TEST_CONNECTION_IP);
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

    it('should reuse storedId when valid and IP cache matches', () => {
      // Set up IP cache matching stored entry's IP
      storage.getDataFromLocalStorage.returns(JSON.stringify({
        ip: TEST_CONNECTION_IP,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 1000
      }));

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        },
        storage: {
          name: '_locid'
        }
      };
      const storedId = {
        id: 'existing-id',
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        expiresAt: Date.now() + 1000
      };
      const result = locIdSubmodule.getId(config, {}, storedId);
      expect(result).to.deep.equal({ id: storedId });
      expect(ajaxStub.called).to.be.false;
    });

    it('should not reuse storedId when expired', () => {
      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };
      const storedId = {
        id: 'expired-id',
        connectionIp: TEST_CONNECTION_IP,
        createdAt: 1000,
        updatedAt: 1000,
        expiresAt: Date.now() - 1000
      };
      const result = locIdSubmodule.getId(config, {}, storedId);
      expect(result).to.have.property('callback');
    });

    it('should not reuse storedId when connectionIp is missing', () => {
      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };
      const storedId = {
        id: 'existing-id',
        createdAt: 1000,
        updatedAt: 1000,
        expiresAt: 2000
      };
      const result = locIdSubmodule.getId(config, {}, storedId);
      expect(result).to.have.property('callback');
    });

    it('should pass x-api-key header when apiKey is configured', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        expect(options.customHeaders).to.deep.equal({ 'x-api-key': 'test-api-key' });
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
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
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
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
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
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
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
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
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => {
        expect(ajaxBuilderStub.calledWith(800)).to.be.true;
        done();
      });
    });

    it('should use custom timeout when timeoutMs is configured', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT,
          timeoutMs: 1500
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => {
        expect(ajaxBuilderStub.calledWith(1500)).to.be.true;
        done();
      });
    });

    it('should always use GET method', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        expect(options.method).to.equal('GET');
        expect(body).to.be.null;
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
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
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
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
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
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
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
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
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
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
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
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
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
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

    it('should return undefined via callback when endpoint is empty string', (done) => {
      const config = {
        params: {
          endpoint: ''
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.be.undefined;
        expect(ajaxStub.called).to.be.false;
        done();
      });
    });
  });

  describe('extendId', () => {
    const config = {
      params: {
        endpoint: TEST_ENDPOINT
      }
    };

    it('should return stored id when valid and IP cache is current', () => {
      storage.getDataFromLocalStorage.returns(JSON.stringify({
        ip: TEST_CONNECTION_IP,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 14400000
      }));
      const storedId = { id: 'existing-id', connectionIp: TEST_CONNECTION_IP };
      const result = locIdSubmodule.extendId(config, {}, storedId);
      expect(result).to.deep.equal({ id: storedId });
    });

    it('should reuse storedId when refreshInSeconds is configured but not due', () => {
      const now = Date.now();
      const refreshInSeconds = 60;
      storage.getDataFromLocalStorage.returns(JSON.stringify({
        ip: TEST_CONNECTION_IP,
        fetchedAt: now,
        expiresAt: now + 14400000
      }));
      const storedId = {
        id: 'existing-id',
        connectionIp: TEST_CONNECTION_IP,
        createdAt: now - ((refreshInSeconds - 10) * 1000),
        expiresAt: now + 10000
      };
      const refreshConfig = {
        params: {
          endpoint: TEST_ENDPOINT
        },
        storage: {
          refreshInSeconds
        }
      };
      const result = locIdSubmodule.extendId(refreshConfig, {}, storedId);
      expect(result).to.deep.equal({ id: storedId });
    });

    it('should return undefined when refreshInSeconds is due', () => {
      const now = Date.now();
      const refreshInSeconds = 60;
      const storedId = {
        id: 'existing-id',
        connectionIp: TEST_CONNECTION_IP,
        createdAt: now - ((refreshInSeconds + 10) * 1000),
        expiresAt: now + 10000
      };
      const refreshConfig = {
        params: {
          endpoint: TEST_ENDPOINT
        },
        storage: {
          refreshInSeconds
        }
      };
      const result = locIdSubmodule.extendId(refreshConfig, {}, storedId);
      expect(result).to.be.undefined;
    });

    it('should return undefined when refreshInSeconds is configured and createdAt is missing', () => {
      const now = Date.now();
      const refreshInSeconds = 60;
      const storedId = {
        id: 'existing-id',
        connectionIp: TEST_CONNECTION_IP,
        expiresAt: now + 10000
      };
      const refreshConfig = {
        params: {
          endpoint: TEST_ENDPOINT
        },
        storage: {
          refreshInSeconds
        }
      };
      const result = locIdSubmodule.extendId(refreshConfig, {}, storedId);
      expect(result).to.be.undefined;
    });

    it('should return undefined when storedId is a string', () => {
      const result = locIdSubmodule.extendId(config, {}, 'existing-id');
      expect(result).to.be.undefined;
    });

    it('should return undefined when connectionIp is missing', () => {
      const result = locIdSubmodule.extendId(config, {}, { id: 'existing-id' });
      expect(result).to.be.undefined;
    });

    it('should return undefined when stored entry is expired', () => {
      const storedId = {
        id: 'existing-id',
        connectionIp: TEST_CONNECTION_IP,
        expiresAt: Date.now() - 1000
      };
      const result = locIdSubmodule.extendId(config, {}, storedId);
      expect(result).to.be.undefined;
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

    it('should proceed with privacy signals present and requirePrivacySignals=true', () => {
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
          vendor: {}
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

    it('should proceed when gdprApplies=true and usp is present but no GDPR CMP artifacts', () => {
      const consentData = {
        gdprApplies: true,
        usp: '1NN-'
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should proceed when gdprApplies=true and consentString is empty (treated as absent CMP artifact)', () => {
      // Empty consentString is treated as not present, so LI-mode behavior applies.
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
          vendor: {}
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

    it('should proceed when GDPR applies with consentString and vendor flags deny', () => {
      const consentData = {
        gdprApplies: true,
        consentString: 'valid-consent-string',
        vendorData: {
          vendor: {
            consents: { 999: false },
            legitimateInterests: { 999: false }
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should return undefined on US Privacy processing restriction and not call ajax', () => {
      const consentData = {
        usp: '1YY-'
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.be.undefined;
      expect(ajaxStub.called).to.be.false;
    });

    it('should return undefined on legacy US Privacy processing restriction and not call ajax', () => {
      const consentData = {
        uspConsent: '1YY-'
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.be.undefined;
      expect(ajaxStub.called).to.be.false;
    });

    it('should return undefined on GPP processing restriction and not call ajax', () => {
      const consentData = {
        gpp: {
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

    it('should return undefined on legacy GPP processing restriction and not call ajax', () => {
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

    it('should proceed when GDPR applies and vendorData is present', () => {
      const consentData = {
        gdprApplies: true,
        consentString: 'valid-consent-string',
        vendorData: {
          vendor: {
            consents: { 999: false },
            legitimateInterests: { 999: false }
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should proceed when GDPR applies and vendor is missing from consents', () => {
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
      expect(result).to.have.property('callback');
    });

    it('should proceed when GDPR applies and vendor consents object is present', () => {
      const consentData = {
        gdprApplies: true,
        consentString: 'valid-consent-string',
        vendorData: {
          vendor: {
            consents: { 999: true }
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should proceed when GDPR applies and vendor legitimate interests object is present', () => {
      const consentData = {
        gdprApplies: true,
        consentString: 'valid-consent-string',
        vendorData: {
          vendor: {
            consents: { 999: false },
            legitimateInterests: { 999: true }
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
              consents: { 999: true }
            }
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should proceed when nested vendorData has explicit deny flags', () => {
      const consentData = {
        gdpr: {
          gdprApplies: true,
          consentString: 'valid-consent-string',
          vendorData: {
            vendor: {
              consents: { 999: false },
              legitimateInterests: {}
            }
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should proceed when vendor consents is a function returning true', () => {
      const consentData = {
        gdprApplies: true,
        consentString: 'valid-consent-string',
        vendorData: {
          vendor: {
            consents: (id) => id === 999,
            legitimateInterests: {}
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should proceed when vendor legitimateInterests is a function returning true', () => {
      const consentData = {
        gdprApplies: true,
        consentString: 'valid-consent-string',
        vendorData: {
          vendor: {
            consents: (id) => false,
            legitimateInterests: (id) => id === 999
          }
        }
      };
      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.have.property('callback');
    });

    it('should proceed when vendor consent callbacks both return false', () => {
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
      expect(result).to.have.property('callback');
    });
  });

  describe('response parsing', () => {
    it('should parse JSON string response', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        callbacks.success('{"tx_cloc":"parsed-id","connection_ip":"203.0.113.42"}');
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.be.an('object');
        expect(id.id).to.equal('parsed-id');
        expect(id.connectionIp).to.equal('203.0.113.42');
        done();
      });
    });

    it('should return undefined when connection_ip is missing', (done) => {
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
        expect(id).to.be.undefined;
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

    it('should cache entry with null id when tx_cloc is empty string', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        callbacks.success(JSON.stringify({ tx_cloc: '', connection_ip: TEST_CONNECTION_IP }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.be.an('object');
        expect(id.id).to.be.null;
        expect(id.connectionIp).to.equal(TEST_CONNECTION_IP);
        done();
      });
    });

    it('should cache entry with null id when tx_cloc is whitespace-only', (done) => {
      ajaxStub.callsFake((url, callbacks, body, options) => {
        callbacks.success(JSON.stringify({ tx_cloc: '   \n\t  ', connection_ip: TEST_CONNECTION_IP }));
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT
        }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.be.an('object');
        expect(id.id).to.be.null;
        expect(id.connectionIp).to.equal(TEST_CONNECTION_IP);
        done();
      });
    });

    it('should return undefined when tx_cloc is missing', (done) => {
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

  describe('empty tx_cloc handling', () => {
    it('should decode null id as undefined (no EID emitted)', () => {
      const result = locIdSubmodule.decode({ id: null, connectionIp: TEST_CONNECTION_IP });
      expect(result).to.be.undefined;
    });

    it('should cache empty tx_cloc response for the full cache period', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        callbacks.success(JSON.stringify({ connection_ip: TEST_CONNECTION_IP }));
      });

      const config = {
        params: { endpoint: TEST_ENDPOINT },
        storage: { expires: 7 }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.be.an('object');
        expect(id.id).to.be.null;
        expect(id.connectionIp).to.equal(TEST_CONNECTION_IP);
        expect(id.expiresAt).to.be.a('number');
        expect(id.expiresAt).to.be.greaterThan(Date.now());
        done();
      });
    });

    it('should reuse cached entry with null id on subsequent getId calls', () => {
      storage.getDataFromLocalStorage.returns(JSON.stringify({
        ip: TEST_CONNECTION_IP,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 1000
      }));

      const config = {
        params: { endpoint: TEST_ENDPOINT },
        storage: { name: '_locid' }
      };
      const storedId = {
        id: null,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };

      const result = locIdSubmodule.getId(config, {}, storedId);
      expect(result).to.deep.equal({ id: storedId });
      expect(ajaxStub.called).to.be.false;
    });

    it('should not produce EID when tx_cloc is null', () => {
      const decoded = locIdSubmodule.decode({ id: null, connectionIp: TEST_CONNECTION_IP });
      expect(decoded).to.be.undefined;
    });

    it('should write IP cache when endpoint returns empty tx_cloc', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        callbacks.success(JSON.stringify({ connection_ip: TEST_CONNECTION_IP }));
      });

      const config = {
        params: { endpoint: TEST_ENDPOINT },
        storage: { name: '_locid' }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => {
        expect(storage.setDataInLocalStorage.called).to.be.true;
        const callArgs = storage.setDataInLocalStorage.getCall(0).args;
        expect(callArgs[0]).to.equal('_locid_ip');
        const ipEntry = JSON.parse(callArgs[1]);
        expect(ipEntry.ip).to.equal(TEST_CONNECTION_IP);
        done();
      });
    });
  });

  describe('IP cache management', () => {
    const ipCacheConfig = {
      params: { endpoint: TEST_ENDPOINT },
      storage: { name: '_locid' }
    };

    it('should read valid IP cache entry', () => {
      storage.getDataFromLocalStorage.returns(JSON.stringify({
        ip: TEST_CONNECTION_IP,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 1000
      }));

      // If IP cache is valid and stored entry matches, should reuse
      const storedId = {
        id: TEST_ID,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };
      const result = locIdSubmodule.getId(ipCacheConfig, {}, storedId);
      expect(result).to.deep.equal({ id: storedId });
      expect(ajaxStub.called).to.be.false;
    });

    it('should treat expired IP cache as missing', (done) => {
      storage.getDataFromLocalStorage.returns(JSON.stringify({
        ip: TEST_CONNECTION_IP,
        fetchedAt: Date.now() - 20000,
        expiresAt: Date.now() - 1000
      }));

      ajaxStub.callsFake((url, callbacks) => {
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
      });

      const storedId = {
        id: TEST_ID,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };
      const result = locIdSubmodule.getId(ipCacheConfig, {}, storedId);
      // Expired IP cache → calls main endpoint
      expect(result).to.have.property('callback');
      result.callback((id) => {
        expect(id).to.be.an('object');
        done();
      });
    });

    it('should handle corrupted IP cache JSON gracefully', (done) => {
      storage.getDataFromLocalStorage.returns('not-valid-json');

      ajaxStub.callsFake((url, callbacks) => {
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
      });

      const result = locIdSubmodule.getId(ipCacheConfig, {});
      expect(result).to.have.property('callback');
      result.callback((id) => {
        expect(id).to.be.an('object');
        expect(id.id).to.equal(TEST_ID);
        done();
      });
    });

    it('should derive IP cache key from storage name', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
      });

      const config = {
        params: { endpoint: TEST_ENDPOINT },
        storage: { name: 'custom_key' }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => {
        const setCall = storage.setDataInLocalStorage.getCall(0);
        expect(setCall.args[0]).to.equal('custom_key_ip');
        done();
      });
    });

    it('should use custom ipCacheName when configured', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
      });

      const config = {
        params: { endpoint: TEST_ENDPOINT, ipCacheName: 'my_ip_cache' },
        storage: { name: '_locid' }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => {
        const setCall = storage.setDataInLocalStorage.getCall(0);
        expect(setCall.args[0]).to.equal('my_ip_cache');
        done();
      });
    });

    it('should use custom ipCacheTtlMs when configured', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
      });

      const config = {
        params: { endpoint: TEST_ENDPOINT, ipCacheTtlMs: 7200000 },
        storage: { name: '_locid' }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback(() => {
        const setCall = storage.setDataInLocalStorage.getCall(0);
        const ipEntry = JSON.parse(setCall.args[1]);
        // TTL should be ~2 hours
        const ttl = ipEntry.expiresAt - ipEntry.fetchedAt;
        expect(ttl).to.equal(7200000);
        done();
      });
    });

    it('should write IP cache on every successful main endpoint response', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: '10.0.0.1' }));
      });

      const result = locIdSubmodule.getId(ipCacheConfig, {});
      result.callback(() => {
        expect(storage.setDataInLocalStorage.called).to.be.true;
        const ipEntry = JSON.parse(storage.setDataInLocalStorage.getCall(0).args[1]);
        expect(ipEntry.ip).to.equal('10.0.0.1');
        done();
      });
    });
  });

  describe('getId with ipEndpoint (two-call optimization)', () => {
    it('should call ipEndpoint first when IP cache is expired', (done) => {
      let callCount = 0;
      ajaxStub.callsFake((url, callbacks) => {
        callCount++;
        if (url === 'https://ip.example.com/check') {
          callbacks.success(JSON.stringify({ ip: '10.0.0.1' }));
        } else {
          callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: '10.0.0.1' }));
        }
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT,
          ipEndpoint: 'https://ip.example.com/check'
        },
        storage: { name: '_locid' }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        // IP changed (no stored entry) → 2 calls: ipEndpoint + main endpoint
        expect(callCount).to.equal(2);
        expect(id.id).to.equal(TEST_ID);
        done();
      });
    });

    it('should reuse cached tx_cloc when ipEndpoint returns same IP', (done) => {
      let callCount = 0;
      ajaxStub.callsFake((url, callbacks) => {
        callCount++;
        if (url === 'https://ip.example.com/check') {
          callbacks.success(JSON.stringify({ ip: TEST_CONNECTION_IP }));
        } else {
          callbacks.success(JSON.stringify({ tx_cloc: 'new-id', connection_ip: TEST_CONNECTION_IP }));
        }
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT,
          ipEndpoint: 'https://ip.example.com/check'
        },
        storage: { name: '_locid' }
      };
      const storedId = {
        id: TEST_ID,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };

      const result = locIdSubmodule.getId(config, {}, storedId);
      result.callback((id) => {
        // IP unchanged → only 1 call (ipEndpoint), reuses stored tx_cloc
        expect(callCount).to.equal(1);
        expect(id.id).to.equal(TEST_ID);
        done();
      });
    });

    it('should call main endpoint when ipEndpoint returns different IP', (done) => {
      let callCount = 0;
      ajaxStub.callsFake((url, callbacks) => {
        callCount++;
        if (url === 'https://ip.example.com/check') {
          callbacks.success(JSON.stringify({ ip: '10.0.0.99' }));
        } else {
          callbacks.success(JSON.stringify({ tx_cloc: 'new-id', connection_ip: '10.0.0.99' }));
        }
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT,
          ipEndpoint: 'https://ip.example.com/check'
        },
        storage: { name: '_locid' }
      };
      const storedId = {
        id: TEST_ID,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };

      const result = locIdSubmodule.getId(config, {}, storedId);
      result.callback((id) => {
        // IP changed → 2 calls: ipEndpoint + main endpoint
        expect(callCount).to.equal(2);
        expect(id.id).to.equal('new-id');
        done();
      });
    });

    it('should fall back to main endpoint when ipEndpoint fails', (done) => {
      let callCount = 0;
      ajaxStub.callsFake((url, callbacks) => {
        callCount++;
        if (url === 'https://ip.example.com/check') {
          callbacks.error('Network error');
        } else {
          callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
        }
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT,
          ipEndpoint: 'https://ip.example.com/check'
        },
        storage: { name: '_locid' }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(callCount).to.equal(2);
        expect(id.id).to.equal(TEST_ID);
        done();
      });
    });

    it('should fall back to main endpoint when ipEndpoint returns invalid IP', (done) => {
      let callCount = 0;
      ajaxStub.callsFake((url, callbacks) => {
        callCount++;
        if (url === 'https://ip.example.com/check') {
          callbacks.success('not-an-ip!!!');
        } else {
          callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
        }
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT,
          ipEndpoint: 'https://ip.example.com/check'
        },
        storage: { name: '_locid' }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(callCount).to.equal(2);
        expect(id.id).to.equal(TEST_ID);
        done();
      });
    });

    it('should pass apiKey header to ipEndpoint when configured', (done) => {
      ajaxStub.callsFake((url, callbacks, _body, options) => {
        if (url === 'https://ip.example.com/check') {
          expect(options.customHeaders).to.deep.equal({ 'x-api-key': 'test-key-123' });
          callbacks.success(JSON.stringify({ ip: TEST_CONNECTION_IP }));
        } else {
          callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
        }
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT,
          ipEndpoint: 'https://ip.example.com/check',
          apiKey: 'test-key-123'
        },
        storage: { name: '_locid' }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.be.an('object');
        done();
      });
    });

    it('should parse plain text IP from ipEndpoint', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        if (url === 'https://ip.example.com/check') {
          callbacks.success(TEST_CONNECTION_IP);
        } else {
          callbacks.success(JSON.stringify({ tx_cloc: 'new-id', connection_ip: TEST_CONNECTION_IP }));
        }
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT,
          ipEndpoint: 'https://ip.example.com/check'
        },
        storage: { name: '_locid' }
      };
      const storedId = {
        id: TEST_ID,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };

      const result = locIdSubmodule.getId(config, {}, storedId);
      result.callback((id) => {
        // IP same → reuses stored tx_cloc
        expect(id.id).to.equal(TEST_ID);
        done();
      });
    });
  });

  describe('getId tx_cloc preservation (no churn)', () => {
    it('should preserve existing tx_cloc when main endpoint returns same IP', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        callbacks.success(JSON.stringify({ tx_cloc: 'fresh-id', connection_ip: TEST_CONNECTION_IP }));
      });

      const config = {
        params: { endpoint: TEST_ENDPOINT },
        storage: { name: '_locid' }
      };
      const storedId = {
        id: TEST_ID,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };

      const result = locIdSubmodule.getId(config, {}, storedId);
      result.callback((id) => {
        // IP unchanged → preserve existing tx_cloc (don't churn)
        expect(id.id).to.equal(TEST_ID);
        expect(id.connectionIp).to.equal(TEST_CONNECTION_IP);
        done();
      });
    });

    it('should use fresh non-null tx_cloc when stored entry is null for same IP', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        callbacks.success(JSON.stringify({ tx_cloc: 'fresh-id', connection_ip: TEST_CONNECTION_IP }));
      });

      const config = {
        params: { endpoint: TEST_ENDPOINT },
        storage: { name: '_locid' }
      };
      const storedId = {
        id: null,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };

      const result = locIdSubmodule.getId(config, {}, storedId);
      result.callback((id) => {
        expect(id.id).to.equal('fresh-id');
        expect(id.connectionIp).to.equal(TEST_CONNECTION_IP);
        done();
      });
    });

    it('should use fresh tx_cloc when main endpoint returns different IP', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        callbacks.success(JSON.stringify({ tx_cloc: 'fresh-id', connection_ip: '10.0.0.99' }));
      });

      const config = {
        params: { endpoint: TEST_ENDPOINT },
        storage: { name: '_locid' }
      };
      const storedId = {
        id: TEST_ID,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };

      const result = locIdSubmodule.getId(config, {}, storedId);
      result.callback((id) => {
        // IP changed → use fresh tx_cloc
        expect(id.id).to.equal('fresh-id');
        expect(id.connectionIp).to.equal('10.0.0.99');
        done();
      });
    });

    it('should use fresh tx_cloc when stored entry is expired even if IP matches', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        callbacks.success(JSON.stringify({ tx_cloc: 'fresh-id', connection_ip: TEST_CONNECTION_IP }));
      });

      const config = {
        params: { endpoint: TEST_ENDPOINT },
        storage: { name: '_locid' }
      };
      const storedId = {
        id: TEST_ID,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now() - 86400000,
        expiresAt: Date.now() - 1000
      };

      const result = locIdSubmodule.getId(config, {}, storedId);
      result.callback((id) => {
        // tx_cloc expired → use fresh even though IP matches
        expect(id.id).to.equal('fresh-id');
        done();
      });
    });

    it('should honor null tx_cloc from main endpoint even when stored entry is reusable', (done) => {
      // Server returns connection_ip but no tx_cloc → freshEntry.id === null.
      // The stored entry has a valid tx_cloc for the same IP, but the server
      // now indicates no ID for this IP. The null response must be honored.
      ajaxStub.callsFake((url, callbacks) => {
        callbacks.success(JSON.stringify({ connection_ip: TEST_CONNECTION_IP }));
      });

      const config = {
        params: { endpoint: TEST_ENDPOINT },
        storage: { name: '_locid' }
      };
      const storedId = {
        id: TEST_ID,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };

      const result = locIdSubmodule.getId(config, {}, storedId);
      result.callback((id) => {
        // Server said no tx_cloc → stored entry must NOT be preserved
        expect(id.id).to.be.null;
        expect(id.connectionIp).to.equal(TEST_CONNECTION_IP);
        done();
      });
    });

    it('should use fresh entry on first load (no stored entry)', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: TEST_CONNECTION_IP }));
      });

      const config = {
        params: { endpoint: TEST_ENDPOINT },
        storage: { name: '_locid' }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id.id).to.equal(TEST_ID);
        expect(id.connectionIp).to.equal(TEST_CONNECTION_IP);
        done();
      });
    });
  });

  describe('extendId with null id and IP cache', () => {
    const config = {
      params: { endpoint: TEST_ENDPOINT },
      storage: { name: '_locid' }
    };

    it('should accept stored entry with null id (empty tx_cloc)', () => {
      storage.getDataFromLocalStorage.returns(JSON.stringify({
        ip: TEST_CONNECTION_IP,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 14400000
      }));
      const storedId = {
        id: null,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };
      const result = locIdSubmodule.extendId(config, {}, storedId);
      expect(result).to.deep.equal({ id: storedId });
    });

    it('should return refresh callback when IP cache shows different IP', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        callbacks.success(JSON.stringify({ tx_cloc: 'fresh-id', connection_ip: '10.0.0.99' }));
      });
      storage.getDataFromLocalStorage.returns(JSON.stringify({
        ip: '10.0.0.99',
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 1000
      }));

      const storedId = {
        id: TEST_ID,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };
      const result = locIdSubmodule.extendId(config, {}, storedId);
      expect(result).to.have.property('callback');
      result.callback((id) => {
        expect(id.id).to.equal('fresh-id');
        expect(id.connectionIp).to.equal('10.0.0.99');
        done();
      });
    });

    it('should extend when IP cache matches stored entry IP', () => {
      storage.getDataFromLocalStorage.returns(JSON.stringify({
        ip: TEST_CONNECTION_IP,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 1000
      }));

      const storedId = {
        id: TEST_ID,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };
      const result = locIdSubmodule.extendId(config, {}, storedId);
      expect(result).to.deep.equal({ id: storedId });
    });

    it('should return refresh callback when IP cache is missing', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        callbacks.success(JSON.stringify({ tx_cloc: 'fresh-id', connection_ip: TEST_CONNECTION_IP }));
      });
      const storedId = {
        id: TEST_ID,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };
      const result = locIdSubmodule.extendId(config, {}, storedId);
      expect(result).to.have.property('callback');
      result.callback((id) => {
        expect(id.id).to.equal('fresh-id');
        expect(id.connectionIp).to.equal(TEST_CONNECTION_IP);
        done();
      });
    });

    it('should return refresh callback when IP cache is expired', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        callbacks.success(JSON.stringify({ tx_cloc: 'fresh-id', connection_ip: TEST_CONNECTION_IP }));
      });
      storage.getDataFromLocalStorage.returns(JSON.stringify({
        ip: TEST_CONNECTION_IP,
        fetchedAt: Date.now() - 14400000,
        expiresAt: Date.now() - 1000
      }));
      const storedId = {
        id: TEST_ID,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };
      const result = locIdSubmodule.extendId(config, {}, storedId);
      expect(result).to.have.property('callback');
      result.callback((id) => {
        expect(id.id).to.equal('fresh-id');
        expect(id.connectionIp).to.equal(TEST_CONNECTION_IP);
        done();
      });
    });

    it('should return undefined for undefined id (not null, not valid string)', () => {
      const storedId = {
        id: undefined,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };
      const result = locIdSubmodule.extendId(config, {}, storedId);
      expect(result).to.be.undefined;
    });
  });

  describe('normalizeStoredId with null id', () => {
    it('should preserve explicit null id', () => {
      // getId is the public interface; test via decode which uses normalized values
      const stored = { id: null, connectionIp: TEST_CONNECTION_IP };
      // decode returns undefined for null id (correct: no EID emitted)
      const decoded = locIdSubmodule.decode(stored);
      expect(decoded).to.be.undefined;
    });

    it('should preserve valid string id', () => {
      const stored = { id: TEST_ID, connectionIp: TEST_CONNECTION_IP };
      const decoded = locIdSubmodule.decode(stored);
      expect(decoded).to.deep.equal({ locId: TEST_ID });
    });

    it('should fall back to tx_cloc when id key is absent', () => {
      const stored = { tx_cloc: TEST_ID, connectionIp: TEST_CONNECTION_IP };
      const decoded = locIdSubmodule.decode(stored);
      expect(decoded).to.deep.equal({ locId: TEST_ID });
    });

    it('should handle connection_ip alias', () => {
      const stored = { id: TEST_ID, connection_ip: TEST_CONNECTION_IP };
      const decoded = locIdSubmodule.decode(stored);
      expect(decoded).to.deep.equal({ locId: TEST_ID });
    });
  });

  describe('parseIpResponse via ipEndpoint', () => {
    it('should parse JSON with ip field', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        if (url === 'https://ip.example.com/check') {
          callbacks.success('{"ip":"1.2.3.4"}');
        } else {
          callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: '1.2.3.4' }));
        }
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT,
          ipEndpoint: 'https://ip.example.com/check'
        },
        storage: { name: '_locid' }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        // IP fetched and used
        expect(id).to.be.an('object');
        done();
      });
    });

    it('should parse JSON with connection_ip field', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        if (url === 'https://ip.example.com/check') {
          callbacks.success('{"connection_ip":"1.2.3.4"}');
        } else {
          callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: '1.2.3.4' }));
        }
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT,
          ipEndpoint: 'https://ip.example.com/check'
        },
        storage: { name: '_locid' }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.be.an('object');
        done();
      });
    });

    it('should parse plain text IP address', (done) => {
      ajaxStub.callsFake((url, callbacks) => {
        if (url === 'https://ip.example.com/check') {
          callbacks.success('1.2.3.4\n');
        } else {
          callbacks.success(JSON.stringify({ tx_cloc: TEST_ID, connection_ip: '1.2.3.4' }));
        }
      });

      const config = {
        params: {
          endpoint: TEST_ENDPOINT,
          ipEndpoint: 'https://ip.example.com/check'
        },
        storage: { name: '_locid' }
      };

      const result = locIdSubmodule.getId(config, {});
      result.callback((id) => {
        expect(id).to.be.an('object');
        done();
      });
    });
  });

  describe('backward compatibility', () => {
    it('should work with existing stored entries that have string ids', () => {
      storage.getDataFromLocalStorage.returns(JSON.stringify({
        ip: TEST_CONNECTION_IP,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 1000
      }));

      const config = {
        params: { endpoint: TEST_ENDPOINT },
        storage: { name: '_locid' }
      };
      const storedId = {
        id: TEST_ID,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };
      const result = locIdSubmodule.getId(config, {}, storedId);
      expect(result).to.deep.equal({ id: storedId });
    });

    it('should work with stored entries using connection_ip alias', () => {
      storage.getDataFromLocalStorage.returns(JSON.stringify({
        ip: TEST_CONNECTION_IP,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 1000
      }));

      const config = {
        params: { endpoint: TEST_ENDPOINT },
        storage: { name: '_locid' }
      };
      const storedId = {
        id: TEST_ID,
        connection_ip: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };
      const result = locIdSubmodule.getId(config, {}, storedId);
      expect(result.id.connectionIp).to.equal(TEST_CONNECTION_IP);
    });

    it('should work with stored entries using tx_cloc alias', () => {
      storage.getDataFromLocalStorage.returns(JSON.stringify({
        ip: TEST_CONNECTION_IP,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 1000
      }));

      const config = {
        params: { endpoint: TEST_ENDPOINT },
        storage: { name: '_locid' }
      };
      const storedId = {
        tx_cloc: TEST_ID,
        connectionIp: TEST_CONNECTION_IP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };
      const result = locIdSubmodule.getId(config, {}, storedId);
      expect(result.id.id).to.equal(TEST_ID);
    });
  });

  describe('EID round-trip integration', () => {
    before(() => {
      attachIdSystem(locIdSubmodule);
    });

    it('should produce a valid EID from decode output via createEidsArray', () => {
      // Simulate the full Prebid pipeline:
      // 1. decode() returns { locId: "string" }
      // 2. Prebid extracts idObj["locId"] -> the string
      // 3. createEidsArray({ locId: "string" }) should produce a valid EID
      const stored = { id: TEST_ID, connectionIp: TEST_CONNECTION_IP };
      const decoded = locIdSubmodule.decode(stored);
      expect(decoded).to.deep.equal({ locId: TEST_ID });

      const eids = createEidsArray(decoded);
      expect(eids.length).to.equal(1);
      expect(eids[0]).to.deep.equal({
        source: 'locid.com',
        uids: [{ id: TEST_ID, atype: 1 }]
      });
      expect(eids[0].uids[0].atype).to.not.equal(Number('33' + '84'));
    });

    it('should not produce EID when decode returns undefined', () => {
      const decoded = locIdSubmodule.decode(null);
      expect(decoded).to.be.undefined;
    });

    it('should not produce EID when only stable_cloc is present', () => {
      const decoded = locIdSubmodule.decode({
        stable_cloc: 'stable-only-value',
        connectionIp: TEST_CONNECTION_IP
      });
      expect(decoded).to.be.undefined;

      const eids = createEidsArray({ locId: decoded?.locId });
      expect(eids).to.deep.equal([]);
    });

    it('should not produce EID when tx_cloc is null', () => {
      const decoded = locIdSubmodule.decode({ id: null, connectionIp: TEST_CONNECTION_IP });
      expect(decoded).to.be.undefined;

      const eids = createEidsArray({ locId: decoded?.locId });
      expect(eids).to.deep.equal([]);
    });

    it('should not produce EID when tx_cloc is missing', () => {
      const decoded = locIdSubmodule.decode({ connectionIp: TEST_CONNECTION_IP });
      expect(decoded).to.be.undefined;

      const eids = createEidsArray({ locId: decoded?.locId });
      expect(eids).to.deep.equal([]);
    });
  });
});
