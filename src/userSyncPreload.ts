import { config } from './config.js';
import { ready as hooksReady } from './hook.js';
import { allConsent, type AllConsentData } from './consentHandler.js';
import adapterManager from './adapterManager.js';
import { userSync } from './userSync.js';
import { isArray, isStr, logWarn } from './utils.js';
import { delay } from './utils/promise.js';
import type { BidderCode } from './types/common.d.ts';

/**
 * Register and fire the user syncs of the given bidders now, calling their `getUserSyncs` with no server responses.
 * Bidders whose spec does not set `supportsPreloadSync` are skipped, with a warning when listed explicitly.
 *
 * @param bidders bidder codes (or aliases), or '*' for every registered bidder that supports it
 * @param consent the consent data to pass to `getUserSyncs`
 * @returns the bidders whose syncs were registered
 */
export function preloadSyncs(bidders: '*' | BidderCode[], consent: Partial<AllConsentData> | null): BidderCode[] {
  const registry = adapterManager.bidderRegistry;
  const explicit = bidders !== '*';
  const candidates = explicit ? bidders : Object.keys(registry);
  const synced = candidates.filter((bidder) => {
    const adapter = registry[bidder];
    if (typeof adapter?.getSpec !== 'function') {
      if (explicit) {
        logWarn(`userSync.preloadSyncBidders: bidder "${bidder}" is not registered`);
      }
      return false;
    }
    if (adapter.getSpec().supportsPreloadSync !== true) {
      if (explicit) {
        logWarn(`userSync.preloadSyncBidders: bidder "${bidder}" does not support preload syncs`);
      }
      return false;
    }
    config.runWithBidder(bidder, () => adapter.registerSyncs([], consent?.gdpr ?? null, consent?.usp ?? null, consent?.gpp ?? null));
    return true;
  });
  userSync.fireBidderSyncs(synced);
  return synced;
}

function isValidBidderList(bidders): bidders is '*' | BidderCode[] {
  return bidders === '*' || (isArray(bidders) && bidders.every(bidder => isStr(bidder) && bidder !== '*'));
}

/**
 * Start listening to `userSync.preloadSyncBidders`. Called by core rather than run on import,
 * so bundlers that honor the package `sideEffects` list do not drop it.
 */
export function setupPreloadSyncs() {
  config.getConfig('userSync', ({ userSync: userSyncConfig }) => {
    const bidders = userSyncConfig?.preloadSyncBidders;
    if (bidders == null) {
      return;
    }
    if (!isValidBidderList(bidders)) {
      logWarn(`userSync.preloadSyncBidders must be '*' or an array of bidder codes`);
      return;
    }
    // Wait for the command queue to run (so the consentManagement config is in place) and for consent data.
    // Nothing else waits for this chain: auctions are never delayed by preload syncs.
    hooksReady
      .then(() => delay())
      .then(() => allConsent.promise)
      .then(
        (consent) => preloadSyncs(bidders, consent),
        () => logWarn('userSync.preloadSyncBidders: consent data is not available, preload syncs skipped')
      );
  });
}
