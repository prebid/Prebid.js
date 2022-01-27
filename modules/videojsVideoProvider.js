import {
  PROTOCOLS, API_FRAMEWORKS, VIDEO_MIME_TYPE, PLAYBACK_METHODS, PLACEMENT, VPAID_MIME_TYPE, AD_POSITION, PLAYBACK_END
} from './videoModule/constants/ortb.js';
import { VIDEO_JS_VENDOR } from './videoModule/constants/vendorCodes.js';
import { videoVendorDirectory } from './videoModule/vendorDirectory.js';

export function VideojsProvider(config, videojs_, adState_, timeState_, callbackStorage_, utils) {
  let videojs = videojs_;
  let player = null;
  let playerVersion = null;
  const {playerConfig, divId} = config;

  // TODO: test with older videojs versions
  let minimumSupportedPlayerVersion = '7.17.0';

  function init() {
    if (!videojs) {
    // TODO: come up with code for player absent
      return;
    }
    playerVersion = videojs.VERSION;

    if (playerVersion < minimumSupportedPlayerVersion) {
    // TODO: come up with code for version not supported
      return;
    }

    // returns the player if it exists, or attempts to instantiate a new one
    player = videojs(divId, playerConfig, function() {
      // callback runs in both cases
    });
    // TODO: make sure ortb gets called in integration example
    // currently testing with a hacky solution by hooking it to window
    // window.ortb = this.getOrtbParams
  }

  function getId() {
    return divId;
  }

  function getOrtbParams() {
    if (!player) {
      return null;
    }

    let playBackMethod = PLAYBACK_METHODS.CLICK_TO_PLAY
    const isMuted = player.muted() || player.autoplay() === 'muted'; // todo autoplayAdsMuted only applies to preRoll
    if (player.autoplay()) {
      playBackMethod = isMuted ? PLAYBACK_METHODS.AUTOPLAY_MUTED : PLAYBACK_METHODS.AUTOPLAY;
    }
    const supportedMediaTypes = Object.values(VIDEO_MIME_TYPE).filter(
      // Follows w3 spec https://www.w3.org/TR/2011/WD-html5-20110113/video.html#dom-navigator-canplaytype
      type => player.canPlayType(type) !== ''
    ).concat([VPAID_MIME_TYPE])
    const video = {
      mimes: supportedMediaTypes,
      // Based on the protocol support provided by the videojs-ima plugin
      // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/compatibility
      // Need to check for the plugins prescence by checking videojs.ima
      protocols: videojs.ima ? [
        PROTOCOLS.VAST_2_0,
      ] : [],
      api: [
        API_FRAMEWORKS.VPAID_2_0
      ],
      // TODO: Make sure this returns dimensions in DIPS
      h: player.currentHeight(),
      w: player.currentWidth(),
      placement: PLACEMENT.IN_STREAM,
      // both linearity forms are supported
      // sequence - TODO not yet supported
      // battr: adConfig.battr, TODO: Not sure where this should be coming from
      maxextended: -1,
      boxingallowed: 1,
      playbackmethod: [ playBackMethod ],
      playbackend: PLAYBACK_END.VIDEO_COMPLETION,
      skip: 1,
      pos: AD_POSITION.UNKNOWN // default value modified below
    };

    // Placement according to IQG Guidelines 4.2.8
    // https://cdn2.hubspot.net/hubfs/2848641/TrustworthyAccountabilityGroup_May2017/Docs/TAG-Inventory-Quality-Guidelines-v2_2-10-18-2016.pdf?t=1509469105938
    if (player.isFullscreen()) {
      video.pos = AD_POSITION.FULL_SCREEN;
    }
    else if(videojs.dom.findPosition){
      const {left, top, width, height} = videojs.dom.findPosition(player.el())
      const bottom = window.innerHeight - top - height
      const right = window.innerWidth - left - width
      // Make sure video isn't overflowed horizontally
      if(left >= 0 && right >= 0){
        if(top>=0 && bottom>=0){
          video.pos = AD_POSITION.ABOVE_THE_FOLD
        }
        else if(top>=0){
          video.pos = AD_POSITION.BELOW_THE_FOLD
        }
      }
    }

    const content = {
      // id:, TODO: find a suitable id for videojs sources
      url: player.currentSrc()
    };
    // Only include length if player is ready
    if (player.readyState() > 0) {
      content.len = Math.round(player.duration());
    }
    const item = player.getMedia();
    if (item) {
      for (let param of ['album', 'artist', 'title']) {
        if (item[param]) {
          content[param] = item[param];
        }
      }
    }

    return {video, content};
  }

  // Plugins to integrate: https://github.com/googleads/videojs-ima
  function setAdTagUrl(adTagUrl, options) {
  }

  function onEvents(events, callback) {
  }

  function offEvents(events, callback) {
  }

  function destroy() {
    if (!player) {
      return;
    }
    player.remove();
    player = null;
  }

  return {
    init,
    getId,
    getOrtbParams,
    setAdTagUrl,
    onEvents,
    offEvents,
    destroy
  };
}

const videojsSubmoduleFactory = function (config) {
  const adState = null;
  const timeState = null;
  const callbackStorage = null;
  // videojs factory is stored to window by default
  const vjs = window.videojs
  return VideojsProvider(config, vjs, adState, timeState, callbackStorage, {});
}
videojsSubmoduleFactory.vendorCode = VIDEO_JS_VENDOR;

videoVendorDirectory[VIDEO_JS_VENDOR] = videojsSubmoduleFactory;
export default videojsSubmoduleFactory;
