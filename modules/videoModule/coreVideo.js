import { videoVendorDirectory } from './vendorDirectory.js';
import { ParentModule, SubmoduleBuilder } from './shared/parentModule.js';

// define, ortb object,  events

/**
 * Video Provider Submodule interface. All submodules of the Core Video module must adhere to this.
 * @description attached to a video player instance.
 * @typedef {Object} VideoProvider
 * @function init - Instantiates the Video Provider and the video player, if not already instantiated.
 * @function getId - retrieves the div id (unique identifier) of the attached player instance.
 * @function getOrtbParams - retrieves the oRTB params for a player's current video session.
 * @function setAdTagUrl - Requests that a player render the ad in the provided ad tag url.
 * @function onEvents - attaches event listeners to the player instance.
 * @function offEvents - removes event listeners to the player instance.
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
 * @function VideoProvider#getOrtParams
 * @returns {Object}
 */

/**
 * @function VideoProvider#setAdTagUrl
 * @param {string} adTagUrl - URL to a VAST ad tag
 * @param {Object} options - Optional params
 */


/**
 * @function VideoProvider#onEvents
 * @param {[string]} events - List of event names for which the listener should be added
 * @param {function} callback - function that will get called when one of the events is triggered
 */

/**
 * @function VideoProvider#offEvents
 * @param {[string]} events - List of event names for which the attached listener should be removed
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
 * Routes commands to the appropriate video submodule.
 * @typedef {Object} VideoCore
 * @class
 * @function registerProvider
 * @function getOrtbParams
 * @function setAdTagUrl
 * @function onEvents
 * @function offEvents
 */

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
    parentModule.registerSubmodule(providerConfig.divId, providerConfig.vendorCode, providerConfig);
  }

  /**
   * @name VideoCore#getOrtbParams
   * @summary Obtains the oRTB params for a player's current video session.
   * @param {string} divId - unique identifier of the player instance
   * @returns {Object} oRTB params
   */
  function getOrtbParams(divId) {
    const submodule = parentModule.getSubmodule(divId);
    return submodule && submodule.getOrtbParams();
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
    const submodule = parentModule.getSubmodule(divId);
    submodule && submodule.onEvents(events, callback);
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
    submodule && submodule.offEvents(events, callback);
  }

  return {
    registerProvider,
    getOrtbParams,
    setAdTagUrl,
    onEvents,
    offEvents
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
