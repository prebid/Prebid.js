/**
 * @file AudienceNetwork adapter.
 */
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { generateUUID, deepAccess, convertTypes, formatQS } from '../src/utils.js';
import findIndex from 'core-js-pure/features/array/find-index.js';
import includes from 'core-js-pure/features/array/includes.js';

const code = 'audienceNetwork';
const currency = 'USD';
const method = 'GET';
const url = 'https://an.facebook.com/v2/placementbid.json';
const supportedMediaTypes = ['banner', 'video'];
const netRevenue = true;
const hbBidder = 'fan';
const ttl = 600;
const videoTtl = 3600;
const platver = '$prebid.version$';
const platform = '241394079772386';
const adapterver = '1.3.0';

/**
 * Does this bid request contain valid parameters?
 * @param {Object} bid
 * @returns {Boolean}
 */
const isBidRequestValid = bid =>
  typeof bid.params === 'object' &&
  typeof bid.params.placementId === 'string' &&
  bid.params.placementId.length > 0 &&
  Array.isArray(bid.sizes) && bid.sizes.length > 0 &&
  (isFullWidth(bid.params.format) ? bid.sizes.map(flattenSize).some(size => size === '300x250') : true) &&
  (isValidNonSizedFormat(bid.params.format) || bid.sizes.map(flattenSize).some(isValidSize));

/**
 * Flattens a 2-element [W, H] array as a 'WxH' string,
 * otherwise passes value through.
 * @param {Array|String} size
 * @returns {String}
 */
const flattenSize = size =>
  (Array.isArray(size) && size.length === 2) ? `${size[0]}x${size[1]}` : size;

/**
 * Expands a 'WxH' string as a 2-element [W, H] array
 * @param {String} size
 * @returns {Array}
 */
const expandSize = size => size.split('x').map(Number);

/**
 * Is this a valid slot size?
 * @param {String} size
 * @returns {Boolean}
 */
const isValidSize = size => includes(['300x250', '320x50'], size);

/**
 * Is this a valid, non-sized format?
 * @param {String} size
 * @returns {Boolean}
 */
const isValidNonSizedFormat = format => includes(['video', 'native'], format);

/**
 * Is this a valid size and format?
 * @param {String} size
 * @returns {Boolean}
 */
const isValidSizeAndFormat = (size, format) =>
  (isFullWidth(format) && flattenSize(size) === '300x250') ||
  isValidNonSizedFormat(format) ||
  isValidSize(flattenSize(size));

/**
 * Find a preferred entry, if any, from an array of valid sizes.
 * @param {Array<String>} acc
 * @param {String} cur
 */
const sortByPreferredSize = (acc, cur) =>
  (cur === '300x250') ? [cur, ...acc] : [...acc, cur];

/**
 * Map any deprecated size/formats to new values.
 * @param {String} size
 * @param {String} format
 */
const mapDeprecatedSizeAndFormat = (size, format) =>
  isFullWidth(format) ? ['300x250', null] : [size, format];

/**
 * Is this a video format?
 * @param {String} format
 * @returns {Boolean}
 */
const isVideo = format => format === 'video';

/**
 * Is this a fullwidth format?
 * @param {String} format
 * @returns {Boolean}
 */
const isFullWidth = format => format === 'fullwidth';

/**
 * Which SDK version should be used for this format?
 * @param {String} format
 * @returns {String}
 */
const sdkVersion = format => isVideo(format) ? '' : '6.0.web';

/**
 * Which platform identifier should be used?
 * @param {Array<String>} platforms Possible platform identifiers
 * @returns {String} First valid platform found, or default if none found
 */
const findPlatform = platforms => [...platforms.filter(Boolean), platform][0];

/**
 * Does the search part of the URL contain "anhb_testmode"
 * and therefore indicate testmode should be used?
 * @returns {String} "true" or "false"
 */
const isTestmode = () => Boolean(
  window && window.location &&
  typeof window.location.search === 'string' &&
  window.location.search.indexOf('anhb_testmode') !== -1
).toString();

/**
 * Generate ad HTML for injection into an iframe
 * @param {String} placementId
 * @param {String} format
 * @param {String} bidId
 * @returns {String} HTML
 */
const createAdHtml = (placementId, format, bidId) => {
  const nativeStyle = format === 'native' ? '<script>window.onload=function(){if(parent){var o=document.getElementsByTagName("head")[0];var s=parent.document.getElementsByTagName("style");for(var i=0;i<s.length;i++)o.appendChild(s[i].cloneNode(true));}}</script>' : '';
  const nativeContainer = format === 'native' ? '<div class="thirdPartyRoot"><a class="fbAdLink"><div class="fbAdMedia thirdPartyMediaClass"></div><div class="fbAdSubtitle thirdPartySubtitleClass"></div><div class="fbDefaultNativeAdWrapper"><div class="fbAdCallToAction thirdPartyCallToActionClass"></div><div class="fbAdTitle thirdPartyTitleClass"></div></div></a></div>' : '';
  return `<html>
  <head>${nativeStyle}</head>
  <body>
    <div style="display:none;position:relative;">
      <script type="text/javascript" src="https://connect.facebook.net/en_US/fbadnw60-tag.js" async></script>
      <script type="text/javascript">
        window.ADNW = window.ADNW || {};
        window.ADNW.v60 = window.ADNW.v60 || {};
        window.ADNW.v60.slots = window.ADNW.v60.slots || [];
        window.ADNW.v60.slots.push({
          rootElement: document.currentScript.parentElement,
          placementid: '${placementId}',
          format: '${format}',
          bidid: '${bidId}',
          testmode: false,
          onAdLoaded: function(rootElement) {
            console.log('Audience Network [${placementId}] ad loaded');
            rootElement.style.display = 'block';
          },
          onAdError: function(errorCode, errorMessage) {
            console.log('Audience Network [${placementId}] error (' + errorCode + ') ' + errorMessage);
          }
        });
      </script>
      ${nativeContainer}
    </div>
  </body>
</html>`;
};

/**
 * Convert each bid request to a single URL to fetch those bids.
 * @param {Array} bids - list of bids
 * @param {String} bids[].placementCode - Prebid placement identifier
 * @param {Object} bids[].params
 * @param {String} bids[].params.placementId - Audience Network placement identifier
 * @param {String} bids[].params.platform - Audience Network platform identifier (optional)
 * @param {String} bids[].params.format - Optional format, one of 'video' or 'native' if set
 * @param {Array} bids[].sizes - list of desired advert sizes
 * @param {Array} bids[].sizes[] - Size arrays [h,w]: should include one of [300, 250], [320, 50]
 * @returns {Array<Object>} List of URLs to fetch, plus formats and sizes for later use with interpretResponse
 */
const buildRequests = (bids, bidderRequest) => {
  // Build lists of placementids, adformats, sizes and SDK versions
  const placementids = [];
  const adformats = [];
  const sizes = [];
  const sdk = [];
  const platforms = [];
  const requestIds = [];

  bids.forEach(bid => bid.sizes
    .map(flattenSize)
    .filter(size => isValidSizeAndFormat(size, bid.params.format))
    .reduce(sortByPreferredSize, [])
    .slice(0, 1)
    .forEach(preferredSize => {
      const [size, format] = mapDeprecatedSizeAndFormat(preferredSize, bid.params.format);
      placementids.push(bid.params.placementId);
      adformats.push(format || size);
      sizes.push(size);
      sdk.push(sdkVersion(format));
      platforms.push(bid.params.platform);
      requestIds.push(bid.bidId);
    })
  );
  // Build URL
  const testmode = isTestmode();
  const pageurl = encodeURIComponent(deepAccess(bidderRequest, 'refererInfo.canonicalUrl') || deepAccess(bidderRequest, 'refererInfo.referer'));
  const platform = findPlatform(platforms);
  const cb = generateUUID();
  const search = {
    placementids,
    adformats,
    testmode,
    pageurl,
    sdk,
    adapterver,
    platform,
    platver,
    cb
  };
  const video = findIndex(adformats, isVideo);
  if (video !== -1) {
    [search.playerwidth, search.playerheight] = expandSize(sizes[video]);
  }
  const data = formatQS(search);

  return [{ adformats, data, method, requestIds, sizes, url, pageurl }];
};

/**
 * Convert a server response to a bid response.
 * @param {Object} response - object representing the response
 * @param {Object} response.body - response body, already converted from JSON
 * @param {Object} bidRequests - the original bid requests
 * @param {Array} bidRequest.adformats - list of formats for the original bid requests
 * @param {Array} bidRequest.sizes - list of sizes fot the original bid requests
 * @returns {Array<Object>} A list of bid response objects
 */
const interpretResponse = ({ body }, { adformats, requestIds, sizes, pageurl }) => {
  const { bids = {} } = body;
  return Object.keys(bids)
    // extract Array of bid responses
    .map(placementId => bids[placementId])
    // flatten
    .reduce((a, b) => a.concat(b), [])
    // transform to bidResponse
    .map((bid, i) => {
      const {
        bid_id: fbBidid,
        placement_id: creativeId,
        bid_price_cents: cpm
      } = bid;

      const format = adformats[i];
      const [width, height] = expandSize(flattenSize(sizes[i]));
      const ad = createAdHtml(creativeId, format, fbBidid);
      const requestId = requestIds[i];

      const bidResponse = {
        // Prebid attributes
        requestId,
        cpm: cpm / 100,
        width,
        height,
        ad,
        ttl,
        creativeId,
        netRevenue,
        currency,
        // Audience Network attributes
        hb_bidder: hbBidder,
        fb_bidid: fbBidid,
        fb_format: format,
        fb_placementid: creativeId
      };
      // Video attributes
      if (isVideo(format)) {
        bidResponse.mediaType = 'video';
        bidResponse.vastUrl = `https://an.facebook.com/v1/instream/vast.xml?placementid=${creativeId}&pageurl=${pageurl}&playerwidth=${width}&playerheight=${height}&bidid=${fbBidid}`;
        bidResponse.ttl = videoTtl;
      }
      return bidResponse;
    });
};

/**
 * Covert bid param types for S2S
 * @param {Object} params bid params
 * @param {Boolean} isOpenRtb boolean to check openrtb2 protocol
 * @return {Object} params bid params
 */
const transformBidParams = (params, isOpenRtb) => {
  return convertTypes({
    'placementId': 'string'
  }, params);
}

export const spec = {
  code,
  supportedMediaTypes,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  transformBidParams
};

registerBidder(spec);
