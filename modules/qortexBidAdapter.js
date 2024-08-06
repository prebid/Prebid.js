import {
  isArray, getAdUnitSizes, parseGPTSingleSizeArrayToRtbSize, getDNT
} from '../src/utils.js';
import {BANNER} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';

const BIDDER_CODE = 'qortex';
const DEFAULT_API_URL = 'https://dev-demand.qortex.ai';

export const spec = {
  code: BIDDER_CODE,
  /**
   * Verifies required params to determine given bid request is valid.
   * @param {BidRequest} bidRequest The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bidRequest) {
    return 'params' in bidRequest &&
      'groupId' in bidRequest.params &&
      bidRequest.params?.groupId?.length > 0 && 'banner' in bidRequest.mediaTypes;
  },
  /**
   * build a valid request to be handled by catapultx demand api
   * @return Array Info describing the request to the server.
   * @param {BidRequest[]} bidRequests
   * @param {BidderRequest} bidderRequest
   * @returns {ServerRequest}
   */
  buildRequests: function (bidRequests, bidderRequest) {
    const secure = bidderRequest?.refererInfo?.page.indexOf('https:') === 0 ? 1 : 0;
    const imps = bidRequests.map(bidRequest => buildImp(bidRequest, secure));
    const {qxData, apiUrl, groupId} = bidRequests[0].params;
    const request = buildMonetizeRequest(imps, bidderRequest, qxData, groupId);
    return {
      method: 'POST',
      url: `${apiUrl || DEFAULT_API_URL}/api/v1/monetize/resources/prebid`,
      data: JSON.stringify(request),
      options: {withCredentials: false, contentType: 'application/json'}
    };
  },

  /**
   * Parse response from catapultx demand api
   * @param {ServerResponse} serverResponse
   * @returns {Bid[]}
   */
  interpretResponse: function (serverResponse) {
    let response = serverResponse.body;
    if (!response.seatbid || !response?.seatbid[0]) {
      return [];
    }
    let rtbBids = response.seatbid
      .map(seatbid => seatbid.bid)
      .reduce((a, b) => a.concat(b), []);

    return rtbBids.map(rtbBid => {
      let prBid = {
        requestId: rtbBid.impid,
        cpm: rtbBid.price,
        creativeId: rtbBid.crid,
        currency: response.cur || 'USD',
        ttl: 360,
        netRevenue: true,
        meta: {}
      };
      prBid.mediaType = BANNER;
      prBid.width = rtbBid.w;
      prBid.height = rtbBid.h;
      prBid.ad = rtbBid.adm;
      if (isArray(rtbBid?.adomain)) {
        prBid.meta.advertiserDomains = rtbBid.adomain;
      }
      if (isArray(rtbBid?.cat) && rtbBid?.cat?.length > 0) {
        prBid.meta.primaryCatId = rtbBid.cat[0];
        if (rtbBid.cat.length > 1) {
          prBid.meta.secondaryCatIds = rtbBid.cat.slice(1);
        }
      }
      return prBid;
    });
  },

};

registerBidder(spec);

/**
 * builds PrebidRequest object for catapultx monetize/prebid endpoint
 * @returns {String}
 */
function buildMonetizeRequest(imps, bidderRequest, qxData, groupId) {
  let {gdprConsent, auctionId, timeout, uspConsent, ortb2} = bidderRequest;
  let coppa = config.getConfig('coppa');
  let req = {
    id: auctionId,
    imp: imps,
    tmax: timeout,
    coppa: 0,
    groupId: groupId
  };
  if (getDNT()) {
    req.dnt = 1;
  }
  if (coppa !== undefined && coppa === true) {
    req.coppa = 1;
  }
  if (qxData) {
    req.qxData = qxData;
  }
  if (gdprConsent) {
    if (gdprConsent.gdprApplies !== undefined) {
      req.GDPRApplies = gdprConsent.gdprApplies ? 1 : 0;
    }
    if (gdprConsent.consentString !== undefined) {
      req.TCString = gdprConsent.consentString
    }
  }
  if (uspConsent) {
    req.USPString = uspConsent;
  }
  // this will need to be santized on either end
  if (ortb2?.site?.content) {
    req.content = ortb2?.site?.content
  }
  return req;
}

/**
 * generates rtb Imp object from bidrequest
 * @param {BidRequest} bidRequest
 * @param {Number} secure
 * @returns Imp object
 */
function buildImp(bidRequest, secure) {
  const imp = {
    'id': bidRequest.bidId,
    'tagid': bidRequest.adUnitCode,
    'secure': secure
  };
  var sizes = [];
  sizes = getAdUnitSizes(bidRequest);
  imp.banner = {
    format: sizes.map(wh => parseGPTSingleSizeArrayToRtbSize(wh)),
    topframe: 0
  };
  imp.bidfloor = getBidFloor(bidRequest, BANNER, sizes) || 0;
  if (bidRequest.ortb2Imp?.ext) {
    imp.ext = bidRequest.ortb2Imp.ext;
  }
  return imp;
}

function getBidFloor(bid, mediaType, sizes) {
  var floor;
  var size = sizes.length === 1 ? sizes[0] : '*';
  if (typeof bid.getFloor === 'function') {
    const floorInfo = bid.getFloor({currency: 'USD', mediaType, size});
    if (typeof floorInfo === 'object' && floorInfo.currency === 'USD' && !isNaN(parseFloat(floorInfo.floor))) {
      floor = parseFloat(floorInfo.floor);
    }
  }
  return floor;
}
