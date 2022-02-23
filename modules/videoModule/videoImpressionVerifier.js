import find from 'core-js-pure/features/array/find';
import URL from 'core-js-pure/web/url';
import { vastXmlEditorFactory } from './shared/vastXmlEditor.js';

export function videoImpressionVerifierFactory(isCacheUsed) {
  const vastXmlEditor = vastXmlEditorFactory();
  const bidTracker = tracker();
  if (isCacheUsed) {
    return cachedVideoImpressionVerifier(vastXmlEditor, bidTracker);
  }

  return videoImpressionVerifier(vastXmlEditor, bidTracker);
}

function videoImpressionVerifier(vastXmlEditor_, bidTracker_) {
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
      url.searchParams.append('pb_uuid', uuid);
      bid.vastUrl = url.toString();
    } else if (vastXml) {
      bid.vastXml = vastXmlEditor.getVastXmlWithTracking(vastXml, uuid);
    }

    return uuid;
  }

  return verifier;
}

function cachedVideoImpressionVerifier(vastXmlEditor_, bidTracker_) {
  const verifier = baseImpressionVerifier(bidTracker_);
  const superTrackBid = verifier.trackBid;
  const superGetTrackedBid = verifier.getTrackedBid;
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
      impressionUrl = impressionTracking.url;
      impressionId = impressionTracking.id || adId + '-impression';
    }

    if (errorTracking) {
      errorUrl = errorTracking.url;
    }

    if (vastXml) {
      vastXml = vastXmlEditor.getVastXmlWithTracking(vastXml, adIdOverride, impressionUrl, impressionId, errorUrl);
    } else if (vastUrl) {
      vastXml = vastXmlEditor.buildVastWrapper(adIdOverride, vastUrl, impressionUrl, impressionId, errorUrl);
    }

    bid.vastXml = vastXml;
    return adIdOverride;
  }

  verifier.getTrackedBid = function (adId, adTagUrl, adWrapperIds) {
    // When the video is cached, the ad tag loaded into the player is a parent wrapper of the cache url.
    // As a result, the ad tag Url cannot include identifiers.
    return superGetTrackedBid(adId, null, adWrapperIds);
  }

  return verifier;
}

function baseImpressionVerifier(bidTracker_) {
  const bidTracker = bidTracker_;

  function trackBid(bid) {
    let { adId, adUnitCode, requestId, auctionId } = bid;
    const uuid = 'pb-' + generateId(12);
    bidTracker.store(uuid, { adId, adUnitCode, requestId, auctionId });
    return uuid;
  }

  // get tracked Bid from adUrl ad id, adWrapper Ids
  // get uuid from url, ad id, wrapper ids
  // match to tracked bid
  // find actual bid object
  // remove from tracked
  // return actual bid object

  function getTrackedBid(adId, adTagUrl, adWrapperIds) {
    return bidTracker.remove(adId) || getBidForAdTagUrl(adTagUrl) || getBidForAdWrappers(adWrapperIds);
  }

  return {
    trackBid,
    getTrackedBid
  };

  function getBidForAdTagUrl(adTagUrl) {
    if (!adTagUrl) {
      return;
    }

    const url = new URL(adTagUrl);
    const queryParams = url.searchParams;
    let uuid = queryParams.get('pb_uuid');
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

function tracker() {
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

export function generateId(length) {
  return Math.floor(Math.random() * 10 ** length);
}
