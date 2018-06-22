import * as utils from 'src/utils';
import { BANNER } from 'src/mediaTypes';
import { registerBidder } from 'src/adapters/bidderFactory';
import includes from 'core-js/library/fn/array/includes';

const BIDDER_CODE = 'rtbhouse';
const REGIONS = ['prebid-eu', 'prebid-us', 'prebid-asia'];
const ENDPOINT_URL = 'creativecdn.com/bidder/prebid/bids';
const DEFAULT_CURRENCY_ARR = ['USD']; // NOTE - USD is the only supported currency right now; Hardcoded for bids

/**
 * Helpers
 */

function buildEndpointUrl(region) {
  return 'https://' + region + '.' + ENDPOINT_URL;
}

/**
 * Produces an OpenRTBImpression from a slot config.
 */
function mapImpression(slot) {
  return {
    id: slot.bidId,
    banner: mapBanner(slot),
    tagid: slot.adUnitCode.toString(),
  };
}

/**
 * Produces an OpenRTB Banner object for the slot given.
 */
function mapBanner(slot) {
  return {
    w: slot.sizes[0][0],
    h: slot.sizes[0][1],
    format: mapSizes(slot.sizes)
  };
}

/**
 * Produce openRTB banner.format object
 */
function mapSizes(slot_sizes) {
  const format = [];
  slot_sizes.forEach(elem => {
    format.push({
      w: elem[0],
      h: elem[1]
    });
  });
  return format;
}

/**
 * Produces an OpenRTB site object.
 */
function mapSite(validRequest) {
  const pubId = validRequest && validRequest.length > 0 ? validRequest[0].params.publisherId : 'unknown';
  return {
    publisher: {
      id: pubId.toString(),
    },
    page: utils.getTopWindowUrl(),
    name: utils.getOrigin()
  }
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    return !!(includes(REGIONS, bid.params.region) && bid.params.publisherId);
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const request = {
      id: validBidRequests[0].auctionId,
      imp: validBidRequests.map(slot => mapImpression(slot)),
      site: mapSite(validBidRequests),
      cur: DEFAULT_CURRENCY_ARR,
      test: validBidRequests[0].params.test || 0
    };
    if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) {
      const consentStr = (bidderRequest.gdprConsent.consentString)
        ? bidderRequest.gdprConsent.consentString.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '';
      const gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
      request.regs = {ext: {gdpr: gdpr}};
      request.user = {ext: {consent: consentStr}};
    };

    return {
      method: 'POST',
      url: buildEndpointUrl(validBidRequests[0].params.region),
      data: JSON.stringify(request)
    };
  },
  interpretResponse: function (serverResponse, originalRequest) {
    serverResponse = serverResponse.body;
    const bids = [];

    if (utils.isArray(serverResponse)) {
      serverResponse.forEach(serverBid => {
        if (serverBid.price !== 0) {
          const bid = {
            requestId: serverBid.impid,
            mediaType: BANNER,
            cpm: serverBid.price,
            creativeId: serverBid.adid,
            ad: serverBid.adm,
            width: serverBid.w,
            height: serverBid.h,
            ttl: 55,
            netRevenue: true,
            currency: 'USD'
          };
          bids.push(bid);
        }
      });
    }
    return bids;
  }
};

registerBidder(spec);
