import { expect } from 'chai';
import { find } from 'src/polyfill.js';
import { config } from 'src/config.js';
import { init, requestBidsHook, setSubmoduleRegistry } from 'modules/userId/index.js';
import { storage, lmpIdSubmodule } from 'modules/lmpIdSystem.js';
import { mockGdprConsent } from '../../helpers/consentData.js';
import 'src/prebid.js';

function getConfigMock() {
  return {
    userSync: {
      syncDelay: 0,
      userIds: [{
        name: 'lmpid'
      }]
    }
  }
}

function getAdUnitMock(code = 'adUnit-code') {
  return {
    code,
    mediaTypes: { banner: {}, native: {} },
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

describe('LMPID System', () => {
  let getDataFromLocalStorageStub, localStorageIsEnabledStub;
  let windowLmpidStub;

  beforeEach(() => {
    window.__lmpid = undefined;
    windowLmpidStub = sinon.stub(window, '__lmpid');
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    localStorageIsEnabledStub = sinon.stub(storage, 'localStorageIsEnabled');
  });

  afterEach(() => {
    getDataFromLocalStorageStub.restore();
    localStorageIsEnabledStub.restore();
    windowLmpidStub.restore();
  });

  describe('LMPID: test "getId" method', () => {
    it('prefers the window cached LMPID', () => {
      localStorageIsEnabledStub.returns(true);
      getDataFromLocalStorageStub.withArgs('__lmpid').returns('stored-lmpid');

      windowLmpidStub.value('lmpid');
      expect(lmpIdSubmodule.getId()).to.deep.equal({ id: 'lmpid' });
    });

    it('fallbacks on localStorage when window cache is falsy', () => {
      localStorageIsEnabledStub.returns(true);
      getDataFromLocalStorageStub.withArgs('__lmpid').returns('stored-lmpid');

      windowLmpidStub.value('');
      expect(lmpIdSubmodule.getId()).to.deep.equal({ id: 'stored-lmpid' });

      windowLmpidStub.value(false);
      expect(lmpIdSubmodule.getId()).to.deep.equal({ id: 'stored-lmpid' });
    });

    it('fallbacks only if localStorageIsEnabled', () => {
      localStorageIsEnabledStub.returns(false);
      getDataFromLocalStorageStub.withArgs('__lmpid').returns('stored-lmpid');

      expect(lmpIdSubmodule.getId()).to.be.undefined;
    });
  });

  describe('LMPID: test "decode" method', () => {
    it('provides the lmpid from a stored object', () => {
      expect(lmpIdSubmodule.decode('lmpid')).to.deep.equal({ lmpid: 'lmpid' });
    });
  });

  describe('LMPID: requestBids hook', () => {
    let adUnits;
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      mockGdprConsent(sandbox);
      adUnits = [getAdUnitMock()];
      init(config);
      setSubmoduleRegistry([lmpIdSubmodule]);
      getDataFromLocalStorageStub.withArgs('__lmpid').returns('stored-lmpid');
      localStorageIsEnabledStub.returns(true);
      config.setConfig(getConfigMock());
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('when a stored LMPID exists it is added to bids', (done) => {
      requestBidsHook(() => {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.lmpid');
            expect(bid.userId.lmpid).to.equal('stored-lmpid');
            const lmpidAsEid = find(bid.userIdAsEids, e => e.source == 'loblawmedia.ca');
            expect(lmpidAsEid).to.deep.equal({
              source: 'loblawmedia.ca',
              uids: [{
                id: 'stored-lmpid',
                atype: 3,
              }]
            });
          });
        });
        done();
      }, { adUnits });
    });
  });
});
