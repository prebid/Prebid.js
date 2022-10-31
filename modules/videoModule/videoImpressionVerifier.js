import { find } from '../../src/polyfill.js';
import { vastXmlEditorFactory } from '../../libraries/video/shared/vastXmlEditor.js';
import { generateUUID } from '../../src/utils.js';

export const PB_PREFIX = 'pb_';
export const UUID_MARKER = PB_PREFIX + 'uuid';

/**
 * Video Impression Verifier interface. All implementations of a Video Impression Verifier must comply with this interface.
 * @description adds tracking markers to an ad and extracts the bid identifiers from ad event information.
 * @typedef {Object} VideoImpressionVerifier
 * @function trackBid - requests that a bid's ad be tracked for impression verification.
 * @function getBidIdentifiers - requests information from the ad event data that can be used to match the ad to a tracked bid.
 */

/**
 * @function VideoImpressionVerifier#trackBid
 * @param {Object} bid - Bid that should be tracked.
 * @return {String} - Identifier for the bid being tracked.
 */

/**
 * @function VideoImpressionVerifier#getBidIdentifiers
 * @param {String} adId - In the VAST tag, this value is present in the Ad element's id property.
 * @param {String} adTagUrl - The ad tag url that was loaded into the player.
 * @param {[String]} adWrapperIds - List of ad id's that were obtained from the different wrappers. Each redirect points to an ad wrapper.
 * @return {bidIdentifier} - Object allowing the bid matching the ad event to be identified.
 */

/**
 * @typedef {Object} bidIdentifier
 * @property {String} adId - Bid identifier.
 * @property {String} adUnitCode - Identifier for the Ad Unit for which the bid was made.
 * @property {String} auctionId - Id of the auction in which the bid was made.
 * @property {String} requestId - Id of the bid request which resulted in the bid.
 */

/**
 * Factory function for obtaining a Video Impression Verifier.
 * @param {Boolean} isCacheUsed - wether Prebid is configured to use a cache.
 * @return {VideoImpressionVerifier}
 */
export function videoImpressionVerifierFactory(isCacheUsed) {
  const vastXmlEditor = vastXmlEditorFactory();
  const bidTracker = tracker();
  if (isCacheUsed) {
    return cachedVideoImpressionVerifier(vastXmlEditor, bidTracker);
  }

  return videoImpressionVerifier(vastXmlEditor, bidTracker);
}

export function videoImpressionVerifier(vastXmlEditor_, bidTracker_) {
  const verifier = baseImpressionVerifier(bidTracker_);
  const superTrackBid = verifier.trackBid;
  const vastXmlEditor = vastXmlEditor_;

  verifier.trackBid = function(bid) {
    let { vastXml, vastUrl } = bid;
    if (!vastXml && !vastUrl) {
      return;
    }

    const uuid = superTrackBid(bid);

    if (vastUrl) {
      const url = new URL(vastUrl);
      url.searchParams.append(UUID_MARKER, uuid);
      bid.vastUrl = url.toString();
    } else if (vastXml) {
      bid.vastXml = vastXmlEditor.getVastXmlWithTracking(vastXml, uuid);
    }

    return uuid;
  }

  return verifier;
}

export function cachedVideoImpressionVerifier(vastXmlEditor_, bidTracker_) {
  const verifier = baseImpressionVerifier(bidTracker_);
  const superTrackBid = verifier.trackBid;
  const superGetBidIdentifiers = verifier.getBidIdentifiers;
  const vastXmlEditor = vastXmlEditor_;

  verifier.trackBid = function (bid, globalAdUnits) {
    const adIdOverride = superTrackBid(bid);
    let { vastXml, vastUrl, adId, adUnitCode } = bid;
    const adUnit = find(globalAdUnits, adUnit => adUnitCode === adUnit.code);
    const videoConfig = adUnit && adUnit.video;
    const adServerConfig = videoConfig && videoConfig.adServer;
    const trackingConfig = adServerConfig && adServerConfig.tracking;
    let impressionUrl;
    let impressionId;
    let errorUrl;
    const impressionTracking = trackingConfig.impression;
    const errorTracking = trackingConfig.error;

    if (impressionTracking) {
      impressionUrl = getTrackingUrl(impressionTracking.getUrl, bid);
      impressionId = impressionTracking.id || adId + '-impression';
    }

    if (errorTracking) {
      errorUrl = getTrackingUrl(errorTracking.getUrl, bid);
    }

    if (vastXml) {
      vastXml = vastXmlEditor.getVastXmlWithTracking(vastXml, adIdOverride, impressionUrl, impressionId, errorUrl);
    } else if (vastUrl) {
      vastXml = vastXmlEditor.buildVastWrapper(adIdOverride, vastUrl, impressionUrl, impressionId, errorUrl);
    }

    bid.vastXml = vastXml;
    return adIdOverride;
  }

  verifier.getBidIdentifiers = function (adId, adTagUrl, adWrapperIds) {
    // When the video is cached, the ad tag loaded into the player is a parent wrapper of the cache url.
    // As a result, the ad tag Url cannot include identifiers.
    return superGetBidIdentifiers(adId, null, adWrapperIds);
  }

  return verifier;

  function getTrackingUrl(getUrl, bid) {
    if (!getUrl || typeof getUrl !== 'function') {
      return;
    }

    return getUrl(bid);
  }
}

export function baseImpressionVerifier(bidTracker_) {
  const bidTracker = bidTracker_;

  function trackBid(bid) {
    let { adId, adUnitCode, requestId, auctionId } = bid;
    const trackingId = PB_PREFIX + generateUUID(10 ** 13);
    bidTracker.store(trackingId, { adId, adUnitCode, requestId, auctionId });
    return trackingId;
  }

  function getBidIdentifiers(adId, adTagUrl, adWrapperIds) {
    return bidTracker.remove(adId) || getBidForAdTagUrl(adTagUrl) || getBidForAdWrappers(adWrapperIds);
  }

  return {
    trackBid,
    getBidIdentifiers
  };

  function getBidForAdTagUrl(adTagUrl) {
    if (!adTagUrl) {
      return;
    }

    let url;
    try {
      url = new URL(adTagUrl);
    } catch (e) {
      return;
    }

    const queryParams = url.searchParams;
    let uuid = queryParams.get(UUID_MARKER);
    return uuid && bidTracker.remove(uuid);
  }

  function getBidForAdWrappers(adWrapperIds) {
    if (!adWrapperIds || !adWrapperIds.length) {
      return;
    }

    for (const wrapperId in adWrapperIds) {
      const bidInfo = bidTracker.remove(wrapperId);
      if (bidInfo) {
        return bidInfo;
      }
    }
  }
}

export function tracker() {
  const model = {};

  function store(key, value) {
    model[key] = value;
  }

  function remove(key) {
    const value = model[key];
    if (!value) {
      return;
    }

    delete model[key];
    return value;
  }

  return {
    store,
    remove
  }
}
