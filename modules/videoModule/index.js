import { config } from '../../src/config.js';
import events from '../../src/events.js';
import { allVideoEvents, AUCTION_AD_LOAD_ATTEMPT } from './constants/events.js';
import CONSTANTS from '../../src/constants.json';
import { videoCoreFactory } from './coreVideo.js';
import { coreAdServerFactory } from './adServer.js';
import find from 'prebidjs-polyfill/find.js';
import { vastXmlEditorFactory } from './shared/vastXmlEditor.js';

/**
 * This module adds User Video support to prebid.js
 * @module modules/videoModule
 */

events.addEvents(allVideoEvents);

export function PbVideo(videoCore_, getConfig_, pbGlobal_, pbEvents_, videoEvents_, adServerCore_, vastXmlEditor_) {
  const videoCore = videoCore_;
  const getConfig = getConfig_;
  const pbGlobal = pbGlobal_;
  const requestBids = pbGlobal.requestBids;
  const pbEvents = pbEvents_;
  const videoEvents = videoEvents_;
  const adServerCore = adServerCore_;
  const vastXmlEditor = vastXmlEditor_;

  function init() {
    getConfig('video', ({ video }) => {
      video.providers.forEach(provider => {
        try {
          videoCore.registerProvider(provider);
          videoCore.onEvents(videoEvents, (type, payload) => {
            pbEvents.emit(type, payload);
          }, provider.divId);
        } catch (e) {}

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

    const cache = getConfig('cache');
    if (!cache) {
      return;
    }

    pbEvents.on(CONSTANTS.EVENTS.BID_ADJUSTMENT, function (bid) {
      const adUnitCode = bid.adUnitCode;
      const adUnit = find(pbGlobal.adUnits, adUnit => adUnitCode === adUnit.code);
      const videoConfig = adUnit && adUnit.video;
      const adServerConfig = videoConfig && videoConfig.adServer;
      const trackingConfig = adServerConfig && adServerConfig.tracking;
      addTrackingNodesToVastXml(bid, trackingConfig);
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
    adUnit.mediaTypes.video = Object.assign({}, videoMediaType, oRtbParams);
  }

  function renderWinningBid(adUnit) {
    const videoConfig = adUnit.video;
    const divId = videoConfig.divId;
    const adServerConfig = videoConfig.adServer;
    let adUrl;
    if (adServerConfig) {
      adUrl = adServerCore.getAdTagUrl(adServerConfig.vendorCode, adUnit, adServerConfig.baseAdTagUrl);
    }

    const adUnitCode = adUnit.code;
    const options = { adUnitCode };
    if (adUrl) {
      loadAdTag(adUrl, divId, options);
      return;
    }

    const highestCpmBids = pbGlobal.getHighestCpmBids(adUnit.code);
    const highestBid = highestCpmBids && highestCpmBids.shift();
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

  function addTrackingNodesToVastXml(bid, trackingConfig) {
    if (!trackingConfig) {
      return;
    }

    let { vastXml, vastUrl, adId } = bid;
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
      vastXml = vastXmlEditor.getVastXmlWithTrackingNodes(vastXml, impressionUrl, impressionId, errorUrl);
    } else if (vastUrl) {
      vastXml = vastXmlEditor.buildVastWrapper(adId, vastUrl, impressionUrl, impressionId, errorUrl);
    }

    bid.vastXml = vastXml;
  }
}

export function pbVideoFactory() {
  const videoCore = videoCoreFactory();
  const adServerCore = coreAdServerFactory();
  const vastXmlEditor = vastXmlEditorFactory();
  const pbVideo = PbVideo(videoCore, config.getConfig, $$PREBID_GLOBAL$$, events, allVideoEvents, adServerCore, vastXmlEditor);
  pbVideo.init();
  return pbVideo;
}

pbVideoFactory();
