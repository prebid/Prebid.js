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
    imp.tagid ||= 'prebid_' + imp.ext.gpid;

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
    const placementId = bidRequests[0].params.placementId;
    const data = converter.toORTB({bidRequests, bidderRequest});
    data.device.js = 1;
    return [{
      method: 'POST',
      url: ENDPOINT_URL + '?placementId=' + placementId,
      data
    }];
  },

  interpretResponse(response, request) {
    response.body.seatbid.forEach(sb => sb.bid.forEach(bid => {
      bid.crid = 'test-prebidjs-adbro.com';
      bid.adomain = ['adbro.com'];
      bid.price = 0.1;
    }));
    const result = converter.fromORTB({request: request.data, response: response.body}).bids;
    return result;
  },

  onBidWon: function(bid) {
    if (bid.burl) triggerPixel(bid.burl);
  },
};

registerBidder(spec);
