import { config } from '../../src/config.js';
import events from '../../src/events.js';
import { allVideoEvents } from './constants/events.js';
import CONSTANTS from '../../src/constants.json';
import { videoCoreFactory } from './coreVideo.js';
import { coreAdServerFactory } from './adServer.js';
import find from 'core-js-pure/features/array/find.js';
import {buildVastWrapper, getErrorNode, getImpressionNode} from './shared/vastXmlBuilder';

events.addEvents(allVideoEvents);

export function PbVideo(videoCore_, getConfig_, pbGlobal_, pbEvents_, videoEvents_, adServerCore_) {
  const videoCore = videoCore_;
  const getConfig = getConfig_;
  const pbGlobal = pbGlobal_;
  const requestBids = pbGlobal.requestBids;
  const pbEvents = pbEvents_;
  const videoEvents = videoEvents_;
  const adServerCore = adServerCore_;

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
          adServerCore.registerAdServer(adServerConfig.vendorCode, adServerConfig.params);
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
      const adUnit = find($$PREBID_GLOBAL$$.adUnits, adUnit => adUnitCode === adUnit.code);
      const videoConfig = adUnit && adUnit.video;
      const adServerConfig = videoConfig && videoConfig.adServer;
      if (!adServerConfig) {
        return;
      }

      let { vastXml, vastUrl } = bid;
      const adId = bid.adId;
      let impressionUrl;
      let impressionId;
      let errorUrl;
      const trackingConfig = adServerConfig.tracking || {};
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
        vastXml = getVastXmlWithTrackingNodes(vastXml, impressionUrl, impressionId, errorUrl);
      } else if (vastUrl) {
        vastXml = buildVastWrapper(adId, vastUrl, impressionUrl, impressionId, errorUrl);
      }

      bid.vastXml = vastXml;
    });



    // must tie adId to bid id and auction id possibly
    // bid.auctionId .adId .creativeId .requestId

    // it could be that bid.adId should be equal to the VAST XML adId.
    // asked in pbjs slack and media grid

    // confirmation comes from jwplayer ad impression event.adId
    // this is not sent for ad error
    // check how/if this works for vmap
    // what happens when there are many redirects ? - initial tests were done with ad tag in event, not ad tag loaded to player
    // works for IMA!

    // then check impression/error event
  }

  return { init };

  function enrichAdUnits(nextFn, bidRequest) {
    const adUnits = bidRequest.adUnits || pbGlobal.adUnits || [];
    adUnits.forEach(adUnit => {
      const oRtbParams = videoCore.getOrtbParams(adUnit.video.divId);
      adUnit.mediaTypes.video = Object.assign({}, adUnit.mediaTypes.video, oRtbParams);
    });
    return nextFn.call(this, bidRequest);
  }

  function renderWinningBid(adUnit) {
    const videoConfig = adUnit.video;
    const divId = videoConfig.divId;
    const adServerConfig = videoConfig.adServer;
    let adTagUrl;
    if (adServerConfig) {
      adTagUrl = adServerCore.getAdTagUrl(adServerConfig.vendorCode, adUnit, adServerConfig.baseAdTagUrl);
    }

    const adUnitCode = adUnit.code;
    const options = { adUnitCode };
    if (adTagUrl) {
      videoCore.setAdTagUrl(adTagUrl, divId, options);
      return;
    }

    const highestCpmBids = pbGlobal.getHighestCpmBids(adUnit.code);
    const highestBid = highestCpmBids && highestCpmBids.shift();
    if (!highestBid) {
      return;
    }

    adTagUrl = highestBid.vastUrl;
    options.adXml = highestBid.vastXml;
    videoCore.setAdTagUrl(adTagUrl, divId, options);
  }
}

export function pbVideoFactory() {
  const videoCore = videoCoreFactory();
  const adServerCore = coreAdServerFactory();
  const pbVideo = PbVideo(videoCore, config.getConfig, $$PREBID_GLOBAL$$, events, allVideoEvents, adServerCore);
  pbVideo.init();
  return pbVideo;
}
