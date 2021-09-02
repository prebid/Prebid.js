// import {config} from '../../src/config.js';
import events from '../../src/events.js';
import { allVideoEvents } from './constants/events.js';
import CONSTANTS from '../../src/constants.json';
// import { videoCoreFactory } from './coreVideo.js';

events.addEvents(allVideoEvents);

export function PbVideo(videoCore_, getConfig_, pbGlobal_, pbEvents_, videoEvents_) {
  const videoCore = videoCore_;
  const getConfig = getConfig_;
  const pbGlobal = pbGlobal_;
  const requestBids = pbGlobal.requestBids;
  const pbEvents = pbEvents_;
  const videoEvents = videoEvents_;

  function init() {
    getConfig('video', ({ video }) => {
      video.providers.forEach(provider => {
        try {
          videoCore.registerProvider(provider);
          videoCore.onEvents(videoEvents, (type, payload) => {
            pbEvents.emit(type, payload);
          }, provider.divId);
        } catch (e) {}
      });
    });

    requestBids.before(enrichAdUnits, 40);

    pbEvents.on(CONSTANTS.EVENTS.AUCTION_END, function(auctionResult) {
      // TODO: requires AdServer Module.
      // get ad tag from adServer - auctionResult.winningBids
      // coreVideo.setAdTagUrl(adTag, divId);
    });
  }

  function enrichAdUnits(nextFn, bidRequest) {
    const adUnits = bidRequest.adUnits || pbGlobal.adUnits;
    adUnits.forEach(adUnit => {
      const oRtbParams = videoCore.getOrtbParams(adUnit.video.divId);
      adUnit.mediaTypes.video = Object.assign({}, adUnit.mediaTypes.video, oRtbParams);
    });
    return nextFn.call(this, bidRequest);
  }

  return { init };
}

// function pbVideoFactory() {
//   const videoCore = videoCoreFactory();
//   const pbVideo = PbVideo(videoCore, config.getConfig, $$PREBID_GLOBAL$$, events, allVideoEvents);
//   pbVideo.init();
//   return pbVideo;
// }
//
// pbVideoFactory();
