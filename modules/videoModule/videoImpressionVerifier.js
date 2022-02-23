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

function videoImpressionVerifier(vastXmlEditor_) {
  const vastXmlEditor = vastXmlEditor_;
  const trackedBids = {};

  function trackBid(bid) {
    let { vastXml, vastUrl, adId, adUnitCode, requestId, auctionId } = bid;
    const uuid = 'pb-' + generateId(12);

    if (!vastXml && !vastUrl) {
      return;
    }

    if (vastUrl) {
      const url = new URL(vastUrl);
      url.searchParams.append('pb_uuid', uuid);
      bid.vastUrl = url.toString();
    } else if (vastXml) {
      bid.vastXml = vastXmlEditor.getVastXmlWithTracking(vastXml, uuid);
    }
    trackedBids[uuid] = { adId, adUnitCode, requestId, auctionId };
  }

  // get tracked Bid from adUrl ad id, adWrapper Ids
  // get uuid from url, ad id, wrapper ids
  // match to tracked bid
  // find actual bid object
  // remove from tracked
  // return actual bid object

  function getTrackedBid(adId, adTagUrl, adWrapperIds) {
    return trackedBids[adId] || getBidForAdTagUrl(adTagUrl) || getBidForAdWrappers(adWrapperIds);
  }

  function getBidForAdTagUrl(adTagUrl) {
    const url = new URL(adTagUrl);
    const queryParams = url.searchParams;
    let uuid = queryParams.get('pb_uuid');
    return uuid && trackedBids[uuid];
  }

  function getBidForAdWrappers(adWrapperIds) {
    for (const wrapperId in adWrapperIds) {
      const bid = trackedBids[wrapperId];
      if (bid) {
        return bid;
      }
    }
  }

  return {
    trackBid,
    getTrackedBid
  };
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

function cachedVideoImpressionVerifier(vastXmlEditor_) {
  const vastXmlEditor = vastXmlEditor_;
  const trackedBids = {};

  function registerBid(bid, globalAdUnits) {
    let { vastXml, vastUrl, adId, adUnitCode, requestId, auctionId } = bid;
    const adUnit = find(globalAdUnits, adUnit => adUnitCode === adUnit.code);
    const videoConfig = adUnit && adUnit.video;
    const adServerConfig = videoConfig && videoConfig.adServer;
    const trackingConfig = adServerConfig && adServerConfig.tracking;
    let impressionUrl;
    let impressionId;
    let errorUrl;
    const adIdOverride = 'pb-' + generateId(12);
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

    trackedBids[adIdOverride] = { adId, adUnitCode, requestId, auctionId };
    bid.vastXml = vastXml;
  }

  // verify id from ad id or wrapper ids

  return {
    registerBid,
    getTrackedBid,
  };
}

export function generateId(length) {
  return Math.floor(Math.random() * 10 ** length);
}
