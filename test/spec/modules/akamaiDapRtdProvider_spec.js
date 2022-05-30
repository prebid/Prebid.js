import {config} from 'src/config.js';
import {
  dapUtils,
  generateRealTimeData,
  akamaiDapRtdSubmodule,
  storage, DAP_MAX_RETRY_TOKENIZE, DAP_SS_ID, DAP_TOKEN, DAP_MEMBERSHIP, DAP_ENCRYPTED_MEMBERSHIP
} from 'modules/akamaiDapRtdProvider.js';
import {server} from 'test/mocks/xhr.js';
const responseHeader = {'Content-Type': 'application/json'};

describe('akamaiDapRtdProvider', function() {
  const testReqBidsConfigObj = {
    adUnits: [
      {
        bids: ['bid1', 'bid2']
      }
    ]
  };

  const onDone = function() { return true };

  const sampleGdprConsentConfig = {
    'gdpr': {
      'consentString': null,
      'vendorData': {},
      'gdprApplies': true
    }
  };

  const sampleUspConsentConfig = {
    'usp': '1YYY'
  };

  const sampleIdentity = {
    type: 'dap-signature:1.0.0'
  };

  const cmoduleConfig = {
    'name': 'dap',
    'waitForIt': true,
    'params': {
      'apiHostname': 'prebid.dap.akadns.net',
      'apiVersion': 'x1',
      'domain': 'prebid.org',
      'identityType': 'dap-signature:1.0.0',
      'segtax': 503
    }
  }

  const emoduleConfig = {
    'name': 'dap',
    'waitForIt': true,
    'params': {
      'apiHostname': 'prebid.dap.akadns.net',
      'apiVersion': 'x1',
      'domain': 'prebid.org',
      'identityType': 'dap-signature:1.0.0',
      'segtax': 504
    }
  }

  const sampleConfig = {
    'api_hostname': 'prebid.dap.akadns.net',
    'api_version': 'x1',
    'domain': 'prebid.org',
    'segtax': 503,
    'identity': sampleIdentity
  }

  const esampleConfig = {
    'api_hostname': 'prebid.dap.akadns.net',
    'api_version': 'x1',
    'domain': 'prebid.org',
    'segtax': 504,
    'identity': sampleIdentity
  }
  let cacheExpiry = Math.round(Date.now() / 1000.0) + 300; // in seconds
  const sampleCachedToken = {'expires_at': cacheExpiry, 'token': 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2Iiwia2lkIjoicGFzc3dvcmQxIn0..6buzBd2BjtgoyaNbHN8YnQ.l38avCfm3sYNy798-ETYOugz0cOx1cCkjACkAhYszxzrZ0sUJ0AiF-NdDXVTiTyp2Ih3vCWKzS0rKJ8lbS1zhyEVWVu91QwtwseM2fBbwA5ggAgBEo5wV-IXqDLPxVnxsPF0D3hP6cNCiH9Q2c-vULfsLhMhG5zvvZDPBbn4hUY5fKB8LoCBTF9rbuuWGYK1nramnb4AlS5UK82wBsHQea1Ou_Kp5wWCMNZ6TZk5qKIuRBfPIAhQblWvHECaHXkg1wyoM9VASs_yNhne7RR-qkwzbFiPFiMJibNOt9hF3_vPDJO5-06ZBjRTP1BllYGWxI-uQX6InzN18Wtun2WHqg.63sH0SNlIRcsK57v0pMujfB_nhU8Y5CuQbsHqH5MGoM'};
  const cachedEncryptedMembership = {'expires_at': cacheExpiry, 'encryptedSegments': 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2Iiwia2lkIjoic29tZXNlY3JldGludmF1bHQifQ..IvnIUQDqWBVYIS0gbcE9bw.Z4NZGvtogWaWlGH4e-GdYKe_PUc15M2x3Bj85rMWsN1A17mIxQIMOfg2hsQ2tgieLu5LggWPmsFu1Wbph6P0k3kOu1dVReoIhOHzxw50rP0DLHKaEZ5mLMJ7Lcosvwh4miIfFuCHlsX7J0sFgOTAp0zGo1S_UsHLtev1JflhjoSB0AoX95ALbAnyctirPuLJM8gZ1vXTiZ01jpvucGyR1lM4cWjPOeD8jPtgwaPGgSRZXE-3X2Cqy7z4Giam5Uqu74LPWTBuKtUQTGyAXA5QJoP7xwTbsU4O1f69lu3fWNqC92GijeTH1A4Zd_C-WXxWuQlDEURjlkWQoaqTHka2OqlnwukEQIf_v0r5KQQX64CTLhEUH91jeD0-E9ClcIP7pwOLxxqiKoaBmx8Mrnm_6Agj5DtTA1rusy3AL63sI_rsUxrmLrVt0Wft4aCfRkW8QpQxu8clFdOmce0NNCGeBCyCPVw9d9izrILlXJ6rItU2cpFrcbz8uw2otamF5eOFCOY3IzHedWVNNuKHFIUVC_xYSlsYvQ8f2QIP1eiMbmukcuPzmTzjw1h1_7IKaj-jJkXrnrY-TdDgX_4-_Z3rmbpXK2yTR7dBrsg-ubqFbgbKic1b4zlQEO_LbBlgPl3DYdWEuJ8CY2NUt1GfpATQGsufS2FTY1YGw_gkPe3q04l_cgLafDoxHvHh_t_0ZgPjciW82gThB_kN4RP7Mc3krVcXl_P6N1VbV07xyx0hCyVsrrxbLslI8q9wYDiLGci7mNmByM5j7SXV9jPwwPkHtn0HfMJlw2PFbIDPjgG3h7sOyLcBIJTTvuUIgpHPIkRWLIl_4FlIucXbJ7orW2nt5BWleBVHgumzGcnl9ZNcZb3W-dsdYPSOmuj0CY28MRTP2oJ1rzLInbDDpIRffJBtR7SS4nYyy7Vi09PtBigod5YNz1Q0WDSJxr8zeH_aKFaXInw7Bfo_U0IAcLiRgcT0ogsMLeQRjRFy27mr4XNJv3NtHhbdjDAwF2aClCktXyXbQaVdsPH2W71v6m2Q9rB5GQWOktw2s5f-4N1-_EBPGq6TgjF-aJZP22MJVwp1pimT50DfOzoeEqDwi862NNwNNoHmcObH0ZfwAXlhRxsgupNBe20-MNNABj2Phlfv4DUrtQbMdfCnNiypzNCmoTb7G7c_o5_JUwoV_GVkwUtvmi_IUm05P4GeMASSUw8zDKVRAj9h31C2cabM8RjMHGhkbCWpUP2pcz9zlJ7Y76Dh3RLnctfTw7DG9U4w4UlaxNZOgLUiSrGwfyapuSiuGUpuOJkBBLiHmEqAGI5C8oJpcVRccNlHxJAYowgXyFopD5Fr-FkXmv8KMkS0h5C9F6KihmDt5sqDD0qnjM0hHJgq01l7wjVnhEmPpyD-6auFQ-xDnbh1uBOJ_0gCVbRad--FSa5p-dXenggegRxOvZXJ0iAtM6Fal5Og-RCjexIHa9WhVbXhQBJpkSTWwAajZJ64eQ.yih49XB51wE-Xob7COT9OYqBrzBmIMVCQbLFx2UdzkI'};
  const cachedMembership = {'expires_at': cacheExpiry, 'said': 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2Iiwia2lkIjoicGFzc3dvcmQxIn0..QwvU5h0NVJYaJbs5EqWCKA.XNaJHSlnsH8P-yBIr3gIEqavLONWDIFyj7QCHFwJVkwXH_EYkxrk0_26b0uMPzfJp5URnqxKZusMH9DzEJsmj8EMrKQv1y3IYYMsW5_0BdP5bcAWfG6fzOqtMOwLiYRkYiQOqn1ZVGzhovheHWEmNr2_oCY0LvAr3iN1eG_K-l-bBKvBWnwvuuGKquUfCqO8NMMq6wtkecEXM9blqFRZ7oNYmW2aIG7qcHUsrUW7HMr9Ev2Ik0sIeEUsOYrgf_X_VA64RgKSTRugS9FupMv1p54JkHokwduF9pOFmW8QLQi8itFogKGbbgvOTNnmahxQUX5FcrjjYLqHwKqC8htLdlHnO5LWU9l4A7vLXrRurvoSnh0cAJy0GsdoyEwTqR9bwVFHoPquxlJjQ4buEd7PIxpBj9Qg9oOPH3b2upbMTu5CQ9oj526eXPhP5G54nwGklm2AZ3Vggd7jCQJn45Jjiq0iIfsXAtpqS2BssCLBN8WhmUTnStK8m5sux6WUBdrpDESQjPj-EEHVS-DB5rA7icRUh6EzRxzen2rndvHvnwVhSG_l6cwPYuJ0HE0KBmYHOoqNpKwzoGiKFHrf4ReA06iWB3V2TEGJucGujhtQ9_18WwHCeJ1XtQiiO1eqa3tp5MwAbFXawVFl3FFOBgadrPyvGmkmUJ6FCLU2MSwHiYZmANMnJsokFX_6DwoAgO3U_QnvEHIVSvefc7ReeJ8fBDdmrH3LtuLrUpXsvLvEIMQdWQ_SXhjKIi7tOODR8CfrhUcdIjsp3PZs1DpuOcDB6YJKbGnKZTluLUJi3TyHgyi-DHXdTm-jSE5i_DYJGW-t2Gf23FoQhexv4q7gdrfsKfcRJNrZLp6Gd6jl4zHhUtY.nprKBsy9taQBk6dCPbA7BFF0CiGhQOEF_MazZ2bedqk', 'cohorts': ['9', '11', '13']};
  const rtdUserObj = {
    name: 'www.dataprovider3.com',
    ext: {
      taxonomyname: 'iab_audience_taxonomy'
    },
    segment: [
      {
        id: '1918'
      },
      {
        id: '1939'
      }
    ]
  };

  const encRtdUserObj = {
    name: 'www.dataprovider3.com',
    ext: {
      segtax: 504,
      taxonomyname: 'iab_audience_taxonomy'
    },
    segment: []
  };

  const cachedRtd = {
    rtd: {
      ortb2: {
        user: {
          data: [rtdUserObj]
        }
      }
    }
  };

  let membership = {
    said: cachedMembership.said,
    cohorts: cachedMembership.cohorts,
    attributes: null
  };
  let encMembership = {
    encryptedSegments: cachedEncryptedMembership.encryptedSegments
  };
  encRtdUserObj.segment.push({ id: encMembership.encryptedSegments });
  const cachedEncRtd = {
    rtd: {
      ortb2: {
        user: {
          data: [encRtdUserObj]
        }
      }
    }
  };

  beforeEach(function() {
    config.resetConfig();
    storage.removeDataFromLocalStorage(DAP_TOKEN);
    storage.removeDataFromLocalStorage(DAP_MEMBERSHIP);
    storage.removeDataFromLocalStorage(DAP_ENCRYPTED_MEMBERSHIP);
    storage.removeDataFromLocalStorage(DAP_SS_ID);
  });

  afterEach(function () {
  });

  describe('akamaiDapRtdSubmodule', function() {
    it('successfully instantiates', function () {
      expect(akamaiDapRtdSubmodule.init()).to.equal(true);
    });
  });

  describe('Get Real-Time Data', function() {
    it('gets rtd from local storage cache', function() {
      let dapGetMembershipFromLocalStorageStub = sinon.stub(dapUtils, 'dapGetMembershipFromLocalStorage').returns(membership)
      let dapGetRtdObjStub = sinon.stub(dapUtils, 'dapGetRtdObj').returns(cachedRtd)
      let dapGetEncryptedMembershipFromLocalStorageStub = sinon.stub(dapUtils, 'dapGetEncryptedMembershipFromLocalStorage').returns(encMembership)
      let dapGetEncryptedRtdObjStub = sinon.stub(dapUtils, 'dapGetEncryptedRtdObj').returns(cachedEncRtd)
      let callDapApisStub = sinon.stub(dapUtils, 'callDapAPIs')
      try {
        const bidConfig = {};
        storage.setDataInLocalStorage(DAP_TOKEN, JSON.stringify(sampleCachedToken));
        expect(config.getConfig().ortb2).to.be.undefined;
        generateRealTimeData(bidConfig, () => {}, emoduleConfig, {});

        expect(config.getConfig().ortb2.user.data).to.deep.include.members([encRtdUserObj]);
        generateRealTimeData(bidConfig, () => {}, cmoduleConfig, {});
        expect(config.getConfig().ortb2.user.data).to.deep.include.members([rtdUserObj]);
      } finally {
        dapGetRtdObjStub.restore()
        dapGetMembershipFromLocalStorageStub.restore()
        dapGetEncryptedRtdObjStub.restore()
        dapGetEncryptedMembershipFromLocalStorageStub.restore()
        callDapApisStub.restore()
      }
    });
  });

  describe('calling DAP APIs', function() {
    it('Calls callDapAPIs for unencrypted segments flow', function() {
      const bidConfig = {};
      storage.setDataInLocalStorage(DAP_TOKEN, JSON.stringify(sampleCachedToken));
      let dapExtractExpiryFromTokenStub = sinon.stub(dapUtils, 'dapExtractExpiryFromToken').returns(cacheExpiry)
      try {
        expect(config.getConfig().ortb2).to.be.undefined;
        dapUtils.callDapAPIs(bidConfig, () => {}, cmoduleConfig, {});
        let membership = {'cohorts': ['9', '11', '13'], 'said': 'sample-said'}
        let membershipRequest = server.requests[0];
        membershipRequest.respond(200, responseHeader, JSON.stringify(membership));
        let tokenWithExpiry = 'Sample-token-with-exp'
        let tokenizeRequest = server.requests[1];
        responseHeader['Akamai-DAP-Token'] = tokenWithExpiry;
        tokenizeRequest.respond(200, responseHeader, JSON.stringify(tokenWithExpiry));
        let data = dapUtils.dapGetRtdObj(membership, cmoduleConfig.params.segtax);
        expect(config.getConfig().ortb2.user.data).to.deep.include.members(data.rtd.ortb2.user.data);
      } finally {
        dapExtractExpiryFromTokenStub.restore();
      }
    });

    it('Calls callDapAPIs for encrypted segments flow', function() {
      const bidConfig = {};
      storage.setDataInLocalStorage(DAP_TOKEN, JSON.stringify(sampleCachedToken));
      let dapExtractExpiryFromTokenStub = sinon.stub(dapUtils, 'dapExtractExpiryFromToken').returns(cacheExpiry)
      try {
        expect(config.getConfig().ortb2).to.be.undefined;
        dapUtils.callDapAPIs(bidConfig, () => {}, emoduleConfig, {});
        let encMembership = 'Sample-enc-token';
        let membershipRequest = server.requests[0];
        responseHeader['Akamai-DAP-Token'] = encMembership;
        membershipRequest.respond(200, responseHeader, JSON.stringify(encMembership));
        let tokenWithExpiry = 'Sample-token-with-exp'
        let tokenizeRequest = server.requests[1];
        responseHeader['Akamai-DAP-Token'] = tokenWithExpiry;
        tokenizeRequest.respond(200, responseHeader, JSON.stringify(tokenWithExpiry));
        let data = dapUtils.dapGetEncryptedRtdObj({'encryptedSegments': encMembership}, emoduleConfig.params.segtax);
        expect(config.getConfig().ortb2.user.data).to.deep.include.members(data.rtd.ortb2.user.data);
      } finally {
        dapExtractExpiryFromTokenStub.restore();
      }
    });
  });

  describe('dapTokenize', function () {
    it('dapTokenize error callback', function () {
      let configAsync = JSON.parse(JSON.stringify(sampleConfig));
      let submoduleCallback = dapUtils.dapTokenize(configAsync, sampleIdentity, onDone,
        function(token, status, xhr, onDone) {
        },
        function(xhr, status, error, onDone) {
        }
      );
      let request = server.requests[0];
      request.respond(400, responseHeader, JSON.stringify('error'));
      expect(submoduleCallback).to.equal(undefined);
    });

    it('dapTokenize success callback', function () {
      let configAsync = JSON.parse(JSON.stringify(sampleConfig));
      let submoduleCallback = dapUtils.dapTokenize(configAsync, sampleIdentity, onDone,
        function(token, status, xhr, onDone) {
        },
        function(xhr, status, error, onDone) {
        }
      );
      let request = server.requests[0];
      request.respond(200, responseHeader, JSON.stringify('success'));
      expect(submoduleCallback).to.equal(undefined);
    });
  });

  describe('dapTokenize and dapMembership incorrect params', function () {
    it('Onerror and config are null', function () {
      expect(dapUtils.dapTokenize(null, 'identity', onDone, null, null)).to.be.equal(undefined);
      expect(dapUtils.dapMembership(null, 'identity', onDone, null, null)).to.be.equal(undefined);
      expect(dapUtils.dapEncryptedMembership(null, 'identity', onDone, null, null)).to.be.equal(undefined);
      const config = {
        'api_hostname': 'prebid.dap.akadns.net',
        'api_version': 1,
        'domain': '',
        'segtax': 503
      };
      const encConfig = {
        'api_hostname': 'prebid.dap.akadns.net',
        'api_version': 1,
        'domain': '',
        'segtax': 504
      };
      let identity = {
        type: 'dap-signature:1.0.0'
      };
      expect(dapUtils.dapTokenize(config, identity, onDone, null, null)).to.be.equal(undefined);
      expect(dapUtils.dapMembership(config, 'token', onDone, null, null)).to.be.equal(undefined);
      expect(dapUtils.dapEncryptedMembership(encConfig, 'token', onDone, null, null)).to.be.equal(undefined);
    });
  });

  describe('Getting dapTokenize, dapMembership and dapEncryptedMembership from localstorage', function () {
    it('dapGetTokenFromLocalStorage success', function () {
      storage.setDataInLocalStorage(DAP_TOKEN, JSON.stringify(sampleCachedToken));
      expect(dapUtils.dapGetTokenFromLocalStorage(60)).to.be.equal(sampleCachedToken.token);
    });

    it('dapGetMembershipFromLocalStorage success', function () {
      storage.setDataInLocalStorage(DAP_MEMBERSHIP, JSON.stringify(cachedMembership));
      expect(JSON.stringify(dapUtils.dapGetMembershipFromLocalStorage())).to.be.equal(JSON.stringify(membership));
    });

    it('dapGetEncryptedMembershipFromLocalStorage success', function () {
      storage.setDataInLocalStorage(DAP_ENCRYPTED_MEMBERSHIP, JSON.stringify(cachedEncryptedMembership));
      expect(JSON.stringify(dapUtils.dapGetEncryptedMembershipFromLocalStorage())).to.be.equal(JSON.stringify(encMembership));
    });
  });

  describe('dapMembership', function () {
    it('dapMembership success callback', function () {
      let configAsync = JSON.parse(JSON.stringify(sampleConfig));
      let submoduleCallback = dapUtils.dapMembership(configAsync, 'token', onDone,
        function(token, status, xhr, onDone) {
        },
        function(xhr, status, error, onDone) {
        }
      );
      let request = server.requests[0];
      request.respond(200, responseHeader, JSON.stringify('success'));
      expect(submoduleCallback).to.equal(undefined);
    });

    it('dapMembership error callback', function () {
      let configAsync = JSON.parse(JSON.stringify(sampleConfig));
      let submoduleCallback = dapUtils.dapMembership(configAsync, 'token', onDone,
        function(token, status, xhr, onDone) {
        },
        function(xhr, status, error, onDone) {
        }
      );
      let request = server.requests[0];
      request.respond(400, responseHeader, JSON.stringify('error'));
      expect(submoduleCallback).to.equal(undefined);
    });
  });

  describe('dapEncMembership', function () {
    it('dapEncMembership success callback', function () {
      let configAsync = JSON.parse(JSON.stringify(esampleConfig));
      let submoduleCallback = dapUtils.dapEncryptedMembership(configAsync, 'token', onDone,
        function(token, status, xhr, onDone) {
        },
        function(xhr, status, error, onDone) {
        }
      );
      let request = server.requests[0];
      request.respond(200, responseHeader, JSON.stringify('success'));
      expect(submoduleCallback).to.equal(undefined);
    });

    it('dapEncMembership error callback', function () {
      let configAsync = JSON.parse(JSON.stringify(esampleConfig));
      let submoduleCallback = dapUtils.dapEncryptedMembership(configAsync, 'token', onDone,
        function(token, status, xhr, onDone) {
        },
        function(xhr, status, error, onDone) {
        }
      );
      let request = server.requests[0];
      request.respond(400, responseHeader, JSON.stringify('error'));
      expect(submoduleCallback).to.equal(undefined);
    });
  });

  describe('dapMembership', function () {
    it('should invoke the getDapToken and getDapMembership', function () {
      let membership = {
        said: 'item.said1',
        cohorts: 'item.cohorts',
        attributes: null
      };

      let getDapMembershipStub = sinon.stub(dapUtils, 'dapGetMembershipFromLocalStorage').returns(membership);
      let callDapApisStub = sinon.stub(dapUtils, 'callDapAPIs');
      try {
        generateRealTimeData(testReqBidsConfigObj, onDone, cmoduleConfig);
        expect(getDapMembershipStub.calledOnce).to.be.equal(true);
      } finally {
        getDapMembershipStub.restore();
        callDapApisStub.restore();
      }
    });
  });

  describe('dapEncMembership test', function () {
    it('should invoke the getDapToken and getEncDapMembership', function () {
      let encMembership = {
        encryptedSegments: 'enc.seg',
      };

      let getDapEncMembershipStub = sinon.stub(dapUtils, 'dapGetEncryptedMembershipFromLocalStorage').returns(encMembership);
      let callDapApisStub = sinon.stub(dapUtils, 'callDapAPIs');
      try {
        generateRealTimeData(testReqBidsConfigObj, onDone, emoduleConfig);
        expect(getDapEncMembershipStub.calledOnce).to.be.equal(true);
      } finally {
        getDapEncMembershipStub.restore();
        callDapApisStub.restore();
      }
    });
  });

  describe('dapGetRtdObj test', function () {
    it('dapGetRtdObj', function () {
      const config = {
        apiHostname: 'prebid.dap.akadns.net',
        apiVersion: 'x1',
        domain: 'prebid.org',
        segtax: 503
      };
      expect(dapUtils.dapRefreshMembership(config, 'token', onDone)).to.equal(undefined)
      const membership = {cohorts: ['1', '5', '7']}
      expect(dapUtils.dapGetRtdObj(membership, config.segtax)).to.not.equal(undefined);
    });
  });

  describe('checkAndAddRealtimeData test', function () {
    it('add realtime data for segtax 503 and 504', function () {
      dapUtils.checkAndAddRealtimeData(cachedEncRtd, 504);
      dapUtils.checkAndAddRealtimeData(cachedEncRtd, 504);
      expect(config.getConfig().ortb2.user.data).to.deep.include.members([encRtdUserObj]);
      dapUtils.checkAndAddRealtimeData(cachedRtd, 503);
      expect(config.getConfig().ortb2.user.data).to.deep.include.members([rtdUserObj]);
    });
  });

  describe('dapExtractExpiryFromToken test', function () {
    it('test dapExtractExpiryFromToken function', function () {
      let tokenWithoutExpiry = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2Iiwia2lkIjoicGFzc3dvcmQxIn0..6buzBd2BjtgoyaNbHN8YnQ.l38avCfm3sYNy798-ETYOugz0cOx1cCkjACkAhYszxzrZ0sUJ0AiF-NdDXVTiTyp2Ih3vCWKzS0rKJ8lbS1zhyEVWVu91QwtwseM2fBbwA5ggAgBEo5wV-IXqDLPxVnxsPF0D3hP6cNCiH9Q2c-vULfsLhMhG5zvvZDPBbn4hUY5fKB8LoCBTF9rbuuWGYK1nramnb4AlS5UK82wBsHQea1Ou_Kp5wWCMNZ6TZk5qKIuRBfPIAhQblWvHECaHXkg1wyoM9VASs_yNhne7RR-qkwzbFiPFiMJibNOt9hF3_vPDJO5-06ZBjRTP1BllYGWxI-uQX6InzN18Wtun2WHqg.63sH0SNlIRcsK57v0pMujfB_nhU8Y5CuQbsHqH5MGoM'
      expect(dapUtils.dapExtractExpiryFromToken(tokenWithoutExpiry)).to.equal(undefined);
      let tokenWithExpiry = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2Iiwia2lkIjoicGFzc3dvcmQxIiwiZXhwIjoxNjQzODMwMzY5fQ..hTbcSQgmmO0HUJJrQ5fRHw.7zjrQXNNVkb-GD0ZhIVhEPcWbyaDBilHTWv-bp1lFZ9mdkSC0QbcAvUbYteiTD7ya23GUwcL2WOW8WgRSHaWHOJe0B5NDqfdUGTzElWfu7fFodRxRgGmwG8Rq5xxteFKLLGHLf1mFYRJKDtjtgajGNUKIDfn9AEt-c5Qz4KU8VolG_KzrLROx-f6Z7MnoPTcwRCj0WjXD6j2D6RAZ80-mKTNIsMIELdj6xiabHcjDJ1WzwtwCZSE2y2nMs451pSYp8W-bFPfZmDDwrkjN4s9ASLlIXcXgxK-H0GsiEbckQOZ49zsIKyFtasBvZW8339rrXi1js-aBh99M7aS5w9DmXPpUDmppSPpwkeTfKiqF0cQiAUq8tpeEQrGDJuw3Qt2.XI8h9Xw-VZj_NOmKtV19wLM63S4snos7rzkoHf9FXCw'
      expect(dapUtils.dapExtractExpiryFromToken(tokenWithExpiry)).to.equal(1643830369);
    });
  });

  describe('dapRefreshToken test', function () {
    it('test dapRefreshToken success response', function () {
      dapUtils.dapRefreshToken(sampleConfig, true, onDone)
      let request = server.requests[0];
      responseHeader['Akamai-DAP-Token'] = sampleCachedToken.token;
      request.respond(200, responseHeader, JSON.stringify(sampleCachedToken.token));
      expect(JSON.parse(storage.getDataFromLocalStorage(DAP_TOKEN)).token).to.be.equal(sampleCachedToken.token);
    });

    it('test dapRefreshToken success response with deviceid 100', function () {
      dapUtils.dapRefreshToken(esampleConfig, true, onDone)
      let request = server.requests[0];
      responseHeader['Akamai-DAP-100'] = sampleCachedToken.token;
      request.respond(200, responseHeader, '');
      expect(storage.getDataFromLocalStorage('dap_deviceId100')).to.be.equal(sampleCachedToken.token);
    });

    it('test dapRefreshToken success response with exp claim', function () {
      dapUtils.dapRefreshToken(sampleConfig, true, onDone)
      let request = server.requests[0];
      let tokenWithExpiry = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2Iiwia2lkIjoicGFzc3dvcmQxIiwiZXhwIjoxNjQzODMwMzY5fQ..hTbcSQgmmO0HUJJrQ5fRHw.7zjrQXNNVkb-GD0ZhIVhEPcWbyaDBilHTWv-bp1lFZ9mdkSC0QbcAvUbYteiTD7ya23GUwcL2WOW8WgRSHaWHOJe0B5NDqfdUGTzElWfu7fFodRxRgGmwG8Rq5xxteFKLLGHLf1mFYRJKDtjtgajGNUKIDfn9AEt-c5Qz4KU8VolG_KzrLROx-f6Z7MnoPTcwRCj0WjXD6j2D6RAZ80-mKTNIsMIELdj6xiabHcjDJ1WzwtwCZSE2y2nMs451pSYp8W-bFPfZmDDwrkjN4s9ASLlIXcXgxK-H0GsiEbckQOZ49zsIKyFtasBvZW8339rrXi1js-aBh99M7aS5w9DmXPpUDmppSPpwkeTfKiqF0cQiAUq8tpeEQrGDJuw3Qt2.XI8h9Xw-VZj_NOmKtV19wLM63S4snos7rzkoHf9FXCw'
      responseHeader['Akamai-DAP-Token'] = tokenWithExpiry;
      request.respond(200, responseHeader, JSON.stringify(tokenWithExpiry));
      expect(JSON.parse(storage.getDataFromLocalStorage(DAP_TOKEN)).expires_at).to.be.equal(1643830359);
    });

    it('test dapRefreshToken error response', function () {
      storage.setDataInLocalStorage(DAP_TOKEN, JSON.stringify(sampleCachedToken));
      dapUtils.dapRefreshToken(sampleConfig, false, onDone)
      let request = server.requests[0];
      request.respond(400, responseHeader, 'error');
      expect(JSON.parse(storage.getDataFromLocalStorage(DAP_TOKEN)).expires_at).to.be.equal(cacheExpiry);// Since the expiry is same, the token is not updated in the cache
    });
  });

  describe('dapRefreshEncryptedMembership test', function () {
    it('test dapRefreshEncryptedMembership success response', function () {
      let expiry = Math.round(Date.now() / 1000.0) + 3600; // in seconds
      let encMembership = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2Iiwia2lkIjoic29tZXNlY3JldGludmF1bHQifQ..f8_At4OqeQXyQcSwThOJ_w.69ImVQ3bEZ6QP7ROCRpAJjNcKY49SEPYR6qTp_8l7L8kQdPbpi4wmuOzt78j7iBrX64k2wltzmQFjDmVKSxDhrEguxpgx6t-L1tT8ZA0UosMWpVsgmKEZxOn2e9ES3jw8RNCS4WSWocSPQX33xSb51evXjm9E1s0tGoLnwXl0GsUvzRsSU86wQG6RZnAQTi7s-r-M2TKibdDjUqgIt62vJ-aBZ7RWw91MINgOdmDNs1bFfbBX5Cy1kd4-kjvRDz_aJ6zHX4sK_7EmQhGEY3tW-A3_l2I88mw-RSJaPkb_IWg0QpVwXDaE2F2g8NpY1PzCRvG_NIE8r28eK5q44OMVitykHmKmBXGDj7z2JVgoXkfo5u0I-dypZARn4GP_7niK932avB-9JD7Mz3TrlU4GZ7IpYfJ91PMsRhrs5xNPQwLZbpuhF76A7Dp7iss71UjkGCiPTU6udfRb4foyf_7xEF66m1eQVcVaMdxEbMuu9GBfdr-d04TbtJhPfUV8JfxTenvRYoi13n0j5kH0M5OgaSQD9kQ3Mrd9u-Cms-BGtT0vf-N8AaFZY_wn0Y4rkpv5HEaH7z3iT4RCHINWrXb_D0WtjLTKQi2YmF8zMlzUOewNJGwZRwbRwxc7JoDIKEc5RZkJYevfJXOEEOPGXZ7AGZxOEsJawPqFqd_nOUosCZS4akHhcDPcVowoecVAV0hhhoS6JEY66PhPp1snbt6yqA-fQhch7z8Y-DZT3Scibvffww3Scg_KFANWp0KeEvHG0vyv9R2F4o66viSS8y21MDnM7Yjk8C-j7aNMldUQbjN_7Yq1nkfe0jiBX_hsINBRPgJHUY4zCaXuyXs-JZZfU92nwG0RT3A_3RP2rpY8-fXp9d3C2QJjEpnmHvTMsuAZCQSBe5DVrJwN_UKedxcJEoOt0wLz6MaCMyYZPd8tnQeqYK1cd3RgQDXtzKC0HDw1En489DqJXEst4eSSkaaW1lImLeaF8XCOaIqPqoyGk4_6KVLw5Q7OnpczuXqYKMd9UTMovGeuTuo1k0ddfEqTq9QwxkwZL51AiDRnwTCAeYBU1krV8FCJQx-mH_WPB5ftZj-o_3pbvANeRk27QBVmjcS-tgDllJkWBxX-4axRXzLw8pUUUZUT_NOL0OiqUCWVm0qMBEpgRQ57Se42-hkLMTzLhhGJOnVcaXU1j4ep-N7faNvbgREBjf_LgzvaWS90a2NJ9bB_J9FyXelhCN_AMLfdOS3fHkeWlZ0u0PMbn5DxXRMe0l9jB-2VJZhcPQRlWoYyoCO3l4F5ZmuQP5Xh9CU4tvSWih6jlwMDgdVWuTpdfPD5bx8ccog3JDq87enx-QtPzLU3gMgouNARJGgNwKS_GJSE1uPrt2oiqgZ3Z0u_I5MKvPdQPV3o-4rsaE730eB4OwAOF-mkGWpzy8Pbl-Qe5PR9mHBhuyJgZ-WDSCHl5yvet2kfO9mPXZlqBQ26fzTcUYH94MULAZn36og6w.3iKGv-Le-AvRmi26W1v6ibRLGbwKbCR92vs-a9t55hw';
      dapUtils.dapRefreshEncryptedMembership(esampleConfig, sampleCachedToken.token, onDone)
      let request = server.requests[0];
      responseHeader['Akamai-DAP-Token'] = encMembership;
      request.respond(200, responseHeader, encMembership);
      let rtdObj = dapUtils.dapGetEncryptedRtdObj({'encryptedSegments': encMembership}, 504)
      expect(config.getConfig().ortb2.user.data).to.deep.include.members(rtdObj.rtd.ortb2.user.data);
      expect(JSON.parse(storage.getDataFromLocalStorage(DAP_ENCRYPTED_MEMBERSHIP)).expires_at).to.equal(expiry);
    });

    it('test dapRefreshEncryptedMembership success response with exp claim', function () {
      let encMembership = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2Iiwia2lkIjoic29tZXNlY3JldGludmF1bHQiLCJleHAiOjE2NDM4MzA2NDB9..inYoxwht_aqTIWqGhEm_Gw.wDcCUOCwtqgnNUouaD723gKfm7X7bgkHgtiX4mr07P3tWk25PUQunmwTLhWBB5CYzzGIfIvveG_u4glNRLi_eRSQV4ihKKk1AN-BSSJ3d0CLAdY9I1WG5vX1VmopXyKnV90bl9SLNqnhg4Vxe6YU4ogTYxsKHuIN1EeIH4hpl-HbCQWQ1DQt4mB-MQF8V9AWTfU0D7sFMSK8f9qj6NGmf1__oHdHUlws0t5V2UAn_dhJexsuREK_gh65pczCuly5eEcziZ82LeP-nOhKWSRHB_tS_mKXrRU6_At_EVDgtfA3PSBJ6eQylCii6bTL42vZzz4jZhJv_3eLfRdKqpVT5CWNBzcDoQ2VcQgKgIBtPJ45KFfAYTQ6kdl21QMSjqtu8GTsv1lEZtrqHY6zRiG8_Mu28-PmjEw4LDdZmBDOeroue_MJD6wuE_jlE7J2iVdo8CkVnoRgzFwNbKBo7CK4z0WahV9rhuOm0LKAN5H0jF_gj696U-3fVTDTIb8ndNKNI2_xAhvWs00BFGtUtWgr8QGDGRTDCNGsDgnb_Vva9xCqVOyAE9O3Fq1QYl-tMA-KkBt3zzvmFFpOxpOyH-lUubKLKlsrxKc3GSyVEQ9DDLhrXXJgR5H5BSE4tjlK7p3ODF5qz0FHtIj7oDcgLazFO7z2MuFy2LjJmd3hKl6ujcfYEDiQ4D3pMIo7oiU33aFBD1YpzI4-WzNfJlUt1FoK0-DAXpbbV95s8p08GOD4q81rPw5hRADKJEr0QzrbDwplTWCzT2fKXMg_dIIc5AGqGKnVRUS6UyF1DnHpudNIJWxyWZjWIEw_QNjU0cDFmyPSyKxNrnfq9w8WE2bfbS5KTicxei5QHnC-cnL7Nh7IXp7WOW6R1YHbNPT7Ad4OhnlV-jjrXwkSv4wMAbfwAWoSCchGh7uvENNAeJymuponlJbOgw_GcYM73hMs8Z8W9qxRfbyF4WX5fDKXg61mMlaieHkc0EnoC5q7uKyXuZUehHZ76JLDFmewslLkQq5SkVCttzJePBnY1ouPEHw5ZTzUnG5f01QQOVcjIN-AqXNDbG5IOwq0heyS6vVfq7lZKJdLDVQ21qRjazGPaqYwLzugkWkzCOzPTgyFdbXzgjfmJwylHSOM5Jpnul84GzxEQF-1mHP2A8wtIT-M7_iX24It2wwWvc8qLA6GEqruWCtNyoug8CXo44mKdSSCGeEZHtfMbzXdLIBHCy2jSHz5i8S7DU_R7rE_5Ssrb81CqIYbgsAQBHtOYoyvzduTOruWcci4De0QcULloqImIEHUuIe2lnYO889_LIx5p7nE3UlSvLBo0sPexavFUtHqI6jdG6ye9tdseUEoNBDXW0aWD4D-KXX1JLtAgToPVUtEaXCJI7QavwO9ZG6UZM6jbfuJ5co0fvUXp6qYrFxPQo2dYHkar0nT6s1Zg5l2g8yWlLUJrHdHAzAw_NScUp71OpM4TmNsLnYaPVPcOxMvtJXTanbNWr0VKc8gy9q3k_1XxAnQwiduNs7f5bA-6qCVpayHv5dE7mUhFEwyh1_w95jEaURsQF_hnnd2OqRkADfiok4ZiPU2b38kFW1LXjpI39XXES3JU0e08Rq2uuelyLbCLWuJWq_axuKSZbZvpYeqWtIAde8FjCiO7RPlEc0nyzWBst8RBxQ-Bekg9UXPhxBRcm0HwA.Q2cBSFOQAC-QKDwmjrQXnVQd3jNOppMl9oZfd2yuKeY';
      dapUtils.dapRefreshEncryptedMembership(esampleConfig, sampleCachedToken.token, onDone)
      let request = server.requests[0];
      responseHeader['Akamai-DAP-Token'] = encMembership;
      request.respond(200, responseHeader, encMembership);
      let rtdObj = dapUtils.dapGetEncryptedRtdObj({'encryptedSegments': encMembership}, 504)
      expect(config.getConfig().ortb2.user.data).to.deep.include.members(rtdObj.rtd.ortb2.user.data);
      expect(JSON.parse(storage.getDataFromLocalStorage(DAP_ENCRYPTED_MEMBERSHIP)).expires_at).to.equal(1643830630);
    });

    it('test dapRefreshEncryptedMembership error response', function () {
      dapUtils.dapRefreshEncryptedMembership(esampleConfig, sampleCachedToken.token, onDone)
      let request = server.requests[0];
      request.respond(400, responseHeader, 'error');
      expect(config.getConfig().ortb2).to.be.equal(undefined);
    });

    it('test dapRefreshEncryptedMembership 403 error response', function () {
      dapUtils.dapRefreshEncryptedMembership(esampleConfig, sampleCachedToken.token, onDone)
      let request = server.requests[0];
      request.respond(403, responseHeader, 'error');
      let requestTokenize = server.requests[1];
      responseHeader['Akamai-DAP-Token'] = sampleCachedToken.token;
      requestTokenize.respond(200, responseHeader, '');
      let requestMembership = server.requests[2];
      requestMembership.respond(403, responseHeader, 'error');
      expect(server.requests.length).to.be.equal(DAP_MAX_RETRY_TOKENIZE + 2);
    });
  });

  describe('dapRefreshMembership test', function () {
    it('test dapRefreshMembership success response', function () {
      let membership = {'cohorts': ['9', '11', '13'], 'said': 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2Iiwia2lkIjoicGFzc3dvcmQxIn0..17wnrhz6FbWx0Cf6LXpm1A.m9PKVCradk3CZokNKzVHzE06TOqiXYeijgxTQUiQy5Syx-yicnO8DyYX6zQ6rgPcNgUNRt4R4XE5MXuK0laUVQJr9yc9g3vUfQfw69OMYGW_vRlLMPzoNOhF2c4gSyfkRrLr7C0qgALmZO1D11sPflaCTNmO7pmZtRaCOB5buHoWcQhp1bUSJ09DNDb31dX3llimPwjNGSrUhyq_EZl4HopnnjxbM4qVNMY2G_43C_idlVOvbFoTxcDRATd-6MplJoIOIHQLDZEetpIOVcbEYN9gQ_ndBISITwuu5YEgs5C_WPHA25nm6e4BT5R-tawSA8yPyQAupqE8gk4ZWq_2-T0cqyTstIHrMQnZ_vysYN7h6bkzE-KeZRk7GMtySN87_fiu904hLD9QentGegamX6UAbVqQh7Htj7SnMHXkEenjxXAM5mRqQvNCTlw8k-9-VPXs-vTcKLYP8VFf8gMOmuYykgWac1gX-svyAg-24mo8cUbqcsj9relx4Qj5HiXUVyDMBZxK-mHZi-Xz6uv9GlggcsjE13DSszar-j2OetigpdibnJIxRZ-4ew3-vlvZ0Dul3j0LjeWURVBWYWfMjuZ193G7lwR3ohh_NzlNfwOPBK_SYurdAnLh7jJgTW-lVLjH2Dipmi9JwX9s03IQq9opexAn7hlM9oBI6x5asByH8JF8WwZ5GhzDjpDwpSmHPQNGFRSyrx_Sh2CPWNK6C1NJmLkyqAtJ5iw0_al7vPDQyZrKXaLTjBCUnbpJhUZ8dUKtWLzGPjzFXp10muoDIutd1NfyKxk1aWGhx5aerYuLdywv6cT_M8RZTi8924NGj5VA30V5OvEwLLyX93eDhntXZSCbkPHpAfiRZNGXrPY.GhCbWGQz11mIRD4uPKmoAuFXDH7hGnils54zg7N7-TU'}
      dapUtils.dapRefreshMembership(sampleConfig, sampleCachedToken.token, onDone);
      let request = server.requests[0];
      request.respond(200, responseHeader, JSON.stringify(membership));
      let rtdObj = dapUtils.dapGetRtdObj(membership, 503);
      expect(config.getConfig().ortb2.user.data).to.deep.include.members(rtdObj.rtd.ortb2.user.data);
    });

    it('test dapRefreshMembership success response with exp claim', function () {
      let membership = {'cohorts': ['9', '11', '13'], 'said': 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2Iiwia2lkIjoicGFzc3dvcmQxIiwiZXhwIjoxNjQ3OTcxNTU4fQ..ptdM5WO-62ypXlKxFXD4FQ.waEo9MHS2NYQCi-zh_p6HgT9BdqGyQbBq4GfGLfsay4nRBgICsTS-VkV6e7xx5U1T8BgpKkRJIZBwTOY5Pkxk9FpK5nnffDSEljRrp1LXLCkNP4qwrlqHInFbZsonNWW4_mW-7aUPlTwIsTbfjTuyHdXHeQa1ALrwFFFWE7QUmPNd2RsHjDwUsxlJPEb5TnHn5W0Mgo_PQZaxvhJInMbxPgtJLoqnJvOqCBEoQY7au7ALZL_nWK8XIwPMF19J7Z3cBg9vQInhr_E3rMdQcAFHEzYfgoNcIYCCR0t1UOqUE3HNtX-E64kZAYKWdlsBb9eW5Gj9hHYyPNL_4Hntjg5eLXGpsocMg0An-qQKGC6hkrxKzeM-GrjpvSaQLNs4iqDpHUtzA02LW_vkLkMNRUiyXVJ3FUZwfyq6uHSRKWZ6UFdAfL0rfJ8q8x8Ll-qJO2Jfyvidlsi9FIs7x1WJrvDCKepfAQM1UXRTonrQljFBAk83PcL2bmWuJDgJZ0lWS4VnZbIf6A7fDourmkDxdVRptvQq5nSjtzCA6whRw0-wGz8ehNJsaJw9H_nG9k4lRKs7A5Lqsyy7TVFrAPjnA_Q1a2H6xF2ULxrtIqoNqdX7k9RjowEZSQlZgZUOAmI4wzjckdcSyC_pUlYBMcBwmlld34mmOJe9EBHAxjdci7Q_9lvj1HTcwGDcQITXnkW9Ux5Jkt9Naw-IGGrnEIADaT2guUAto8W_Gb05TmwHSd6DCmh4zepQCbqeVe6AvPILtVkTgsTTo27Q-NvS7h-XtthJy8425j5kqwxxpZFJ0l0ytc6DUyNCLJXuxi0JFU6-LoSXcROEMVrHa_Achufr9vHIELwacSAIHuwseEvg_OOu1c1WYEwZH8ynBLSjqzy8AnDj24hYgA0YanPAvDqacrYrTUFqURbHmvcQqLBTcYa_gs7uDx4a1EjtP_NvHRlvCgGAaASrjGMhTX8oJxlTqahhQ.pXm-7KqnNK8sbyyczwkVYhcjgiwkpO8LjBBVw4lcyZE'};
      dapUtils.dapRefreshMembership(sampleConfig, sampleCachedToken.token, onDone);
      let request = server.requests[0];
      request.respond(200, responseHeader, JSON.stringify(membership));
      let rtdObj = dapUtils.dapGetRtdObj(membership, 503)
      expect(config.getConfig().ortb2.user.data).to.deep.include.members(rtdObj.rtd.ortb2.user.data);
      expect(JSON.parse(storage.getDataFromLocalStorage(DAP_MEMBERSHIP)).expires_at).to.be.equal(1647971548);
    });

    it('test dapRefreshMembership 400 error response', function () {
      dapUtils.dapRefreshMembership(sampleConfig, sampleCachedToken.token, onDone)
      let request = server.requests[0];
      request.respond(400, responseHeader, 'error');
      expect(config.getConfig().ortb2).to.be.equal(undefined);
    });

    it('test dapRefreshMembership 403 error response', function () {
      dapUtils.dapRefreshMembership(sampleConfig, sampleCachedToken.token, onDone)
      let request = server.requests[0];
      request.respond(403, responseHeader, 'error');
      expect(server.requests.length).to.be.equal(DAP_MAX_RETRY_TOKENIZE);
    });
  });

  describe('dapGetEncryptedMembershipFromLocalStorage test', function () {
    it('test dapGetEncryptedMembershipFromLocalStorage function with valid cache', function () {
      storage.setDataInLocalStorage(DAP_ENCRYPTED_MEMBERSHIP, JSON.stringify(cachedEncryptedMembership))
      expect(JSON.stringify(dapUtils.dapGetEncryptedMembershipFromLocalStorage())).to.equal(JSON.stringify(encMembership));
    });

    it('test dapGetEncryptedMembershipFromLocalStorage function with invalid cache', function () {
      let expiry = Math.round(Date.now() / 1000.0) - 100; // in seconds
      let encMembership = {'expiry': expiry, 'encryptedSegments': cachedEncryptedMembership.encryptedSegments}
      storage.setDataInLocalStorage(DAP_ENCRYPTED_MEMBERSHIP, JSON.stringify(encMembership))
      expect(dapUtils.dapGetEncryptedMembershipFromLocalStorage()).to.equal(null);
    });
  });

  describe('Akamai-DAP-SS-ID test', function () {
    it('Akamai-DAP-SS-ID present in response header', function () {
      let expiry = Math.round(Date.now() / 1000.0) + 300; // in seconds
      dapUtils.dapRefreshToken(sampleConfig, false, onDone)
      let request = server.requests[0];
      let sampleSSID = 'Test_SSID_Spec';
      responseHeader['Akamai-DAP-Token'] = sampleCachedToken.token;
      responseHeader['Akamai-DAP-SS-ID'] = sampleSSID;
      request.respond(200, responseHeader, '');
      expect(storage.getDataFromLocalStorage(DAP_SS_ID)).to.be.equal(JSON.stringify(sampleSSID));
    });

    it('Test if Akamai-DAP-SS-ID is present in request header', function () {
      let expiry = Math.round(Date.now() / 1000.0) + 100; // in seconds
      storage.setDataInLocalStorage(DAP_SS_ID, JSON.stringify('Test_SSID_Spec'))
      dapUtils.dapRefreshToken(sampleConfig, false, onDone)
      let request = server.requests[0];
      let ssidHeader = request.requestHeaders['Akamai-DAP-SS-ID'];
      responseHeader['Akamai-DAP-Token'] = sampleCachedToken.token;
      request.respond(200, responseHeader, '');
      expect(ssidHeader).to.be.equal('Test_SSID_Spec');
    });
  });

  describe('Test gdpr and usp consent handling', function () {
    it('Gdpr applies and gdpr consent string not present', function () {
      expect(akamaiDapRtdSubmodule.init(null, sampleGdprConsentConfig)).to.equal(false);
    });

    it('Gdpr applies and gdpr consent string is present', function () {
      sampleGdprConsentConfig.gdpr.consentString = 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==';
      expect(akamaiDapRtdSubmodule.init(null, sampleGdprConsentConfig)).to.equal(true);
    });

    it('USP consent present and user have opted out', function () {
      expect(akamaiDapRtdSubmodule.init(null, sampleUspConsentConfig)).to.equal(false);
    });

    it('USP consent present and user have not been provided with option to opt out', function () {
      expect(akamaiDapRtdSubmodule.init(null, {'usp': '1NYY'})).to.equal(false);
    });

    it('USP consent present and user have not opted out', function () {
      expect(akamaiDapRtdSubmodule.init(null, {'usp': '1YNY'})).to.equal(true);
    });
  });
});
