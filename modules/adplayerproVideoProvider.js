import {
  API_FRAMEWORKS,
  PLACEMENT,
  PLAYBACK_METHODS,
  PROTOCOLS,
  VIDEO_MIME_TYPE,
  VPAID_MIME_TYPE
} from '../libraries/video/constants/ortb.js';
import {
  AD_CLICK,
  AD_COMPLETE,
  AD_ERROR,
  AD_IMPRESSION,
  AD_LOADED,
  AD_PAUSE,
  AD_PLAY,
  AD_REQUEST,
  AD_SKIPPED,
  AD_STARTED,
  DESTROYED,
  ERROR,
  MUTE,
  PLAYER_RESIZE,
  SETUP_COMPLETE,
  SETUP_FAILED,
  VOLUME
} from '../libraries/video/constants/events.js';
import {AD_PLAYER_PRO_VENDOR} from '../libraries/video/constants/vendorCodes.js';
import {getEventHandler} from '../libraries/video/shared/eventHandler.js';
import {submodule} from '../src/hook.js';

const setupFailMessage = 'Failed to instantiate the player';

/**
 * @constructor
 * @param {Object} config - videoProviderConfig
 * @param {function} adPlayerPro_
 * @param {CallbackStorage} callbackStorage_
 * @param {Object} utils
 * @returns {Object} - VideoProvider
 */
export function AdPlayerProProvider(config, adPlayerPro_, callbackStorage_, utils) {
  const adPlayerPro = adPlayerPro_;
  let player = null;
  let playerVersion = null;
  const playerConfig = config.playerConfig;
  const divId = config.divId;
  let callbackStorage = callbackStorage_;
  let supportedMediaTypes = null;
  let setupCompleteCallbacks = [];
  let setupFailedCallbacks = [];
  const MEDIA_TYPES = [
    VIDEO_MIME_TYPE.MP4,
    VIDEO_MIME_TYPE.OGG,
    VIDEO_MIME_TYPE.WEBM,
    VIDEO_MIME_TYPE.AAC,
    VIDEO_MIME_TYPE.HLS
  ];

  function init() {
    if (!adPlayerPro) {
      triggerSetupFailure(-1, setupFailMessage + ': player not present');
      return;
    }

    // if (playerVersion < minimumSupportedPlayerVersion) {
    //   triggerSetupFailure(-2, setupFailMessage + ': player version not supported');
    //   return;
    // }

    if (!document.getElementById(divId)) {
      triggerSetupFailure(-3, setupFailMessage + ': No div found with id ' + divId);
      return;
    }

    if (!playerConfig || !playerConfig.placementId) {
      triggerSetupFailure(-4, setupFailMessage + ': placementId is required in playerConfig');
      return;
    }

    triggerSetupComplete();
  }

  function getId() {
    return divId;
  }

  function getOrtbVideo() {
    supportedMediaTypes = supportedMediaTypes || utils.getSupportedMediaTypes(MEDIA_TYPES);

    const video = {
      mimes: supportedMediaTypes,
      protocols: [
        PROTOCOLS.VAST_2_0,
        PROTOCOLS.VAST_3_0,
        PROTOCOLS.VAST_4_0,
        PROTOCOLS.VAST_2_0_WRAPPER,
        PROTOCOLS.VAST_3_0_WRAPPER,
        PROTOCOLS.VAST_4_0_WRAPPER
      ],
      // h: player.getHeight(),
      // w: player.getWidth(),
      placement: utils.getPlacement(playerConfig.advertising),
      maxextended: -1, // extension is allowed, and there is no time limit imposed.
      boxingallowed: 1,
      playbackmethod: [utils.getPlaybackMethod(config)],
      playbackend: 1,
      api: [
        API_FRAMEWORKS.VPAID_2_0,
        API_FRAMEWORKS.OMID_1_0
      ],
    };

    return video;
  }

  function getOrtbContent() {
  }

  function setAdTagUrl(adTagUrl, options) {
    setupPlayer(playerConfig, adTagUrl || options.adXml)
  }

  function onEvent(externalEventName, callback, basePayload) {
    if (externalEventName === SETUP_COMPLETE) {
      setupCompleteCallbacks.push(callback);
      return;
    }

    if (externalEventName === SETUP_FAILED) {
      setupFailedCallbacks.push(callback);
      return;
    }

    let getEventPayload;

    switch (externalEventName) {
      case AD_REQUEST:
      case AD_PLAY:
      case AD_PAUSE:
      case AD_LOADED:
      case AD_STARTED:
      case AD_IMPRESSION:
      case AD_CLICK:
      case AD_SKIPPED:
      case AD_ERROR:
      case AD_COMPLETE:
      case MUTE:
      case VOLUME:
      case ERROR:
      case PLAYER_RESIZE:
        getEventPayload = e => ({
          height: player.getAdHeight(),
          width: player.getAdWidth(),
        });
        break;
      default:
        return;
    }

    // eslint-disable-next-line no-unreachable
    const playerEventName = utils.getPlayerEvent(externalEventName);
    const eventHandler = getEventHandler(externalEventName, callback, basePayload, getEventPayload)
    player && player.on(playerEventName, eventHandler);
    callbackStorage.storeCallback(playerEventName, eventHandler, callback);
  }

  function offEvent(event, callback) {
    const playerEventName = utils.getPlayerEvent(event);
    const eventHandler = callbackStorage.getCallback(playerEventName, callback);
    if (eventHandler) {
      player && player.off(playerEventName, eventHandler);
    } else {
      player && player.off(playerEventName);
    }
    callbackStorage.clearCallback(playerEventName, callback);
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
    getOrtbVideo,
    getOrtbContent,
    setAdTagUrl,
    onEvent,
    offEvent,
    destroy
  };

  function setupPlayer(config, urlOrXml) {
    if (!config || player) {
      return;
    }
    const playerConfig = utils.getConfig(config, urlOrXml);

    if (!playerConfig) {
      return;
    }

    player = adPlayerPro(divId);
    callbackStorage.addAllCallbacks(player.on);
    player.on('AdStopped', () => player = null);
    player.setup(playerConfig);
  }

  function triggerSetupComplete() {
    if (!setupCompleteCallbacks.length) {
      return;
    }

    const payload = getSetupCompletePayload();
    setupCompleteCallbacks.forEach(callback => callback(SETUP_COMPLETE, payload));
    setupCompleteCallbacks = [];
  }

  function getSetupCompletePayload() {
    return {
      divId,
      playerVersion,
      type: SETUP_COMPLETE
    };
  }

  function triggerSetupFailure(errorCode, msg, sourceError) {
    if (!setupFailedCallbacks.length) {
      return;
    }

    const payload = {
      divId,
      playerVersion,
      type: SETUP_FAILED,
      errorCode: errorCode,
      errorMessage: msg,
      sourceError: sourceError
    };

    setupFailedCallbacks.forEach(callback => callback(SETUP_FAILED, payload));
    setupFailedCallbacks = [];
  }
}

/**
 * @param {Object} config - videoProviderConfig
 * @param {sharedUtils} sharedUtils
 * @returns {Object} - VideoProvider
 */
const adPlayerProSubmoduleFactory = function (config, sharedUtils) {
  const callbackStorage = callbackStorageFactory();
  return AdPlayerProProvider(config, window.playerPro, callbackStorage, utils);
}

adPlayerProSubmoduleFactory.vendorCode = AD_PLAYER_PRO_VENDOR;
submodule('video', adPlayerProSubmoduleFactory);
export default adPlayerProSubmoduleFactory;

// HELPERS

export const utils = {
  getConfig: function (config, urlOrXml) {
    if (!config || !urlOrXml) {
      return;
    }

    const params = config.params || {};
    params.placementId = config.placementId;
    params.advertising = params.advertising || {};
    params.advertising.tag = params.advertising.tag || {};

    params._pType = 'pbjs';
    params.advertising.tag.url = urlOrXml;
    return params;
  },

  getPlayerEvent: function (eventName) {
    switch (eventName) {
      case DESTROYED:
        return 'AdStopped';

      case AD_REQUEST:
        return 'AdRequest';
      case AD_LOADED:
        return 'AdLoaded';
      case AD_STARTED:
        return 'AdStarted';
      case AD_IMPRESSION:
        return 'AdImpression';
      case AD_PLAY:
        return 'AdPlaying';
      case AD_PAUSE:
        return 'AdPaused';
      case AD_CLICK:
        return 'AdClickThru';
      case AD_SKIPPED:
        return 'AdSkipped';
      case AD_ERROR:
        return 'AdError';
      case AD_COMPLETE:
        return 'AdCompleted';
      case VOLUME:
        return 'AdVolumeChange';
      case PLAYER_RESIZE:
        return 'AdSizeChange';
      // case FULLSCREEN:
      //   return FULLSCREEN;
      default:
        return eventName;
    }
  },

  getSupportedMediaTypes: function (mediaTypes = []) {
    const el = document.createElement('video');
    return mediaTypes
      .filter(mediaType => el.canPlayType(mediaType))
      .concat(VPAID_MIME_TYPE); // Always allow VPAIDs.
  },

  /**
   * Determine the ad placement
   * @param {Object} adConfig
   * @return {PLACEMENT|undefined}
   */
  getPlacement: function (adConfig) {
    adConfig = adConfig || {};

    switch (adConfig.type) {
      case 'inPage':
        return PLACEMENT.ARTICLE;
      case 'rewarded':
      case 'inView':
        return PLACEMENT.INTERSTITIAL_SLIDER_FLOATING;
      default:
        return PLACEMENT.BANNER;
    }
  },

  getPlaybackMethod: function ({autoplay, mute}) {
    if (autoplay) {
      return mute ? PLAYBACK_METHODS.AUTOPLAY_MUTED : PLAYBACK_METHODS.AUTOPLAY;
    }
    return PLAYBACK_METHODS.CLICK_TO_PLAY;
  }
}

/**
 * Tracks which functions are attached to events
 * @typedef CallbackStorage
 * @function storeCallback
 * @function getCallback
 * @function clearCallback
 * @function addAllCallbacks
 * @function clearStorage
 */

/**
 * @returns {CallbackStorage}
 */
export function callbackStorageFactory() {
  let storage = {};
  let storageHandlers = {};

  function storeCallback(eventType, eventHandler, callback) {
    let eventHandlers = storage[eventType];
    if (!eventHandlers) {
      eventHandlers = storage[eventType] = {};
    }

    eventHandlers[callback] = eventHandler;
    addHandler(eventType, eventHandler);
  }

  function getCallback(eventType, callback) {
    let eventHandlers = storage[eventType];
    if (eventHandlers) {
      return eventHandlers[callback];
    }
  }

  function clearCallback(eventType, callback) {
    if (!callback) {
      delete storage[eventType];
      delete storageHandlers[eventType];
      return;
    }
    let eventHandlers = storage[eventType];
    if (eventHandlers) {
      const eventHandler = eventHandlers[callback];
      if (eventHandler) {
        delete eventHandlers[callback];
        clearHandler(eventType, eventHandler);
      }
    }
  }

  function clearStorage() {
    storage = {};
    storageHandlers = {};
  }

  function addHandler(eventType, eventHandler) {
    let eventHandlers = storageHandlers[eventType];
    if (!eventHandlers) {
      eventHandlers = storageHandlers[eventType] = [];
    }
    eventHandlers.push(eventHandler);
  }

  function clearHandler(eventType, eventHandler) {
    let eventHandlers = storageHandlers[eventType];
    eventHandlers = eventHandlers.filter(handler => handler !== eventHandler);
    if (eventHandlers.length) {
      storageHandlers[eventType] = eventHandlers;
    } else {
      delete storageHandlers[eventType];
    }
  }

  function addAllCallbacks(functionOnPlayer) {
    for (let eventType in storageHandlers) {
      storageHandlers[eventType].forEach(handler => functionOnPlayer(eventType, handler));
    }
  }

  return {
    storeCallback,
    getCallback,
    clearCallback,
    addAllCallbacks,
    clearStorage,
  }
}
