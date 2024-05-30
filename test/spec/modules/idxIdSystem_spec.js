import { expect } from 'chai';
import {find} from 'src/polyfill.js';
import { config } from 'src/config.js';
import { init, requestBidsHook, setSubmoduleRegistry } from 'modules/userId/index.js';
import { storage, idxIdSubmodule } from 'modules/idxIdSystem.js';
import {mockGdprConsent} from '../../helpers/consentData.js';

const IDX_COOKIE_NAME = '_idx';
const IDX_DUMMY_VALUE = 'idx value for testing';
const IDX_COOKIE_STORED = '{ "idx": "' + IDX_DUMMY_VALUE + '" }';
const ID_COOKIE_OBJECT = { id: IDX_DUMMY_VALUE };
const IDX_COOKIE_OBJECT = { idx: IDX_DUMMY_VALUE };

function getConfigMock() {
  return {
    userSync: {
      syncDelay: 0,
      userIds: [{
        name: 'idx'
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

describe('IDx ID System', () => {
  let getDataFromLocalStorageStub, localStorageIsEnabledStub;
  let getCookieStub, cookiesAreEnabledStub;

  beforeEach(() => {
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    localStorageIsEnabledStub = sinon.stub(storage, 'localStorageIsEnabled');
    getCookieStub = sinon.stub(storage, 'getCookie');
    cookiesAreEnabledStub = sinon.stub(storage, 'cookiesAreEnabled');
  });

  afterEach(() => {
    getDataFromLocalStorageStub.restore();
    localStorageIsEnabledStub.restore();
    getCookieStub.restore();
    cookiesAreEnabledStub.restore();
  });

  describe('IDx: test "getId" method', () => {
    it('provides the stored IDx if a cookie exists', () => {
      getCookieStub.withArgs(IDX_COOKIE_NAME).returns(IDX_COOKIE_STORED);
      let idx = idxIdSubmodule.getId();
      expect(idx).to.deep.equal(ID_COOKIE_OBJECT);
    });

    it('provides the stored IDx if cookie is absent but present in local storage', () => {
      getDataFromLocalStorageStub.withArgs(IDX_COOKIE_NAME).returns(IDX_COOKIE_STORED);
      let idx = idxIdSubmodule.getId();
      expect(idx).to.deep.equal(ID_COOKIE_OBJECT);
    });

    it('returns undefined if both cookie and local storage are empty', () => {
      let idx = idxIdSubmodule.getId();
      expect(idx).to.be.undefined;
    })
  });

  describe('IDx: test "decode" method', () => {
    it('provides the IDx from a stored object', () => {
      expect(idxIdSubmodule.decode(ID_COOKIE_OBJECT)).to.deep.equal(IDX_COOKIE_OBJECT);
    });

    it('provides the IDx from a stored string', () => {
      expect(idxIdSubmodule.decode(IDX_DUMMY_VALUE)).to.deep.equal(IDX_COOKIE_OBJECT);
    });
  });

  describe('requestBids hook', () => {
    let adUnits;
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      mockGdprConsent(sandbox);
      adUnits = [getAdUnitMock()];
      init(config);
      setSubmoduleRegistry([idxIdSubmodule]);
      getCookieStub.withArgs(IDX_COOKIE_NAME).returns(IDX_COOKIE_STORED);
      config.setConfig(getConfigMock());
    });

    afterEach(() => {
      sandbox.restore();
    })

    it('when a stored IDx exists it is added to bids', (done) => {
      requestBidsHook(() => {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.idx');
            expect(bid.userId.idx).to.equal(IDX_DUMMY_VALUE);
            const idxIdAsEid = find(bid.userIdAsEids, e => e.source == 'idx.lat');
            expect(idxIdAsEid).to.deep.equal({
              source: 'idx.lat',
              uids: [{
                id: IDX_DUMMY_VALUE,
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
