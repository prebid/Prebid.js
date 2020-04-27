import { expect } from 'chai';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import { init, requestBidsHook, setSubmoduleRegistry } from 'modules/userId/index.js';
import { parrableIdSubmodule } from 'modules/parrableIdSystem.js';
import { newStorageManager } from 'src/storageManager.js';
import {server} from 'test/mocks/xhr.js';

const storage = newStorageManager();

const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';
const P_COOKIE_NAME = '_parrable_eid';
const P_COOKIE_VALUE = '01.1563917337.test-eid';
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
  let logErrorStub;
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

  describe('Parrable ID in Bid Request', function() {
    let adUnits;

    beforeEach(function() {
      adUnits = [getAdUnitMock()];
      logErrorStub = sinon.stub(utils, 'logError');
    });

    this.afterEach(function() {
      logErrorStub.restore();
    });

    it('should append parrableid to bid request', function(done) {
      // simulate existing browser local storage values
      storage.setCookie(
        P_COOKIE_NAME,
        P_COOKIE_VALUE,
        (new Date(Date.now() + 5000).toUTCString())
      );

      setSubmoduleRegistry([parrableIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock());

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.parrableid');
            expect(bid.userId.parrableid).to.equal(P_COOKIE_VALUE);
          });
        });
        storage.setCookie(P_COOKIE_NAME, '', EXPIRED_COOKIE_DATE);
        done();
      }, { adUnits });
    });

    it('should log an error and continue to callback if ajax request errors', function () {
      let callBackSpy = sinon.spy();
      let submoduleCallback = parrableIdSubmodule.getId({partner: 'prebid'}).callback;
      submoduleCallback(callBackSpy);
      let request = server.requests[0];
      expect(request.url).to.contain('h.parrable.com/prebid');
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
