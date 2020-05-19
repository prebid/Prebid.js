import { expect } from 'chai';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';
import { newStorageManager } from 'src/storageManager.js';
import { getRefererInfo } from 'src/refererDetection.js';
import { uspDataHandler } from 'src/adapterManager.js';
import { init, requestBidsHook, setSubmoduleRegistry } from 'modules/userId/index.js';
import { parrableIdSubmodule } from 'modules/parrableIdSystem.js';
import { server } from 'test/mocks/xhr.js';

const storage = newStorageManager();

const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';
const P_COOKIE_NAME = '_parrable_eid';
const P_COOKIE_EID = '01.1563917337.test-eid';
const P_XHR_EID = '01.1588030911.test-new-eid'
const P_CONFIG_MOCK = {
  name: 'parrableId',
  params: {
    partner: 'parrable_test_partner_123,parrable_test_partner_456'
  },
  storage: {
    name: '_parrable_eid',
    type: 'cookie',
    expires: 364
  }
};

describe('Parrable ID System', function() {
  function getConfigMock() {
    return {
      userSync: {
        syncDelay: 0,
        userIds: [P_CONFIG_MOCK]
      }
    }
  }

  function getAdUnitMock(code = 'adUnit-code') {
    return {
      code,
      mediaTypes: {banner: {}, native: {}},
      sizes: [
        [300, 200],
        [300, 600]
      ],
      bids: [{
        bidder: 'sampleBidder',
        params: { placementId: 'banner-only-bidder' }
      }]
    };
  }

  describe('parrableIdSystem.getId()', function() {
    let callbackSpy = sinon.spy();

    beforeEach(function() {
      callbackSpy.resetHistory();
    });

    it('returns a callback used to refresh the ID', function() {
      let getIdResponse = parrableIdSubmodule.getId(
        P_CONFIG_MOCK.params,
        null,
        P_COOKIE_EID
      );
      expect(getIdResponse.callback).to.be.a('function');
    });

    it('callback creates xhr to Parrable that synchronizes the ID', function() {
      let getIdCallback = parrableIdSubmodule.getId(
        P_CONFIG_MOCK.params,
        null,
        P_COOKIE_EID
      ).callback;

      getIdCallback(callbackSpy);

      let request = server.requests[0];
      let queryParams = utils.parseQS(request.url.split('?')[1]);
      let data = JSON.parse(atob(queryParams.data));

      expect(request.url).to.contain('h.parrable.com');
      expect(queryParams).to.not.have.property('us_privacy');
      expect(data).to.deep.equal({
        eid: P_COOKIE_EID,
        trackers: P_CONFIG_MOCK.params.partner.split(','),
        url: getRefererInfo().referer
      });

      server.requests[0].respond(200,
        { 'Content-Type': 'text/plain' },
        JSON.stringify({ eid: P_XHR_EID })
      );

      expect(callbackSpy.calledWith(P_XHR_EID)).to.be.true;
    });

    it('passes the uspString to Parrable', function() {
      let uspString = '1YNN';
      uspDataHandler.setConsentData(uspString);
      parrableIdSubmodule.getId(
        P_CONFIG_MOCK.params,
        null,
        P_COOKIE_EID
      ).callback(callbackSpy);
      expect(server.requests[0].url).to.contain('us_privacy=' + uspString);
    });
  });

  describe('Parrable ID in Bid Request', function() {
    let adUnits;
    let logErrorStub;

    beforeEach(function() {
      adUnits = [getAdUnitMock()];
      // simulate existing browser local storage values
      storage.setCookie(
        P_COOKIE_NAME,
        P_COOKIE_EID,
        (new Date(Date.now() + 5000).toUTCString())
      );
      setSubmoduleRegistry([parrableIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock());
      logErrorStub = sinon.stub(utils, 'logError');
    });

    afterEach(function() {
      storage.setCookie(P_COOKIE_NAME, '', EXPIRED_COOKIE_DATE);
      logErrorStub.restore();
    });

    it('provides the parrableid in the bid request', function(done) {
      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.parrableid');
            expect(bid.userId.parrableid).to.equal(P_COOKIE_EID);
          });
        });
        done();
      }, { adUnits });
    });

    it('should log an error and continue to callback if ajax request errors', function () {
      let callBackSpy = sinon.spy();
      let submoduleCallback = parrableIdSubmodule.getId({partner: 'prebid'}).callback;
      submoduleCallback(callBackSpy);
      let request = server.requests[0];
      expect(request.url).to.contain('h.parrable.com');
      request.respond(
        503,
        null,
        'Unavailable'
      );
      expect(logErrorStub.calledOnce).to.be.true;
      expect(callBackSpy.calledOnce).to.be.true;
    });
  });
});
