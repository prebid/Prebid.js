import {createTrackPixelHtml, logError, getBidIdParameter} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import {tryAppendQueryString} from '../libraries/urlUtils/urlUtils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 */

const BIDDER_CODE = 'aja';
const ENDPOINT_URL = 'https://ad.as.amanad.adtdp.com/v2/prebid';
const SDK_TYPE = 5;

const AD_TYPE = {
  Banner: 1,
  Native: 2,
  Video: 3,
};

const BANNER_SIZE_MAP = {
  '970x250': 1,
  '300x250': 2,
  '320x50': 3,
  '728x90': 4,
  '320x100': 6,
  '336x280': 31,
  '300x600': 32,
};

const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 300;
const DEFAULT_NET_REVENUE = true;

/**
 * @typedef {object} AJABidResponse
 *
 * @property {boolean} is_ad_return - Whether an ad was returned
 * @property {AJAAd} ad - The ad object
 * @property {string[]} [syncs] - Array of user sync pixel URLs
 * @property {string[]} [sync_htmls] - Array of user sync iframe URLs
 */

/**
 * @typedef {object} AJAAd
 *
 * @property {number} ad_type - Type of ad (1=Banner, 2=Native, 3=Video)
 * @property {string} prebid_id - Prebid bid ID
 * @property {number} price - CPM price
 * @property {string} [creative_id] - Creative ID
 * @property {string} [deal_id] - Deal ID
 * @property {string} [currency] - Currency code
 * @property {AJABannerAd} banner - Banner ad data
 */

/**
 * @typedef {object} AJABannerAd
 *
 * @property {string} tag - HTML tag for the ad
 * @property {number} w - Width of the ad
 * @property {number} h - Height of the ad
 * @property {string[]} [adomain] - Advertiser domains
 * @property {string[]} [imps] - Array of impression tracking URLs
 */

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * @param {BidRequest} bidRequest
   * @returns {boolean}
   */
  isBidRequestValid: function(bidRequest) {
    return !!(bidRequest.params?.asi);
  },

  /**
   * @param {BidRequest[]} validBidRequests
   * @param {BidderRequest} bidderRequest
   * @returns {ServerRequest[]}
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const bidRequests = [];
    const pageUrl = bidderRequest?.refererInfo?.page || undefined;

    for (let i = 0, len = validBidRequests.length; i < len; i++) {
      const bidRequest = validBidRequests[i];

      let queryString = '';

      const asi = getBidIdParameter('asi', bidRequest.params);
      queryString = tryAppendQueryString(queryString, 'asi', asi);
      queryString = tryAppendQueryString(queryString, 'skt', SDK_TYPE);
      queryString = tryAppendQueryString(queryString, 'gpid', bidRequest.ortb2Imp?.ext?.gpid);
      queryString = tryAppendQueryString(queryString, 'tid', bidRequest.ortb2Imp?.ext?.tid);
      queryString = tryAppendQueryString(queryString, 'cdep', bidRequest.ortb2?.device?.ext?.cdep);
      queryString = tryAppendQueryString(queryString, 'prebid_id', bidRequest.bidId);
      queryString = tryAppendQueryString(queryString, 'prebid_ver', '$prebid.version$');
      queryString = tryAppendQueryString(queryString, 'page_url', pageUrl);
      const schain = bidRequest?.ortb2?.source?.ext?.schain;
      queryString = tryAppendQueryString(queryString, 'schain', spec.serializeSupplyChain(schain || []));

      const adFormatIDs = pickAdFormats(bidRequest);
      if (adFormatIDs && adFormatIDs.length > 0) {
        queryString = tryAppendQueryString(queryString, 'ad_format_ids', adFormatIDs.join(','));
      }

      const eids = bidRequest.userIdAsEids;
      if (eids && eids.length) {
        queryString = tryAppendQueryString(queryString, 'eids', JSON.stringify({
          'eids': eids,
        }));
      }

      const sua = bidRequest.ortb2?.device?.sua;
      if (sua) {
        queryString = tryAppendQueryString(queryString, 'sua', JSON.stringify(sua));
      }

      bidRequests.push({
        method: 'GET',
        url: ENDPOINT_URL,
        data: queryString
      });
    }

    return bidRequests;
  },

  /**
   * @param {ServerResponse} serverResponse
   * @param {ServerRequest} bidRequest
   * @returns {Bid[]}
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bidderResponseBody = serverResponse.body;

    if (!bidderResponseBody.is_ad_return) {
      return [];
    }

    const ad = bidderResponseBody.ad;
    if (!ad || AD_TYPE.Banner !== ad.ad_type) {
      return [];
    }

    const bannerAd = ad.banner;
    if (!bannerAd) {
      return [];
    }

    const bid = {
      requestId: ad.prebid_id,
      mediaType: BANNER,
      ad: bannerAd.tag,
      width: bannerAd.w,
      height: bannerAd.h,
      cpm: ad.price,
      creativeId: ad.creative_id,
      dealId: ad.deal_id,
      currency: ad.currency || DEFAULT_CURRENCY,
      netRevenue: DEFAULT_NET_REVENUE,
      ttl: DEFAULT_TTL,
      meta: {
        advertiserDomains: bannerAd.adomain || [],
      },
    };

    try {
      if (Array.isArray(bannerAd.imps)) {
        bannerAd.imps.forEach(impTracker => {
          const tracker = createTrackPixelHtml(impTracker);
          bid.ad += tracker;
        });
      }
    } catch (error) {
      logError('Error appending tracking pixel', error);
    }

    return [bid];
  },

  /**
   * @param {SyncOptions} syncOptions
   * @param {ServerResponse[]} serverResponses
   * @returns {{type: string, url: string}[]}
   */
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];
    if (!serverResponses.length) {
      return syncs;
    }

    const bidderResponseBody = serverResponses[0].body;

    if (syncOptions.pixelEnabled && bidderResponseBody.syncs && Array.isArray(bidderResponseBody.syncs)) {
      bidderResponseBody.syncs.forEach(sync => {
        syncs.push({
          type: 'image',
          url: sync
        });
      });
    }

    if (syncOptions.iframeEnabled && bidderResponseBody.sync_htmls && Array.isArray(bidderResponseBody.sync_htmls)) {
      bidderResponseBody.sync_htmls.forEach(sync => {
        syncs.push({
          type: 'iframe',
          url: sync
        });
      });
    }

    return syncs;
  },

  /**
   * @param {Object} supplyChain
   * @returns {string|undefined}
   */
  serializeSupplyChain: function(supplyChain) {
    if (!supplyChain || !supplyChain.nodes) {
      return undefined;
    }
    const { ver, complete, nodes } = supplyChain;
    return `${ver},${complete}!${spec.serializeSupplyChainNodes(nodes)}`;
  },

  /**
   * @param {Array} nodes
   * @returns {string}
   */
  serializeSupplyChainNodes: function(nodes) {
    const fields = ['asi', 'sid', 'hp', 'rid', 'name', 'domain'];
    return nodes.map((n) => {
      return fields.map((f) => {
        return encodeURIComponent(n[f] || '').replace(/!/g, '%21');
      }).join(',');
    }).join('!');
  }
};

/**
 * @param {BidRequest} bidRequest
 * @returns {number[]}
 */
function pickAdFormats(bidRequest) {
  const sizes = bidRequest.sizes || [];
  sizes.push(...(bidRequest.mediaTypes?.banner?.sizes || []));

  const adFormatIDs = [];
  for (const size of sizes) {
    if (!Array.isArray(size) || size.length !== 2) {
      continue;
    }

    const adFormatID = BANNER_SIZE_MAP[`${size[0]}x${size[1]}`];
    if (adFormatID) {
      adFormatIDs.push(adFormatID);
    }
  }

  return [...new Set(adFormatIDs)];
}

registerBidder(spec);
