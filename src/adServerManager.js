import { getGlobal } from './prebidGlobal.js';
import { logWarn } from './utils.js';

const prebid = getGlobal();

/**
 * This file defines the plugin points in prebid-core for AdServer-specific functionality.
 *
 * Its main job is to expose functions for AdServer modules to append functionality to the Prebid public API.
 * For a given Ad Server with name "adServerName", these functions will only change the API in the
 * $$PREBID_GLOBAL$$.adServers[adServerName] namespace.
 */

/**
 * @typedef {Object} CachedVideoBid
 *
 * @property {string} videoCacheId The ID which can be used to retrieve this video from prebid-server.
 *   This is the same ID given to the callback in the videoCache's store function.
 */

/**
 * @function VideoAdUrlBuilder
 *
 * @param {CachedVideoBid} bid The winning Bid which the ad server should show, assuming it beats out
 *   the competition.
 *
 * @param {Object} options Options required by the Ad Server to make a valid AdServer URL.
 *   This object will have different properties depending on the specific ad server supported.
 *   For more information, see the docs inside the ad server module you're supporting.
 *
 * @return {string} A URL which can be passed into the Video player to play an ad.
 */

/**
 * @typedef {Object} VideoSupport
 *
 * @function {VideoAdUrlBuilder} buildVideoAdUrl
 */

/**
 * Enable video support for the Ad Server.
 *
 * @property {string} name The identifying name for this adserver.
 * @property {VideoSupport} videoSupport An object with the functions needed to support video in Prebid.
 */
export function registerVideoSupport(name, videoSupport) {
  prebid.adServers = prebid.adServers || { };
  prebid.adServers[name] = prebid.adServers[name] || { };
  Object.keys(videoSupport).forEach((key) => {
    if (prebid.adServers[name][key]) {
      logWarn(`Attempting to add an already registered function property ${key} for AdServer ${name}.`);
      return;
    }
    prebid.adServers[name][key] = videoSupport[key];
  });
}
