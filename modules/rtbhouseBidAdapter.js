import * as utils from 'src/utils';
import { BANNER } from 'src/mediaTypes';
import { registerBidder } from 'src/adapters/bidderFactory';
import includes from 'core-js/library/fn/array/includes';

const BIDDER_CODE = 'rtbhouse';
const REGIONS = ['prebid-eu', 'prebid-us', 'prebid-asia'];
const ENDPOINT_URL = 'creativecdn.com/bidder/prebid/bids';
const DEFAULT_CURRENCY_ARR = ['USD']; // NOTE - USD is the only supported currency right now; Hardcoded for bids
const TTL = 55;

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
    }

    return {
      method: 'POST',
      url: 'https://' + validBidRequests[0].params.region + '.' + ENDPOINT_URL,
      data: JSON.stringify(request)
    };
  },
  interpretResponse: function (serverResponse, originalRequest) {
    const responseBody = serverResponse.body;
    if (!utils.isArray(responseBody)) {
      return [];
    }

    const bids = [];
    if (utils.isArray(responseBody)) {
      responseBody.forEach(serverBid => {
        if (serverBid.price === 0) {
          return;
        }
        bids.push({
          requestId: serverBid.impid,
          mediaType: BANNER,
          cpm: serverBid.price,
          creativeId: serverBid.adid,
          ad: serverBid.adm,
          width: serverBid.w,
          height: serverBid.h,
          ttl: TTL,
          netRevenue: true,
          currency: 'USD'
        });
      });
    }
    return bids;
  }
};
registerBidder(spec);

/**
 * @param {object} slot Ad Unit Params by Prebid
 * @returns {object} Imp by OpenRTB 2.5 §3.2.4
 */
function mapImpression(slot) {
  return {
    id: slot.bidId,
    banner: mapBanner(slot),
    tagid: slot.adUnitCode.toString()
  };
}

/**
 * @param {object} slot Ad Unit Params by Prebid
 * @returns {object} Banner by OpenRTB 2.5 §3.2.6
 */
function mapBanner(slot) {
  return {
    w: slot.sizes[0][0],
    h: slot.sizes[0][1],
    format: slot.sizes.map(size => ({
      w: size[0],
      h: size[1]
    }))
  };
}

/**
 * @param {object} slot Ad Unit Params by Prebid
 * @returns {object} Site by OpenRTB 2.5 §3.2.13
 */
function mapSite(slot) {
  const pubId = slot && slot.length > 0
    ? slot[0].params.publisherId
    : 'unknown';
  return {
    publisher: {
      id: pubId.toString(),
    },
    page: utils.getTopWindowUrl(),
    name: utils.getOrigin()
  }
}
