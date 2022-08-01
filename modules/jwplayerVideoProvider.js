import {
  PROTOCOLS, API_FRAMEWORKS, VIDEO_MIME_TYPE, PLAYBACK_METHODS, PLACEMENT, VPAID_MIME_TYPE, AD_POSITION
} from '../libraries/video/constants/ortb.js';
import {
  SETUP_COMPLETE, SETUP_FAILED, DESTROYED, AD_REQUEST, AD_BREAK_START, AD_LOADED, AD_STARTED, AD_IMPRESSION, AD_PLAY,
  AD_TIME, AD_PAUSE, AD_CLICK, AD_SKIPPED, AD_ERROR, AD_COMPLETE, AD_BREAK_END, PLAYLIST, PLAYBACK_REQUEST,
  AUTOSTART_BLOCKED, PLAY_ATTEMPT_FAILED, CONTENT_LOADED, PLAY, PAUSE, BUFFER, TIME, SEEK_START, SEEK_END, MUTE, VOLUME,
  RENDITION_UPDATE, ERROR, COMPLETE, PLAYLIST_COMPLETE, FULLSCREEN, PLAYER_RESIZE, VIEWABLE, CAST
} from '../libraries/video/constants/events.js';
import { PLAYBACK_MODE } from '../libraries/video/constants/enums.js';
import stateFactory from '../libraries/video/shared/state.js';
import { JWPLAYER_VENDOR } from '../libraries/video/constants/vendorCodes.js';
import { submodule } from '../src/hook.js';

/**
 * @constructor
 * @param {videoProviderConfig} config
 * @param {Object} jwplayer_ - JW Player global factory
 * @param {State} adState_
 * @param {State} timeState_
 * @param {CallbackStorage} callbackStorage_
 * @param {Object} utils
 * @returns {VideoProvider}
 */
export function JWPlayerProvider(config, jwplayer_, adState_, timeState_, callbackStorage_, utils, sharedUtils) {
  const jwplayer = jwplayer_;
  let player = null;
  let playerVersion = null;
  const playerConfig = config.playerConfig;
  const divId = config.divId;
  let adState = adState_;
  let timeState = timeState_;
  let callbackStorage = callbackStorage_;
  let pendingSeek = {};
  let supportedMediaTypes = null;
  let minimumSupportedPlayerVersion = '8.20.1';
  let setupCompleteCallback = null;
  let setupFailedCallback = null;
  const MEDIA_TYPES = [
    VIDEO_MIME_TYPE.MP4,
    VIDEO_MIME_TYPE.OGG,
    VIDEO_MIME_TYPE.WEBM,
    VIDEO_MIME_TYPE.AAC,
    VIDEO_MIME_TYPE.HLS
  ];

  function init() {
    if (!jwplayer) {
      triggerSetupFailure(-1); // TODO: come up with code for player absent
      return;
    }

    playerVersion = jwplayer.version;

    if (playerVersion < minimumSupportedPlayerVersion) {
      triggerSetupFailure(-2); // TODO: come up with code for version not supported
      return;
    }

    player = jwplayer(divId);
    if (player.getState() === undefined) {
      setupPlayer(playerConfig);
    } else {
      setupCompleteCallback && setupCompleteCallback(SETUP_COMPLETE, getSetupCompletePayload());
    }
  }

  function getId() {
    return divId;
  }

  function getOrtbParams() {
    if (!player) {
      return;
    }
    const config = player.getConfig() || {};
    const adConfig = config.advertising || {};
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
      h: player.getHeight(), // TODO does player call need optimization ?
      w: player.getWidth(), // TODO does player call need optimization ?
      startdelay: utils.getStartDelay(),
      placement: utils.getPlacement(adConfig, player),
      // linearity is omitted because both forms are supported.
      // sequence - TODO not yet supported
      battr: adConfig.battr,
      maxextended: -1, // extension is allowed, and there is no time limit imposed.
      boxingallowed: 1,
      playbackmethod: [ utils.getPlaybackMethod(config) ],
      playbackend: 1, // TODO: need to account for floating player - https://developer.jwplayer.com/jwplayer/docs/jw8-embed-an-outstream-player , https://developer.jwplayer.com/jwplayer/docs/jw8-player-configuration-reference#section-float-on-scroll
      // companionad - TODO add in future version
      // companiontype - TODO add in future version
      // minbitrate - TODO add in future version
      // maxbitrate - TODO add in future version
      // delivery - omitted because all are supported.
      // minduration - Is there value to specifying ?
      // maxduration - Is there value to specifying ?
      api: [
        API_FRAMEWORKS.VPAID_2_0
      ],
    };

    if (utils.isOmidSupported(adConfig.adClient)) {
      video.api.push(API_FRAMEWORKS.OMID_1_0);
    }

    Object.assign(video, utils.getSkipParams(adConfig));

    if (player.getFullscreen()) { // TODO does player call need optimization ?
      // only specify ad position when in Fullscreen since computational cost is low
      // ad position options are listed in oRTB 2.5 section 5.4
      // https://www.iab.com/wp-content/uploads/2016/03/OpenRTB-API-Specification-Version-2-5-FINAL.pdf
      video.pos = AD_POSITION.FULL_SCREEN; // TODO make constant in oRTB
    }

    const item = player.getPlaylistItem() || {}; // TODO does player call need optimization ?
    let { duration, playbackMode } = timeState.getState();
    if (duration === undefined) {
      duration = player.getDuration();
    }

    const content = {
      url: item.file,
      title: item.title,
      cat: item.iabCategories,
      keywords: item.tags,
      len: duration,
      livestream: Math.min(playbackMode, 1),
      embeddable: 1
    };

    const mediaId = item.mediaid;
    if (mediaId) {
      content.id = 'jw_' + mediaId;
    }

    const jwpseg = item.jwpseg;
    const dataSegment = utils.getSegments(jwpseg);
    const contentDatum = utils.getContentDatum(mediaId, dataSegment);
    if (contentDatum) {
      content.data = [contentDatum];
    }

    const isoLanguageCode = utils.getIsoLanguageCode(player);
    if (isoLanguageCode) {
      content.language = isoLanguageCode;
    }

    return {
      video,
      content
    }
  }

  function setAdTagUrl(adTagUrl, options) {
    if (!player || player.getPlugin('bidding') || player.getPlugin('biddingCore')) {
      return;
    }

    player.playAd(adTagUrl || options.adXml, options);
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

      registerPostSetupListeners(type, callback, payload);
    }
  }

  function offEvents(events, callback) {
    events.forEach(event => {
      const jwEvent = utils.getJwEvent(event);
      if (!callback) {
        player.off(jwEvent);
        return;
      }

      const eventHandler = callbackStorage.getCallback(event, callback);
      if (!eventHandler) {
        // skip this iteration when event handler not found.
        return;
      }

      player.off(jwEvent, eventHandler);
    });
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
    if (!config) {
      return;
    }
    player.setup(utils.getJwConfig(config));
  }

  function getSetupCompletePayload() {
    return {
      divId,
      playerVersion,
      type: SETUP_COMPLETE,
      viewable: player.getViewable(),
      viewabilityPercentage: player.getPercentViewable() * 100,
      mute: player.getMute(),
      volumePercentage: player.getVolume()
    };
  }

  function triggerSetupFailure(errorCode) {
    if (!setupFailedCallback) {
      return;
    }

    const payload = {
      divId,
      playerVersion,
      type: SETUP_FAILED,
      errorCode,
      errorMessage: '',
      sourceError: null
    };
    setupFailedCallback(SETUP_FAILED, payload);
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
        player && player.on('ready', eventHandler);
        break;

      case SETUP_FAILED:
        setupFailedCallback = callback;
        eventHandler = e => {
          Object.assign(payload, {
            playerVersion,
            errorCode: e.code,
            errorMessage: e.message,
            sourceError: e.sourceError
          });
          callback(type, payload);
          setupFailedCallback = null;
        };
        player && player.on('setupError', eventHandler);
        break;

      default:
        return;
    }
    callbackStorage.storeCallback(type, eventHandler, callback);
  }

  function registerPostSetupListeners(type, callback, payload) {
    let eventHandler;

    switch (type) {
      case DESTROYED:
        eventHandler = () => {
          callback(type, payload);
        };
        player.on('remove', eventHandler);
        break;

      case AD_REQUEST:
        eventHandler = e => {
          payload.adTagUrl = e.tag;
          callback(type, payload);
        };
        player.on(AD_REQUEST, eventHandler);
        break;

      case AD_BREAK_START:
        eventHandler = e => {
          timeState.clearState();
          payload.offset = e.adPosition;
          callback(type, payload);
        };
        player.on(AD_BREAK_START, eventHandler);
        break;

      case AD_LOADED:
        eventHandler = e => {
          adState.updateForEvent(e);
          const adConfig = player.getConfig().advertising;
          adState.updateState(utils.getSkipParams(adConfig));
          Object.assign(payload, adState.getState());
          callback(type, payload);
        };
        player.on(AD_LOADED, eventHandler);
        break;

      case AD_STARTED:
        eventHandler = () => {
          Object.assign(payload, adState.getState());
          callback(type, payload);
        };
        // JW Player adImpression fires when the ad starts, regardless of viewability.
        player.on(AD_IMPRESSION, eventHandler);
        break;

      case AD_IMPRESSION:
        eventHandler = () => {
          Object.assign(payload, adState.getState(), timeState.getState());
          callback(type, payload);
        };
        player.on('adViewableImpression', eventHandler);
        break;

      case AD_PLAY:
        eventHandler = e => {
          payload.adTagUrl = e.tag;
          callback(type, payload);
        };
        player.on(AD_PLAY, eventHandler);
        break;

      case AD_TIME:
        eventHandler = e => {
          timeState.updateForEvent(e);
          Object.assign(payload, {
            adTagUrl: e.tag,
            time: e.position,
            duration: e.duration,
          });
          callback(type, payload);
        };
        player.on(AD_TIME, eventHandler);
        break;

      case AD_PAUSE:
        eventHandler = e => {
          payload.adTagUrl = e.tag;
          callback(type, payload);
        };
        player.on(AD_PAUSE, eventHandler);
        break;

      case AD_CLICK:
        eventHandler = () => {
          Object.assign(payload, adState.getState(), timeState.getState());
          callback(type, payload);
        };
        player.on(AD_CLICK, eventHandler);
        break;

      case AD_SKIPPED:
        eventHandler = e => {
          Object.assign(payload, {
            time: e.position,
            duration: e.duration,
          });
          callback(type, payload);
          adState.clearState();
        };
        player.on(AD_SKIPPED, eventHandler);
        break;

      case AD_ERROR:
        eventHandler = e => {
          Object.assign(payload, {
            playerErrorCode: e.adErrorCode,
            vastErrorCode: e.code,
            errorMessage: e.message,
            sourceError: e.sourceError
            // timeout
          }, adState.getState(), timeState.getState());
          adState.clearState();
          callback(type, payload);
        };
        player.on(AD_ERROR, eventHandler);
        break;

      case AD_COMPLETE:
        eventHandler = e => {
          payload.adTagUrl = e.tag;
          callback(type, payload);
          adState.clearState();
        };
        player.on(AD_COMPLETE, eventHandler);
        break;

      case AD_BREAK_END:
        eventHandler = e => {
          payload.offset = e.adPosition;
          callback(type, payload);
        };
        player.on(AD_BREAK_END, eventHandler);
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
        player.on(PLAYLIST, eventHandler);
        break;

      case PLAYBACK_REQUEST:
        eventHandler = e => {
          payload.playReason = e.playReason;
          callback(type, payload);
        };
        player.on('playAttempt', eventHandler);
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
        player.on('autostartNotAllowed', eventHandler);
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
        player.on(PLAY_ATTEMPT_FAILED, eventHandler);
        break;

      case CONTENT_LOADED:
        eventHandler = e => {
          const { item, index } = e;
          Object.assign(payload, {
            contentId: item.mediaid,
            contentUrl: item.file, // cover other sources ? util ?
            title: item.title,
            description: item.description,
            playlistIndex: index,
            contentTags: item.tags
          });
          callback(type, payload);
        };
        player.on('playlistItem', eventHandler);
        break;

      case PLAY:
        eventHandler = () => {
          callback(type, payload);
        };
        player.on(PLAY, eventHandler);
        break;

      case PAUSE:
        eventHandler = () => {
          callback(type, payload);
        };
        player.on(PAUSE, eventHandler);
        break;

      case BUFFER:
        eventHandler = () => {
          Object.assign(payload, timeState.getState());
          callback(type, payload);
        };
        player.on(BUFFER, eventHandler);
        break;

      case TIME:
        eventHandler = e => {
          timeState.updateForEvent(e);
          Object.assign(payload, {
            position: e.position,
            duration: e.duration
          });
          callback(type, payload);
        };
        player.on(TIME, eventHandler);
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
    callbackStorage.storeCallback(type, eventHandler, callback);
  }
}

/**
 * @param {videoProviderConfig} config
 * @param {sharedUtils} sharedUtils
 * @returns {VideoProvider}
 */
const jwplayerSubmoduleFactory = function (config, sharedUtils) {
  const adState = adStateFactory();
  const timeState = timeStateFactory();
  const callbackStorage = callbackStorageFactory();
  return JWPlayerProvider(config, window.jwplayer, adState, timeState, callbackStorage, utils, sharedUtils);
}

jwplayerSubmoduleFactory.vendorCode = JWPLAYER_VENDOR;
submodule('video', jwplayerSubmoduleFactory);
export default jwplayerSubmoduleFactory;

// HELPERS

export const utils = {
  getJwConfig: function(config) {
    if (!config) {
      return;
    }

    const params = config.params || {};
    const jwConfig = params.vendorConfig || {};
    if (jwConfig.autostart === undefined && config.autoStart !== undefined) {
      jwConfig.autostart = config.autoStart;
    }

    if (jwConfig.mute === undefined && config.mute !== undefined) {
      jwConfig.mute = config.mute;
    }

    if (!jwConfig.key && config.licenseKey !== undefined) {
      jwConfig.key = config.licenseKey;
    }

    if (params.adOptimization === false) {
      return jwConfig;
    }

    const advertising = jwConfig.advertising || { client: 'vast' };
    if (!jwConfig.file && !jwConfig.playlist && !jwConfig.source) {
      // TODO verify accuracy
      advertising.outstream = true;
    }

    const bids = advertising.bids || {};
    bids.prebid = true;
    advertising.bids = bids;

    jwConfig.advertising = advertising;
    return jwConfig;
  },

  getJwEvent: function(eventName) {
    switch (eventName) {
      case SETUP_COMPLETE:
        return 'ready';

      case SETUP_FAILED:
        return 'setupError';

      case DESTROYED:
        return 'remove';

      case AD_STARTED:
        return AD_IMPRESSION;

      case AD_IMPRESSION:
        return 'adViewableImpression';

      case PLAYBACK_REQUEST:
        return 'playAttempt';

      case AUTOSTART_BLOCKED:
        return 'autostartNotAllowed';

      case CONTENT_LOADED:
        return 'playlistItem';

      case SEEK_START:
        return 'seek';

      case SEEK_END:
        return 'seeked';

      case RENDITION_UPDATE:
        return 'visualQuality';

      case PLAYER_RESIZE:
        return 'resize';

      default:
        return eventName;
    }
  },

  getSkipParams: function(adConfig) {
    const skipParams = {};
    const skipoffset = adConfig.skipoffset;
    if (skipoffset !== undefined) {
      const skippable = skipoffset >= 0;
      skipParams.skip = skippable ? 1 : 0;
      if (skippable) {
        skipParams.skipmin = skipoffset + 2;
        skipParams.skipafter = skipoffset;
      }
    }
    return skipParams;
  },

  getSupportedMediaTypes: function(mediaTypes = []) {
    const el = document.createElement('video');
    return mediaTypes
      .filter(mediaType => el.canPlayType(mediaType))
      .concat(VPAID_MIME_TYPE); // Always allow VPAIDs.
  },

  getStartDelay: function() {
    // todo calculate
    // need to know which ad we are bidding on
    // Might have to implement and set in Pb-video ; would required ad unit as param.
  },

  /**
   * Determine the ad placement
   * @param {Object} adConfig
   * @param {Object} player
   * @return {PLACEMENT|OrtbVideoParams.placement|undefined}
   */
  getPlacement: function(adConfig, player) {
    if (!adConfig.outstream) {
      // https://developer.jwplayer.com/jwplayer/docs/jw8-embed-an-outstream-player for more info on outstream
      return PLACEMENT.INSTREAM;
    }

    if (player.getFloating()) {
      return PLACEMENT.FLOATING;
    }

    const placement = adConfig.placement;
    if (!placement) {
      return;
    }

    return PLACEMENT[placement.toUpperCase()];
  },

  getPlaybackMethod: function({ autoplay, mute, autoplayAdsMuted }) {
    if (autoplay) {
      // Determine whether player is going to start muted.
      const isMuted = mute || autoplayAdsMuted; // todo autoplayAdsMuted only applies to preRoll
      return isMuted ? PLAYBACK_METHODS.AUTOPLAY_MUTED : PLAYBACK_METHODS.AUTOPLAY;
    }
    /*
     TODO
      could support the following with float player:
      5 Initiates on Entering Viewport with Sound On
      6 Initiates on Entering Viewport with Sound Off by Default
     */
    return PLAYBACK_METHODS.CLICK_TO_PLAY;
  },

  /**
   * Indicates if Omid is supported
   *
   * @param {string} adClient - The identifier of the ad plugin requesting the bid
   * @returns {boolean} - support of omid
   */
  isOmidSupported: function(adClient) {
    const omidIsLoaded = window.OmidSessionClient !== undefined;
    return omidIsLoaded && adClient === 'vast';
  },

  /**
   * Gets ISO 639 language code of current audio track.
   * @param {Object} player
   * @returns {string|undefined} ISO 639 language code.
   */
  getIsoLanguageCode: function(player) {
    const audioTracks = player.getAudioTracks();
    if (!audioTracks || !audioTracks.length) {
      return;
    }

    const currentTrackIndex = Math.max(player.getCurrentAudioTrack() || 0, 0); // returns -1 when there are no alternative tracks.
    const audioTrack = audioTracks[currentTrackIndex];
    return audioTrack && audioTrack.language;
  },

  /**
   * Converts an array of jwpsegs into an array of data segments compliant with the oRTB content.data[index].segment
   * @param {[String]} jwpsegs - jwplayer contextual targeting segments
   * @return {[Object]|undefined} list of data segments compliant with the oRTB content.data[index].segment spec
   */
  getSegments: function (jwpsegs) {
    if (!jwpsegs || !jwpsegs.length) {
      return;
    }

    const formattedSegments = jwpsegs.reduce((convertedSegments, rawSegment) => {
      convertedSegments.push({
        id: rawSegment,
        value: rawSegment
      });
      return convertedSegments;
    }, []);

    return formattedSegments;
  },

  /**
   * Creates an object compliant with the oRTB content.data[index] spec.
   * @param {String} mediaId - content identifier
   * @param {[Object]} segments - list of data segments compliant with the oRTB content.data[index].segment spec
   * @return {Object} - Object compliant with the oRTB content.data[index] spec.
   */
  getContentDatum: function (mediaId, segments) {
    if (!mediaId && !segments) {
      return;
    }

    const contentData = {
      name: 'jwplayer.com',
      ext: {}
    };

    if (mediaId) {
      contentData.ext.cids = [mediaId];
    }

    if (segments) {
      contentData.segment = segments;
      contentData.ext.segtax = 502;
    }

    return contentData;
  }
}

/**
 * Tracks which functions are attached to events
 * @typedef CallbackStorage
 * @function storeCallback
 * @function getCallback
 * @function clearStorage
 */

/**
 * @returns {CallbackStorage}
 */
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

// STATE

/**
 * @returns {State}
 */
export function adStateFactory() {
  const adState = Object.assign({}, stateFactory());

  function updateForEvent(event) {
    const updates = {
      adTagUrl: event.tag,
      offset: event.adPosition,
      loadTime: event.timeLoading,
      vastAdId: event.id, // TODO: delete from spec!! seems JW Player specific
      adDescription: event.description,
      adServer: event.adsystem,
      adTitle: event.adtitle,
      advertiserId: event.advertiserId,
      advertiserName: event.advertiser,
      dealId: event.dealId,
      // adCategories
      linear: event.linear,
      vastVersion: event.vastversion,
      // campaignId:
      creativeUrl: event.mediaFile, // TODO: per AP, mediafile might be object w/ file property. verify
      adId: event.adId,
      universalAdId: event.universalAdId,
      creativeId: event.creativeAdId,
      creativeType: event.creativetype,
      redirectUrl: event.clickThroughUrl,
      adPlacementType: convertPlacementToOrtbCode(event.placement),
      waterfallIndex: event.witem,
      waterfallCount: event.wcount,
      adPodCount: event.podcount,
      adPodIndex: event.sequence,
      wrapperAdIds: event.wrapperAdIds
    };

    if (event.client === 'googima' && !updates.wrapperAdIds) {
      updates.wrapperAdIds = parseImaAdWrapperIds(event);
    }

    this.updateState(updates);
  }

  adState.updateForEvent = updateForEvent;

  function convertPlacementToOrtbCode(placement) {
    switch (placement) {
      case 'instream':
        return PLACEMENT.INSTREAM;

      case 'banner':
        return PLACEMENT.BANNER;

      case 'article':
        return PLACEMENT.ARTICLE;

      case 'feed':
        return PLACEMENT.FEED;

      case 'interstitial':
      case 'slider':
      case 'floating':
        return PLACEMENT.INTERSTITIAL_SLIDER_FLOATING;
    }
  }

  function parseImaAdWrapperIds(adEvent) {
    const ima = adEvent.ima;
    const ad = ima && ima.ad;
    if (!ad) {
      return;
    }

    const adProperties = Object.keys(ad);
    adProperties.forEach(property => {
      const value = ad[property];
      const wrapperIds = value.adWrapperIds;
      if (wrapperIds) {
        return wrapperIds;
      }
    });
  }

  return adState;
}

/**
 * @returns {State}
 */
export function timeStateFactory() {
  const timeState = Object.assign({}, stateFactory());

  function updateForEvent(event) {
    const { position, duration } = event;
    this.updateState({
      time: position,
      duration,
      playbackMode: getPlaybackMode(duration)
    });
  }

  timeState.updateForEvent = updateForEvent;

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
