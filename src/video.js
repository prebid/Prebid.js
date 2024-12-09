import {isArrayOfNums, isInteger, isNumber, isPlainObject, isStr, logError, logWarn} from './utils.js';
import {config} from '../src/config.js';
import {hook} from './hook.js';
import {auctionManager} from './auctionManager.js';

export const OUTSTREAM = 'outstream';
export const INSTREAM = 'instream';

/**
 * List of OpenRTB 2.x video object properties with simple validators.
 * Not included: `companionad`, `durfloors`, `ext`
 * reference: https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
 */
export const ORTB_VIDEO_PARAMS = new Map([
  [ 'mimes', value => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string') ],
  [ 'minduration', isInteger ],
  [ 'maxduration', isInteger ],
  [ 'startdelay', isInteger ],
  [ 'maxseq', isInteger ],
  [ 'poddur', isInteger ],
  [ 'protocols', isArrayOfNums ],
  [ 'w', isInteger ],
  [ 'h', isInteger ],
  [ 'podid', isStr ],
  [ 'podseq', isInteger ],
  [ 'rqddurs', isArrayOfNums ],
  [ 'placement', isInteger ], // deprecated, see plcmt
  [ 'plcmt', isInteger ],
  [ 'linearity', isInteger ],
  [ 'skip', value => [1, 0].includes(value) ],
  [ 'skipmin', isInteger ],
  [ 'skipafter', isInteger ],
  [ 'sequence', isInteger ], // deprecated
  [ 'slotinpod', isInteger ],
  [ 'mincpmpersec', isNumber ],
  [ 'battr', isArrayOfNums ],
  [ 'maxextended', isInteger ],
  [ 'minbitrate', isInteger ],
  [ 'maxbitrate', isInteger ],
  [ 'boxingallowed', isInteger ],
  [ 'playbackmethod', isArrayOfNums ],
  [ 'playbackend', isInteger ],
  [ 'delivery', isArrayOfNums ],
  [ 'pos', isInteger ],
  [ 'api', isArrayOfNums ],
  [ 'companiontype', isArrayOfNums ],
  [ 'poddedupe', isArrayOfNums ]
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
 * validateOrtbVideoFields mutates the `adUnit.mediaTypes.video` object by removing invalid ortb properties (default).
 * The onInvalidParam callback can be used to handle invalid properties differently.
 * Other properties are ignored and kept as is.
 *
 * @param {Object} adUnit - The adUnit object.
 * @param {Function} onInvalidParam - The callback function to be called with key, value, and adUnit.
 * @returns {void}
 */
export function validateOrtbVideoFields(adUnit, onInvalidParam) {
  const videoParams = adUnit?.mediaTypes?.video;

  if (!isPlainObject(videoParams)) {
    logWarn(`validateOrtbVideoFields: videoParams must be an object.`);
    return;
  }

  if (videoParams != null) {
    Object.entries(videoParams)
      .forEach(([key, value]) => {
        if (!ORTB_VIDEO_PARAMS.has(key)) {
          return
        }
        const isValid = ORTB_VIDEO_PARAMS.get(key)(value);
        if (!isValid) {
          if (typeof onInvalidParam === 'function') {
            onInvalidParam(key, value, adUnit);
          } else {
            delete videoParams[key];
            logWarn(`Invalid prop in adUnit "${adUnit.code}": Invalid value for mediaTypes.video.${key} ORTB property. The property has been removed.`);
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
  const videoMediaType = index.getMediaTypes(bid)?.video;
  const context = videoMediaType && videoMediaType?.context;
  const useCacheKey = videoMediaType && videoMediaType?.useCacheKey;
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
