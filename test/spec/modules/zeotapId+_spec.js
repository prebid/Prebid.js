import { expect } from 'chai';
import find from 'core-js-pure/features/array/find.js';
import { config } from 'src/config.js';
import { newStorageManager } from 'src/storageManager.js';
import { init, requestBidsHook, setSubmoduleRegistry } from 'modules/userId/index.js';
import { zeotapIdPlusSubmodule } from 'modules/zeotapId+.js';

const storage = newStorageManager();

const ZEOTAP_COOKIE_NAME = 'IDP';
const ZEOTAP_COOKIE = 'THIS-IS-A-DUMMY-COOKIE';
const CONFIG_PARAMS_MOCK = {
  name: 'zeotapId+',
  storage: {
    name: 'IDP',
    type: 'cookie',
    expires: 30,
    refreshInSeconds: null
  }
};

function getConfigMock() {
  return {
    userSync: {
      syncDelay: 0,
      userIds: [{
        name: 'zeotapId+',
        storage: {
          name: 'IDP',
          type: 'cookie',
          expires: 30,
          refreshInSeconds: null
        }
      }]
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

function writeZeotapCookie() {
  storage.setCookie(
    ZEOTAP_COOKIE_NAME,
    ZEOTAP_COOKIE,
    (new Date(Date.now() + 5000).toUTCString()),
  );
}

function unsetCookie() {
  storage.setCookie(ZEOTAP_COOKIE_NAME, '');
}

function unsetLocalStorage() {
  storage.setDataInLocalStorage(ZEOTAP_COOKIE_NAME, '');
}

describe('Zeotap ID System', function() {
  describe('test method: getId', function() {
    afterEach(() => {
      unsetCookie();
      unsetLocalStorage();
    })

    it('return undefined if incorrect config as argument', function() {
      writeZeotapCookie();
      let id = zeotapIdPlusSubmodule.getId({});
      expect(id).to.be.undefined;
    });

    it('provides the stored Zeotap id if a cookie exists', function() {
      writeZeotapCookie();
      let id = zeotapIdPlusSubmodule.getId(CONFIG_PARAMS_MOCK);
      expect(id).to.deep.equal({
        id: ZEOTAP_COOKIE
      });
    });

    it('provides the stored Zeotap id if cookie is absent but present in local storage', function() {
      writeZeotapCookie();
      let id = zeotapIdPlusSubmodule.getId(CONFIG_PARAMS_MOCK);
      expect(id).to.deep.equal({
        id: ZEOTAP_COOKIE
      });
    });

    it('returns empty id in object if both cookie and local storage are empty', function() {
      let id = zeotapIdPlusSubmodule.getId(CONFIG_PARAMS_MOCK);
      expect(id).to.deep.equal({
        id: ''
      });
    })
  });

  describe('test method: decode', function() {
    it('provides the Zeotap ID (IDP) from a stored object', function() {
      let zeotapId = {
        id: ZEOTAP_COOKIE,
      };

      expect(zeotapIdPlusSubmodule.decode(zeotapId)).to.deep.equal({
        IDP: ZEOTAP_COOKIE
      });
    });

    it('provides the Zeotap ID (IDP) from a stored string', function() {
      let zeotapId = ZEOTAP_COOKIE;

      expect(zeotapIdPlusSubmodule.decode(zeotapId)).to.deep.equal({
        IDP: ZEOTAP_COOKIE
      });
    });
  });

  describe('requestBids hook', function() {
    let adUnits;

    beforeEach(function() {
      adUnits = [getAdUnitMock()];
      writeZeotapCookie();
      setSubmoduleRegistry([zeotapIdPlusSubmodule]);
      init(config);
      config.setConfig(getConfigMock());
    });

    afterEach(function() {
      unsetCookie();
      unsetLocalStorage();
    });

    it('when a stored Zeotap ID exists it is added to bids', function(done) {
      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.IDP');
            expect(bid.userId.IDP).to.equal(ZEOTAP_COOKIE);
            const zeotapIdAsEid = find(bid.userIdAsEids, e => e.source == 'zeotap.com');
            expect(zeotapIdAsEid).to.deep.equal({
              source: 'zeotap.com',
              uids: [{
                id: ZEOTAP_COOKIE,
                atype: 1,
              }]
            });
          });
        });
        done();
      }, { adUnits });
    });
  });
});
