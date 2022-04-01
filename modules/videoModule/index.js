import { config } from '../../src/config.js';
import { find } from '../../src/polyfill.js';
import * as events from '../../src/events.js';
import { allVideoEvents, AUCTION_AD_LOAD_ATTEMPT, allVideoAuctionEvents,
  AD_IMPRESSION, AD_ERROR, BID_VIDEO_IMPRESSION, BID_VIDEO_ERROR, allVideoBidEvents } from './constants/events.js';
import CONSTANTS from '../../src/constants.json';
import { videoCoreFactory } from './coreVideo.js';
import { coreAdServerFactory } from './adServer.js';
import { videoImpressionVerifierFactory } from './videoImpressionVerifier.js';
import { mergeDeep } from '../../src/utils'

/**
 * This module adds User Video support to prebid.js
 * @module modules/videoModule
 */

events.addEvents(allVideoEvents);
events.addEvents(allVideoAuctionEvents);
events.addEvents(allVideoBidEvents);

export function PbVideo(videoCore_, getConfig_, pbGlobal_, pbEvents_, videoEvents_, adServerCore_, videoImpressionVerifierFactory_) {
  const videoCore = videoCore_;
  const getConfig = getConfig_;
  const pbGlobal = pbGlobal_;
  const requestBids = pbGlobal.requestBids;
  const pbEvents = pbEvents_;
  const videoEvents = videoEvents_;
  const adServerCore = adServerCore_;
  const videoImpressionVerifierFactory = videoImpressionVerifierFactory_;
  let videoImpressionVerifier;

  function init() {
    const cache = getConfig('cache');
    videoImpressionVerifier = videoImpressionVerifierFactory(!!cache);
    getConfig('video', ({ video }) => {
      video.providers.forEach(provider => {
        videoCore.registerProvider(provider);
        videoCore.onEvents(videoEvents, (type, payload) => {
          pbEvents.emit(type, payload);
        }, provider.divId);

        const adServerConfig = provider.adServer;
        if (adServerConfig) {
          adServerCore.registerAdServer(adServerConfig);
        }
      });
    });

    requestBids.before(enrichAdUnits, 40);

    pbEvents.on(CONSTANTS.EVENTS.AUCTION_END, function(auctionResult) {
      auctionResult.adUnits.forEach(adUnit => {
        if (adUnit.video) {
          renderWinningBid(adUnit);
        }
      });
    });

    pbEvents.on(CONSTANTS.EVENTS.BID_ADJUSTMENT, function (bid) {
      videoImpressionVerifier.trackBid(bid);
    });

    pbEvents.on(AD_IMPRESSION, function (payload) {
      triggerVideoBidEvent(BID_VIDEO_IMPRESSION, payload);
    });

    pbEvents.on(AD_ERROR, function (payload) {
      triggerVideoBidEvent(BID_VIDEO_ERROR, payload);
    });
  }

  return { init };

  function enrichAdUnits(nextFn, bidRequest) {
    const adUnits = bidRequest.adUnits || pbGlobal.adUnits || [];
    adUnits.forEach(adUnit => {
      enrichAdUnit(adUnit);
    });
    return nextFn.call(this, bidRequest);
  }

  function enrichAdUnit(adUnit) {
    const videoMediaType = adUnit.mediaTypes.video;
    if (!videoMediaType) {
      return;
    }

    const oRtbParams = videoCore.getOrtbParams(adUnit.video.divId);

    adUnit.mediaTypes.video = Object.assign({}, videoMediaType, oRtbParams.video);
    let ortb2 = { ortb2: mergeDeep({}, getConfig('ortb2'), { site: oRtbParams.content }) };
    pbGlobal.setConfig(ortb2);
  }

  function renderWinningBid(adUnit) {
    const adUnitCode = adUnit.code;
    const options = { adUnitCode };
    const highestCpmBids = pbGlobal.getHighestCpmBids(adUnitCode);
    if (!highestCpmBids.length) {
      pbEvents.emit(AUCTION_AD_LOAD_ATTEMPT, options);
      return;
    }

    const videoConfig = adUnit.video;
    const divId = videoConfig.divId;
    const adServerConfig = videoConfig.adServer;
    let adUrl;
    if (adServerConfig) {
      adUrl = adServerCore.getAdTagUrl(adServerConfig.vendorCode, adUnit, adServerConfig.baseAdTagUrl);
    }

    if (adUrl) {
      loadAdTag(adUrl, divId, options);
      return;
    }

    const highestBid = highestCpmBids.shift();
    if (!highestBid) {
      return;
    }

    adUrl = highestBid.vastUrl;
    options.adXml = highestBid.vastXml;
    options.winner = highestBid.bidder;
    loadAdTag(adUrl, divId, options);
  }

  // options: adXml, winner, adUnitCode,
  function loadAdTag(adUrl, divId, options) {
    const payload = Object.assign({ adUrl }, options);
    pbEvents.emit(AUCTION_AD_LOAD_ATTEMPT, payload);
    videoCore.setAdTagUrl(adUrl, divId, options);
  }

  function triggerVideoBidEvent(eventName, adEventPayload) {
    const bid = getBid(adEventPayload);
    if (!bid) {
      return;
    }
    pbEvents.emit(eventName, { bid, adEvent: adEventPayload });
  }

  function getBid(adPayload) {
    const { adId, adTagUrl, wrapperAdIds } = adPayload;
    const bidIdentifiers = videoImpressionVerifier.getBidIdentifiers(adId, adTagUrl, wrapperAdIds);
    if (!bidIdentifiers) {
      return;
    }

    const { bidAdId = adId, adUnitCode, requestId, auctionId } = bidIdentifiers;
    const { bids } = pbGlobal.getBidResponsesForAdUnitCode(adUnitCode);
    return find(bids, bid => bid.adId === bidAdId && bid.requestId === requestId && bid.auctionId === auctionId);
  }
}

export function pbVideoFactory() {
  const videoCore = videoCoreFactory();
  const adServerCore = coreAdServerFactory();
  const pbVideo = PbVideo(videoCore, config.getConfig, $$PREBID_GLOBAL$$, events, allVideoEvents, adServerCore, videoImpressionVerifierFactory);
  pbVideo.init();
  return pbVideo;
}

pbVideoFactory();
