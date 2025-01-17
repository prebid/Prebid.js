import {deepClone, isArray, isBoolean, isEmpty, isFn, isPlainObject} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import {getAdUnitSizes} from '../libraries/sizeUtils/sizeUtils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 */

export const BIDDER_CODE = 'aduptech';
export const GVLID = 647;
export const ENDPOINT_URL_PUBLISHER_PLACEHOLDER = '{PUBLISHER}';
export const ENDPOINT_URL = 'https://rtb.d.adup-tech.com/prebid/' + ENDPOINT_URL_PUBLISHER_PLACEHOLDER + '_bid';
export const ENDPOINT_METHOD = 'POST';

/**
 * Internal utitlity functions
 */
export const internal = {

  /**
   * Extracts the GDPR information from given bidderRequest
   *
   * @param {BidderRequest} bidderRequest
   * @returns {null|Object.<string, string|boolean>}
   */
  extractGdpr: (bidderRequest) => {
    if (!bidderRequest?.gdprConsent) {
      return null;
    }

    return {
      consentString: bidderRequest.gdprConsent.consentString,
      consentRequired: (isBoolean(bidderRequest.gdprConsent.gdprApplies)) ? bidderRequest.gdprConsent.gdprApplies : true
    };
  },

  /**
   * Extracts the pageUrl from given bidderRequest.refererInfo or gobal "pageUrl" config or from (top) window location
   *
   * @param {BidderRequest} bidderRequest
   * @returns {string}
   */
  extractPageUrl: (bidderRequest) => {
    // TODO: does it make sense to fall back here?
    return bidderRequest?.refererInfo?.page || window.location.href;
  },

  /**
   * Extracts the referrer based on given bidderRequest.refererInfo or from (top) document referrer
   *
   * @param {BidderRequest} bidderRequest
   * @returns {string}
   */
  extractReferrer: (bidderRequest) => {
    // TODO: does it make sense to fall back here?
    return bidderRequest?.refererInfo?.ref || window.document.referrer;
  },

  /**
   * Extracts banner config from given bidRequest
   *
   * @param {BidRequest} bidRequest
   * @returns {null|Object.<string, *>}
   */
  extractBannerConfig: (bidRequest) => {
    const adUnitSizes = getAdUnitSizes(bidRequest);
    if (!isArray(adUnitSizes) || isEmpty(adUnitSizes)) {
      return null;
    }

    const banner = { sizes: [] };

    adUnitSizes.forEach(adUnitSize => {
      const size = deepClone(adUnitSize);

      // try to add floor for each banner size
      const floor = internal.getFloor(bidRequest, { mediaType: BANNER, size: adUnitSize });
      if (floor) {
        size.push(floor.floor);
        size.push(floor.currency);
      }

      banner.sizes.push(size);
    });

    // try to add default floor for banner
    const floor = internal.getFloor(bidRequest, { mediaType: BANNER, size: '*' });
    if (floor) {
      banner.floorPrice = floor.floor;
      banner.floorCurrency = floor.currency;
    }

    return banner;
  },

  /**
   * Extracts native config from given bidRequest
   *
   * @param {BidRequest} bidRequest
   * @returns {null|Object.<string, *>}
   */
  extractNativeConfig: (bidRequest) => {
    if (!bidRequest?.mediaTypes?.native) {
      return null;
    }

    const native = deepClone(bidRequest.mediaTypes.native);

    // try to add default floor for native
    const floor = internal.getFloor(bidRequest, { mediaType: NATIVE, size: '*' });
    if (floor) {
      native.floorPrice = floor.floor;
      native.floorCurrency = floor.currency;
    }

    return native;
  },

  /**
   * Extracts the bidder params from given bidRequest
   *
   * @param {BidRequest} bidRequest
   * @returns {null|Object.<string, *>}
   */
  extractParams: (bidRequest) => {
    if (!bidRequest?.params) {
      return null;
    }

    return deepClone(bidRequest.params);
  },

  /**
   * Try to get floor information via bidRequest.getFloor()
   *
   * @param {BidRequest} bidRequest
   * @param {Object<string, *>} options
   * @returns {null|Object.<string, *>}
   */
  getFloor: (bidRequest, options) => {
    if (!isFn(bidRequest?.getFloor)) {
      return null;
    }

    try {
      const floor = bidRequest.getFloor(options);
      if (isPlainObject(floor) && !isNaN(floor.floor)) {
        return floor;
      }
    } catch {}

    return null;
  },

  /**
   * Group given array of bidRequests by params.publisher
   *
   * @param {BidRequest[]} bidRequests
   * @returns {Object.<string, BidRequest>}
   */
  groupBidRequestsByPublisher: (bidRequests) => {
    const groupedBidRequests = {};

    if (!bidRequests || isEmpty(bidRequests)) {
      return groupedBidRequests;
    }

    bidRequests.forEach(bidRequest => {
      const publisher = internal.extractParams(bidRequest).publisher;
      if (!publisher) {
        return;
      }

      if (!groupedBidRequests[publisher]) {
        groupedBidRequests[publisher] = [];
      }

      groupedBidRequests[publisher].push(bidRequest);
    });

    return groupedBidRequests;
  },

  /**
   * Build ednpoint url based on given publisher code
   *
   * @param {string} publisher
   * @returns {string}
   */
  buildEndpointUrl: (publisher) => {
    return ENDPOINT_URL.replace(ENDPOINT_URL_PUBLISHER_PLACEHOLDER, encodeURIComponent(publisher));
  },
}

/**
 * The bid adapter definition
 */
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],
  gvlid: GVLID,

  /**
   * Validate given bid request
   *
   * @param {BidRequest[]} bidRequest
   * @returns {boolean}
   */
  isBidRequestValid: (bidRequest) => {
    if (!bidRequest) {
      return false;
    }

    // banner or native config has to be set
    if (!internal.extractBannerConfig(bidRequest) && !internal.extractNativeConfig(bidRequest)) {
      return false;
    }

    // publisher and placement param has to be set
    const params = internal.extractParams(bidRequest);
    if (!params || !params.publisher || !params.placement) {
      return false;
    }

    return true;
  },

  /**
   * Build real bid requests
   *
   * @param {BidRequest[]} validBidRequests
   * @param {BidderRequest} bidderRequest
   * @returns {Object[]}
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    const requests = [];

    // stop here on invalid or empty data
    if (!bidderRequest || !validBidRequests || isEmpty(validBidRequests)) {
      return requests;
    }

    // collect required data
    const auctionId = bidderRequest.auctionId;
    const pageUrl = internal.extractPageUrl(bidderRequest);
    const referrer = internal.extractReferrer(bidderRequest);
    const gdpr = internal.extractGdpr(bidderRequest);

    // group bid requests by publisher
    const groupedBidRequests = internal.groupBidRequestsByPublisher(validBidRequests);

    // build requests
    for (const publisher in groupedBidRequests) {
      const request = {
        url: internal.buildEndpointUrl(publisher),
        method: ENDPOINT_METHOD,
        data: {
          // TODO: fix auctionId leak: https://github.com/prebid/Prebid.js/issues/9781
          auctionId: auctionId,
          pageUrl: pageUrl,
          referrer: referrer,
          imp: []
        }
      };

      // add gdpr data
      if (gdpr) {
        request.data.gdpr = gdpr;
      }

      // handle multiple bids per request
      groupedBidRequests[publisher].forEach(bidRequest => {
        const bid = {
          bidId: bidRequest.bidId,
          transactionId: bidRequest.ortb2Imp?.ext?.tid,
          adUnitCode: bidRequest.adUnitCode,
          params: internal.extractParams(bidRequest)
        };

        // add banner config
        const bannerConfig = internal.extractBannerConfig(bidRequest);
        if (bannerConfig) {
          bid.banner = bannerConfig;
        }

        // add native config
        const nativeConfig = internal.extractNativeConfig(bidRequest);
        if (nativeConfig) {
          bid.native = nativeConfig;
        }

        // try to add default floor
        const floor = internal.getFloor(bidRequest, { mediaType: '*', size: '*' });
        if (floor) {
          bid.floorPrice = floor.floor;
          bid.floorCurrency = floor.currency;
        }

        request.data.imp.push(bid);
      });

      requests.push(request);
    }

    return requests;
  },

  /**
   * Handle bid response
   *
   * @param {Object} response
   * @returns {Object[]}
   */
  interpretResponse: (response) => {
    const bidResponses = [];

    // stop here on invalid or empty data
    if (!response?.body?.bids || isEmpty(response.body.bids)) {
      return bidResponses;
    }

    // parse multiple bids per response
    response.body.bids.forEach(bid => {
      if (!bid || !bid.bid || !bid.creative) {
        return;
      }

      const bidResponse = {
        requestId: bid.bid.bidId,
        cpm: bid.bid.price,
        netRevenue: bid.bid.net,
        currency: bid.bid.currency,
        ttl: bid.bid.ttl,
        creativeId: bid.creative.id,
        meta: {
          advertiserDomains: bid.creative.advertiserDomains
        }
      }

      if (bid.creative.html) {
        bidResponse.mediaType = BANNER;
        bidResponse.ad = bid.creative.html;
        bidResponse.width = bid.creative.width;
        bidResponse.height = bid.creative.height;
      }

      if (bid.creative.native) {
        bidResponse.mediaType = NATIVE;
        bidResponse.native = bid.creative.native;
      }

      bidResponses.push(bidResponse);
    });

    return bidResponses;
  }
};

registerBidder(spec);
