import { locIdSubmodule, storage } from 'modules/locIdSystem.js';
import { server } from 'test/mocks/xhr.js';
import * as utils from 'src/utils.js';
import * as ajax from 'src/ajax.js';
import { uspDataHandler, gppDataHandler } from 'src/adapterManager.js';
import { expect } from 'chai/index.mjs';

const TEST_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_PUBLISHER_ID = 'pub-12345';
const TEST_ENDPOINT_URL = 'https://api.locid.com/v1/id';

describe('LocID System', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
    sandbox.stub(storage, 'cookiesAreEnabled').returns(true);
    sandbox.stub(storage, 'getDataFromLocalStorage');
    sandbox.stub(storage, 'setDataInLocalStorage');
    sandbox.stub(storage, 'getCookie');
    sandbox.stub(storage, 'setCookie');
    sandbox.stub(utils, 'generateUUID').returns(TEST_ID);
    sandbox.stub(uspDataHandler, 'getConsentData').returns(null);
    sandbox.stub(gppDataHandler, 'getConsentData').returns(null);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('module properties', () => {
    it('should expose correct module name', () => {
      expect(locIdSubmodule.name).to.equal('locid');
    });

    it('should not have gvlid defined', () => {
      expect(locIdSubmodule.gvlid).to.be.undefined;
    });

    it('should have eids configuration', () => {
      expect(locIdSubmodule.eids).to.be.an('object');
      expect(locIdSubmodule.eids.locid).to.be.an('object');
      expect(locIdSubmodule.eids.locid.source).to.equal('locid.com');
      expect(locIdSubmodule.eids.locid.atype).to.equal(1);
    });
  });

  describe('decode', () => {
    it('should decode valid ID correctly', () => {
      const result = locIdSubmodule.decode(TEST_ID, {});
      expect(result).to.deep.equal({
        locid: TEST_ID
      });
    });

    it('should include GAM output when configured', () => {
      const config = {
        params: {
          gam: {
            enabled: true,
            mode: 'ppid',
            key: 'locid'
          }
        }
      };
      const result = locIdSubmodule.decode(TEST_ID, config);
      expect(result).to.deep.equal({
        locid: TEST_ID,
        _gam: {
          key: 'locid',
          ppid: TEST_ID
        }
      });
    });

    it('should return undefined for users in holdout control group', () => {
      const config = {
        params: {
          holdoutOverride: 'forceControl'
        }
      };
      const result = locIdSubmodule.decode(TEST_ID, config);
      expect(result).to.be.undefined;
    });

    it('should decode for users forced into treatment', () => {
      const config = {
        params: {
          holdoutOverride: 'forceTreatment'
        }
      };
      const result = locIdSubmodule.decode(TEST_ID, config);
      expect(result).to.deep.equal({
        locid: TEST_ID
      });
    });

    it('should handle errors gracefully and return undefined', () => {
      // Force an error by passing a value that causes internal issues
      // The decode function has a try-catch that returns undefined on errors
      sandbox.stub(utils, 'logError');

      // Pass an object that stringifies but causes issues in isValidId
      const badValue = { toString: () => { throw new Error('test error'); } };
      const result = locIdSubmodule.decode(badValue, {});
      expect(result).to.be.undefined;
    });

    it('should return undefined for invalid values', () => {
      [null, undefined, '', {}, [], 123].forEach(value => {
        expect(locIdSubmodule.decode(value, {})).to.be.undefined;
      });
    });
  });

  describe('getId with publisher source', () => {
    const config = {
      params: {
        source: 'publisher',
        value: TEST_PUBLISHER_ID
      }
    };

    it('should return publisher-provided ID', () => {
      const result = locIdSubmodule.getId(config, {});
      expect(result).to.deep.equal({
        id: TEST_PUBLISHER_ID
      });
    });

    it('should use storedId when no value in params', () => {
      const configNoValue = {
        params: {
          source: 'publisher'
        }
      };
      const result = locIdSubmodule.getId(configNoValue, {}, TEST_PUBLISHER_ID);
      expect(result).to.deep.equal({
        id: TEST_PUBLISHER_ID
      });
    });

    it('should return undefined when no valid ID provided', () => {
      const configNoValue = {
        params: {
          source: 'publisher'
        }
      };
      const result = locIdSubmodule.getId(configNoValue, {});
      expect(result).to.be.undefined;
    });
  });

  describe('getId with device source', () => {
    const config = {
      params: {
        source: 'device'
      },
      storage: {
        type: 'localStorage',
        name: '_locid_test',
        expires: 30
      }
    };

    it('should generate new device ID', () => {
      storage.getDataFromLocalStorage.returns(null);

      const result = locIdSubmodule.getId(config, {});
      expect(result).to.deep.equal({
        id: TEST_ID
      });
      expect(storage.setDataInLocalStorage.calledOnce).to.be.true;
    });

    it('should use stored ID when not expired', () => {
      const storedData = JSON.stringify({
        id: 'stored-id-123',
        timestamp: Date.now() - 1000
      });
      storage.getDataFromLocalStorage.returns(storedData);

      const result = locIdSubmodule.getId(config, {});
      expect(result).to.deep.equal({
        id: 'stored-id-123'
      });
    });

    it('should refresh expired stored ID', () => {
      const storedData = JSON.stringify({
        id: 'stored-id-123',
        timestamp: Date.now() - (31 * 24 * 60 * 60 * 1000) // 31 days ago
      });
      storage.getDataFromLocalStorage.returns(storedData);

      const result = locIdSubmodule.getId(config, {});
      expect(result).to.deep.equal({
        id: TEST_ID
      });
      expect(storage.setDataInLocalStorage.calledOnce).to.be.true;
    });

    it('should return undefined when GDPR applies without consent', () => {
      storage.getDataFromLocalStorage.returns(null);
      const consentData = {
        gdpr: {
          gdprApplies: true,
          consentString: ''
        }
      };

      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.be.undefined;
      expect(storage.setDataInLocalStorage.called).to.be.false;
    });

    it('should return undefined when US Privacy opt-out applies', () => {
      storage.getDataFromLocalStorage.returns(null);
      uspDataHandler.getConsentData.returns('1-Y-');

      const result = locIdSubmodule.getId(config, {});
      expect(result).to.be.undefined;
      expect(storage.setDataInLocalStorage.called).to.be.false;
    });
  });

  describe('getId with endpoint source (deprecated)', () => {
    it('should warn that endpoint source is no longer supported', () => {
      const config = {
        params: {
          source: 'endpoint'
        }
      };

      const result = locIdSubmodule.getId(config, {});
      expect(result).to.be.undefined;
    });
  });

  describe('extendId for ORTB2 injection', () => {
    let ajaxStub;

    beforeEach(() => {
      ajaxStub = sandbox.stub(ajax, 'ajax');
      storage.getDataFromLocalStorage.returns(null);
    });

    it('should inject ORTB2 data when ID is available and user not in holdout', () => {
      const config = {
        params: {
          source: 'device',
          holdoutOverride: 'forceTreatment',
          loggingEndpoint: 'https://test-logging.com'
        },
        auctionId: 'test-auction-123'
      };

      const result = locIdSubmodule.extendId(config, {}, null);

      expect(result).to.have.property('ortb2');
      expect(result.ortb2.user.ext.data).to.deep.include({
        locid_confidence: 1.0,
        locid_audiences: []
      });
      expect(result.ortb2.user.ext.data).to.have.property('locid_stability_days');
    });

    it('should not inject ORTB2 data when user is in holdout', () => {
      const config = {
        params: {
          source: 'device',
          holdoutOverride: 'forceControl',
          loggingEndpoint: 'https://test-logging.com'
        },
        auctionId: 'test-auction-123'
      };

      const result = locIdSubmodule.extendId(config, {}, null);
      expect(result).to.be.undefined;
    });

    it('should merge ORTB2 data without overwriting existing data', () => {
      const config = {
        params: {
          source: 'device',
          holdoutOverride: 'forceTreatment'
        },
        ortb2: {
          user: {
            ext: {
              data: {
                existing_field: 'existing_value'
              }
            }
          }
        }
      };

      const result = locIdSubmodule.extendId(config, {}, null);

      expect(result.ortb2.user.ext.data).to.have.property('existing_field', 'existing_value');
      expect(result.ortb2.user.ext.data).to.have.property('locid_confidence', 1.0);
    });

    it('should log exposure data when logging endpoint is configured', () => {
      const config = {
        params: {
          source: 'device',
          holdoutOverride: 'forceTreatment',
          loggingEndpoint: 'https://test-logging.com'
        },
        auctionId: 'test-auction-123'
      };

      locIdSubmodule.extendId(config, {}, null);

      expect(ajaxStub.calledOnce).to.be.true;
      const logData = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(logData).to.include({
        auction_id: 'test-auction-123',
        is_holdout: false,
        locid_present: true
      });
    });

    it('should handle errors gracefully and return undefined', () => {
      const config = {
        params: {
          source: 'device'
        }
      };

      // Force an error by making getId throw
      sandbox.stub(locIdSubmodule, 'getId').throws(new Error('test error'));

      const result = locIdSubmodule.extendId(config, {}, null);
      expect(result).to.be.undefined;
    });

    it('should not inject when no consent', () => {
      const config = {
        params: {
          source: 'device',
          holdoutOverride: 'forceTreatment'
        }
      };

      const consentData = {
        gdpr: {
          gdprApplies: true,
          consentString: ''
        }
      };

      const result = locIdSubmodule.extendId(config, consentData, null);
      expect(result).to.be.undefined;
    });
  });

  describe('storage configuration', () => {
    const deviceConfig = {
      params: { source: 'device' }
    };

    it('should support localStorage storage', () => {
      const config = {
        ...deviceConfig,
        storage: {
          type: 'localStorage',
          name: '_test_locid',
          expires: 7
        }
      };

      storage.getDataFromLocalStorage.returns(null);
      locIdSubmodule.getId(config, {});

      expect(storage.setDataInLocalStorage.calledWith('_test_locid')).to.be.true;
      expect(storage.setCookie.called).to.be.false;
    });

    it('should support cookie storage', () => {
      const config = {
        ...deviceConfig,
        storage: {
          type: 'cookie',
          name: '_test_locid',
          expires: 7
        }
      };

      storage.getCookie.returns(null);
      locIdSubmodule.getId(config, {});

      expect(storage.setCookie.calledWith('_test_locid')).to.be.true;
      expect(storage.setDataInLocalStorage.called).to.be.false;
    });

    it('should support combined localStorage&cookie storage', () => {
      const config = {
        ...deviceConfig,
        storage: {
          type: 'localStorage&cookie',
          name: '_test_locid',
          expires: 7
        }
      };

      storage.getDataFromLocalStorage.returns(null);
      storage.getCookie.returns(null);
      locIdSubmodule.getId(config, {});

      expect(storage.setDataInLocalStorage.calledWith('_test_locid')).to.be.true;
      expect(storage.setCookie.calledWith('_test_locid')).to.be.true;
    });
  });

  describe('refresh logic', () => {
    const config = {
      params: { source: 'device' },
      storage: {
        type: 'localStorage',
        name: '_locid_test',
        expires: 30,
        refreshInSeconds: 3600 // 1 hour
      }
    };

    it('should refresh ID when refresh time exceeded', () => {
      const storedData = JSON.stringify({
        id: 'old-id',
        timestamp: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
      });
      storage.getDataFromLocalStorage.returns(storedData);

      const result = locIdSubmodule.getId(config, {});
      expect(result).to.deep.equal({
        id: TEST_ID // New generated ID
      });
      expect(storage.setDataInLocalStorage.calledOnce).to.be.true;
    });

    it('should not refresh ID when refresh time not exceeded', () => {
      const storedData = JSON.stringify({
        id: 'current-id',
        timestamp: Date.now() - (30 * 60 * 1000) // 30 minutes ago
      });
      storage.getDataFromLocalStorage.returns(storedData);

      const result = locIdSubmodule.getId(config, {});
      expect(result).to.deep.equal({
        id: 'current-id' // Existing ID used
      });
      expect(storage.setDataInLocalStorage.called).to.be.false;
    });
  });

  describe('error handling', () => {
    it('should default to device source when source not specified', () => {
      const config = {
        params: {},
        storage: {
          type: 'localStorage',
          name: '_locid_test'
        }
      };
      storage.getDataFromLocalStorage.returns(null);

      const result = locIdSubmodule.getId(config, {});
      expect(result).to.deep.equal({
        id: TEST_ID
      });
    });

    it('should handle unknown source', () => {
      const config = {
        params: {
          source: 'unknown'
        }
      };

      const result = locIdSubmodule.getId(config, {});
      expect(result).to.be.undefined;
    });

    it('should handle corrupted stored data gracefully', () => {
      const config = {
        params: { source: 'device' },
        storage: {
          type: 'localStorage',
          name: '_locid_test'
        }
      };

      storage.getDataFromLocalStorage.returns('invalid-json');

      const result = locIdSubmodule.getId(config, {});
      expect(result).to.deep.equal({
        id: TEST_ID
      });
    });
  });

  describe('consent handling', () => {
    const config = {
      params: { source: 'device' },
      storage: {
        type: 'localStorage',
        name: '_locid_test',
        expires: 30
      }
    };

    it('should store ID with valid GDPR consent', () => {
      storage.getDataFromLocalStorage.returns(null);
      const consentData = {
        gdpr: {
          gdprApplies: true,
          consentString: 'valid-consent-string'
        }
      };

      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.deep.equal({
        id: TEST_ID
      });
      expect(storage.setDataInLocalStorage.calledOnce).to.be.true;
    });

    it('should store ID when GDPR does not apply', () => {
      storage.getDataFromLocalStorage.returns(null);
      const consentData = {
        gdpr: {
          gdprApplies: false,
          consentString: ''
        }
      };

      const result = locIdSubmodule.getId(config, consentData);
      expect(result).to.deep.equal({
        id: TEST_ID
      });
      expect(storage.setDataInLocalStorage.calledOnce).to.be.true;
    });

    it('should return undefined for publisher source when consent is missing', () => {
      const publisherConfig = {
        params: {
          source: 'publisher',
          value: TEST_PUBLISHER_ID
        }
      };

      const consentData = {
        gdpr: {
          gdprApplies: true,
          consentString: ''
        }
      };

      const result = locIdSubmodule.getId(publisherConfig, consentData);
      expect(result).to.be.undefined;
    });

    it('should work with publisher source when consent is valid', () => {
      const publisherConfig = {
        params: {
          source: 'publisher',
          value: TEST_PUBLISHER_ID
        }
      };

      const consentData = {
        gdpr: {
          gdprApplies: true,
          consentString: 'valid-consent-string'
        }
      };

      const result = locIdSubmodule.getId(publisherConfig, consentData);
      expect(result).to.deep.equal({
        id: TEST_PUBLISHER_ID
      });
    });
  });
});
