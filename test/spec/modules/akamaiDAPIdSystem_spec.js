import {akamaiDAPIdSubmodule} from 'modules/akamaiDAPIdSystem.js';
import * as utils from 'src/utils.js';
import {server} from 'test/mocks/xhr.js';
import {getStorageManager} from '../../../src/storageManager.js';

export const storage = getStorageManager();

const signatureConfigParams = {params: {
  apiHostname: 'prebid.dap.akadns.net',
  domain: 'prebid.org',
  type: 'dap-signature:1.0.0',
  apiVersion: 'v1'
}};

const tokenizeConfigParams = {params: {
  apiHostname: 'prebid.dap.akadns.net',
  domain: 'prebid.org',
  type: 'email',
  identity: 'amishra@xyz.com',
  apiVersion: 'v1'
}};

const x1TokenizeConfigParams = {params: {
  apiHostname: 'prebid.dap.akadns.net',
  domain: 'prebid.org',
  type: 'email',
  identity: 'amishra@xyz.com',
  apiVersion: 'x1',
  attributes: '{ "cohorts": [ "3:14400", "5:14400", "7:0" ],"first_name": "Ace","last_name": "McCool" }'
}};

const consentData = {
  gdprApplies: true,
  consentString: 'BOkIpDSOkIpDSADABAENCc-AAAApOAFAAMAAsAMIAcAA_g'
};

const responseHeader = {'Content-Type': 'application/json'}

const TEST_ID = '51sd61e3-sd82-4vea-8387-093dffca4a3a';

describe('akamaiDAPId getId', function () {
  let logErrorStub;

  beforeEach(function () {
    logErrorStub = sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    logErrorStub.restore();
  });

  describe('decode', function () {
    it('should respond with an object with dapId  containing the value', () => {
      expect(akamaiDAPIdSubmodule.decode(TEST_ID)).to.deep.equal({
        dapId: TEST_ID
      });
    });
  });

  describe('getId', function () {
    it('should log an error if no configParams were passed when getId', function () {
      akamaiDAPIdSubmodule.getId(null);
      expect(logErrorStub.calledOnce).to.be.true;
    });

    it('should log an error if configParams were passed without apihostname', function () {
      akamaiDAPIdSubmodule.getId({ params: {
        domain: 'prebid.org',
        type: 'dap-signature:1.0.0'
      } });
      expect(logErrorStub.calledOnce).to.be.true;
    });

    it('should log an error if configParams were passed without domain', function () {
      akamaiDAPIdSubmodule.getId({ params: {
        apiHostname: 'prebid.dap.akadns.net',
        type: 'dap-signature:1.0.0'
      } });
      expect(logErrorStub.calledOnce).to.be.true;
    });

    it('should log an error if configParams were passed without type', function () {
      akamaiDAPIdSubmodule.getId({ params: {
        apiHostname: 'prebid.dap.akadns.net',
        domain: 'prebid.org'
      } });
      expect(logErrorStub.calledOnce).to.be.true;
    });

    it('akamaiDAPId submobile requires consent string to call API', function () {
      let consentData = {
        gdprApplies: true,
        consentString: ''
      };
      let submoduleCallback = akamaiDAPIdSubmodule.getId(signatureConfigParams, consentData);
      expect(submoduleCallback).to.be.undefined;
    });

    it('should call the signature v1 API and store token in Local storage', function () {
      let submoduleCallback1 = akamaiDAPIdSubmodule.getId(signatureConfigParams, consentData).id;
      expect(submoduleCallback1).to.be.eq(storage.getDataFromLocalStorage('akamai_dap_token'))
      storage.removeDataFromLocalStorage('akamai_dap_token');
    });

    it('should call the tokenize v1 API and store token in Local storage', function () {
      let submoduleCallback = akamaiDAPIdSubmodule.getId(tokenizeConfigParams, consentData).id;
      expect(submoduleCallback).to.be.eq(storage.getDataFromLocalStorage('akamai_dap_token'))
      storage.removeDataFromLocalStorage('akamai_dap_token');
    });

    it('should call the tokenize x1 API and store token in Local storage', function () {
      let submoduleCallback = akamaiDAPIdSubmodule.getId(x1TokenizeConfigParams, consentData).id;
      expect(submoduleCallback).to.be.eq(storage.getDataFromLocalStorage('akamai_dap_token'))
      storage.removeDataFromLocalStorage('akamai_dap_token');
    });
  });
});
