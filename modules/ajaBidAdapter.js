import {createTrackPixelHtml, logError, getBidIdParameter} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import {tryAppendQueryString} from '../libraries/urlUtils/urlUtils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 */

const BidderCode = 'aja';
const URL = 'https://ad.as.amanad.adtdp.com/v2/prebid';
const SDKType = 5;
const AdType = {
  Banner: 1,
  Native: 2,
  Video: 3,
};

const BannerSizeMap = {
  '970x250': 1,
  '300x250': 2,
  '320x50': 3,
  '728x90': 4,
  '320x100': 6,
  '336x280': 31,
  '300x600': 32,
}

export const spec = {
  code: BidderCode,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid has all the params needed to make a valid request.
   *
   * @param {BidRequest} bidRequest
   * @returns {boolean}
   */
  isBidRequestValid: function(bidRequest) {
    return !!(bidRequest.params.asi);
  },

  /**
   * Build the request to the Server which requests Bids for the given array of Requests.
   * Each BidRequest in the argument array is guaranteed to have passed the isBidRequestValid() test.
   *
   * @param {BidRequest[]} validBidRequests
   * @param {*} bidderRequest
   * @returns {ServerRequest|ServerRequest[]}
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const bidRequests = [];
    const pageUrl = bidderRequest?.refererInfo?.page || undefined;

    for (let i = 0, len = validBidRequests.length; i < len; i++) {
      const bidRequest = validBidRequests[i];

      let queryString = '';

      const asi = getBidIdParameter('asi', bidRequest.params);
      queryString = tryAppendQueryString(queryString, 'asi', asi);
      queryString = tryAppendQueryString(queryString, 'skt', SDKType);
      queryString = tryAppendQueryString(queryString, 'gpid', bidRequest.ortb2Imp?.ext?.gpid)
      queryString = tryAppendQueryString(queryString, 'tid', bidRequest.ortb2Imp?.ext?.tid)
      queryString = tryAppendQueryString(queryString, 'cdep', bidRequest.ortb2?.device?.ext?.cdep)
      queryString = tryAppendQueryString(queryString, 'prebid_id', bidRequest.bidId);
      queryString = tryAppendQueryString(queryString, 'prebid_ver', '$prebid.version$');
      queryString = tryAppendQueryString(queryString, 'page_url', pageUrl);
      queryString = tryAppendQueryString(queryString, 'schain', spec.serializeSupplyChain(bidRequest.schain || []))

      const adFormatIDs = pickAdFormats(bidRequest)
      if (adFormatIDs && adFormatIDs.length > 0) {
        queryString = tryAppendQueryString(queryString, 'ad_format_ids', adFormatIDs.join(','));
      }

      const eids = bidRequest.userIdAsEids;
      if (eids && eids.length) {
        queryString = tryAppendQueryString(queryString, 'eids', JSON.stringify({
          'eids': eids,
        }));
      }

      const sua = bidRequest.ortb2?.device?.sua
      if (sua) {
        queryString = tryAppendQueryString(queryString, 'sua', JSON.stringify(sua));
      }

      bidRequests.push({
        method: 'GET',
        url: URL,
        data: queryString
      });
    }

    return bidRequests;
  },

  interpretResponse: function(bidderResponse) {
    const bidderResponseBody = bidderResponse.body;

    if (!bidderResponseBody.is_ad_return) {
      return [];
    }

    const ad = bidderResponseBody.ad;
    if (AdType.Banner !== ad.ad_type) {
      return []
    }

    const bannerAd = bidderResponseBody.ad.banner;
    const bid = {
      requestId: ad.prebid_id,
      mediaType: BANNER,
      ad: bannerAd.tag,
      width: bannerAd.w,
      height: bannerAd.h,
      cpm: ad.price,
      creativeId: ad.creative_id,
      dealId: ad.deal_id,
      currency: ad.currency || 'USD',
      netRevenue: true,
      ttl: 300, // 5 minutes
      meta: {
        advertiserDomains: bannerAd.adomain,
      },
    }
    try {
      bannerAd.imps.forEach(impTracker => {
        const tracker = createTrackPixelHtml(impTracker);
        bid.ad += tracker;
      });
    } catch (error) {
      logError('Error appending tracking pixel', error);
    }

    return [bid];
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];
    if (!serverResponses.length) {
      return syncs;
    }

    const bidderResponseBody = serverResponses[0].body;

    if (syncOptions.pixelEnabled && bidderResponseBody.syncs) {
      bidderResponseBody.syncs.forEach(sync => {
        syncs.push({
          type: 'image',
          url: sync
        });
      });
    }

    if (syncOptions.iframeEnabled && bidderResponseBody.sync_htmls) {
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
   * Serialize supply chain object
   * @param {Object} supplyChain
   * @returns {String | undefined}
   */
  serializeSupplyChain: function(supplyChain) {
    if (!supplyChain || !supplyChain.nodes) return undefined
    const { ver, complete, nodes } = supplyChain
    return `${ver},${complete}!${spec.serializeSupplyChainNodes(nodes)}`
  },

  /**
   * Serialize each supply chain nodes
   * @param {Array} nodes
   * @returns {String}
   */
  serializeSupplyChainNodes: function(nodes) {
    const fields = ['asi', 'sid', 'hp', 'rid', 'name', 'domain']
    return nodes.map((n) => {
      return fields.map((f) => {
        return encodeURIComponent(n[f] || '').replace(/!/g, '%21')
      }).join(',')
    }).join('!')
  }
}

function pickAdFormats(bidRequest) {
  let sizes = bidRequest.sizes || []
  sizes.push(...(bidRequest.mediaTypes?.banner?.sizes || []))

  const adFormatIDs = [];
  for (const size of sizes) {
    if (size.length !== 2) {
      continue
    }

    const adFormatID = BannerSizeMap[`${size[0]}x${size[1]}`];
    if (adFormatID) {
      adFormatIDs.push(adFormatID);
    }
  }

  return [...new Set(adFormatIDs)]
}

registerBidder(spec);
