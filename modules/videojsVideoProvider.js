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

export function VideojsProvider(config, videojs_, adState_, timeState_, callbackStorage_, utils) {
  let videojs = videojs_;
  // Supplied callbacks are typically wrapped by handlers
  // we use this dict to keep track of these pairings
  const callbackToHandler = {};

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

    if (!document.getElementById(divId)) {
      triggerSetupFailure(-3, `No div found with id ${divId}`)
      return;
    }

    player = videojs(divId)

    function adSetup(){
      // Todo: the linter doesn't like optional chaining is there a better way to do this
      const vendorConfig = config.playerConfig && config.playerConfig.params && config.playerConfig.params.vendorConfig;
      const tags = vendorConfig && vendorConfig.advertising && vendorConfig.advertising.tag;
      if (player.ima && tags) {
        imaOptions = {
          adTagUrl: tags[0]
        };
        player.ima(imaOptions);
      }
    }

    // Instantiate player if it does not exist
    if(!player){
      // setupCompleteCallback should already be hooked to player.ready so no need to include it here
      player = videojs(divId, playerConfig, adSetup)
      setupFailedCallback && player.on('error', callbackToHandler[setupFailedCallback])
      setupCompleteCallback && player.on('ready', callbackToHandler[setupCompleteCallback])
      return
    }

    setupCompleteCallback && setupCompleteCallback(SETUP_COMPLETE, getSetupCompletePayload());
    adSetup();

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
      if (!player) {
        return;
      }

      registerPostSetupListeners(type, callback, payload);
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
        setupCompleteCallback = callback
        eventHandler = () => {
          payload = getSetupCompletePayload();
          callback(type, payload);
          setupCompleteCallback = null;
        };
        break;
      case SETUP_FAILED:
        setupFailedCallback = callback
        eventHandler = () => {
          // Videojs has no specific setup error handler
          // so we imitate it by hooking to the general error
          // handler and checking to see if the player has been setup
          if (player.readyState() == 0) {
            const e = player.error()
            Object.assign(payload, {
              playerVersion,
              errorCode: e.errorTypes,
              errorMessage: e.message,
            });
            callback(type, payload);
            setupFailedCallback = null;
          }
        }
        break;
      default:
        return
    }
    callbackToHandler[callback] = eventHandler
    player && player.on(utils.getVideojsEventName(type), eventHandler);
  }

  function registerPostSetupListeners(type, callback, payload){
    let eventHandler;

    switch (type) {
      case DESTROYED:
        eventHandler = () => {
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
        player.on(utils.getVideojsEventName(type), eventHandler);
        break;

      case BUFFER:
        eventHandler = () => {
          Object.assign(payload, {
            position: 0,
            duration: 0,
            playbackMode: -1
          });
          callback(type, payload);
        };
        player.el().addEventListener('waiting', eventHandler);
        break;

      // TODO: No time event fired by videojs
      case TIME:
        eventHandler = e => {
          Object.assign(payload, {
            position: e.position,
            duration: e.duration
          });
          callback(type, payload);
        };
        player.el().addEventListener('timeupdate', eventHandler);
        break;

      case PLAYLIST:
        eventHandler = e => {
          const playlistItemCount = e.playlist.length;
          Object.assign(payload, {
            playlistItemCount,
            autostart: player.getConfig().autostart
          });
          callback(type, payload);
        };
        break;
      case PLAYBACK_REQUEST:
        eventHandler = e => {
          payload.playReason = e.playReason;
          callback(type, payload);
        };
        break;
      case AUTOSTART_BLOCKED:
        eventHandler = e => {
          Object.assign(payload, {
            sourceError: e.error,
            errorCode: e.code,
            errorMessage: e.message
          });
          callback(type, payload);
        };
        break;
      case PLAY_ATTEMPT_FAILED:
        eventHandler = e => {
          Object.assign(payload, {
            playReason: e.playReason,
            sourceError: e.sourceError,
            errorCode: e.code,
            errorMessage: e.message
          });
          callback(type, payload);
        };
        break;

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
        player.el().addEventListener('loadeddata', eventHandler);
        break;

      case SEEK_START:
        eventHandler = e => {
          const duration = e.duration;
          const offset = e.offset;
          pendingSeek = {
            duration,
            offset
          };
          Object.assign(payload, {
            position: e.position,
            destination: offset,
            duration: duration
          });
          callback(type, payload);
        }
        player.on('seek', eventHandler);
        break;

      case SEEK_END:
        eventHandler = () => {
          Object.assign(payload, {
            position: pendingSeek.offset,
            duration: pendingSeek.duration
          });
          callback(type, payload);
          pendingSeek = {};
        };
        player.on('seeked', eventHandler);
        break;

      case MUTE:
        eventHandler = e => {
          payload.mute = e.mute;
          callback(type, payload);
        };
        player.on(MUTE, eventHandler);
        break;

      case VOLUME:
        eventHandler = e => {
          payload.volumePercentage = e.volume;
          callback(type, payload);
        };
        player.on(VOLUME, eventHandler);
        break;

      case RENDITION_UPDATE:
        eventHandler = e => {
          const bitrate = e.bitrate;
          const level = e.level;
          Object.assign(payload, {
            videoReportedBitrate: bitrate,
            audioReportedBitrate: bitrate,
            encodedVideoWidth: level.width,
            encodedVideoHeight: level.height,
            videoFramerate: e.frameRate
          });
          callback(type, payload);
        };
        player.on('visualQuality', eventHandler);
        break;

      case ERROR:
        eventHandler = e => {
          Object.assign(payload, {
            sourceError: e.sourceError,
            errorCode: e.code,
            errorMessage: e.message,
          });
          callback(type, payload);
        };
        player.on(ERROR, eventHandler);
        break;

      case COMPLETE:
        eventHandler = e => {
          callback(type, payload);
          timeState.clearState();
        };
        player.on(COMPLETE, eventHandler);
        break;

      case PLAYLIST_COMPLETE:
        eventHandler = () => {
          callback(type, payload);
        };
        player.on(PLAYLIST_COMPLETE, eventHandler);
        break;

      case FULLSCREEN:
        eventHandler = e => {
          payload.fullscreen = e.fullscreen;
          callback(type, payload);
        };
        player.on(FULLSCREEN, eventHandler);
        break;

      case PLAYER_RESIZE:
        eventHandler = e => {
          Object.assign(payload, {
            height: e.height,
            width: e.width,
          });
          callback(type, payload);
        };
        player.on('resize', eventHandler);
        break;

      case VIEWABLE:
        eventHandler = e => {
          Object.assign(payload, {
            viewable: e.viewable,
            viewabilityPercentage: player.getPercentViewable() * 100,
          });
          callback(type, payload);
        };
        player.on(VIEWABLE, eventHandler);
        break;

      case CAST:
        eventHandler = e => {
          payload.casting = e.active;
          callback(type, payload);
        };
        player.on(CAST, eventHandler);
        break;

      default:
        return;
    }

  }

  function offEvents(events, callback) {
    for (let event of events) {
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
submodule('video', videojsSubmoduleFactory);
export default videojsSubmoduleFactory;
