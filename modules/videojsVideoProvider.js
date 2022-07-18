import {
  SETUP_COMPLETE, SETUP_FAILED, DESTROYED, PLAYLIST, PLAYBACK_REQUEST,
  AUTOSTART_BLOCKED, PLAY_ATTEMPT_FAILED, CONTENT_LOADED, PLAY, PAUSE, BUFFER, TIME, SEEK_START, SEEK_END, MUTE, VOLUME,
  RENDITION_UPDATE, ERROR, COMPLETE, PLAYLIST_COMPLETE, FULLSCREEN, PLAYER_RESIZE, VIEWABLE, CAST
} from '../libraries/video/constants/events.js';
// pending events: AD_REQUEST, AD_BREAK_START, AD_LOADED, AD_STARTED, AD_IMPRESSION, AD_PLAY,
//   AD_TIME, AD_PAUSE, AD_CLICK, AD_SKIPPED, AD_ERROR, AD_COMPLETE, AD_BREAK_END
import {
  PROTOCOLS, API_FRAMEWORKS, VIDEO_MIME_TYPE, PLAYBACK_METHODS, PLACEMENT, VPAID_MIME_TYPE, AD_POSITION, PLAYBACK_END
} from '../libraries/video/constants/ortb.js';
import { VIDEO_JS_VENDOR } from '../libraries/video/constants/vendorCodes.js';
import { submodule } from '../src/hook.js';

export function VideojsProvider(config, vjs_, adState_, timeState_, callbackStorage_, utils) {
  let vjs = vjs_;
  // Supplied callbacks are typically wrapped by handlers
  // we use this dict to keep track of these pairings
  const callbackToHandler = {};

  let player = null;
  let playerVersion = null;
  let imaOptions = null;
  const {playerConfig, divId} = config;
  let isMuted;
  let previousLastTimePosition = 0;
  let lastTimePosition = 0;

  let setupCompleteCallback, setupFailedCallback;

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

    if (player.isReady_) {
      triggerSetupComplete();
    } else {
      player.on('ready', function() {
        triggerSetupComplete();
      });
    }
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
    setupFailedCallback = null;
  }

  function triggerSetupComplete() {
    const payload = {
      divId,
      playerVersion,
      type: SETUP_COMPLETE,
    };

    setupCompleteCallback && setupCompleteCallback(SETUP_COMPLETE, payload);
    setupCompleteCallback = null;

    isMuted = player.muted();
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
    const findPosition = vjs.dom.findPosition;
    if (player.isFullscreen()) {
      video.pos = AD_POSITION.FULL_SCREEN;
    } else if (findPosition) {
      video.pos = utils.getPositionCode(findPosition(player.el()))
    }

    return {video, content};
  }

  // Plugins to integrate: https://github.com/googleads/videojs-ima
  function setAdTagUrl(adTagUrl) {
    player.ima.changeAdTag(adTagUrl);
    player.ima.requestAds();
  }

  // Should this function return some sort of signal
  // to specify whether or not the callback was succesfully hooked?
  function onEvents(events, callback) {
    if (!callback) {
      return;
    }
    const vjEVENTS = [
      'loadstart',
      'progress',
      'suspend',
      'abort',
      'error',
      'emptied',
      'stalled',
      'loadedmetadata',
      'loadeddata',
      'canplay',
      'canplaythrough',
      'playing',
      'waiting',
      'seeking',
      'seeked',
      'ended',
      'durationchange',
      'timeupdate',
      'play',
      'pause',
      'ratechange',
      'resize',
      'volumechange',
      'playerresize',
      'mutechange',
      'fullscreenchange',
    ]

    vjEVENTS.forEach(ev => {
      player.on(ev, function () {
        console.log('vjs: ', ev);
      });
    });

    for (let i = 0; i < events.length; i++) {
      const type = events[i];
      const payload = {
        divId,
        type
      };

      registerPreSetupListeners(type, callback, payload);
      if (!player) {
        return;
      }

      registerPostSetupListeners(type, callback, payload);
    }
  }

  function registerPreSetupListeners(type, callback, payload) {
    let eventHandler;
    switch (type) {
      case SETUP_COMPLETE:
        setupCompleteCallback = callback
        eventHandler = () => {
          triggerSetupComplete();
        };
        break;
      case SETUP_FAILED:
        let isReady = false;
        player.ready(() => {
          isReady = true;
        });

        if (isReady) {
          return;
        }
        setupFailedCallback = callback
        eventHandler = () => {
          let isReady = false;
          player.ready(() => {
            isReady = true;
          });

          if (isReady) {
            return;
          }
          // Videojs has no specific setup error handler
          // so we imitate it by hooking to the general error
          // handler and checking to see if the player has been setup
          const error = player.error();
          Object.assign(payload, {
            playerVersion,
            sourceError: error,
            errorCode: error.code,
            errorMessage: error.message,
          });
          callback(type, payload);
          setupFailedCallback = null;
        };
        player.on(ERROR, eventHandler);
        break;
      default:
        return
    }
    callbackToHandler[callback] = eventHandler
    player && player.on(utils.getVideojsEventName(type), eventHandler);
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
            playlistItemCount: 1,
            autostart: player.autoplay()
          });
          callback(type, payload);
        };
        player.on('sourceset', eventHandler);
        break;

      case PLAYBACK_REQUEST:
        eventHandler = e => {
          payload.playReason = 'unknown';
          callback(type, payload);
        };
        player.on(utils.getVideojsEventName(type), eventHandler);
        break;

        // case AUTOSTART_BLOCKED:
      //   eventHandler = e => {
      //     Object.assign(payload, {
      //       sourceError: e.error,
      //       errorCode: e.code,
      //       errorMessage: e.message
      //     });
      //     callback(type, payload);
      //   };
      //   break;
      // case PLAY_ATTEMPT_FAILED:
      //   eventHandler = e => {
      //     Object.assign(payload, {
      //       playReason: e.playReason,
      //       sourceError: e.sourceError,
      //       errorCode: e.code,
      //       errorMessage: e.message
      //     });
      //     callback(type, payload);
      //   };
      //   break;

      case CONTENT_LOADED:
        eventHandler = e => {
          const {target} = e
          Object.assign(payload, {
            contentId: target.currentSrc,
            contentUrl: target.currentSrc, // cover other sources ? util ?
            title: null,
            description: null,
            playlistIndex: null,
            contentTags: null
          });
          callback(type, payload);
        };
        player.on(utils.getVideojsEventName(type), eventHandler);
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

      // case BUFFER:
      //   eventHandler = () => {
      //     Object.assign(payload, {
      //       position: 0,
      //       duration: 0,
      //       playbackMode: -1
      //     });
      //     callback(type, payload);
      //   };
      //   player.el().addEventListener('waiting', eventHandler);
      //   break;

      case TIME:
        // might want to check seeking() and/or scrubbing()
        eventHandler = e => {
          previousLastTimePosition = lastTimePosition;
          lastTimePosition = player.currentTime();
          Object.assign(payload, {
            position: lastTimePosition,
            duration: player.duration()
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

      // case RENDITION_UPDATE:
      //   eventHandler = e => {
      //     const bitrate = e.bitrate;
      //     const level = e.level;
      //     Object.assign(payload, {
      //       videoReportedBitrate: bitrate,
      //       audioReportedBitrate: bitrate,
      //       encodedVideoWidth: level.width,
      //       encodedVideoHeight: level.height,
      //       videoFramerate: e.frameRate
      //     });
      //     callback(type, payload);
      //   };
      //   player.on('visualQuality', eventHandler);
      //   break;

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
        };
        player.on(utils.getVideojsEventName(type), eventHandler);
        break;

      // case PLAYLIST_COMPLETE:
      //   eventHandler = () => {
      //     callback(type, payload);
      //   };
      //   player.on(PLAYLIST_COMPLETE, eventHandler);
      //   break;

      case FULLSCREEN:
        eventHandler = e => {
          // payload.fullscreen = e.fullscreen;
          callback(type, payload);
        };
        player.on(FULLSCREEN, eventHandler);
        break;

      case PLAYER_RESIZE:
        eventHandler = e => {
          // Object.assign(payload, {
          //   height: e.height,
          //   width: e.width,
          // });
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
      //
      // case CAST:
      //   eventHandler = e => {
      //     payload.casting = e.active;
      //     callback(type, payload);
      //   };
      //   player.on(CAST, eventHandler);
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
    function setupAds() {
      if (!player.ima) {
        return;
      }
      player.ima({});
    }

    const setupConfig = utils.getSetupConfig(config);
    player = vjs(divId, setupConfig, setupAds);
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
      case CONTENT_LOADED:
        return 'loadeddata';
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
  }
};

const videojsSubmoduleFactory = function (config) {
  const adState = null;
  const timeState = null;
  const callbackStorage = null;
  // videojs factory is stored to window by default
  const vjs = window.videojs;
  return VideojsProvider(config, vjs, adState, timeState, callbackStorage, utils);
}

videojsSubmoduleFactory.vendorCode = VIDEO_JS_VENDOR;
submodule('video', videojsSubmoduleFactory);
export default videojsSubmoduleFactory;
