import * as ajaxLib from 'src/ajax.js';
import * as utils from 'src/utils.js';
import {merkleIdSubmodule} from 'modules/merkleIdSystem.js';

import sinon from 'sinon';

let expect = require('chai').expect;

const CONFIG_PARAMS = {
  endpoint: 'https://test/id',
  vendor: 'idsv2',
  sv_cid: '5344_04531',
  sv_pubid: '11314',
  sv_domain: 'www.testDomain.com',
  sv_session: 'testsession'
};

const STORAGE_PARAMS = {
  type: 'cookie',
  name: 'merkle',
  expires: 10,
  refreshInSeconds: 10
};

const MOCK_RESPONSE = {
  c: {
    name: '_svsid',
    value: '123876327647627364236478'
  }
};

function mockResponse(
  responseText,
  response = (url, successCallback) => successCallback(responseText)) {
  return function() {
    return response;
  }
}

describe('Merkle System', function () {
  describe('Merkle System getId()', function () {
    const callbackSpy = sinon.spy();
    let sandbox;
    let ajaxStub;

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
      sinon.stub(utils, 'logInfo');
      sinon.stub(utils, 'logWarn');
      sinon.stub(utils, 'logError');
      callbackSpy.resetHistory();
      ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(mockResponse(JSON.stringify(MOCK_RESPONSE)));
    });

    afterEach(function () {
      utils.logInfo.restore();
      utils.logWarn.restore();
      utils.logError.restore();
      ajaxStub.restore();
    });

    it('getId() should fail on missing vendor', function () {
      let config = {
        params: {
          ...CONFIG_PARAMS,
          vendor: undefined
        },
        storage: STORAGE_PARAMS
      };

      let submoduleCallback = merkleIdSubmodule.getId(config, undefined);
      expect(submoduleCallback).to.be.undefined;
      expect(utils.logError.args[0][0]).to.exist.and.to.equal('User ID - merkleId submodule requires a valid vendor to be defined');
    });

    it('getId() should fail on missing vendor', function () {
      let config = {
        params: {
          ...CONFIG_PARAMS,
          vendor: undefined
        },
        storage: STORAGE_PARAMS
      };

      let submoduleCallback = merkleIdSubmodule.getId(config, undefined);
      expect(submoduleCallback).to.be.undefined;
      expect(utils.logError.args[0][0]).to.exist.and.to.equal('User ID - merkleId submodule requires a valid vendor to be defined');
    });

    it('getId() should fail on missing sv_cid', function () {
      let config = {
        params: {
          ...CONFIG_PARAMS,
          sv_cid: undefined
        },
        storage: STORAGE_PARAMS
      };

      let submoduleCallback = merkleIdSubmodule.getId(config, undefined);
      expect(submoduleCallback).to.be.undefined;
      expect(utils.logError.args[0][0]).to.exist.and.to.equal('User ID - merkleId submodule requires a valid sv_cid string to be defined');
    });

    it('getId() should fail on missing sv_pubid', function () {
      let config = {
        params: {
          ...CONFIG_PARAMS,
          sv_pubid: undefined
        },
        storage: STORAGE_PARAMS
      };

      let submoduleCallback = merkleIdSubmodule.getId(config, undefined);
      expect(submoduleCallback).to.be.undefined;
      expect(utils.logError.args[0][0]).to.exist.and.to.equal('User ID - merkleId submodule requires a valid sv_pubid string to be defined');
    });

    it('getId() should warn on missing endpoint', function () {
      let config = {
        params: {
          ...CONFIG_PARAMS,
          endpoint: undefined
        },
        storage: STORAGE_PARAMS
      };

      let submoduleCallback = merkleIdSubmodule.getId(config, undefined).callback;
      submoduleCallback(callbackSpy);
      expect(callbackSpy.calledOnce).to.be.true;
      expect(utils.logWarn.args[0][0]).to.exist.and.to.equal('User ID - merkleId submodule endpoint string is not defined');
    });

    it('getId() should handle callback with valid configuration', function () {
      let config = {
        params: CONFIG_PARAMS,
        storage: STORAGE_PARAMS
      };

      let submoduleCallback = merkleIdSubmodule.getId(config, undefined).callback;
      submoduleCallback(callbackSpy);
      expect(callbackSpy.calledOnce).to.be.true;
    });
  });

  describe('Merkle System extendId()', function () {
    const callbackSpy = sinon.spy();
    let sandbox;
    let ajaxStub;

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
      sinon.stub(utils, 'logInfo');
      sinon.stub(utils, 'logWarn');
      sinon.stub(utils, 'logError');
      callbackSpy.resetHistory();
      ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(mockResponse(JSON.stringify(MOCK_RESPONSE)));
    });

    afterEach(function () {
      utils.logInfo.restore();
      utils.logWarn.restore();
      utils.logError.restore();
      ajaxStub.restore();
    });

    it('extendId() get storedid', function () {
      let config = {
        params: {
          ...CONFIG_PARAMS,
        },
        storage: STORAGE_PARAMS
      };

      let id = merkleIdSubmodule.extendId(config, undefined, 'Merkle_Stored_ID');
      expect(id.id).to.exist.and.to.equal('Merkle_Stored_ID');
    });

    it('extendId() get storedId on configured storageParam.refreshInSeconds', function () {
      let config = {
        params: {
          ...CONFIG_PARAMS,
          refreshInSeconds: 1000
        },
        storage: STORAGE_PARAMS
      };

      let yesterday = new Date(Date.now() - 86400000).toUTCString();
      let storedId = {value: 'Merkle_Stored_ID', date: yesterday};

      let id = merkleIdSubmodule.extendId(config, undefined,
        storedId);

      expect(id.id).to.exist.and.to.equal(storedId);
    });
    it('extendId() should warn on missing endpoint', function () {
      let config = {
        params: {
          ...CONFIG_PARAMS,
          endpoint: undefined
        },
        storage: STORAGE_PARAMS
      };

      let yesterday = new Date(Date.now() - 86400000).toUTCString();
      let storedId = {value: 'Merkle_Stored_ID', date: yesterday};

      let submoduleCallback = merkleIdSubmodule.extendId(config, undefined,
        storedId).callback;
      submoduleCallback(callbackSpy);
      expect(callbackSpy.calledOnce).to.be.true;
      expect(utils.logWarn.args[0][0]).to.exist.and.to.equal('User ID - merkleId submodule endpoint string is not defined');
    });

    it('extendId() callback on configured storageParam.refreshInSeconds', function () {
      let config = {
        params: {
          ...CONFIG_PARAMS,
          refreshInSeconds: 1
        }
      };

      let yesterday = new Date(Date.now() - 86400000).toUTCString();
      let storedId = {value: 'Merkle_Stored_ID', date: yesterday};

      let submoduleCallback = merkleIdSubmodule.extendId(config, undefined, storedId).callback;
      submoduleCallback(callbackSpy);
      expect(callbackSpy.calledOnce).to.be.true;
    });
  });
});
