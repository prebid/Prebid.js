import * as utils from '../src/utils';
import {BANNER} from '../src/mediaTypes';
import {registerBidder} from '../src/adapters/bidderFactory';
import {config} from '../src/config';

const BIDDER_CODE = 'rexrtb';
const DEFAULT_HOST = 'bid.rxrtb.com';
const AUCTION_TYPE = 2;
const RESPONSE_TTL = 900;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bidRequest) {
    return 'params' in bidRequest && bidRequest.params.id !== undefined && utils.isInteger(bidRequest.params.id) && bidRequest.params.token !== undefined;
  },
  buildRequests: function (validBidRequests) {
    var requests = [];
    for (let i = 0; i < validBidRequests.length; i++) {
      let prebidReq = makePrebidRequest(validBidRequests[i]);
      if (prebidReq) {
        requests.push(prebidReq);
      }
    }

    return requests;
  },
  interpretResponse: function (serverResponse, bidRequest) {
    let rtbResp = serverResponse.body;
    if ((!rtbResp) || (!rtbResp.seatbid)) {
      return [];
    }
    let bidResponses = [];
    for (let i = 0; i < rtbResp.seatbid.length; i++) {
      let seatbid = rtbResp.seatbid[i];
      for (let j = 0; j < seatbid.bid.length; j++) {
        let bid = seatbid.bid[j];
        let bidResponse = {
          requestId: bid.impid,
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          mediaType: BANNER,
          creativeId: bid.crid,
          currency: rtbResp.cur || 'USD',
          netRevenue: true,
          ttl: bid.exp || RESPONSE_TTL,
          ad: bid.adm
        };
        bidResponses.push(bidResponse);
      }
    }
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    return [];
  }
}

registerBidder(spec);

function getDomain(url) {
  var a = document.createElement('a');
  a.href = url;
  return a.host;
}

function makePrebidRequest(req) {
  let host = req.params.host || DEFAULT_HOST;
  let url = 'https://' + host + '/dsp?id=' + req.params.id + '&token=' + req.params.token;
  let reqData = makeRtbRequest(req);
  return {
    method: 'POST',
    url: url,
    data: JSON.stringify(reqData)
  };
}

function makeRtbRequest(req) {
  let imp = [];
  imp.push(makeImp(req));
  return {
    'id': req.auctionId,
    'imp': imp,
    'site': makeSite(req),
    'device': makeDevice(),
    'hb': 1,
    'at': req.params.at || AUCTION_TYPE,
    'cur': ['USD'],
    'badv': req.params.badv || '',
    'bcat': req.params.bcat || '',
  };
}

function makeImp(req) {
  let imp = {
    'id': req.bidId,
    'tagid': req.adUnitCode,
    'banner': makeBanner(req)
  };
  if (req.params.bidfloor && isFinite(req.params.bidfloor)) {
    imp.bidfloor = req.params.bidfloor
  }
  return imp;
}

function makeBanner(req) {
  let format = [];
  let banner = {};
  for (let i = 0; i < req.sizes.length; i++) {
    format.push({
      w: req.sizes[i][0],
      h: req.sizes[i][1]
    });
  }
  banner.format = format;
  if (req.params.pos && utils.isInteger(req.params.pos)) {
    banner.pos = req.params.pos;
  }
  return banner;
}

function makeSite(req) {
  let domain = getDomain(config.getConfig('publisherDomain'));
  return {
    'id': req.params.source || domain,
    'domain': domain,
    'page': utils.getTopWindowUrl(),
    'ref': utils.getTopWindowReferrer()
  };
}

function makeDevice() {
  return {
    'ua': window.navigator.userAgent || '',
    'ip': 1
  };
}
