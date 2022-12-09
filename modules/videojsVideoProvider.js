import {
  SETUP_COMPLETE, SETUP_FAILED, DESTROYED,
  PLAYLIST, PLAYBACK_REQUEST, CONTENT_LOADED, PLAY, PAUSE, TIME, SEEK_START, SEEK_END, MUTE, VOLUME, ERROR, COMPLETE,
  FULLSCREEN, PLAYER_RESIZE,
  AD_REQUEST, AD_IMPRESSION, AD_TIME, AD_COMPLETE, AD_SKIPPED, AD_CLICK, AD_STARTED, AD_ERROR, AD_LOADED, AD_PLAY, AD_PAUSE
} from '../libraries/video/constants/events.js';
// missing events: , AD_BREAK_START, , AD_BREAK_END, VIEWABLE, BUFFER, CAST, PLAYLIST_COMPLETE, RENDITION_UPDATE, PLAY_ATTEMPT_FAILED, AUTOSTART_BLOCKED
import {
  PROTOCOLS, API_FRAMEWORKS, VIDEO_MIME_TYPE, PLAYBACK_METHODS, PLACEMENT, VPAID_MIME_TYPE, AD_POSITION, PLAYBACK_END
} from '../libraries/video/constants/ortb.js';
import { VIDEO_JS_VENDOR } from '../libraries/video/constants/vendorCodes.js';
import { submodule } from '../src/hook.js';
import stateFactory from '../libraries/video/shared/state.js';
import { PLAYBACK_MODE } from '../libraries/video/constants/enums.js';
import { getEventHandler } from '../libraries/video/shared/eventHandler.js';

/*
Plugins of interest:
https://www.npmjs.com/package/videojs-chromecast
https://www.npmjs.com/package/@silvermine/videojs-airplay
https://www.npmjs.com/package/videojs-airplay
https://www.npmjs.com/package/@silvermine/videojs-chromecast
https://www.npmjs.com/package/videojs-ima
https://github.com/googleads/videojs-ima
https://github.com/videojs/videojs-playlist
https://github.com/videojs/videojs-contrib-ads
https://github.com/videojs/videojs-errors
https://github.com/videojs/videojs-overlay
https://github.com/videojs/videojs-playlist-ui

inspiration:
https://github.com/Conviva/conviva-js-videojs/blob/master/conviva-videojs-module.js
 */

const setupFailMessage = 'Failed to instantiate the player';
const AD_MANAGER_EVENTS = [AD_LOADED, AD_STARTED, AD_IMPRESSION, AD_PLAY, AD_PAUSE, AD_TIME, AD_COMPLETE, AD_SKIPPED];

export function VideojsProvider(config, vjs_, adState_, timeState_, callbackStorage_, utils) {
  let vjs = vjs_;
  // Supplied callbacks are typically wrapped by handlers
  // we use this dict to keep track of these pairings
  const callbackToHandler = {};

  const adState = adState_;
  const timeState = timeState_;
  let player = null;
  let playerVersion = null;
  let playerIsSetup = false;
  const {playerConfig, divId} = config;
  let isMuted;
  let previousLastTimePosition = 0;
  let lastTimePosition = 0;

  let setupCompleteCallbacks = [];
  let setupFailedCallbacks = [];
  let setupFailedEventHandlers = [];

  // TODO: test with older videojs versions
  let minimumSupportedPlayerVersion = '7.17.0';

  function init() {
    if (!vjs) {
      triggerSetupFailure(-1, setupFailMessage + ': Videojs not present')
      return;
    }

    playerVersion = vjs.VERSION;
    if (playerVersion < minimumSupportedPlayerVersion) {
      triggerSetupFailure(-2, setupFailMessage + ': Videojs version not supported');
      return;
    }

    if (!document.getElementById(divId)) {
      triggerSetupFailure(-3, setupFailMessage + ': No div found with id ' + divId);
      return;
    }

    const instantiatedPlayers = vjs.players;
    if (instantiatedPlayers && instantiatedPlayers[divId]) {
      // already instantiated
      player = instantiatedPlayers[divId];
      onReady();
      return;
    }

    setupPlayer(playerConfig);

    if (!player) {
      triggerSetupFailure(-4, setupFailMessage);
    }
  }

  function getId() {
    return divId;
  }

  function getOrtbVideo() {
    if (!player) {
      return;
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
    // TODO: needs a reference to the imaOptions used at setup to determine if vpaid can be used
    // if (imaOptions && imaOptions.vpaidMode !== 0) {
    supportedMediaTypes.push(VPAID_MIME_TYPE);
    // }

    const video = {
      mimes: supportedMediaTypes,
      // Based on the protocol support provided by the videojs-ima plugin
      // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/compatibility
      // Need to check for the plugins
      protocols: [
        PROTOCOLS.VAST_2_0,
      ],
      api: [
        API_FRAMEWORKS.VPAID_2_0 // TODO: needs a reference to the imaOptions used at setup to determine if vpaid can be used
      ],
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
    if (player.src()) {
      video.placement = PLACEMENT.INSTREAM;
    }

    // Placement according to IQG Guidelines 4.2.8
    // https://cdn2.hubspot.net/hubfs/2848641/TrustworthyAccountabilityGroup_May2017/Docs/TAG-Inventory-Quality-Guidelines-v2_2-10-18-2016.pdf?t=1509469105938
    const findPosition = vjs.dom.findPosition;
    if (player.isFullscreen()) {
      video.pos = AD_POSITION.FULL_SCREEN;
    } else if (findPosition) {
      video.pos = utils.getPositionCode(findPosition(player.el()));
    }

    return video;
  }

  function getOrtbContent() {
    if (!player) {
      return;
    }

    const content = {
      // id:, TODO: find a suitable id for videojs sources
      url: player.currentSrc()
    };
    // Only include length if player is ready
    // player.readyState() returns a level of readiness from 0 to 4
    // https://docs.videojs.com/player#readyState
    if (player.readyState()) {
      content.len = Math.round(player.duration());
    }

    const mediaItem = utils.getMedia(player);
    if (mediaItem) {
      for (let param of ['id', 'title', 'description', 'album', 'artist']) {
        if (mediaItem[param]) {
          content[param] = mediaItem[param];
        }
      }
    }

    const contentUrl = utils.getValidMediaUrl(mediaItem && mediaItem.src, player.src)
    if (contentUrl) {
      content.url = contentUrl;
    }

    return content;
  }

  // Plugins to integrate: https://github.com/googleads/videojs-ima
  function setAdTagUrl(adTagUrl, options) {
    if (!player.ima || !adTagUrl) {
      return;
    }

    player.ima.changeAdTag(adTagUrl);
    player.ima.requestAds();
  }

  function onEvent(type, callback, payload) {
    registerSetupListeners(type, callback, payload);

    if (!player) {
      return;
    }

    player.ready(() => {
      registerListeners(type, callback, payload);
    });
  }

  function registerSetupListeners(externalEventName, callback, basePayload) {
    // no point in registering for setup failures if already setup.
    if (playerIsSetup) {
      return;
    }

    if (externalEventName === SETUP_COMPLETE) {
      setupCompleteCallbacks.push(callback);
    } else if (externalEventName === SETUP_FAILED) {
      setupFailedCallbacks.push(callback);
      registerSetupErrorListener()
    }
  }

  function registerSetupErrorListener() {
    if (!player) {
      return
    }

    const eventHandler = () => {
      /*
      Videojs has no specific setup error handler
      so we imitate it by hooking to the general error
      handler and checking to see if the player has been setup
       */
      if (playerIsSetup) {
        return;
      }

      const error = player.error();
      triggerSetupFailure(error.code, error.message, error);
    };

    player.on(ERROR, eventHandler);
    setupFailedEventHandlers.push(eventHandler)
  }

  function registerListeners(externalEventName, callback, basePayload) {
    if (externalEventName === MUTE) {
      const eventHandler = () => {
        if (isMuted !== player.muted()) {
          basePayload.mute = isMuted = !isMuted;
          callback(externalEventName, basePayload);
        }
      };
      player.on(utils.getVideojsEventName(VOLUME), eventHandler);
      return;
    }

    let getEventPayload;

    switch (externalEventName) {
      case PLAY:
      case PAUSE:
      case DESTROYED:
        break;

      case PLAYBACK_REQUEST:
        getEventPayload = e => ({ playReason: 'unknown' });
        break;

      case AD_REQUEST:
        getEventPayload = e => {
          const adTagUrl = e.AdsRequest.adTagUrl;
          adState.updateState({ adTagUrl });
          return { adTagUrl };
        };
        break

      case AD_LOADED:
        getEventPayload = (e) => {
          const imaAd = e.getAdData && e.getAdData();
          adState.updateForEvent(imaAd);
          timeState.clearState();
          return adState.getState();
        };
        break

      case AD_STARTED:
      case AD_PLAY:
      case AD_PAUSE:
        getEventPayload = () => adState.getState();
        break

      case AD_IMPRESSION:
      case AD_CLICK:
        getEventPayload = () => Object.assign({}, adState.getState(), timeState.getState());
        break

      case AD_TIME:
        getEventPayload = (e) => {
          const adTimeEvent = e && e.getAdData && e.getAdData();
          timeState.updateForTimeEvent(adTimeEvent);
          return Object.assign({}, adState.getState(), timeState.getState());
        };
        break

      case AD_COMPLETE:
        getEventPayload = () => {
          const currentState = adState.getState();
          adState.clearState();
          return currentState;
        };
        break

      case AD_SKIPPED:
        getEventPayload = () => {
          const currentState = Object.assign({}, adState.getState(), timeState.getState());
          adState.clearState();
          return currentState;
        };
        break

      case AD_ERROR:
        getEventPayload = e => {
          const imaAdError = e.data && e.data.AdError;
          const extraPayload = Object.assign({
            playerErrorCode: imaAdError.getErrorCode(),
            vastErrorCode: imaAdError.getVastErrorCode(),
            errorMessage: imaAdError.getMessage(),
            sourceError: imaAdError.getInnerError()
            // timeout
          }, adState.getState(), timeState.getState());
          adState.clearState();
          return extraPayload;
        };
        break

      case PLAYLIST:
        getEventPayload = e => ({
          playlistItemCount: utils.getPlaylistCount(player),
          autostart: player.autoplay()
        });
        break

      case CONTENT_LOADED:
        getEventPayload = e => {
          const media = utils.getMedia(player);
          const contentUrl = utils.getValidMediaUrl(media && media.src, player.src, e && e.target && e.target.currentSrc)
          return {
            contentId: media && media.id,
            contentUrl,
            title: media && media.title,
            description: media && media.description,
            playlistIndex: utils.getCurrentPlaylistIndex(player),
            contentTags: media && media.contentTags
          };
        };
        break;

      case TIME:
        // TODO: might want to check seeking() and/or scrubbing()
        getEventPayload = e => {
          previousLastTimePosition = lastTimePosition;
          const currentTime = player.currentTime();
          const duration = player.duration();
          timeState.updateForTimeEvent({ currentTime, duration });
          lastTimePosition = currentTime;
          return {
            position: lastTimePosition,
            duration
          };
        };
        break;

      case SEEK_START:
        getEventPayload = e => {
          return {
            position: previousLastTimePosition,
            destination: player.currentTime(),
            duration: player.duration()
          };
        }
        break;

      case SEEK_END:
        getEventPayload = () => ({
          position: player.currentTime(),
          duration: player.duration()
        });
        break;

      case VOLUME:
        getEventPayload = e => ({ volumePercentage: player.volume() * 100 });
        break;

      case ERROR:
        getEventPayload = e => {
          const error = player.error();
          return {
            sourceError: error,
            errorCode: error.code,
            errorMessage: error.message,
          };
        };
        break;

      case COMPLETE:
        getEventPayload = e => {
          previousLastTimePosition = lastTimePosition = 0;
          timeState.clearState();
        };
        break;

      case FULLSCREEN:
        getEventPayload = e => ({ fullscreen: player.isFullscreen() });
        break;

      case PLAYER_RESIZE:
        getEventPayload = e => ({
          height: player.currentHeight(),
          width: player.currentWidth(),
        });
        break;

      default:
        return;
    }

    const eventHandler = getEventHandler(externalEventName, callback, basePayload, getEventPayload);

    if (externalEventName === PLAYLIST) {
      registerPlaylistEventListener(eventHandler);
      return;
    }

    const videojsEventName = utils.getVideojsEventName(externalEventName);

    if (AD_MANAGER_EVENTS.includes(externalEventName)) {
      player.on('ads-manager', () => player.ima.addEventListener(videojsEventName, eventHandler));
    } else {
      player.on(videojsEventName, eventHandler);
    }
  }

  function registerPlaylistEventListener(eventHandler) {
    if (player.playlist) {
      // force a playlist event on first item load
      player.one('loadstart', eventHandler);
      player.on('playlistchange', eventHandler);
    } else {
      // When playlist plugin is not used, treat each media item as a single item playlist
      player.on('loadstart', eventHandler);
    }
  }

  function offEvent(event, callback) {
    const videojsEvent = utils.getVideojsEventName(event)
    if (!callback) {
      player.off(videojsEvent);
      return;
    }

    const eventHandler = callbackToHandler[event];// callbackStorage.getCallback(event, callback);
    if (eventHandler) {
      player.off(videojsEvent, eventHandler);
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
    getOrtbVideo,
    getOrtbContent,
    setAdTagUrl,
    onEvent,
    offEvent,
    destroy
  };

  function setupPlayer(config) {
    const setupConfig = utils.getSetupConfig(config);
    player = vjs(divId, setupConfig, onReady);
  }

  function onReady() {
    try {
      setupAds();
    } catch (e) {
      triggerSetupFailure(-5, e.message);
      return;
    }
    triggerSetupComplete();
  }

  // TODO: consider supporting https://www.npmjs.com/package/videojs-vast-vpaid as well
  function setupAds() {
    if (!player.ima) {
      throw new Error(setupFailMessage + ': ima plugin is missing');
    }

    if (typeof player.ima !== 'function') {
      // when player.ima is already instantiated, it is an object. Early abort if already instantiated.
      return;
    }

    const adConfig = utils.getAdConfig(config);
    player.ima(adConfig);
  }

  function triggerSetupFailure(errorCode, msg, sourceError) {
    const payload = {
      divId,
      playerVersion,
      type: SETUP_FAILED,
      errorCode,
      errorMessage: msg,
      sourceError: sourceError
    };
    setupFailedCallbacks.forEach(setupFailedCallback => setupFailedCallback(SETUP_FAILED, payload));
    setupFailedCallbacks = [];
  }

  function triggerSetupComplete() {
    playerIsSetup = true;
    const payload = {
      divId,
      playerVersion,
      type: SETUP_COMPLETE,
    };

    setupCompleteCallbacks.forEach(callback => callback(SETUP_COMPLETE, payload));
    setupCompleteCallbacks = [];

    isMuted = player.muted();

    setupFailedEventHandlers.forEach(eventHandler => player.off('error', eventHandler));
    setupFailedEventHandlers = [];
  }
}

export const utils = {
  getSetupConfig: function (config) {
    if (!config) {
      return;
    }

    const params = config.params || {};
    const videojsConfig = params.vendorConfig || {};

    if (videojsConfig.autostart === undefined && config.autostart !== undefined) {
      videojsConfig.autostart = config.autostart
    }

    if (videojsConfig.muted === undefined && config.mute !== undefined) {
      videojsConfig.muted = config.mute;
    }

    return videojsConfig;
  },

  getAdConfig: function (config) {
    const params = config && config.params;
    if (!params) {
      return {};
    }

    return params.adPluginConfig || {}; // TODO: add adPluginConfig to spec
  },

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
      case AD_REQUEST:
        return 'ads-request';
      case AD_LOADED:
        return 'loaded'
      case AD_STARTED:
        return 'start';
      case AD_IMPRESSION:
        return 'impression';
      case AD_PLAY:
        return 'resume'
      case AD_PAUSE:
        return PAUSE;
      case AD_TIME:
        return 'adProgress';
      case AD_CLICK:
        return 'click';
      case AD_COMPLETE:
        return COMPLETE;
      case AD_SKIPPED:
        return 'skip';
      case AD_ERROR:
        return 'adserror';
      case CONTENT_LOADED:
        return 'loadstart';
      case PLAY:
        return PLAY + 'ing';
      case PLAYBACK_REQUEST:
        return PLAY;
      case SEEK_START:
        return 'seeking';
      case SEEK_END:
        return 'seeked';
      case TIME:
        return TIME + 'update';
      case VOLUME:
        return VOLUME + 'change';
      case MUTE:
        return MUTE + 'change';
      case PLAYER_RESIZE:
        return 'playerresize';
      case FULLSCREEN:
        return FULLSCREEN + 'change';
      case COMPLETE:
        return 'ended';
      default:
        return eventName;
    }
    /*
    The following video.js events might map to an event in our spec
    'loadstart',
      'progress', buffer load ?
      'suspend',
      'abort',
      'error',
      'emptied',
      'stalled',
      'loadedmetadata', meta
      'loadeddata', meta
      'canplay',
      'canplaythrough',
      'waiting', buffer?
      'durationchange', meta-duration
      'ratechange',
     */
  },

  getMedia: function(player) {
    const playlistItem = this.getCurrentPlaylistItem(player);
    if (playlistItem) {
      return playlistItem.sources[0];
    }

    return player.getMedia();
  },

  getValidMediaUrl: function(mediaSrc, playerSrc, eventTargetSrc) {
    return this.getMediaUrl(mediaSrc) || this.getMediaUrl(playerSrc) || this.getMediaUrl(eventTargetSrc);
  },

  getMediaUrl: function(source) {
    if (!source) {
      return;
    }

    if (Array.isArray(source) && source.length) {
      return this.parseSource(source[0]);
    }

    return this.parseSource(source)
  },

  parseSource: function (source) {
    const type = typeof source;
    if (type === 'string') {
      return source;
    } else if (type === 'object') {
      return source.src;
    }
  },

  getPlaylistCount: function (player) {
    const playlist = player.playlist; // has playlist plugin
    if (!playlist) {
      return 1;
    }
    return playlist.lastIndex && playlist.lastIndex() + 1;
  },

  getCurrentPlaylistIndex: function (player) {
    const playlist = player.playlist; // has playlist plugin
    if (!playlist) {
      return 0;
    }
    return playlist.currentIndex && playlist.currentIndex();
  },

  getCurrentPlaylistItem: function(player) {
    const playlist = player.playlist; // has playlist plugin
    if (!playlist) {
      return;
    }

    const currentIndex = this.getCurrentPlaylistIndex(player);
    if (!currentIndex) {
      return
    }

    const item = playlist()[currentIndex];
    return item;
  }
};

const videojsSubmoduleFactory = function (config) {
  const adState = adStateFactory();
  const timeState = timeStateFactory();
  const callbackStorage = null;
  // videojs factory is stored to window by default
  const vjs = window.videojs;
  return VideojsProvider(config, vjs, adState, timeState, callbackStorage, utils);
}

videojsSubmoduleFactory.vendorCode = VIDEO_JS_VENDOR;
submodule('video', videojsSubmoduleFactory);
export default videojsSubmoduleFactory;

// STATE

/**
 * @returns {State}
 */
export function adStateFactory() {
  const adState = Object.assign({}, stateFactory());

  function updateForEvent(event) {
    if (!event) {
      return;
    }

    const skippable = event.skippable;
    // TODO: possibly can check traffickingParameters to determine if winning bid is passed
    const updates = {
      adId: event.adId,
      adServer: event.adSystem,
      advertiserName: event.advertiserName,
      redirectUrl: event.clickThroughUrl,
      creativeId: event.creativeId || event.creativeAdId,
      dealId: event.dealId,
      adDescription: event.description,
      linear: event.linear,
      creativeUrl: event.mediaUrl,
      adTitle: event.title,
      universalAdId: event.universalAdIdValue,
      creativeType: event.contentType,
      wrapperAdIds: event.adWrapperIds,
      skip: skippable ? 1 : 0,
      // missing fields:
      // loadTime
      // advertiserId - TODO: does this even exist ? If not, remove from spec
      // vastVersion
      // adCategories
      // campaignId
      // waterfallIndex
      // waterfallCount
      // skipmin
      // adTagUrl - for now, only has request ad tag
      // adPlacementType
    };

    const adPodInfo = event.adPodInfo;
    if (adPodInfo && adPodInfo.podIndex > -1) {
      updates.adPodCount = adPodInfo.totalAds;
      updates.adPodIndex = adPodInfo.adPosition - 1; // Per IMA docs, adPosition is 1 based.
    }

    if (adPodInfo && adPodInfo.timeOffset) {
      switch (adPodInfo.timeOffset) {
        case -1:
          updates.offset = 'post';
          break

        case 0:
          // TODO: Defaults to 0 if this ad is not part of a pod, or the pod is not part of an ad playlist. - need to check if loaded dynamically and pass last content time update
          updates.offset = 'pre';
          break

        default:
          updates.offset = '' + adPodInfo.timeOffset;
      }
    }

    if (skippable) {
      updates.skipafter = event.skipTimeOffset;
    }

    this.updateState(updates);
  }

  adState.updateForEvent = updateForEvent;

  return adState;
}

export function timeStateFactory() {
  const timeState = Object.assign({}, stateFactory());

  function updateForTimeEvent(event) {
    const { currentTime, duration } = event;
    this.updateState({
      time: currentTime,
      duration,
      playbackMode: getPlaybackMode(duration)
    });
  }

  timeState.updateForTimeEvent = updateForTimeEvent;

  function getPlaybackMode(duration) {
    if (duration > 0) {
      return PLAYBACK_MODE.VOD;
    } else if (duration < 0) {
      return PLAYBACK_MODE.DVR;
    }

    return PLAYBACK_MODE.LIVE;
  }

  return timeState;
}
