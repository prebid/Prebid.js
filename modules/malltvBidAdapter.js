import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const BIDDER_CODE = 'malltv';
const ENDPOINT_URL = 'https://central.mall.tv/bid';
const DIMENSION_SEPARATOR = 'x';
const SIZE_SEPARATOR = ';';
const BISKO_ID = 'biskoId';
const STORAGE_ID = 'bisko-sid';
const SEGMENTS = 'biskoSegments';
const storage = getStorageManager({bidderCode: BIDDER_CODE});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params.propertyId && bid.params.placementId);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const storageId = storage.localStorageIsEnabled() ? storage.getDataFromLocalStorage(STORAGE_ID) || '' : '';
    const biskoId = storage.localStorageIsEnabled() ? storage.getDataFromLocalStorage(BISKO_ID) || '' : '';
    const segments = storage.localStorageIsEnabled() ? JSON.parse(storage.getDataFromLocalStorage(SEGMENTS)) || [] : [];

    let propertyId = '';
    let pageViewGuid = '';
    let bidderRequestId = '';
    let url = '';
    let contents = [];
    let data = {};
    let auctionId = bidderRequest ? bidderRequest.auctionId : '';
    let gdrpApplies = true;
    let gdprConsent = '';
    let placements = validBidRequests.map(bidRequest => {
      if (!propertyId) { propertyId = bidRequest.params.propertyId; }
      if (!pageViewGuid && bidRequest.params) { pageViewGuid = bidRequest.params.pageViewGuid || ''; }
      if (!bidderRequestId) { bidderRequestId = bidRequest.bidderRequestId; }
      // TODO: is 'page' the right value here?
      if (!url && bidderRequest) { url = bidderRequest.refererInfo.page; }
      if (!contents.length && bidRequest.params.contents && bidRequest.params.contents.length) { contents = bidRequest.params.contents; }
      if (Object.keys(data).length === 0 && bidRequest.params.data && Object.keys(bidRequest.params.data).length !== 0) { data = bidRequest.params.data; }
      if (bidderRequest && bidRequest.gdprConsent) { gdrpApplies = bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies ? bidderRequest.gdprConsent.gdprApplies : true; }
      if (bidderRequest && bidRequest.gdprConsent) { gdprConsent = bidderRequest.gdprConsent && bidderRequest.gdprConsent.consentString ? bidderRequest.gdprConsent.consentString : ''; }
      let adUnitId = bidRequest.adUnitCode;
      let placementId = bidRequest.params.placementId;
      let sizes = generateSizeParam(bidRequest.sizes);

      return {
        sizes: sizes,
        adUnitId: adUnitId,
        placementId: placementId,
        bidid: bidRequest.bidId,
        count: bidRequest.params.count,
        skipTime: bidRequest.params.skipTime
      };
    });

    let body = {
      // TODO: fix auctionId leak: https://github.com/prebid/Prebid.js/issues/9781
      auctionId: auctionId,
      propertyId: propertyId,
      pageViewGuid: pageViewGuid,
      storageId: storageId,
      biskoId: biskoId,
      segments: segments,
      url: url,
      requestid: bidderRequestId,
      placements: placements,
      contents: contents,
      data: data,
      gdpr_applies: gdrpApplies,
      gdpr_consent: gdprConsent,
    };

    return [{
      method: 'POST',
      url: ENDPOINT_URL,
      data: body
    }];
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse) {
    const responses = serverResponse.body;
    const bidResponses = [];
    for (var i = 0; i < responses.length; i++) {
      const bidResponse = {
        requestId: responses[i].BidId,
        cpm: responses[i].CPM,
        width: responses[i].Width,
        height: responses[i].Height,
        creativeId: responses[i].CreativeId,
        currency: responses[i].Currency,
        netRevenue: responses[i].NetRevenue,
        ttl: responses[i].TTL,
        referrer: responses[i].Referrer,
        ad: responses[i].Ad,
        vastUrl: responses[i].VastUrl,
        mediaType: responses[i].MediaType,
        meta: {
          advertiserDomains: Array.isArray(responses[i].ADomain) ? responses[i].ADomain : []
        }
      };
      bidResponses.push(bidResponse);
    }
    return bidResponses;
  }
};

/**
 * Generate size param for bid request using sizes array
 *
 * @param {Array} sizes Possible sizes for the ad unit.
 * @return {string} Processed sizes param to be used for the bid request.
 */
function generateSizeParam(sizes) {
  return sizes.map(size => size.join(DIMENSION_SEPARATOR)).join(SIZE_SEPARATOR);
}

registerBidder(spec);
