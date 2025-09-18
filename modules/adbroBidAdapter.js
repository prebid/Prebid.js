import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { triggerPixel } from '../src/utils.js';

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
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: (bid) => {
    const { params, mediaTypes } = bid;
    return Boolean(
      params && params.placementId &&
      mediaTypes && mediaTypes[BANNER] && mediaTypes[BANNER].sizes
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
      data.device.js = 1;
      result.push({
        method: 'POST',
        url: ENDPOINT_URL + '?placementId=' + id,
        data
      });
    });
    return result;
  },

  interpretResponse(response, request) {
    response.body.seatbid.forEach(sb => sb.bid.forEach(bid => {
      bid.crid = 'pbjs-1234';
      bid.adomain = ['adbro.com'];
      bid.price = 0.1;
    }));
    const result = converter.fromORTB({request: request.data, response: response.body}).bids;
    return result;
  },

  onBidBillable: function(bid) {
    if (bid.burl) triggerPixel(bid.burl);
  },
};

registerBidder(spec);
