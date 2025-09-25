import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = 'floxis';

const DEFAULT_REGION = 'us';
const DEFAULT_PARTNER = 'floxis';
const DEFAULT_BID_TTL = 300;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;

function getFloxisUrl(partner, region = DEFAULT_REGION) {
  return `https://${partner}-${region}.floxis.tech/pbjs`;
}

function buildRequests(validBidRequests = [], bidderRequest = {}) {
  if (!validBidRequests || !validBidRequests.length) {
    return [];
  }
  const firstBid = validBidRequests[0];
  const partner = firstBid?.params?.partner || DEFAULT_PARTNER;
  const region = firstBid?.params?.region || DEFAULT_REGION;
  const converter = ortbConverter({
    context: {
      netRevenue: DEFAULT_NET_REVENUE,
      ttl: DEFAULT_BID_TTL,
      currency: DEFAULT_CURRENCY
    },
    imp(buildImp, bidRequest, context) {
      let imp = buildImp(bidRequest, context);
      imp.secure = bidRequest.ortb2Imp?.secure ?? 1;
      // Floors Module support
      let floorInfo;
      if (typeof bidRequest.getFloor === 'function') {
        try {
          floorInfo = bidRequest.getFloor({
            currency: DEFAULT_CURRENCY,
            mediaType: '*',
            size: '*'
          });
        } catch (e) { }
      }
      const floor = floorInfo && typeof floorInfo.floor === 'number' ? floorInfo.floor : bidRequest.params?.bidFloor;
      const floorCur = floorInfo && typeof floorInfo.currency === 'string' ? floorInfo.currency : DEFAULT_CURRENCY;
      if (typeof floor === 'number' && !isNaN(floor)) {
        imp.bidfloor = floor;
        imp.bidfloorcur = floorCur;
      }
      // ORTB blocking params (imp-level)
      if (Array.isArray(bidRequest.params?.battr)) {
        imp.banner = imp.banner || {};
        imp.banner.battr = bidRequest.params.battr;
      }
      return imp;
    },
    request(buildRequest, imps, bidderRequest, context) {
      const req = buildRequest(imps, bidderRequest, context);
      req.at = 1;
      req.ext = req.ext || {};
      req.ext.name = 'prebidjs';
      req.ext.version = '$prebid.version$';
      req.site = req.site || {};
      req.site.ext = req.site.ext || {};
      req.site.ext.placementId = validBidRequests[0]?.params?.placementId;
      // ORTB blocking params (request-level)
      const firstParams = validBidRequests[0]?.params || {};
      if (Array.isArray(firstParams.bcat)) {
        req.bcat = firstParams.bcat;
      }
      if (Array.isArray(firstParams.badv)) {
        req.badv = firstParams.badv;
      }
      if (Array.isArray(firstParams.bapp)) {
        req.bapp = firstParams.bapp;
      }
      return req;
    }
  });

  const ortbRequest = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });
  return [{
    method: 'POST',
    url: getFloxisUrl(partner, region),
    data: ortbRequest,
    converter, // store converter instance for later use
    options: {
      withCredentials: true,
      contentType: 'application/json;charset=UTF-8',
    }
  }];
}

// User sync not supported initially
function getUserSyncs() {
  return [];
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid: function (bid) {
    const params = bid.params || {};
    if (typeof params.partner !== 'string' || !params.partner.length || !Number.isInteger(params.placementId)) {
      return false;
    }
    // Must have at least one media type
    if (!bid.mediaTypes || (!bid.mediaTypes.banner && !bid.mediaTypes.video && !bid.mediaTypes.native)) {
      return false;
    }
    // Banner size validation
    if (bid.mediaTypes.banner && Array.isArray(bid.mediaTypes.banner.sizes)) {
      if (!bid.mediaTypes.banner.sizes.every(size => Array.isArray(size) && size.length === 2 && size.every(Number.isInteger))) {
        return false;
      }
    }
    // Video size validation
    if (bid.mediaTypes.video && Array.isArray(bid.mediaTypes.video.playerSize)) {
      if (!bid.mediaTypes.video.playerSize.every(size => Array.isArray(size) && size.length === 2 && size.every(Number.isInteger))) {
        return false;
      }
    }
    return true;
  },
  buildRequests,
  interpretResponse(response, request) {
    // Use the same converter instance and request object as in buildRequests
    if (!request.converter) {
      throw new Error('Missing converter instance on request object');
    }
    return request.converter.fromORTB({ request: request.data, response: response.body }).bids;
  },
  getUserSyncs,
  onBidWon: function (bid) {
    if (bid.burl) {
      utils.triggerPixel(bid.burl);
    }
    if (bid.nurl) {
      utils.triggerPixel(bid.nurl);
    }
  },
};

registerBidder(spec);
