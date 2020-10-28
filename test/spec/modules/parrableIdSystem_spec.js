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
const P_COOKIE_NAME = '_parrable_id';
const P_COOKIE_EID = '01.1563917337.test-eid';
const P_XHR_EID = '01.1588030911.test-new-eid'
const P_CONFIG_MOCK = {
  name: 'parrableId',
  params: {
    partner: 'parrable_test_partner_123,parrable_test_partner_456'
  }
};

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

function serializeParrableId(parrableId) {
  let str = '';
  if (parrableId.eid) {
    str += 'eid:' + parrableId.eid;
  }
  if (parrableId.ibaOptout) {
    str += ',ibaOptout:1';
  }
  if (parrableId.ccpaOptout) {
    str += ',ccpaOptout:1';
  }
  return str;
}

function writeParrableCookie(parrableId) {
  let cookieValue = encodeURIComponent(serializeParrableId(parrableId));
  storage.setCookie(
    P_COOKIE_NAME,
    cookieValue,
    (new Date(Date.now() + 5000).toUTCString()),
    'lax'
  );
}

function removeParrableCookie() {
  storage.setCookie(P_COOKIE_NAME, '', EXPIRED_COOKIE_DATE);
}

describe('Parrable ID System', function() {
  describe('parrableIdSystem.getId() callback', function() {
    let logErrorStub;
    let callbackSpy = sinon.spy();

    beforeEach(function() {
      logErrorStub = sinon.stub(utils, 'logError');
      callbackSpy.resetHistory();
      writeParrableCookie({ eid: P_COOKIE_EID });
    });

    afterEach(function() {
      removeParrableCookie();
      logErrorStub.restore();
    })

    it('creates xhr to Parrable that synchronizes the ID', function() {
      let getIdResult = parrableIdSubmodule.getId(P_CONFIG_MOCK.params);

      getIdResult.callback(callbackSpy);

      let request = server.requests[0];
      let queryParams = utils.parseQS(request.url.split('?')[1]);
      let data = JSON.parse(atob(queryParams.data));

      expect(getIdResult.callback).to.be.a('function');
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

      expect(callbackSpy.lastCall.lastArg).to.deep.equal({
        eid: P_XHR_EID
      });

      expect(storage.getCookie(P_COOKIE_NAME)).to.equal(
        encodeURIComponent('eid:' + P_XHR_EID)
      );
    });

    it('xhr passes the uspString to Parrable', function() {
      let uspString = '1YNN';
      uspDataHandler.setConsentData(uspString);
      parrableIdSubmodule.getId(
        P_CONFIG_MOCK.params,
        null,
        null
      ).callback(callbackSpy);
      uspDataHandler.setConsentData(null);
      expect(server.requests[0].url).to.contain('us_privacy=' + uspString);
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

  describe('parrableIdSystem.getId() id', function() {
    it('provides the stored Parrable values if a cookie exists', function() {
      writeParrableCookie({ eid: P_COOKIE_EID });
      let getIdResult = parrableIdSubmodule.getId(P_CONFIG_MOCK.params);
      removeParrableCookie();

      expect(getIdResult.id).to.deep.equal({
        eid: P_COOKIE_EID
      });
    });

    it('provides the stored legacy Parrable ID values if cookies exist', function() {
      let oldEid = '01.111.old-eid';
      let oldEidCookieName = '_parrable_eid';
      let oldOptoutCookieName = '_parrable_optout';

      storage.setCookie(oldEidCookieName, oldEid);
      storage.setCookie(oldOptoutCookieName, 'true');

      let getIdResult = parrableIdSubmodule.getId(P_CONFIG_MOCK.params);
      expect(getIdResult.id).to.deep.equal({
        eid: oldEid,
        ibaOptout: true
      });

      // The ID system is expected to migrate old cookies to the new format
      expect(storage.getCookie(P_COOKIE_NAME)).to.equal(
        encodeURIComponent('eid:' + oldEid + ',ibaOptout:1')
      );
      expect(storage.getCookie(oldEidCookieName)).to.equal(null);
      expect(storage.getCookie(oldOptoutCookieName)).to.equal(null);
    });
  });

  describe('parrableIdSystem.decode()', function() {
    it('provides the Parrable ID (EID) from a stored object', function() {
      let eid = '01.123.4567890';
      let parrableId = {
        eid,
        ccpaOptout: true
      };

      expect(parrableIdSubmodule.decode(parrableId)).to.deep.equal({
        parrableid: eid
      });
    });
  });

  describe('userId requestBids hook', function() {
    let adUnits;

    beforeEach(function() {
      adUnits = [getAdUnitMock()];
      writeParrableCookie({ eid: P_COOKIE_EID });
      setSubmoduleRegistry([parrableIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock());
    });

    afterEach(function() {
      removeParrableCookie();
      storage.setCookie(P_COOKIE_NAME, '', EXPIRED_COOKIE_DATE);
    });

    it('when a stored Parrable ID exists it is added to bids', function(done) {
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
  });
});
