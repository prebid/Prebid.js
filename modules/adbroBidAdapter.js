import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { isArray, isInteger, triggerPixel } from '../src/utils.js';

const BIDDER_CODE = 'adbro';
const GVLID = 1316;
const ENDPOINT_URL = 'https://jp.bidbro.me/pbjs';

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 30,
    mediaType: BANNER,
    currency: 'USD',
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    imp.displaymanager ||= 'Prebid.js';
    imp.displaymanagerver ||= '$prebid.version$';
    imp.tagid ||= imp.ext?.gpid || bidRequest.adUnitCode;

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    request.device.js = 1;

    return request;
  },
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  isBidRequestValid(bid) {
    const { params, mediaTypes } = bid;
    return Boolean(
      params && params.placementId && isInteger(Number(params.placementId)) &&
      mediaTypes && mediaTypes[BANNER] && mediaTypes[BANNER].sizes &&
      isArray(mediaTypes[BANNER].sizes) && mediaTypes[BANNER].sizes.length > 0
    );
  },

  buildRequests(bidRequests, bidderRequest) {
    const placements = {};
    const result = [];
    bidRequests.forEach(bidRequest => {
      const { placementId } = bidRequest.params;
      placements[placementId] ||= [];
      placements[placementId].push(bidRequest);
    });
    Object.keys(placements).forEach(function(id) {
      const data = converter.toORTB({
        bidRequests: placements[id],
        bidderRequest: bidderRequest,
      });
      result.push({
        method: 'POST',
        url: ENDPOINT_URL + '?placementId=' + id,
        data
      });
    });
    return result;
  },

  interpretResponse(response, request) {
    if (!response.hasOwnProperty('body') || !response.body.hasOwnProperty('seatbid')) {
      return [];
    }
    const result = converter.fromORTB({
      request: request.data,
      response: response.body,
    }).bids;
    return result;
  },

  onBidBillable(bid) {
    if (bid.burl) triggerPixel(bid.burl);
  },
};

registerBidder(spec);
