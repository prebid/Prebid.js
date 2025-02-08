import { module } from '../../src/hook.js';
import { ParentModule, SubmoduleBuilder } from '../../libraries/video/shared/parentModule.js';

// define, ortb object,  events

/**
 * Video Provider Submodule interface. All submodules of the Core Video module must adhere to this.
 * @description attached to a video player instance.
 * @typedef {Object} VideoProvider
 * @function init - Instantiates the Video Provider and the video player, if not already instantiated.
 * @function getId - retrieves the div id (unique identifier) of the attached player instance.
 * @function getOrtbVideo - retrieves the oRTB Video params for a player's current video session.
 * @function getOrtbContent - retrieves the oRTB Content params for a player's current video session.
 * @function setAdTagUrl - Requests that a player render the ad in the provided ad tag url.
 * @function onEvent - attaches an event listener to the player instance.
 * @function offEvent - removes event listener to the player instance.
 * @function destroy - deallocates the player instance
 */

/**
 * @function VideoProvider#init
 */

/**
 * @function VideoProvider#getId
 * @returns {string}
 */

/**
 * @function VideoProvider#getOrtbVideo
 * @returns {Object}
 */

/**
 * @function VideoProvider#getOrtbContent
 * @returns {Object}
 */

/**
 * @function VideoProvider#setAdTagUrl
 * @param {string} adTagUrl - URL to a VAST ad tag
 * @param {Object} options - Optional params
 */

/**
 * @function VideoProvider#onEvent
 * @param {string} event - name of event for which the listener should be added
 * @param {function} callback - function that will get called when the event is triggered
 * @param {Object} basePayload - Base payload for every event; includes common parameters such as divId and type. Event payload should be built on top of this.
 */

/**
 * @function VideoProvider#offEvent
 * @param {string} event - name of event for which the attached listener should be removed
 * @param {function} callback - function that was assigned as a callback when the listener was added
 */

/**
 * @function VideoProvider#destroy
 */

/**
 * @typedef {Object} videoProviderConfig
 * @name videoProviderConfig
 * @summary contains data indicating which submodule to create and which player instance to attach it to
 * @property {string} divId - unique identifier of the player instance
 * @property {number} vendorCode - numeric identifier of the Video Provider type i.e. video.js or jwplayer
 * @property {playerConfig} playerConfig
 */

/**
 * @typedef {Object} playerConfig
 * @name playerConfig
 * @summary contains data indicating the behavior the player instance should have
 * @property {boolean} autoStart - determines if the player should start automatically when instantiated
 * @property {boolean} mute - determines if the player should be muted when instantiated
 * @property {string} licenseKey - authentication key required for commercial players. Optional for free players.
 * @property {playerVendorParams} params
 */

/**
 * @typedef playerVendorParams
 * @name playerVendorParams
 * @summary configuration options specific to a Video Vendor's Provider
 * @property {Object} vendorConfig - the settings object which can be used as an argument when instantiating a player. Specific to the video player's API.
 */

/**
 * @typedef videoEvent
 *
 */

/**
 * Routes commands to the appropriate video submodule.
 * @typedef {Object} VideoCore
 * @class
 * @function registerProvider
 * @function getOrtbVideo
 * @function getOrtbContent
 * @function setAdTagUrl
 * @function onEvents
 * @function offEvents
 */

/**
 * @summary Maps a Video Provider factory to the video player's vendor code.
 */
const videoVendorDirectory = {};

/**
 * @constructor
 * @param {ParentModule} parentModule_
 * @returns {VideoCore}
 */
export function VideoCore(parentModule_) {
  const parentModule = parentModule_;

  /**
   * requests that a submodule be instantiated for the specific player instance described by the @providerConfig
   * @name VideoCore#registerProvider
   * @param {videoProviderConfig} providerConfig
   */
  function registerProvider(providerConfig) {
    try {
      parentModule.registerSubmodule(providerConfig.divId, providerConfig.vendorCode, providerConfig);
    } catch (e) {}
  }

  function initProvider(divId) {
    const submodule = parentModule.getSubmodule(divId);
    submodule && submodule.init && submodule.init();
  }

  /**
   * @name VideoCore#getOrtbVideo
   * @summary Obtains the oRTB Video params for a player's current video session.
   * @param {string} divId - unique identifier of the player instance
   * @returns {Object} oRTB Video params
   */
  function getOrtbVideo(divId) {
    const submodule = parentModule.getSubmodule(divId);
    return submodule && submodule.getOrtbVideo();
  }

  /**
   * @name VideoCore#getOrtbContent
   * @summary Obtains the oRTB Content params for a player's current video session.
   * @param {string} divId - unique identifier of the player instance
   * @returns {Object} oRTB Content params
   */
  function getOrtbContent(divId) {
    const submodule = parentModule.getSubmodule(divId);
    return submodule && submodule.getOrtbContent();
  }

  /**
   * @name VideoCore#setAdTagUrl
   * @summary Requests that a player render the ad in the provided ad tag
   * @param {string} adTagUrl - URL to a VAST ad tag
   * @param {string} divId - unique identifier of the player instance
   * @param {Object} options - additional params
   */
  function setAdTagUrl(adTagUrl, divId, options) {
    const submodule = parentModule.getSubmodule(divId);
    submodule && submodule.setAdTagUrl(adTagUrl, options);
  }

  /**
   * @name VideoCore#onEvents
   * @summary attaches event listeners
   * @param {[string]} events - List of event names for which the listener should be added
   * @param {function} callback - function that will get called when one of the events is triggered
   * @param {string} divId - unique identifier of the player instance
   */
  function onEvents(events, callback, divId) {
    if (!callback) {
      return;
    }

    const submodule = parentModule.getSubmodule(divId);
    if (!submodule) {
      return;
    }

    for (let i = 0; i < events.length; i++) {
      const type = events[i];
      const basePayload = {
        divId,
        type
      };
      submodule.onEvent(type, callback, basePayload);
    }
  }

  /**
   * @name VideoCore#offEvents
   * @summary removes event listeners
   * @param {[string]} events - List of event names for which the listener should be removed
   * @param {function} callback - function that was assigned as a callback when the listener was added
   * @param {string} divId - unique identifier of the player instance
   */
  function offEvents(events, callback, divId) {
    const submodule = parentModule.getSubmodule(divId);
    if (!submodule) {
      return;
    }

    events.forEach(event => {
      submodule.offEvent(event, callback);
    });
  }

  return {
    registerProvider,
    initProvider,
    getOrtbVideo,
    getOrtbContent,
    setAdTagUrl,
    onEvents,
    offEvents,
    hasProviderFor(divId) {
      return !!parentModule.getSubmodule(divId);
    }
  };
}

/**
 * @function videoCoreFactory
 * @summary Factory to create a Video Core instance
 * @returns {VideoCore}
 */
export function videoCoreFactory() {
  const videoSubmoduleBuilder = SubmoduleBuilder(videoVendorDirectory);
  const parentModule = ParentModule(videoSubmoduleBuilder);
  return VideoCore(parentModule);
}

function attachVideoProvider(submoduleFactory) {
  videoVendorDirectory[submoduleFactory.vendorCode] = submoduleFactory;
}

module('video', attachVideoProvider);
