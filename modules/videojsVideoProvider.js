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
import { PLAYBACK_MODE } from '../libraries/video/constants/enums.js'

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
      triggerSetupFailure(-1, 'Videojs not present')
      return;
    }

    playerVersion = vjs.VERSION;
    if (playerVersion < minimumSupportedPlayerVersion) {
      triggerSetupFailure(-2, 'Videojs version not supported');
      return;
    }

    if (!document.getElementById(divId)) {
      triggerSetupFailure(-3, `No div found with id ${divId}`);
      return;
    }

    setupPlayer(playerConfig);

    if (!player) {
      triggerSetupFailure(-4, 'Failed to instantiate the player');
      return
    }

    player.ready(triggerSetupComplete);
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
    if (player.readyState()) {
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
    if (content.url) {
      video.placement = PLACEMENT.IN_STREAM;
    }

    // Placement according to IQG Guidelines 4.2.8
    // https://cdn2.hubspot.net/hubfs/2848641/TrustworthyAccountabilityGroup_May2017/Docs/TAG-Inventory-Quality-Guidelines-v2_2-10-18-2016.pdf?t=1509469105938
    const findPosition = vjs.dom.findPosition;
    if (player.isFullscreen()) {
      video.pos = AD_POSITION.FULL_SCREEN;
    } else if (findPosition) {
      video.pos = utils.getPositionCode(findPosition(player.el()));
    }

    return {video, content};
  }

  // Plugins to integrate: https://github.com/googleads/videojs-ima
  function setAdTagUrl(adTagUrl) {
    if (!player.ima) {
      return;
    }

    player.ima.changeAdTag(adTagUrl);
    player.ima.requestAds();
  }

  // Should this function return some sort of signal
  // to specify whether or not the callback was succesfully hooked?
  function onEvents(events, callback) {
    if (!callback) {
      return;
    }

    for (let i = 0; i < events.length; i++) {
      const type = events[i];
      const payload = {
        divId,
        type
      };

      registerPreSetupListeners(type, callback, payload);

      player.ready(() => {
        registerPostSetupListeners(type, callback, payload);
      });
    }
  }

  function registerPreSetupListeners(type, callback, payload) {
    switch (type) {
      case SETUP_COMPLETE:
        setupCompleteCallbacks.push(callback);
        break;
      case SETUP_FAILED:
        // no point in registering for setup failures if already setup.
        if (playerIsSetup) {
          return;
        }
        setupFailedCallbacks.push(callback);
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
          Object.assign(payload, {
            playerVersion,
            sourceError: error,
            errorCode: error.code,
            errorMessage: error.message,
          });
          callback(type, payload);
          setupFailedCallbacks = [];
        };
        player.on(ERROR, eventHandler);
        setupFailedEventHandlers.push(eventHandler)
        break;
    }
  }

  function registerPostSetupListeners(type, callback, payload) {
    let eventHandler;

    switch (type) {
      case DESTROYED:
        eventHandler = () => {
          callback(type, payload);
        };
        player.on(utils.getVideojsEventName(type), eventHandler);
        break;

      case PLAYLIST:
        eventHandler = e => {
          Object.assign(payload, {
            playlistItemCount: utils.getPlaylistCount(player),
            autostart: player.autoplay()
          });
          callback(type, payload);
        };
        // TODO: sourceset is experimental
        player.on('sourceset', eventHandler);
        break;

      case PLAYBACK_REQUEST:
        eventHandler = e => {
          payload.playReason = 'unknown';
          callback(type, payload);
        };
        player.on(utils.getVideojsEventName(type), eventHandler);
        break;

      case AD_REQUEST:
        if (!player.ima) {
          return;
        }

        eventHandler = e => {
          const adTagUrl = e.AdsRequest.adTagUrl;
          adState.updateState({ adTagUrl });
          payload.adTagUrl = adTagUrl;
          callback(type, payload);
        };
        player.on('ads-request', eventHandler); // TODO: e has ref to getSettings().VpaidMode - seems not
        break

      case AD_LOADED:
        if (!player.ima) {
          return;
        }

        eventHandler = (e) => {
          const imaAd = e.getAdData();
          adState.updateForEvent(imaAd);
          Object.assign(payload, adState.getState());
          callback(type, payload);
          timeState.clearState();
        };
        player.on('ads-manager', () => player.ima.addEventListener('loaded', eventHandler));
        break

      case AD_STARTED:
        if (!player.ima) {
          return;
        }

        eventHandler = () => {
          Object.assign(payload, adState.getState());
          callback(type, payload);
        };
        player.on('ads-manager', () => player.ima.addEventListener('start', eventHandler));
        break

      case AD_IMPRESSION:
        if (!player.ima) {
          return;
        }

        eventHandler = () => {
          Object.assign(payload, adState.getState(), timeState.getState());
          callback(type, payload);
        };
        player.on('ads-manager', () => player.ima.addEventListener('impression', eventHandler));
        break

      case AD_PLAY:
        if (!player.ima) {
          return;
        }

        eventHandler = () => {
          Object.assign(payload, adState.getState());
          callback(type, payload);
        };
        player.on('ads-manager', () => player.ima.addEventListener('resume', eventHandler));
        break

      case AD_PAUSE:
        if (!player.ima) {
          return;
        }

        eventHandler = () => {
          Object.assign(payload, adState.getState());
          callback(type, payload);
        };
        player.on('ads-manager', () => player.ima.addEventListener('pause', eventHandler));
        break

      case AD_TIME:
        if (!player.ima) {
          return;
        }

        eventHandler = (e) => {
          const adTimeEvent = e.getAdData();
          timeState.updateForTimeEvent(adTimeEvent);
          Object.assign(payload, adState.getState(), timeState.getState());
          callback(type, payload);
        };
        player.on('ads-manager', () => player.ima.addEventListener('adProgress', eventHandler));
        break

      case AD_COMPLETE:
        if (!player.ima) {
          return;
        }

        eventHandler = () => {
          Object.assign(payload, adState.getState());
          callback(type, payload);
          adState.clearState();
        };
        player.on('ads-manager', () => player.ima.addEventListener('complete', eventHandler));
        break

      case AD_SKIPPED:
        if (!player.ima) {
          return;
        }

        eventHandler = () => {
          Object.assign(payload, adState.getState(), timeState.getState());
          callback(type, payload);
          adState.clearState();
        };
        player.on('ads-manager', () => player.ima.addEventListener('skip', eventHandler));
        break

      case AD_CLICK:
        if (!player.ima) {
          return;
        }
        eventHandler = () => {
          Object.assign(payload, adState.getState(), timeState.getState());
          callback(type, payload);
        };
        player.on('ads-manager', () => player.ima.addEventListener('click', eventHandler));
        break

      case AD_ERROR:
        if (!player.ima) {
          return;
        }
        eventHandler = e => {
          const imaAdError = e.data.AdError;
          Object.assign(payload, {
            playerErrorCode: imaAdError.getErrorCode(),
            vastErrorCode: imaAdError.getVastErrorCode(),
            errorMessage: imaAdError.getMessage(),
            sourceError: imaAdError.getInnerError()
            // timeout
          }, adState.getState(), timeState.getState());
          callback(type, payload);
          adState.clearState();
        };
        player.on('adserror', eventHandler)
        break

      case CONTENT_LOADED:
        eventHandler = e => {
          const media = player.getMedia();
          const contentUrl = utils.getMediaUrl(player.src, media && media.src, e && e.target && e.target.currentSrc)
          Object.assign(payload, {
            contentId: media && media.id,
            contentUrl,
            title: media && media.title,
            description: media && media.description, // TODO: description is not part of the videojs Media spec
            playlistIndex: utils.getCurrentPlaylistIndex(player),
            contentTags: null
          });
          callback(type, payload);
        };
        // TODO: sourceset is experimental
        player.on('loadstart', eventHandler); //  loadedmetadata?
        break;

      case PLAY:
        eventHandler = () => {
          callback(type, payload);
        };
        player.on(utils.getVideojsEventName(type), eventHandler);
        break;

      case PAUSE:
        eventHandler = () => {
          callback(type, payload);
        };
        player.on(type, eventHandler);
        break;

      case TIME:
        // might want to check seeking() and/or scrubbing()
        eventHandler = e => {
          previousLastTimePosition = lastTimePosition;
          const currentTime = player.currentTime();
          const duration = player.duration();
          timeState.updateForTimeEvent({ currentTime, duration });
          lastTimePosition = currentTime;
          Object.assign(payload, {
            position: lastTimePosition,
            duration
          });
          callback(type, payload);
        };
        player.on(utils.getVideojsEventName(type), eventHandler);
        break;

      case SEEK_START:
        eventHandler = e => {
          Object.assign(payload, {
            position: previousLastTimePosition,
            destination: player.currentTime(),
            duration: player.duration()
          });
          callback(type, payload);
        }
        player.on(utils.getVideojsEventName(type), eventHandler);
        break;

      case SEEK_END:
        eventHandler = () => {
          Object.assign(payload, {
            position: player.currentTime(),
            duration: player.duration()
          });
          callback(type, payload);
        };
        player.on(utils.getVideojsEventName(type), eventHandler);
        break;

      case MUTE:
        eventHandler = () => {
          const muteChange = player.muted();
          if (isMuted !== muteChange) {
            payload.mute = isMuted = muteChange;
            callback(type, payload);
          }
        };
        player.on(utils.getVideojsEventName(VOLUME), eventHandler);
        break;

      case VOLUME:
        eventHandler = e => {
          payload.volumePercentage = player.volume() * 100;
          callback(type, payload);
        };
        player.on(utils.getVideojsEventName(type), eventHandler);
        break;

      case ERROR:
        eventHandler = e => {
          const error = player.error();
          Object.assign(payload, {
            sourceError: error,
            errorCode: error.code,
            errorMessage: error.message,
          });
          callback(type, payload);
        };
        player.on(ERROR, eventHandler);
        break;

      case COMPLETE:
        eventHandler = e => {
          callback(type, payload);
          previousLastTimePosition = lastTimePosition = 0;
          timeState.clearState();
        };
        player.on(utils.getVideojsEventName(type), eventHandler);
        break;

      case FULLSCREEN:
        eventHandler = e => {
          payload.fullscreen = player.isFullscreen();
          callback(type, payload);
        };
        player.on(utils.getVideojsEventName(type), eventHandler);
        break;

      case PLAYER_RESIZE:
        eventHandler = e => {
          Object.assign(payload, {
            height: player.currentHeight(),
            width: player.currentWidth(),
          });
          callback(type, payload);
        };
        player.on(utils.getVideojsEventName(type), eventHandler);
        break;

      // case VIEWABLE:
      //   eventHandler = e => {
      //     Object.assign(payload, {
      //       viewable: e.viewable,
      //       viewabilityPercentage: player.getPercentViewable() * 100,
      //     });
      //     callback(type, payload);
      //   };
      //   player.on(VIEWABLE, eventHandler);
      //   break;

      default:
    }
  }

  function offEvents(events, callback) {
    for (let event of events) {
      const videojsEvent = utils.getVideojsEventName(event)
      if (!callback) {
        player.off(videojsEvent);
        continue;
      }

      const eventHandler = callbackToHandler[event];// callbackStorage.getCallback(event, callback);
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

  function setupPlayer(config) {
    // TODO: support https://www.npmjs.com/package/videojs-vast-vpaid
    function setupAds() {
      // when player.ima is already instantiated, it is an object.
      if (!player.ima || typeof player.ima !== 'function') {
        return;
      }

      const adConfig = utils.getAdConfig(config);
      player.ima(adConfig);
    }

    const setupConfig = utils.getSetupConfig(config);
    player = vjs(divId, setupConfig, setupAds);
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

    return params.adConfig || {};
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

  getMediaUrl: function(playerSrc, mediaSrc, eventTargetSrc) {
    const source = playerSrc || mediaSrc || eventTargetSrc;

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
      return;
    }
    return playlist.lastIndex && playlist.lastIndex() + 1;
  },

  getCurrentPlaylistIndex: function (player) {
    const playlist = player.playlist; // has playlist plugin
    if (!playlist) {
      return;
    }
    return playlist.currentIndex && playlist.currentIndex();
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
    // TODO: check traffickingParameters to determine if winning bid is passed
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
          updates.offset = adPodInfo.timeOffset;
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
