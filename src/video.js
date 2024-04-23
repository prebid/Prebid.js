import {deepAccess, isArrayOfNums, isInteger, isNumber, isStr, logError, logWarn} from './utils.js';
import {config} from '../src/config.js';
import {hook} from './hook.js';
import {auctionManager} from './auctionManager.js';

export const OUTSTREAM = 'outstream';
export const INSTREAM = 'instream';

/**
 * Basic validation of OpenRTB 2.x video object properties.
 * Not included: `companionad`, `durfloors`, `ext`
 * reference: https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
 */
export const ORTB_VIDEO_PARAMS = new Map([
  [ 'mimes', { validate: (value) => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string') } ],
  [ 'minduration', { validate: (value) => isInteger(value) } ],
  [ 'maxduration', { validate: (value) => isInteger(value) } ],
  [ 'startdelay', { validate: (value) => isInteger(value) } ],
  [ 'maxseq', { validate: (value) => isInteger(value) } ],
  [ 'poddur', { validate: (value) => isInteger(value) } ],
  [ 'protocols', { validate: (value) => isArrayOfNums(value) } ],
  [ 'w', { validate: (value) => isInteger(value) } ],
  [ 'h', { validate: (value) => isInteger(value) } ],
  [ 'podid', { validate: (value) => isStr(value) } ],
  [ 'podseq', { validate: (value) => isInteger(value) } ],
  [ 'rqddurs', { validate: (value) => isArrayOfNums(value) } ],
  [ 'placement', { validate: (value) => isInteger(value) } ], // deprecated, see plcmt
  [ 'plcmt', { validate: (value) => isInteger(value) } ],
  [ 'linearity', { validate: (value) => isInteger(value) } ],
  [ 'skip', { validate: (value) => [1, 0].includes(value) } ],
  [ 'skipmin', { validate: (value) => isInteger(value) } ],
  [ 'skipafter', { validate: (value) => isInteger(value) } ],
  [ 'sequence', { validate: (value) => isInteger(value) } ], // deprecated
  [ 'slotinpod', { validate: (value) => isInteger(value) } ],
  [ 'mincpmpersec', { validate: (value) => isNumber(value) } ],
  [ 'battr', { validate: (value) => isArrayOfNums(value) } ],
  [ 'maxextended', { validate: (value) => isInteger(value) } ],
  [ 'minbitrate', { validate: (value) => isInteger(value) } ],
  [ 'maxbitrate', { validate: (value) => isInteger(value) } ],
  [ 'boxingallowed', { validate: (value) => isInteger(value) } ],
  [ 'playbackmethod', { validate: (value) => isArrayOfNums(value) } ],
  [ 'playbackend', { validate: (value) => isInteger(value) } ],
  [ 'delivery', { validate: (value) => isArrayOfNums(value) } ],
  [ 'pos', { validate: (value) => isInteger(value) } ],
  [ 'api', { validate: (value) => isArrayOfNums(value) } ],
  [ 'companiontype', { validate: (value) => isArrayOfNums(value) } ],
  [ 'poddedupe', { validate: (value) => isArrayOfNums(value) } ],
]);

export function fillVideoDefaults(adUnit) {
  const video = adUnit?.mediaTypes?.video;
  if (video != null && video.plcmt == null) {
    if (video.context === OUTSTREAM || [2, 3, 4].includes(video.placement)) {
      video.plcmt = 4;
    } else if (video.context !== OUTSTREAM && [2, 6].includes(video.playbackmethod)) {
      video.plcmt = 2;
    }
  }
}

/**
 * validateOrtbVideoFields mutates the `videoParams` object by removing invalid ortb properties.
 * Other properties are ignored and kept as is.
 *
 * @param {object} videoParams
 * @returns {void}
 */
export function validateOrtbVideoFields(videoParams) {
  if (videoParams != null) {
    Object.entries(videoParams)
      .forEach(([key, value]) => {
        if (ORTB_VIDEO_PARAMS.has(key)) {
          const valid = ORTB_VIDEO_PARAMS.get(key).validate(value);
          if (!valid) {
            delete videoParams[key];
            logWarn(`Invalid value for mediaTypes.video.${key} ORTB property. The property has been removed.`);
          }
        }
      });
  }
}

/**
 * @typedef {object} VideoBid
 * @property {string} adId id of the bid
 */

/**
 * Validate that the assets required for video context are present on the bid
 * @param {VideoBid} bid Video bid to validate
 * @param {Object} [options] - Options object
 * @param {Object} [options.index=auctionManager.index] - Index object, defaulting to `auctionManager.index`
 * @return {Boolean} If object is valid
 */
export function isValidVideoBid(bid, {index = auctionManager.index} = {}) {
  const videoMediaType = deepAccess(index.getMediaTypes(bid), 'video');
  const context = videoMediaType && deepAccess(videoMediaType, 'context');
  const useCacheKey = videoMediaType && deepAccess(videoMediaType, 'useCacheKey');
  const adUnit = index.getAdUnit(bid);

  // if context not defined assume default 'instream' for video bids
  // instream bids require a vast url or vast xml content
  return checkVideoBidSetup(bid, adUnit, videoMediaType, context, useCacheKey);
}

export const checkVideoBidSetup = hook('sync', function(bid, adUnit, videoMediaType, context, useCacheKey) {
  if (videoMediaType && (useCacheKey || context !== OUTSTREAM)) {
    // xml-only video bids require a prebid cache url
    if (!config.getConfig('cache.url') && bid.vastXml && !bid.vastUrl) {
      logError(`
        This bid contains only vastXml and will not work when a prebid cache url is not specified.
        Try enabling prebid cache with $$PREBID_GLOBAL$$.setConfig({ cache: {url: "..."} });
      `);
      return false;
    }

    return !!(bid.vastUrl || bid.vastXml);
  }

  // outstream bids require a renderer on the bid or pub-defined on adunit
  if (context === OUTSTREAM && !useCacheKey) {
    return !!(bid.renderer || (adUnit && adUnit.renderer) || videoMediaType.renderer);
  }

  return true;
}, 'checkVideoBidSetup');
