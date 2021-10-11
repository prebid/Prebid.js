import { config } from '../../src/config.js';
import events from '../../src/events.js';
import { allVideoEvents } from './constants/events.js';
import CONSTANTS from '../../src/constants.json';
import { videoCoreFactory } from './coreVideo.js';
import { coreAdServerFactory } from './adServer.js';

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
          adServerCore.registerProvider(adServerConfig.vendorCode, adServerConfig.params);
        }
      });
    });

    requestBids.before(enrichAdUnits, 40);

    /*
    auction result conforms to:
    {
      auctionId: _auctionId,
      timestamp: _auctionStart,
      auctionEnd: _auctionEnd,
      auctionStatus: _auctionStatus,
      adUnits: _adUnits,
      adUnitCodes: _adUnitCodes,
      labels: _labels,
      bidderRequests: _bidderRequests,
      noBids: _noBids,
      bidsReceived: _bidsReceived,
      winningBids: _winningBids,
      timeout: _timeout
    }
     */
    pbEvents.on(CONSTANTS.EVENTS.AUCTION_END, function(auctionResult) {
      // TODO: requires AdServer Module.
      console.log(auctionResult);
      auctionResult.adUnits.forEach(adUnit => {
        if (adUnit.video) {
          renderWinningBid(adUnit);
        }
      });
    });
  }

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

    if (adTagUrl) {
      videoCore.setAdTagUrl(adTagUrl, divId);
      return;
    }

    const highestCpmBids = pbGlobal.getHighestCpmBids(adUnit.code);
    const highestBid = highestCpmBids && highestCpmBids.shift();
    if (!highestBid) {
      return;
    }

    adTagUrl = highestBid.vastUrl;
    let adXml = highestBid.vastXml;
    videoCore.setAdTagUrl(adTagUrl, divId, adXml);
  }

  return { init };
}

function pbVideoFactory() {
  const videoCore = videoCoreFactory();
  const adServerCore = coreAdServerFactory();
  const pbVideo = PbVideo(videoCore, config.getConfig, $$PREBID_GLOBAL$$, events, allVideoEvents, adServerCore);
  pbVideo.init();
  return pbVideo;
}

pbVideoFactory();
