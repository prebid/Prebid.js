import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ajax } from '../src/ajax.js';
import { BANNER } from '../src/mediaTypes.js';
import { deepAccess, generateUUID, logWarn, mergeDeep } from '../src/utils.js';

const BIDDER_CODE = 'engerio';
const ENDPOINT_URL = 'https://api.engerio.sk/api/v1/adserver/prebid/auction/';
const TTL = 300; // seconds a cached bid is valid

/**
 * @typedef {object} BidParams
 * @property {string} [adUnitCode] - Optional override for the Prebid adUnitCode.
 */

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 * @typedef {BidRequest & { params?: BidParams, adUnitCode?: string }} EngerioBidRequest
 */

/**
 * @param {EngerioBidRequest} bid
 * @returns {string | undefined}
 */
function getAdUnitCode(bid) {
  return bid.params?.adUnitCode || bid.adUnitCode;
}

/** @type {BidderSpec} */
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Validates a single bid request.
   * `params.adUnitCode` overrides the conventional `adUnitCode` field.
   *
   * @param {EngerioBidRequest} bid
   * @returns {boolean}
   */
  isBidRequestValid(bid) {
    if (!getAdUnitCode(bid)) {
      logWarn(`${BIDDER_CODE}: bid is missing both params.adUnitCode and adUnitCode`);
      return false;
    }
    return true;
  },

  /**
   * Builds an OpenRTB 2.5 BidRequest from Prebid.js bid requests.
   *
   * @param {EngerioBidRequest[]} validBidRequests
   * @param {BidderRequest} bidderRequest
   * @returns {ServerRequest}
   */
  buildRequests(validBidRequests, bidderRequest) {
    const imps = validBidRequests.map(bid => {
      const adUnitCode = getAdUnitCode(bid);
      const imp = {
        id: bid.bidId,
        ext: {
          adUnitCode,
        },
      };

      const bannerMediaType = deepAccess(bid, 'mediaTypes.banner');
      if (bannerMediaType) {
        const sizes = bannerMediaType.sizes || [];
        imp.banner = {
          format: sizes.map(([w, h]) => ({ w, h })),
        };
        if (sizes.length > 0) {
          imp.banner.w = sizes[0][0];
          imp.banner.h = sizes[0][1];
        }
      }

      return imp;
    });

    const ortb2 = bidderRequest?.ortb2 || {};
    const page = deepAccess(bidderRequest, 'refererInfo.page');
    const domain = deepAccess(bidderRequest, 'refererInfo.domain');
    const userAgent = deepAccess(bidderRequest, 'ortb2.device.ua');

    const bidRequest = mergeDeep({}, ortb2, {
      id: generateUUID(),
      imp: imps,
    });

    const site = {};
    const ortb2Page = deepAccess(ortb2, 'site.page');
    const ortb2Domain = deepAccess(ortb2, 'site.domain');

    if (page || ortb2Page) {
      site.page = page || ortb2Page;
    }
    if (domain || ortb2Domain) {
      site.domain = domain || ortb2Domain;
    }
    if (ortb2.site || Object.keys(site).length > 0) {
      bidRequest.site = mergeDeep({}, ortb2.site || {}, site);
    }

    if (userAgent) {
      bidRequest.device = mergeDeep({}, ortb2.device || {}, { ua: userAgent });
    }

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: JSON.stringify(bidRequest),
      options: {
        contentType: 'text/plain',
        withCredentials: false,
      },
    };
  },

  /**
   * Maps an OpenRTB 2.5 BidResponse back to Prebid.js bids.
   *
   * @param {ServerResponse} serverResponse
   * @returns {Bid[]}
   */
  interpretResponse(serverResponse) {
    const bids = [];
    const body = serverResponse.body;

    if (!body || !Array.isArray(body.seatbid) || body.seatbid.length === 0) {
      return bids;
    }

    const currency = body.cur || 'EUR';

    body.seatbid.forEach(seatbid => {
      (seatbid.bid || []).forEach(bid => {
        if (!bid.adm || bid.price <= 0) return;

        const prebidBid = {
          requestId: bid.impid,
          cpm: bid.price,
          currency,
          width: bid.w || 0,
          height: bid.h || 0,
          creativeId: bid.crid || bid.id,
          ad: bid.adm,
          ttl: TTL,
          netRevenue: true,
        };

        if (bid.nurl) {
          prebidBid.nurl = bid.nurl;
        }

        if (bid.adomain && bid.adomain.length > 0) {
          prebidBid.meta = { advertiserDomains: bid.adomain };
        }

        bids.push(prebidBid);
      });
    });

    return bids;
  },

  /**
   * Fires the win notice (nurl) when Prebid.js renders the winning bid.
   * Engerio uses this to mark the ImpressionLog as won and deduct budget.
   *
   * @param {Bid} bid
   */
  onBidWon(bid) {
    if (bid.nurl) {
      ajax(bid.nurl, null, undefined, { method: 'GET', keepalive: true });
    }
  },
};

registerBidder(spec);
