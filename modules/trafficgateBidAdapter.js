import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {deepAccess, mergeDeep, convertTypes} from '../src/utils.js';

const BIDDER_CODE = 'trafficgate';
const URL = 'https://[HOST].bc-plugin.com/prebidjs'

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  transformBidParams,
  isBannerBid
};

registerBidder(spec)

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    mergeDeep(imp, {
      ext: {
        bidder: {
          placementId: bidRequest.params.placementId,
          host: bidRequest.params.host
        }
      }
    });
    if (bidRequest.params.customFloor && !imp.bidfloor) {
      imp.bidfloor = bidRequest.params.customFloor;
    }
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    mergeDeep(req, {
      at: 1,
    })
    const bid = context.bidRequests[0];
    if (bid.params.test) {
      req.test = 1
    }
    return req;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    if (bid.ext) {
      bidResponse.meta.networkId = bid.ext.networkId;
      bidResponse.meta.advertiserDomains = bid.ext.advertiserDomains;
    }
    return bidResponse;
  },
  response(buildResponse, bidResponses, ortbResponse, context) {
    const response = buildResponse(bidResponses, ortbResponse, context);
    return response.bids
  },
  overrides: {
    imp: {
      bidfloor(setBidFloor, imp, bidRequest, context) {
        const floor = {};
        setBidFloor(floor, bidRequest, {...context, currency: 'USD'});
        if (floor.bidfloorcur === 'USD') {
          Object.assign(imp, floor);
        }
      },
      video(orig, imp, bidRequest, context) {
        if (FEATURES.VIDEO) {
          let videoParams = bidRequest.mediaTypes[VIDEO];
          if (videoParams) {
            videoParams = Object.assign({}, videoParams, bidRequest.params.video);
            bidRequest = {...bidRequest, mediaTypes: {[VIDEO]: videoParams}}
          }
          orig(imp, bidRequest, context);
          if (imp.video && videoParams?.context === 'outstream') {
            imp.video.placement = imp.video.placement || 4;
          }
        }
      }
    }
  }
});

function transformBidParams(params, isOpenRtb) {
  return convertTypes({
    'customFloor': 'number',
    'placementId': 'number',
    'host': 'string'
  }, params);
}

function isBidRequestValid(bidRequest) {
  const isValid = bidRequest.params.placementId && bidRequest.params.host;
  if (!isValid) {
    return false
  }
  if (isBannerBid(bidRequest)) {
    return deepAccess(bidRequest, 'mediaTypes.banner.sizes.length') > 0;
  }
  return true
}

function buildRequests(bids, bidderRequest) {
  let videoBids = bids.filter(bid => isVideoBid(bid));
  let bannerBids = bids.filter(bid => isBannerBid(bid));
  let requests = bannerBids.length ? [createRequest(bannerBids, bidderRequest, BANNER)] : [];
  videoBids.forEach(bid => {
    requests.push(createRequest([bid], bidderRequest, VIDEO));
  });
  return requests;
}

function createRequest(bidRequests, bidderRequest, mediaType) {
  return {
    method: 'POST',
    url: URL.replace('[HOST]', bidRequests[0].params.host),
    data: converter.toORTB({bidRequests, bidderRequest, context: {mediaType}})
  }
}

function isVideoBid(bid) {
  return !!deepAccess(bid, 'mediaTypes.video');
}

function isBannerBid(bid) {
  return !!deepAccess(bid, 'mediaTypes.banner');
}

function interpretResponse(resp, req) {
  if (!resp.body) {
    resp.body = {nbr: 0};
  }
  return converter.fromORTB({request: req.data, response: resp.body});
}

export const spec2 = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function (bid) {
    return !!(bid.bidId && bid.params && parseInt(bid.params.placementId) && bid.params.host)
  },
}
