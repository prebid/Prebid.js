import {config} from 'src/config.js';
import {SEGMENTS_STORAGE_KEY, TOKEN_STORAGE_KEY, dapUtils, addRealTimeData, getRealTimeData, akamaiDapRtdSubmodule, storage} from 'modules/akamaiDapRtdProvider.js';
import {server} from 'test/mocks/xhr.js';
import logMessage from 'src/utils.js'
const responseHeader = {'Content-Type': 'application/json'};

describe('akamaiDapRtdProvider', function() {
  let getDataFromLocalStorageStub;
  let getDapTokenStub;

  const testReqBidsConfigObj = {
    adUnits: [
      {
        bids: ['bid1', 'bid2']
      }
    ]
  };

  const onDone = function() { return true };

  const onSuccess = function() { return ('request', 200, 'success') };

  const cmoduleConfig = {
    'name': 'dap',
    'waitForIt': true,
    'params': {
      'apiHostname': 'prebid.dap.akadns.net',
      'apiVersion': 'x1',
      'domain': 'prebid.org',
      'identityType': 'dap-signature:1.0.0',
      'segtax': 503,
      'tokenTtl': 5
    }
  }

  const sampleConfig = {
    'api_hostname': 'prebid.dap.akadns.net',
    'api_version': 'x1',
    'domain': 'prebid.org',
    'segtax': 503
  }
  const sampleIdentity = {
    type: 'dap-signature:1.0.0'
  };

  beforeEach(function() {
    config.resetConfig();
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage')
  });

  afterEach(function () {
    getDataFromLocalStorageStub.restore();
  });

  describe('akamaiDapRtdSubmodule', function() {
    it('successfully instantiates', function () {
		  expect(akamaiDapRtdSubmodule.init()).to.equal(true);
    });
  });

  describe('Get Real-Time Data', function() {
    it('gets rtd from local storage cache', function() {
      const rtdConfig = {
        params: {
          segmentCache: true
        }
      };

      const bidConfig = {};

      const rtdUserObj1 = {
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

      const cachedRtd = {
        rtd: {
          ortb2: {
            user: {
              data: [rtdUserObj1]
            }
          }
        }
      };

      getDataFromLocalStorageStub.withArgs(SEGMENTS_STORAGE_KEY).returns(JSON.stringify(cachedRtd));

      expect(config.getConfig().ortb2).to.be.undefined;
      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(config.getConfig().ortb2.user.data).to.deep.include.members([rtdUserObj1]);
    });

    it('should initalise and return with config', function () {
      expect(getRealTimeData(testReqBidsConfigObj, onDone, cmoduleConfig)).to.equal(undefined)
    });
  });

  describe('dapTokenize', function () {
    it('dapTokenize error callback', function () {
      let configAsync = JSON.parse(JSON.stringify(sampleConfig));
      let submoduleCallback = dapUtils.dapTokenize(configAsync, sampleIdentity,
        function(token, status, xhr) {
        },
        function(xhr, status, error) {
        }
      );
      let request = server.requests[0];
      request.respond(400, responseHeader, JSON.stringify('error'));
      expect(submoduleCallback).to.equal(undefined);
    });

    it('dapTokenize success callback', function () {
      let configAsync = JSON.parse(JSON.stringify(sampleConfig));
      let submoduleCallback = dapUtils.dapTokenize(configAsync, sampleIdentity,
        function(token, status, xhr) {
        },
        function(xhr, status, error) {
        }
      );
      let request = server.requests[0];
      request.respond(200, responseHeader, JSON.stringify('success'));
      expect(submoduleCallback).to.equal(undefined);
    });
  });

  describe('dapTokenize and dapMembership incorrect params', function () {
    it('Onerror and config are null', function () {
      expect(dapUtils.dapTokenize(null, 'identity', null, null)).to.be.equal(undefined);
      expect(dapUtils.dapMembership(null, 'identity', null, null)).to.be.equal(undefined);
      const config = {
        'api_hostname': 'prebid.dap.akadns.net',
        'api_version': 1,
        'domain': '',
        'segtax': 503
      };
      let identity = {
        type: 'dap-signature:1.0.0'
      };
      expect(dapUtils.dapTokenize(config, identity, null, null)).to.be.equal(undefined);
      expect(dapUtils.dapMembership(config, 'token', null, null)).to.be.equal(undefined);
    });

    it('dapGetToken success', function () {
      let dapTokenizeStub = sinon.stub(dapUtils, 'dapTokenize').returns(onSuccess);
      expect(dapUtils.dapGetToken(sampleConfig, 'token',
        function(token, status, xhr) {
        },
        function(xhr, status, error) {
        }
      )).to.be.equal(null);
      dapTokenizeStub.restore();
    });
  });

  describe('dapMembership', function () {
    it('dapMembership success callback', function () {
      let configAsync = JSON.parse(JSON.stringify(sampleConfig));
      let submoduleCallback = dapUtils.dapMembership(configAsync, 'token',
        function(token, status, xhr) {
        },
        function(xhr, status, error) {
        }
      );
      let request = server.requests[0];
      request.respond(200, responseHeader, JSON.stringify('success'));
      expect(submoduleCallback).to.equal(undefined);
    });

    it('dapMembership error callback', function () {
      let configAsync = JSON.parse(JSON.stringify(sampleConfig));
      let submoduleCallback = dapUtils.dapMembership(configAsync, 'token',
        function(token, status, xhr) {
        },
        function(xhr, status, error) {
        }
      );
      let request = server.requests[0];
      request.respond(400, responseHeader, JSON.stringify('error'));
      expect(submoduleCallback).to.equal(undefined);
    });
  });

  describe('dapMembership', function () {
    it('should invoke the getDapToken and getDapMembership', function () {
      let config = {
        api_hostname: cmoduleConfig.params.apiHostname,
        api_version: cmoduleConfig.params.apiVersion,
        domain: cmoduleConfig.params.domain,
        segtax: cmoduleConfig.params.segtax
      };
      let identity = {
        type: cmoduleConfig.params.identityType
      };

      let membership = {
        said: 'item.said1',
        cohorts: 'item.cohorts',
        attributes: null
      };

      let getDapTokenStub = sinon.stub(dapUtils, 'dapGetToken').returns('token3');
      let getDapMembershipStub = sinon.stub(dapUtils, 'dapGetMembership').returns(membership);
      let dapTokenizeStub = sinon.stub(dapUtils, 'dapTokenize').returns('response', 200, 'request');
      getRealTimeData(testReqBidsConfigObj, onDone, cmoduleConfig);
      expect(getDapTokenStub.calledOnce).to.be.equal(true);
      expect(getDapMembershipStub.calledOnce).to.be.equal(true);
      getDapTokenStub.restore();
      getDapMembershipStub.restore();
      dapTokenizeStub.restore();
    });
  });

  describe('dapMembershipToRtbSegment', function () {
    it('dapMembershipToRtbSegment', function () {
      let membership1 = {
        said: 'item.said1',
        cohorts: 'item.cohorts',
        attributes: null
      };
      const config = {
        apiHostname: 'prebid.dap.akadns.net',
        apiVersion: 'x1',
        domain: 'prebid.org',
        tokenTtl: 5,
        segtax: 503
      };
      let identity = {
        type: 'dap-signature:1.0.0'
      };

      expect(dapUtils.dapGetMembership(config, 'token')).to.equal(null)
      const membership = {cohorts: ['1', '5', '7']}
      expect(dapUtils.dapMembershipToRtbSegment(membership, config)).to.not.equal(undefined);
    });
  });
});
