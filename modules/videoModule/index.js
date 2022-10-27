import { config } from '../../src/config.js';
import { find } from '../../src/polyfill.js';
import * as events from '../../src/events.js';
import { mergeDeep } from '../../src/utils.js';
import { getGlobal } from '../../src/prebidGlobal.js';
import CONSTANTS from '../../src/constants.json';
import {
  videoEvents, AUCTION_AD_LOAD_ATTEMPT, AD_IMPRESSION, AD_ERROR, BID_IMPRESSION, BID_ERROR, AUCTION_AD_LOAD_ABORT
} from '../../libraries/video/constants/events.js'
import { PLACEMENT } from '../../libraries/video/constants/ortb.js';
import { videoCoreFactory } from './coreVideo.js';
import { gamSubmoduleFactory } from './gamAdServerSubmodule.js';
import { videoImpressionVerifierFactory } from './videoImpressionVerifier.js';

const videoKey = 'video';

const allVideoEvents = Object.keys(videoEvents).map(eventKey => videoEvents[eventKey]);
events.addEvents(allVideoEvents.concat([AUCTION_AD_LOAD_ATTEMPT, AUCTION_AD_LOAD_ABORT, BID_IMPRESSION, BID_ERROR]).map(getExternalVideoEventName));

/**
 * This module adds User Video support to prebid.js
 * @module modules/videoModule
 */
export function PbVideo(videoCore_, getConfig_, pbGlobal_, pbEvents_, videoEvents_, gamAdServerFactory_, videoImpressionVerifierFactory_) {
  const videoCore = videoCore_;
  const getConfig = getConfig_;
  const pbGlobal = pbGlobal_;
  const requestBids = pbGlobal.requestBids;
  const pbEvents = pbEvents_;
  const videoEvents = videoEvents_;
  const gamAdServerFactory = gamAdServerFactory_;
  let gamSubmodule;
  let mainContentDivId;
  let contentEnrichmentEnabled = true;
  const videoImpressionVerifierFactory = videoImpressionVerifierFactory_;
  let videoImpressionVerifier;

  function init() {
    const cache = getConfig('cache');
    videoImpressionVerifier = videoImpressionVerifierFactory(!!cache);
    getConfig(videoKey, ({ video }) => {
      video.providers.forEach(provider => {
        videoCore.registerProvider(provider);
        videoCore.onEvents(videoEvents, (type, payload) => {
          pbEvents.emit(getExternalVideoEventName(type), payload);
        }, provider.divId);

        const adServerConfig = provider.adServer;
        if (!gamSubmodule && adServerConfig) {
          gamSubmodule = gamAdServerFactory();
        }
      });
      contentEnrichmentEnabled = video.contentEnrichmentEnabled !== false;
      mainContentDivId = contentEnrichmentEnabled ? video.mainContentDivId : null;
    });

    requestBids.before(beforeBidsRequested, 40);

    pbEvents.on(CONSTANTS.EVENTS.BID_ADJUSTMENT, function (bid) {
      videoImpressionVerifier.trackBid(bid);
    });

    pbEvents.on(getExternalVideoEventName(AD_IMPRESSION), function (payload) {
      triggerVideoBidEvent(BID_IMPRESSION, payload);
    });

    pbEvents.on(getExternalVideoEventName(AD_ERROR), function (payload) {
      triggerVideoBidEvent(BID_ERROR, payload);
    });
  }

  function renderBid(divId, bid, options = {}) {
    const adUrl = bid.vastUrl;
    options.adXml = bid.vastXml;
    options.winner = bid.bidder;
    loadAdTag(adUrl, divId, options);
  }

  function getOrtbVideo(divId) {
    return videoCore.getOrtbVideo(divId);
  }

  function getOrtbContent(divId) {
    return videoCore.getOrtbContent(divId);
  }

  return { init, renderBid, getOrtbVideo, getOrtbContent };

  function beforeBidsRequested(nextFn, bidderRequest) {
    enrichAuction(bidderRequest);

    const bidsBackHandler = bidderRequest.bidsBackHandler;
    if (!bidsBackHandler || typeof bidsBackHandler !== 'function') {
      pbEvents.on(CONSTANTS.EVENTS.AUCTION_END, auctionEnd);
    }

    return nextFn.call(this, bidderRequest);
  }

  function enrichAuction(bidderRequest) {
    if (mainContentDivId) {
      enrichOrtb2(mainContentDivId, bidderRequest);
    }

    const adUnits = bidderRequest.adUnits || pbGlobal.adUnits || [];
    adUnits.forEach(adUnit => {
      const divId = getDivId(adUnit);
      enrichAdUnit(adUnit, divId);
      if (contentEnrichmentEnabled && !mainContentDivId) {
        enrichOrtb2(divId, bidderRequest);
      }
    });
  }

  function getDivId(adUnit) {
    const videoConfig = adUnit.video;
    if (!adUnit.mediaTypes.video || !videoConfig) {
      return;
    }

    return videoConfig.divId;
  }

  function enrichAdUnit(adUnit, videoDivId) {
    const ortbVideo = getOrtbVideo(videoDivId);
    if (!ortbVideo) {
      return;
    }

    const video = Object.assign({}, adUnit.mediaTypes.video, ortbVideo);

    video.context = ortbVideo.placement === PLACEMENT.INSTREAM ? 'instream' : 'outstream';

    const width = ortbVideo.w;
    const height = ortbVideo.h;
    if (width && height) {
      video.playerSize = [width, height];
    }

    adUnit.mediaTypes.video = video;
  }

  function enrichOrtb2(divId, bidderRequest) {
    const ortbContent = getOrtbContent(divId);
    if (!ortbContent) {
      return;
    }
    bidderRequest.ortb2 = mergeDeep({}, bidderRequest.ortb2, { site: { content: ortbContent } });
  }

  function auctionEnd(auctionResult) {
    auctionResult.adUnits.forEach(adUnit => {
      if (adUnit.video) {
        renderWinningBid(adUnit);
      }
    });
    pbEvents.off(CONSTANTS.EVENTS.AUCTION_END, auctionEnd);
  }

  function getAdServerConfig(adUnitVideoConfig) {
    const globalVideoConfig = getConfig(videoKey);
    const globalProviderConfig = globalVideoConfig.providers.find(provider => provider.divId === adUnitVideoConfig.divId) || {};
    if (!globalVideoConfig.adServer && !globalProviderConfig.adServer && !adUnitVideoConfig.adServer) {
      return;
    }
    return mergeDeep({}, globalVideoConfig.adServer, globalProviderConfig.adServer, adUnitVideoConfig.adServer);
  }

  function renderWinningBid(adUnit) {
    const adUnitCode = adUnit.code;
    const options = { adUnitCode };

    const videoConfig = adUnit.video;
    const divId = videoConfig.divId;
    const adServerConfig = getAdServerConfig(videoConfig);
    let adUrl;
    if (adServerConfig) {
      adUrl = gamSubmodule.getAdTagUrl(adUnit, adServerConfig.baseAdTagUrl, adServerConfig.params);
    }

    if (adUrl) {
      loadAdTag(adUrl, divId, options);
      return;
    }

    const highestCpmBids = pbGlobal.getHighestCpmBids(adUnitCode);
    if (!highestCpmBids.length) {
      pbEvents.emit(getExternalVideoEventName(AUCTION_AD_LOAD_ABORT), options);
      return;
    }

    const highestBid = highestCpmBids.shift();
    if (!highestBid) {
      return;
    }

    renderBid(divId, highestBid, options);
  }

  // options: adXml, winner, adUnitCode,
  function loadAdTag(adTagUrl, divId, options) {
    const payload = Object.assign({ adTagUrl }, options);
    pbEvents.emit(getExternalVideoEventName(AUCTION_AD_LOAD_ATTEMPT), payload);
    videoCore.setAdTagUrl(adTagUrl, divId, options);
  }

  function triggerVideoBidEvent(eventName, adEventPayload) {
    const bid = getBid(adEventPayload);
    if (!bid) {
      return;
    }

    pbGlobal.markWinningBidAsUsed(bid);
    pbEvents.emit(getExternalVideoEventName(eventName), { bid, adEvent: adEventPayload });
  }

  function getBid(adPayload) {
    const { adId, adTagUrl, wrapperAdIds } = adPayload;
    const bidIdentifiers = videoImpressionVerifier.getBidIdentifiers(adId, adTagUrl, wrapperAdIds);
    if (!bidIdentifiers) {
      return;
    }

    const { adUnitCode, requestId, auctionId } = bidIdentifiers;
    const bidAdId = bidIdentifiers.adId;
    const { bids } = pbGlobal.getBidResponsesForAdUnitCode(adUnitCode);
    return find(bids, bid => bid.adId === bidAdId && bid.requestId === requestId && bid.auctionId === auctionId);
  }
}

export function pbVideoFactory() {
  const videoCore = videoCoreFactory();
  const pbGlobal = getGlobal();
  const pbVideo = PbVideo(videoCore, config.getConfig, pbGlobal, events, allVideoEvents, gamSubmoduleFactory, videoImpressionVerifierFactory);
  pbVideo.init();
  pbGlobal.videoModule = pbVideo;
  return pbVideo;
}

function getExternalVideoEventName(eventName) {
  return videoKey + eventName.replace(/^./, eventName[0].toUpperCase());
}

pbVideoFactory();
