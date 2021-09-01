import {config} from '../../src/config.js';
import events from '../../src/events.js';
import CONSTANTS from '../../src/constants.json'
import { videoCoreFactory } from './coreVideo.js'

export function PbVideo(videoCore_, getConfig_, pbGlobal_, onPbEvents_) {
  const videoCore = videoCore_;
  const getConfig = getConfig_;
  const pbGlobal = pbGlobal_;
  const requestBids = pbGlobal.requestBids;
  const onPbEvents = onPbEvents_;

  function init() {
    getConfig('video', ({ video }) => {
      video.providers.forEach(provider => {
        try {
          videoCore.registerProvider(provider);
        } catch (e) {}
      });
    });

    requestBids.before(enrichAdUnits, 40);

    // bidsBackHandler -> setAdTagUrl
    onPbEvents(CONSTANTS.EVENTS.AUCTION_END, function(auctionResult) {
      // get ad tag from adServer - auctionResult.winningBids
      // coreVideo.setAdTagUrl(adTag, divId);
      this.winningBids = auctionResult.winningBids;
    });

    // analytics registering and surfacing
  }

  function enrichAdUnits(nextFn, bidRequest) {
    const adUnits = bidRequest.adUnits || pbGlobal.adUnits;
    adUnits.forEach(adUnit => {
      const oRtbParams = videoCore.getOrtbParams(adUnit.video.divId);
      adUnit.mediaTypes.video = Object.assign({}, adUnit.mediaTypes.video, oRtbParams);
    });
    return nextFn.call(this, config);
  }

  return { init };
}

function pbVideoFactory() {
  const videoCore = videoCoreFactory();
  const pbVideo = PbVideo(videoCore, config.getConfig, $$PREBID_GLOBAL$$, events.on);
  pbVideo.init();
  return pbVideo;
}

pbVideoFactory();
