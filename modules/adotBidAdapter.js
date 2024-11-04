import { Renderer } from '../src/Renderer.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isArray, isBoolean, isFn, isPlainObject, isStr, logError, replaceAuctionPrice } from '../src/utils.js';
import { find } from '../src/polyfill.js';
import { config } from '../src/config.js';
import { OUTSTREAM } from '../src/video.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { NATIVE_ASSETS_IDS as NATIVE_ID_MAPPING, NATIVE_ASSETS as NATIVE_PLACEMENTS } from '../libraries/braveUtils/nativeAssets.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 * @typedef {import('../src/adapters/bidderFactory.js').MediaType} MediaType
 * @typedef {import('../src/adapters/bidderFactory.js').Site} Site
 * @typedef {import('../src/adapters/bidderFactory.js').Device} Device
 * @typedef {import('../src/adapters/bidderFactory.js').User} User
 * @typedef {import('../src/adapters/bidderFactory.js').Banner} Banner
 * @typedef {import('../src/adapters/bidderFactory.js').Video} Video
 * @typedef {import('../src/adapters/bidderFactory.js').AdUnit} AdUnit
 * @typedef {import('../src/adapters/bidderFactory.js').Imp} Imp
 */

/**
 * @typedef {Object} OpenRTBRequest
 * @property {string} id - Unique request ID.
 * @property {Array<Imp>} imp - List of impression objects.
 * @property {Site} site - Site information.
 * @property {Device} device - Device information.
 * @property {User} user - User information.
 * @property {object} regs - Regulatory data, including GDPR and COPPA.
 * @property {object} ext - Additional extensions, such as custom data for the bid request.
 * @property {number} at - Auction type, typically first-price or second-price.
 */

/**
 * @typedef {Object} OpenRTBBid
 * @property {string} impid - ID of the impression this bid relates to.
 * @property {number} price - Bid price for the impression.
 * @property {string} adid - Ad ID for the bid.
 * @property {number} [crid] - Creative ID, if available.
 * @property {string} [dealid] - Deal ID if the bid is part of a private marketplace deal.
 * @property {object} [ext] - Additional bid-specific extensions, such as media type.
 * @property {string} [adm] - Ad markup if it’s directly included in the bid response.
 * @property {string} [nurl] - Notification URL to be called when the bid wins.
 */

/**
 * @typedef {Object} OpenRTBBidResponse
 * @property {string} id - ID of the bid response.
 * @property {Array<{bid: Array<OpenRTBBid>}>} seatbid - Array of seat bids, each containing a list of bids.
 * @property {string} cur - Currency in which bid amounts are expressed.
 */

const BIDDER_CODE = 'adot';
const ADAPTER_VERSION = 'v2.0.0';
const GVLID = 272;
const BID_METHOD = 'POST';
const BIDDER_URL = 'https://dsp.adotmob.com/headerbidding{PUBLISHER_PATH}/bidrequest';
const REQUIRED_VIDEO_PARAMS = ['mimes', 'protocols'];
const FIRST_PRICE = 1;
const IMP_BUILDER = { banner: buildBanner, video: buildVideo, native: buildNative };
const OUTSTREAM_VIDEO_PLAYER_URL = 'https://adserver.adotmob.com/video/player.min.js';
const BID_RESPONSE_NET_REVENUE = true;
const BID_RESPONSE_TTL = 10;
const DEFAULT_CURRENCY = 'USD';

/**
 * Parses a JSON string into an object.
 *
 * @param {string} data - The JSON string to parse.
 * @returns {object|null} Parsed object or null on error.
 */
function tryParse(data) {
  try {
    return JSON.parse(data);
  } catch (err) {
    logError(err);
    return null;
  }
}

/**
 * Creates a Site object for OpenRTB from bidder request data.
 *
 * @param {BidderRequest} bidderRequest
 * @returns {Site|null} Site object or null if domain is missing.
 */
function getOpenRTBSiteObject(bidderRequest) {
  const refererInfo = bidderRequest?.refererInfo || null;
  const domain = refererInfo ? refererInfo.domain : window.location.hostname;
  const publisherId = config.getConfig('adot.publisherId');

  if (!domain) return null;

  return {
    page: refererInfo ? refererInfo.page : window.location.href,
    domain,
    name: domain,
    publisher: { id: publisherId },
    ext: { schain: bidderRequest.schain },
  };
}

/**
 * Generates a Device object for OpenRTB.
 *
 * @returns {Device} Device object with user-agent and language properties.
 */
function getOpenRTBDeviceObject() {
  return { ua: navigator.userAgent, language: navigator.language };
}

/**
 * Creates a User object for OpenRTB from bidder request data.
 *
 * @param {BidderRequest} bidderRequest
 * @returns {User|null} User object or null if consent string is unavailable.
 */
function getOpenRTBUserObject(bidderRequest) {
  if (!bidderRequest?.gdprConsent?.consentString) return null;
  return {
    ext: {
      consent: bidderRequest.gdprConsent.consentString,
      pubProvidedId: bidderRequest.userId?.pubProvidedId,
    },
  };
}

/**
 * Creates a Regs object for OpenRTB based on GDPR consent data.
 *
 * @param {BidderRequest} bidderRequest
 * @returns {object|null} Regs object or null if GDPR applicability is undefined.
 */
function getOpenRTBRegsObject(bidderRequest) {
  if (!isBoolean(bidderRequest?.gdprConsent?.gdprApplies)) return null;
  return { ext: { gdpr: bidderRequest.gdprConsent.gdprApplies } };
}

/**
 * Returns the primary MediaType in a MediaTypes object.
 *
 * @param {MediaType} mediaTypes - The media types configuration.
 * @returns {string|null} The primary media type or null if not found.
 */
function getMediaType(mediaTypes) {
  if (mediaTypes.banner) return 'banner';
  if (mediaTypes.video) return 'video';
  if (mediaTypes.native) return 'native';
  return null;
}

/**
 * Builds an OpenRTB banner impression object.
 *
 * @param {Banner} banner - MediaType Banner object.
 * @param {BidderRequest} bidderRequest
 * @returns {object} OpenRTB banner object with size format and position.
 */
function buildBanner(banner, bidderRequest) {
  const pos = bidderRequest.position || 0;
  const format = (banner.sizes || []).map(([w, h]) => ({ w, h }));
  return { format, pos };
}

/**
 * Gets the width and height from the video media type.
 *
 * @param {Video} video - Video media type object.
 * @returns {object} Size object with width (w) and height (h).
 */
function getVideoSize(video) {
  const sizes = video.playerSize || [];
  const format = sizes.length > 0 ? sizes[0] : [];
  return { w: format[0] || null, h: format[1] || null };
}

/**
 * Builds an OpenRTB video impression object.
 *
 * @param {Video} video - Video media type object.
 * @returns {object} OpenRTB video object.
 */
function buildVideo(video) {
  const { w, h } = getVideoSize(video);
  return {
    api: video.api,
    w,
    h,
    linearity: video.linearity || null,
    mimes: video.mimes,
    minduration: video.minduration,
    maxduration: video.maxduration,
    placement: video.plcmt,
    playbackmethod: video.playbackmethod,
    pos: video.position || 0,
    protocols: video.protocols,
    skip: video.skip || 0,
    startdelay: video.startdelay,
  };
}

/**
 * Builds a native media object, converting image-only assets to the standard native format.
 *
 * @param {NativeMedia} native - Native media type object.
 * @returns {object} Standardized native media object.
 */
function cleanNativeMedia(native) {
  if (native.type !== 'image') return native;
  return {
    image: { required: true, sizes: native.sizes },
    title: { required: true },
    sponsoredBy: { required: true },
    body: { required: false },
    cta: { required: false },
    icon: { required: false },
  };
}

/**
 * Builds a native OpenRTB impression object.
 *
 * @param {NativeMedia} native - Native media type object.
 * @returns {object} OpenRTB native request object.
 */
function buildNative(native) {
  native = cleanNativeMedia(native);
  const assets = Object.keys(native).reduce((nativeAssets, assetKey) => {
    const asset = native[assetKey];
    const assetInfo = NATIVE_PLACEMENTS[assetKey];
    if (!assetInfo) return nativeAssets;

    const { id, name, type } = assetInfo;
    const { required, len, sizes = [] } = asset;
    let [wmin, hmin] = Array.isArray(sizes[0]) ? sizes[0] : sizes;

    const newAsset = {};
    if (type) newAsset.type = type;
    if (len) newAsset.len = len;
    if (wmin) newAsset.wmin = wmin;
    if (hmin) newAsset.hmin = hmin;

    nativeAssets.push({ id, required, [name]: newAsset });
    return nativeAssets;
  }, []);

  return { request: JSON.stringify({ assets }) };
}

// Remaining methods will follow the same pattern of detailed JSDoc comments
// to ensure each input parameter, return type, and object properties are 
// well-documented for readability and type clarity.
