import {
  PROTOCOLS, API_FRAMEWORKS, VIDEO_MIME_TYPE, PLAYBACK_METHODS, PLACEMENT, VPAID_MIME_TYPE
} from './videoModule/constants/ortb.js';
import {
  SETUP_COMPLETE, SETUP_FAILED, DESTROYED, AD_REQUEST, AD_BREAK_START, AD_LOADED, AD_STARTED, AD_IMPRESSION, AD_PLAY,
  AD_TIME, AD_PAUSE, AD_CLICK, AD_SKIPPED, AD_ERROR, AD_COMPLETE, AD_BREAK_END, PLAYLIST, PLAYBACK_REQUEST,
  AUTOSTART_BLOCKED, PLAY_ATTEMPT_FAILED, CONTENT_LOADED, PLAY, PAUSE, BUFFER, TIME, SEEK_START, SEEK_END, MUTE, VOLUME,
  RENDITION_UPDATE, ERROR, COMPLETE, PLAYLIST_COMPLETE, FULLSCREEN, PLAYER_RESIZE, VIEWABLE, CAST, PLAYBACK_MODE
} from './videoModule/constants/events.js';
import stateFactory from './videoModule/shared/state.js';
import { adStateFactory, timeStateFactory,  callbackStorageFactory} from './jwplayerVideoProvider.js';
import { VIDEO_JS_VENDOR } from './videoModule/constants/vendorCodes.js';
import { videoVendorDirectory } from './videoModule/vendorDirectory.js';

export function VideojsProvider(config, videojs_, adState_, timeState_, callbackStorage_, utils) {
  let videojs = videojs_;
  let player = null;
  let playerVersion = null;
  const {playerConfig, divId} = config;

  let adState = adState_;
  let timeState = timeState_;
  let callbackStorage = callbackStorage_;
  // TODO: test with older videojs versions
  let minimumSupportedPlayerVersion = '7.17.0';


  function init() {
    if (!videojs) {
      console.log("not founds videojs")
      triggerSetupFailure(-1); // TODO: come up with code for player absent
      return;
    }
    console.log("VideoJS found")

    playerVersion = videojs.VERSION;
    

    if (playerVersion < minimumSupportedPlayerVersion) {
      triggerSetupFailure(-2); // TODO: come up with code for version not supported
      return;
    }

    // returns the player if it exists, or attempts to instantiate a new one
    player = videojs(divId, playerConfig, function(){
        //setup complete
    })
    
  }

  function getId() {
    return divId;
  }

  function getOrtbParams() {
    console.log("Requested ortb params")
    // if (!player) {
    //   return;
    // }
    // const config = player.getConfig();
    // const adConfig = config.advertising || {};
    supportedMediaTypes = supportedMediaTypes || utils.getSupportedMediaTypes(MEDIA_TYPES);

    const video = {
      mimes: [],
      w: 0, 
      h: 0,
    };

    const content = {
      id: item.mediaid,
      url: item.file,
      title: item.title,
      cat: item.iabCategories,
      keywords: item.tags,
      len: duration,
    };

    return {
      video,
      content
    }
  }

  function setAdTagUrl(adTagUrl, options) {
    console.log("Set ad tag url:", adTagUrl)
    // if (!player) {
    //   return;
    // }
    // player.playAd(adTagUrl || options.adXml, options);
  }

  function onEvents(events, callback) {
    console.log("Added callback for", events)
  }

  function offEvents(events, callback) {
    console.log("Removed callback for", events)

  }

  function destroy() {
    console.log("Destroying player")
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
    const adState = adStateFactory();
    const timeState = timeStateFactory();
    const callbackStorage = callbackStorageFactory();
    return VideojsProvider(config, videojs, adState, timeState, callbackStorage, {});
}
videojsSubmoduleFactory.vendorCode = VIDEO_JS_VENDOR;

videoVendorDirectory[VIDEO_JS_VENDOR] = videojsSubmoduleFactory;
export default videojsSubmoduleFactory;