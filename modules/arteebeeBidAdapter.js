import * as utils from '../src/utils';
import {BANNER} from '../src/mediaTypes';
import {registerBidder} from '../src/adapters/bidderFactory';
import {config} from '../src/config';

const BIDDER_CODE = 'arteebee';

const DEFAULT_HOST = 'bidder.mamrtb.com';

const DEFAULT_SSP = 'arteebee';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bidRequest) {
    return 'params' in bidRequest && bidRequest.params.pub !== undefined &&
      bidRequest.params.source !== undefined;
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    var requests = [];

    for (let i = 0; i < validBidRequests.length; i++) {
      let prebidReq = makePrebidRequest(validBidRequests[i], bidderRequest);
      if (prebidReq) {
        requests.push(prebidReq);
      }
    }

    return requests;
  },
  interpretResponse: function (serverResponse, bidRequest) {
    var rtbResp = serverResponse.body;

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
          currency: 'USD',
          netRevenue: true,
          ttl: bid.exp,
          ad: bid.adm
        };
        bidResponses.push(bidResponse);
      }
    }
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent) {
    return [];
  }
}

registerBidder(spec);

function makePrebidRequest(req, bidderRequest) {
  var host = req.params.host || DEFAULT_HOST;
  var ssp = req.params.ssp || DEFAULT_SSP;

  var url = window.location.protocol + '//' + host + '/rtb/bid/' + ssp + '?type=json&register=0';

  const payload = makeRtbRequest(req, bidderRequest);
  const payloadString = JSON.stringify(payload);

  return {
    method: 'POST',
    url: url,
    data: payloadString
  };
}

function makeRtbRequest(req, bidderRequest) {
  var auctionId = req.bidderRequestId;

  var imp = [];
  imp.push(makeImp(req));

  var rtbReq = {
    'id': auctionId,
    'imp': imp,
    'site': makeSite(req),
    'device': makeDevice(),
    'at': 1,
    'tmax': config.getConfig('bidderTimeout')
  };

  if (config.getConfig('coppa') === true || req.params.coppa) {
    rtbReq.regs = {coppa: 1};
  }

  if (bidderRequest && bidderRequest.gdprConsent) {
    if ((typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') && bidderRequest.gdprConsent.gdprApplies) {
      if (!rtbReq.regs) {
        rtbReq.regs = {};
      }
      rtbReq.regs['ext'] = {'gdpr': 1};
    }
    if ((typeof bidderRequest.gdprConsent.consentString === 'string') && bidderRequest.gdprConsent.consentString) {
      rtbReq['user'] = {'ext': {'consent': bidderRequest.gdprConsent.consentString}};
    }
  }

  if (req.params.test) {
    rtbReq.test = 1;
  }

  return rtbReq;
}

function makeImp(req) {
  var imp = {
    'id': req.bidId,
    'tagid': req.placementCode
  };

  if (window.location.protocol === 'https:') {
    imp.secure = 1;
  }

  imp.banner = makeBanner(req);

  return imp;
}

function makeBanner(req) {
  var format = [];

  for (let i = 0; i < req.sizes.length; i++) {
    format.push({
      w: req.sizes[i][0],
      h: req.sizes[i][1]
    });
  }
  return {
    'format': format
  };
}

function makeSite(req) {
  var params = req.params;

  var site = {
    'id': params.source,
    'page': utils.getTopWindowUrl(),
    'ref': utils.getTopWindowReferrer(),
    'publisher': makePublisher(req)
  };

  return site;
}

function makePublisher(req) {
  var params = req.params;

  var publisher = {
    'id': params.pub,
    'domain': getDomain(config.getConfig('publisherDomain'))
  };

  return publisher;
}

function getDomain(url) {
  var a = document.createElement('a');
  a.href = url;

  return a.host;
}

function makeDevice() {
  var device = {
    'ua': 'caller',
    'ip': 'caller',
    'js': 1
  };

  return device;
}
