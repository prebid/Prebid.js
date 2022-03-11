import {
  SETUP_COMPLETE, SETUP_FAILED, DESTROYED, AD_REQUEST, AD_BREAK_START, AD_LOADED, AD_STARTED, AD_IMPRESSION, AD_PLAY,
  AD_TIME, AD_PAUSE, AD_CLICK, AD_SKIPPED, AD_ERROR, AD_COMPLETE, AD_BREAK_END, PLAYLIST, PLAYBACK_REQUEST,
  AUTOSTART_BLOCKED, PLAY_ATTEMPT_FAILED, CONTENT_LOADED, PLAY, PAUSE, BUFFER, TIME, SEEK_START, SEEK_END, MUTE, VOLUME,
  RENDITION_UPDATE, ERROR, COMPLETE, PLAYLIST_COMPLETE, FULLSCREEN, PLAYER_RESIZE, VIEWABLE, CAST, PLAYBACK_MODE
} from './videoModule/constants/events.js';
import {
  PROTOCOLS, API_FRAMEWORKS, VIDEO_MIME_TYPE, PLAYBACK_METHODS, PLACEMENT, VPAID_MIME_TYPE, AD_POSITION, PLAYBACK_END
} from './videoModule/constants/ortb.js';
import { VIDEO_JS_VENDOR } from './videoModule/constants/vendorCodes.js';
import { videoVendorDirectory } from './videoModule/vendorDirectory.js';

export function VideojsProvider(config, videojs_, adState_, timeState_, callbackStorage_, utils) {
  let videojs = videojs_;
  const callbackStorage = callbackStorage_;

  let player = null;
  let playerVersion = null;
  let imaOptions = null;
  const {playerConfig, divId} = config;

  let setupCompleteCallback, setupFailedCallback;

  // TODO: test with older videojs versions
  let minimumSupportedPlayerVersion = '7.17.0';

  function init() {
    if (!videojs) {
      triggerSetupFailure(-1, 'Videojs not present')
      return;
    }
    playerVersion = videojs.VERSION;

    if (playerVersion < minimumSupportedPlayerVersion) {
      triggerSetupFailure(-2, 'Videojs version not supported')
      return;
    }

    // returns the player if it exists, or attempts to instantiate a new one
    player = videojs(divId, playerConfig, function() {
      // callback runs in both cases
    });
    // Todo: the linter doesn't like optional chaining is there a better way to do this
    const vendorConfig = config.playerConfig && config.playerConfig.params && config.playerConfig.params.vendorConfig;
    const tags = vendorConfig && vendorConfig.advertising && vendorConfig.advertising.tag;
    if (player.ima && tags) {
      imaOptions = {
        adTagUrl: tags[0]
      };
      player.ima(imaOptions);
    }

    // TODO: make sure ortb gets called in integration example
    // currently testing with a hacky solution by hooking it to window
    // window.ortb = this.getOrtbParams
  }

  function triggerSetupFailure(errorCode, msg) {
    const payload = {
      divId,
      playerVersion,
      type: SETUP_FAILED,
      errorCode,
      errorMessage: msg,
      sourceError: null
    };
    setupFailedCallback && setupFailedCallback(SETUP_FAILED, payload);
  }

  function getId() {
    return divId;
  }

  function getOrtbParams() {
    if (!player) {
      return null;
    }

    const content = {
      // id:, TODO: find a suitable id for videojs sources
      url: player.currentSrc()
    };
    // Only include length if player is ready
    // player.readyState() returns a level of readiness from 0 to 4
    // https://docs.videojs.com/player#readyState
    if (player.readyState() > 0) {
      content.len = Math.round(player.duration());
    }
    const mediaItem = player.getMedia();
    if (mediaItem) {
      for (let param of ['album', 'artist', 'title']) {
        if (mediaItem[param]) {
          content[param] = mediaItem[param];
        }
      }
    }

    let playBackMethod = PLAYBACK_METHODS.CLICK_TO_PLAY;
    // returns a boolean or a string with the autoplay strategy
    const autoplay = player.autoplay();
    const muted = player.muted() || autoplay === 'muted';
    // check if autoplay is truthy since it may be a bool or string
    if (autoplay) {
      playBackMethod = muted ? PLAYBACK_METHODS.AUTOPLAY_MUTED : PLAYBACK_METHODS.AUTOPLAY;
    }
    const supportedMediaTypes = Object.values(VIDEO_MIME_TYPE).filter(
      // Follows w3 spec https://www.w3.org/TR/2011/WD-html5-20110113/video.html#dom-navigator-canplaytype
      type => player.canPlayType(type) !== ''
    )
    // IMA supports vpaid unless its expliclty turned off
    if (imaOptions && imaOptions.vpaidMode !== 0) {
      supportedMediaTypes.push(VPAID_MIME_TYPE);
    }

    const video = {
      mimes: supportedMediaTypes,
      // Based on the protocol support provided by the videojs-ima plugin
      // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/compatibility
      // Need to check for the plugins
      protocols: imaOptions ? [
        PROTOCOLS.VAST_2_0,
      ] : [],
      api: imaOptions ? [
        API_FRAMEWORKS.VPAID_2_0
      ] : [],
      // TODO: Make sure this returns dimensions in DIPS
      h: player.currentHeight(),
      w: player.currentWidth(),
      // TODO: implement startdelay since its reccomend param
      // both linearity forms are supported so the param is excluded
      // sequence - TODO not yet supported
      maxextended: -1,
      boxingallowed: 1,
      playbackmethod: [ playBackMethod ],
      playbackend: PLAYBACK_END.VIDEO_COMPLETION,
      // Per ortb 7.4 skip is omitted since neither the player nor ima plugin imposes a skip button, or a skipmin/max
    };

    // TODO: Determine placement may not be in stream if videojs is only used to serve ad content
    // ~ Sort of resolved check if the player has a source to tell if the placement is instream
    // Still cannot reliably check what type of placement the player is if its outstream
    // i.e. we can't tell if its interstitial, in article, etc.
    if (content.url) {
      video.placement = PLACEMENT.IN_STREAM;
    }

    // Placement according to IQG Guidelines 4.2.8
    // https://cdn2.hubspot.net/hubfs/2848641/TrustworthyAccountabilityGroup_May2017/Docs/TAG-Inventory-Quality-Guidelines-v2_2-10-18-2016.pdf?t=1509469105938
    const findPosition = videojs.dom.findPosition;
    if (player.isFullscreen()) {
      video.pos = AD_POSITION.FULL_SCREEN;
    } else if (findPosition) {
      video.pos = utils.getPositionCode(findPosition(player.el()))
    }

    return {video, content};
  }

  // Plugins to integrate: https://github.com/googleads/videojs-ima
  function setAdTagUrl(adTagUrl, options) {
  }

  function onEvents(events, callback) {
    if (!callback) {
      return;
    }
    for (let i = 0; i < events.length; i++) {
      const type = events[i];
      let payload = {
        divId,
        type
      };

      registerPreSetupListeners(type, callback, payload);
      if (!player) {
        return;
      }

      // registerPostSetupListeners(type, callback, payload);
    }
  }

  function getSetupCompletePayload() {
    return {
      divId,
      playerVersion,
      type: SETUP_COMPLETE,
    };
  }

  function registerPreSetupListeners(type, callback, payload) {
    let eventHandler;
    switch (type) {
      case SETUP_COMPLETE:
        setupCompleteCallback = callback;
        eventHandler = () => {
          payload = getSetupCompletePayload();
          callback(type, payload);
          setupCompleteCallback = null;
        };
        break;

      case SETUP_FAILED:
        setupFailedCallback = callback;
        eventHandler = () => {
          // Videojs has no specific setup error handler
          // so we imitate it by hooking to the general error
          // handler and checking to see if the player has been setup
          if (player.readyState() == 0){
            const e = player.error()
            Object.assign(payload, {
              playerVersion,
              errorCode: e.errorTypes,
              errorMessage: e.message,
            });
            callback(type, payload);
            setupFailedCallback = null;
          }
        };
        break;
      default:
        return;
    }

    
    player && player.on(utils.getVideojsEventName(type), eventHandler);

  }

  function offEvents(events, callback) {
    for(let event of events) {
      const videojsEvent = utils.getVideojsEventName(event)
      if (!callback) {
        player.off(videojsEvent);
        continue;
      }

      const eventHandler = callbackStorage.getCallback(event, callback);
      if (eventHandler) {
        player.off(videojsEvent, eventHandler);
      }

    }
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

export const utils = {
  getPositionCode: function({left, top, width, height}) {
    const bottom = window.innerHeight - top - height;
    const right = window.innerWidth - left - width;

    if (left < 0 || right < 0 || top < 0) {
      return AD_POSITION.UNKNOWN;
    }

    return bottom >= 0 ? AD_POSITION.ABOVE_THE_FOLD : AD_POSITION.BELOW_THE_FOLD;
  },
  getVideojsEventName: function(eventName) {
    switch (eventName) {
      case SETUP_COMPLETE:
        return 'ready';
      case SETUP_FAILED:
        return 'error';
      case DESTROYED:
        return 'dispose';
      case CONTENT_LOADED:
        return 'loadeddata';
      case SEEK_START:
        return 'seeking';
      case SEEK_END:
        return 'timeupdate';
      case VOLUME:
        return 'volumechange';
      case PLAYER_RESIZE:
        return 'playerresize';
      default:
        return eventName;
    }
  }
};

const videojsSubmoduleFactory = function (config) {
  const adState = null;
  const timeState = null;
  const callbackStorage = callbackStorageFactory();
  // videojs factory is stored to window by default
  const vjs = window.videojs;
  return VideojsProvider(config, vjs, adState, timeState, callbackStorage, utils);
}
videojsSubmoduleFactory.vendorCode = VIDEO_JS_VENDOR;

videoVendorDirectory[VIDEO_JS_VENDOR] = videojsSubmoduleFactory;
export default videojsSubmoduleFactory;

export function callbackStorageFactory() {
  let storage = {};

  function storeCallback(eventType, eventHandler, callback) {
    let eventHandlers = storage[eventType];
    if (!eventHandlers) {
      eventHandlers = storage[eventType] = {};
    }

    eventHandlers[callback] = eventHandler;
  }

  function getCallback(eventType, callback) {
    let eventHandlers = storage[eventType];
    if (!eventHandlers) {
      return;
    }

    const eventHandler = eventHandlers[callback];
    delete eventHandlers[callback];
    return eventHandler;
  }

  function clearStorage() {
    storage = {};
  }

  return {
    storeCallback,
    getCallback,
    clearStorage
  }
}
