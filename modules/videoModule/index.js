import { config } from '../../src/config.js';
import { find } from '../../src/polyfill.js';
import * as events from '../../src/events.js';
import { mergeDeep } from '../../src/utils.js';
import { getGlobal } from '../../src/prebidGlobal.js';
import CONSTANTS from '../../src/constants.json';
import {
  videoEvents, AUCTION_AD_LOAD_ATTEMPT, AD_IMPRESSION, AD_ERROR, BID_IMPRESSION, BID_ERROR, AUCTION_AD_LOAD_ABORT
} from '../../libraries/video/constants/events.js'
import { videoCoreFactory } from './coreVideo.js';
import { gamSubmoduleFactory } from './gamAdServerSubmodule.js';
import { videoImpressionVerifierFactory } from './videoImpressionVerifier.js';

const videoPrefix = 'video_';

const allVideoEvents = Object.keys(videoEvents).map(eventKey => videoEvents[eventKey]);
events.addEvents(allVideoEvents.concat([AUCTION_AD_LOAD_ATTEMPT, AUCTION_AD_LOAD_ABORT, BID_IMPRESSION, BID_ERROR]).map(eventName => videoPrefix + eventName));

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
  const videoImpressionVerifierFactory = videoImpressionVerifierFactory_;
  let videoImpressionVerifier;

  function init() {
    const cache = getConfig('cache');
    videoImpressionVerifier = videoImpressionVerifierFactory(!!cache);
    getConfig('video', ({ video }) => {
      video.providers.forEach(provider => {
        videoCore.registerProvider(provider);
        videoCore.onEvents(videoEvents, (type, payload) => {
          pbEvents.emit(videoPrefix + type, payload);
        }, provider.divId);

        const adServerConfig = provider.adServer;
        if (!gamSubmodule && adServerConfig) {
          gamSubmodule = gamAdServerFactory();
        }
      });
    });

    requestBids.before(beforeBidsRequested, 40);

    pbEvents.on(CONSTANTS.EVENTS.BID_ADJUSTMENT, function (bid) {
      videoImpressionVerifier.trackBid(bid);
    });

    pbEvents.on(videoPrefix + AD_IMPRESSION, function (payload) {
      triggerVideoBidEvent(BID_IMPRESSION, payload);
    });

    pbEvents.on(videoPrefix + AD_ERROR, function (payload) {
      triggerVideoBidEvent(BID_ERROR, payload);
    });
  }

  function renderBid(divId, bid, options = {}) {
    const adUrl = bid.vastUrl;
    options.adXml = bid.vastXml;
    options.winner = bid.bidder;
    loadAdTag(adUrl, divId, options);
  }

  function getVideoOrtb(divId) {
    return videoCore.getOrtbParams(divId);
  }

  return { init, renderBid, getVideoOrtb };

  function beforeBidsRequested(nextFn, bidRequest) {
    const adUnits = bidRequest.adUnits || pbGlobal.adUnits || [];
    adUnits.forEach(adUnit => {
      enrichAdUnit(adUnit);
    });

    const bidsBackHandler = bidRequest.bidsBackHandler;
    if (!bidsBackHandler || typeof bidsBackHandler !== 'function') {
      pbEvents.on(CONSTANTS.EVENTS.AUCTION_END, auctionEnd);
    }

    return nextFn.call(this, bidRequest);
  }

  function enrichAdUnit(adUnit) {
    const videoMediaType = adUnit.mediaTypes.video;
    const videoConfig = adUnit.video;
    if (!videoMediaType || !videoConfig) {
      return;
    }

    const oRtbParams = getVideoOrtb(videoConfig.divId);
    if (!oRtbParams) {
      return;
    }

    const ortbVideo = oRtbParams.video;
    adUnit.mediaTypes.video = Object.assign({}, videoMediaType, ortbVideo);

    adUnit.mediaTypes.video.context = ortbVideo.placement === 1 ? 'instream' : 'outstream';

    const width = ortbVideo.w;
    const height = ortbVideo.h;
    if (width && height) {
      adUnit.mediaTypes.video.playerSize = [width, height];
    }

    let ortb2 = { ortb2: mergeDeep({}, pbGlobal.getConfig('ortb2'), { site: oRtbParams.content }) };
    pbGlobal.setConfig(ortb2);
  }

  function auctionEnd(auctionResult) {
    auctionResult.adUnits.forEach(adUnit => {
      if (adUnit.video) {
        renderWinningBid(adUnit);
      }
    });
  }

  function getAdServerConfig(adUnitVideoConfig) {
    const globalVideoConfig = getConfig('video');
    const globalProviderConfig = globalVideoConfig.providers.find(provider => provider.divId === adUnitVideoConfig.divId);
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
      pbEvents.emit(videoPrefix + AUCTION_AD_LOAD_ABORT, options);
      return;
    }

    const highestBid = highestCpmBids.shift();
    if (!highestBid) {
      return;
    }

    renderBid(divId, highestBid, options);
  }

  // options: adXml, winner, adUnitCode,
  function loadAdTag(adUrl, divId, options) {
    const payload = Object.assign({ adUrl }, options);
    pbEvents.emit(videoPrefix + AUCTION_AD_LOAD_ATTEMPT, payload);
    videoCore.setAdTagUrl(adUrl, divId, options);
  }

  function triggerVideoBidEvent(eventName, adEventPayload) {
    const bid = getBid(adEventPayload);
    if (!bid) {
      return;
    }

    pbGlobal.markWinningBidAsUsed(bid);
    pbEvents.emit(videoPrefix + eventName, { bid, adEvent: adEventPayload });
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

pbVideoFactory();
