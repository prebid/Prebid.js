import {deepAccess, getAdUnitSizes} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

export const BIDDER_CODE = 'aduptech';
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
    if (bidderRequest && bidderRequest.gdprConsent) {
      return {
        consentString: bidderRequest.gdprConsent.consentString,
        consentRequired: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : true
      };
    }

    return null;
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
    const sizes = getAdUnitSizes(bidRequest);
    if (Array.isArray(sizes) && sizes.length > 0) {
      return { sizes: sizes };
    }

    return null;
  },

  /**
   * Extracts native config from given bidRequest
   *
   * @param {BidRequest} bidRequest
   * @returns {null|Object.<string, *>}
   */
  extractNativeConfig: (bidRequest) => {
    if (bidRequest && deepAccess(bidRequest, 'mediaTypes.native')) {
      return bidRequest.mediaTypes.native;
    }

    return null;
  },

  /**
   * Extracts the bidder params from given bidRequest
   *
   * @param {BidRequest} bidRequest
   * @returns {null|Object.<string, *>}
   */
  extractParams: (bidRequest) => {
    if (bidRequest && bidRequest.params) {
      return bidRequest.params
    }

    return null;
  },

  /**
   * Extracts the floor price params from given bidRequest
   *
   * @param {BidRequest} bidRequest
   * @returns {undefined|float}
   */
  extractFloorPrice: (bidRequest) => {
    let floorPrice;
    if (bidRequest && bidRequest.params && bidRequest.params.floor) {
      // if there is a manual floorPrice set
      floorPrice = !isNaN(parseInt(bidRequest.params.floor)) ? bidRequest.params.floor : undefined;
    }
    if (typeof bidRequest.getFloor === 'function') {
      // use prebid floor module
      let floorInfo;
      try {
        floorInfo = bidRequest.getFloor();
      } catch (e) {}
      floorPrice = typeof floorInfo === 'object' && !isNaN(parseInt(floorInfo.floor)) ? floorInfo.floor : floorPrice;
    }

    return floorPrice;
  },

  /**
   * Group given array of bidRequests by params.publisher
   *
   * @param {BidRequest[]} bidRequests
   * @returns {Object.<string, BidRequest>}
   */
  groupBidRequestsByPublisher: (bidRequests) => {
    const groupedBidRequests = {};

    if (!bidRequests || bidRequests.length === 0) {
      return groupedBidRequests;
    }

    bidRequests.forEach((bidRequest) => {
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
    if (!bidderRequest || !validBidRequests || validBidRequests.length === 0) {
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
      groupedBidRequests[publisher].forEach((bidRequest) => {
        const bid = {
          bidId: bidRequest.bidId,
          transactionId: bidRequest.transactionId,
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

        // add floor price
        const floorPrice = internal.extractFloorPrice(bidRequest);
        if (floorPrice) {
          bid.floorPrice = floorPrice;
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
    if (!response || !deepAccess(response, 'body.bids') || response.body.bids.length === 0) {
      return bidResponses;
    }

    // parse multiple bids per response
    response.body.bids.forEach((bid) => {
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
