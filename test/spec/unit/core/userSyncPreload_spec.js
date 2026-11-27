import { expect } from 'chai';
import { config } from 'src/config.js';
import { registerBidder } from 'src/adapters/bidderFactory.js';
import { userSync } from 'src/userSync.js';
import { preloadSyncs } from 'src/userSyncPreload.js';
import { registerActivityControl } from 'src/activities/rules.js';
import { ACTIVITY_SYNC_USER } from 'src/activities/activities.js';
import adapterManager from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
// core sets up the userSync.preloadSyncBidders listener
import 'src/prebid.js';

describe('userSync.preloadSyncBidders', function () {
  let sandbox;
  let bidderCount = 0;

  // userSync remembers synced bidders for the whole session, so every test uses new bidder codes
  function mkBidder({ supportsPreloadSync = true, url = 'https://sync.example.com/preload' } = {}) {
    const code = `preloadBidder${bidderCount++}`;
    const getUserSyncs = sandbox.stub().returns([{ type: 'image', url }]);
    registerBidder({
      code,
      supportsPreloadSync,
      isBidRequestValid: () => true,
      buildRequests: () => [],
      interpretResponse: () => [],
      getUserSyncs
    });
    return { code, getUserSyncs };
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(utils, 'logWarn');
    sandbox.stub(utils, 'triggerPixel');
  });

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
  });

  describe('preloadSyncs', function () {
    it('should call getUserSyncs with no server responses and fire the syncs right away', function () {
      const { code, getUserSyncs } = mkBidder();
      const gdpr = { gdprApplies: true, consentString: 'consent' };

      expect(preloadSyncs([code], { gdpr })).to.eql([code]);

      sinon.assert.calledOnce(getUserSyncs);
      expect(getUserSyncs.firstCall.args[1]).to.eql([]);
      expect(getUserSyncs.firstCall.args[2]).to.equal(gdpr);
      sinon.assert.calledWith(utils.triggerPixel, 'https://sync.example.com/preload');
    });

    it('should leave the syncs of other bidders in the queue', function () {
      const preloaded = mkBidder();
      const fireBidderSyncs = sandbox.spy(userSync, 'fireBidderSyncs');
      const syncUsers = sandbox.spy(userSync, 'syncUsers');

      preloadSyncs([preloaded.code], null);

      sinon.assert.calledWith(fireBidderSyncs, [preloaded.code]);
      sinon.assert.notCalled(syncUsers);
    });

    it('should not sync a bidder again after an auction', function () {
      const { code } = mkBidder();
      preloadSyncs([code], null);

      adapterManager.getBidAdapter(code).registerSyncs([], null, null, null);
      userSync.syncUsers();

      sinon.assert.calledOnce(utils.triggerPixel);
    });

    it('should skip, with a warning, listed bidders that are unknown or do not support preload syncs', function () {
      const unsupported = mkBidder({ supportsPreloadSync: false });

      expect(preloadSyncs([unsupported.code, 'notARegisteredBidder'], null)).to.eql([]);

      sinon.assert.notCalled(unsupported.getUserSyncs);
      sinon.assert.calledWith(utils.logWarn, sinon.match(unsupported.code));
      sinon.assert.calledWith(utils.logWarn, sinon.match('notARegisteredBidder'));
    });

    it('should sync every supporting bidder, silently skipping the others, with "*"', function () {
      const supported = mkBidder();
      const unsupported = mkBidder({ supportsPreloadSync: false });

      const synced = preloadSyncs('*', null);

      expect(synced).to.include(supported.code);
      expect(synced).to.not.include(unsupported.code);
      sinon.assert.notCalled(unsupported.getUserSyncs);
      sinon.assert.neverCalledWith(utils.logWarn, sinon.match(unsupported.code));
    });

    it('should not fire syncs that the activity controls deny', function () {
      const { code } = mkBidder();
      const unregister = registerActivityControl(ACTIVITY_SYNC_USER, 'test', () => ({ allow: false }));
      try {
        preloadSyncs([code], null);
      } finally {
        unregister();
      }
      sinon.assert.notCalled(utils.triggerPixel);
    });
  });

  describe('config', function () {
    function settle() {
      return new Promise((resolve) => setTimeout(resolve, 10));
    }

    it('should preload the configured bidders without an auction', async function () {
      const { code, getUserSyncs } = mkBidder();

      config.setConfig({ userSync: { preloadSyncBidders: [code] } });
      await settle();

      sinon.assert.calledOnce(getUserSyncs);
      sinon.assert.calledWith(utils.triggerPixel, 'https://sync.example.com/preload');
    });

    it('should do nothing when the option is not set', async function () {
      const { getUserSyncs } = mkBidder();

      config.setConfig({ userSync: { syncDelay: 1000 } });
      await settle();

      sinon.assert.notCalled(getUserSyncs);
    });

    it('should warn about an invalid value', async function () {
      const { getUserSyncs } = mkBidder();

      config.setConfig({ userSync: { preloadSyncBidders: 'notAList' } });
      await settle();

      sinon.assert.calledWith(utils.logWarn, sinon.match('preloadSyncBidders'));
      sinon.assert.notCalled(getUserSyncs);
    });
  });
});
