import {getGlobal} from '../../src/prebidGlobal.js';
import {config} from '../../src/config.js';
import events from '../../src/events.js';
import CONSTANTS from '../../src/constants.json'
import { videoCoreFactory } from './coreVideo.js'

export function PbVideo(videoCore_, getConfig_, requestBids_, onPbEvents_) {
  const videoCore = videoCore_;
  const getConfig = getConfig_;
  const requestBids = requestBids_;
  const onPbEvents = onPbEvents_;

  function init() {
    getConfig('video.providers', providers => {
      providers.forEach(provider => {
        videoCore.registerProvider(provider);
      });
      // maybe video.providers to get changes on providers
      // called whenever 'video' is updated
      // instantiate anc check for new submodules
    });

    // before bids are requested , getOrtbParams and write to the ad units.
    requestBids.before(enrichAdUnits, 40);


    // bidsBackHandler -> setAdTagUrl
    onPbEvents(CONSTANTS.EVENTS.AUCTION_END, function(auctionResult) {
      // get winning bid + vast xml
    });

    // analytics registering and surfacing
  }

  function enrichAdUnits(nextFn, bidRequest) {
    // get oRTB arams
    // write to ad units
    // let adUnits = bidRequest.adUnits
  }

  return { init };
}

function pbVideoFactory() {
  const videoCore = videoCoreFactory();
  const pbVideo = PbVideo(videoCore, config.getConfig, getGlobal().requestBids, events.on);
  pbVideo.init();
  return pbVideo;
}

pbVideoFactory();
