import * as utils from '../src/utils';
import { BANNER } from '../src/mediaTypes';
import {registerBidder} from '../src/adapters/bidderFactory';
import find from 'core-js/library/fn/array/find';

const VERSION = '1.1';

/**
 * Adapter for requesting bids from andbeyond white-label display platform
 */
export const spec = {

  code: 'andbeyond',
  aliases: ['headbidding'],
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function(bidRequest) {
    return 'params' in bidRequest && typeof bidRequest.params.host !== 'undefined' &&
      'zoneId' in bidRequest.params && !isNaN(Number(bidRequest.params.zoneId));
  },
  buildRequests: function(bidRequests) {
    let auctionId;
    let dispatch = bidRequests.map(buildImp)
      .reduce((acc, curr, index) => {
        let bidRequest = bidRequests[index];
        let zoneId = bidRequest.params.zoneId;
        let host = bidRequest.params.host;
        acc[host] = acc[host] || {};
        acc[host][zoneId] = acc[host][zoneId] || [];
        acc[host][zoneId].push(curr);
        auctionId = bidRequest.bidderRequestId;
        return acc;
      }, {});
    let requests = [];
    Object.keys(dispatch).forEach(host => {
      Object.keys(dispatch[host]).forEach(zoneId => {
        const request = buildRtbRequest(dispatch[host][zoneId], auctionId);
        requests.push({
          method: 'GET',
          url: `https://${host}/rtbg`,
          data: {
            zone: Number(zoneId),
            ad_type: 'rtb',
            v: VERSION,
            r: JSON.stringify(request)
          }
        });
      });
    });
    return requests;
  },
  interpretResponse: function(serverResponse, request) {
    let response = serverResponse.body;
    if (!response.seatbid) {
      return [];
    }

    let rtbRequest = JSON.parse(request.data.r);
    let rtbImps = rtbRequest.imp;
    let rtbBids = response.seatbid
      .map(seatbid => seatbid.bid)
      .reduce((a, b) => a.concat(b), []);

    return rtbBids.map(rtbBid => {
      let imp = find(rtbImps, imp => imp.id === rtbBid.impid);
      let prBid = {
        requestId: rtbBid.impid,
        cpm: rtbBid.price,
        creativeId: rtbBid.crid,
        currency: 'USD',
        ttl: 360,
        netRevenue: true
      };
      if ('banner' in imp) {
        prBid.mediaType = BANNER;
        prBid.width = rtbBid.w;
        prBid.height = rtbBid.h;
        prBid.ad = formatAdMarkup(rtbBid);
      }
      return prBid;
    });
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    if (!syncOptions.iframeEnabled || !serverResponses || serverResponses.length === 0) {
      return [];
    }
    return serverResponses.filter(rsp => rsp.body && rsp.body.ext && rsp.body.ext.adk_usersync)
      .map(rsp => rsp.body.ext.adk_usersync)
      .reduce((a, b) => a.concat(b), [])
      .map(syncUrl => ({type: 'iframe', url: syncUrl}));
  }
};

registerBidder(spec);

/**
 *  Builds parameters object for single impression
 */
function buildImp(bid) {
  const sizes = bid.sizes;
  const imp = {
    'id': bid.bidId,
    'tagid': bid.placementCode
  };

  imp.banner = {
    format: sizes.map(s => ({'w': s[0], 'h': s[1]})),
    topframe: 0
  };
  if (utils.getTopWindowLocation().protocol === 'https:') {
    imp.secure = 1;
  }
  return imp;
}

/**
 * Builds complete rtb request
 * @param imps collection of impressions
 * @param auctionId
 */
function buildRtbRequest(imps, auctionId) {
  let req = {
    'id': auctionId,
    'imp': imps,
    'site': createSite(),
    'at': 1,
    'device': {
      'ip': 'caller',
      'ua': 'caller',
      'js': 1,
      'language': getLanguage()
    },
    'ext': {
      'adk_usersync': 1
    }
  };
  if (utils.getDNT()) {
    req.device.dnt = 1;
  }
  return req;
}

function getLanguage() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return navigator[language].split('-')[0];
}

/**
 * Creates site description object
 */
function createSite() {
  var location = utils.getTopWindowLocation();
  return {
    'domain': location.hostname,
    'page': location.href.split('?')[0]
  };
}

/**
 *  Format creative with optional nurl call
 *  @param bid rtb Bid object
 */
function formatAdMarkup(bid) {
  var adm = bid.adm;
  if ('nurl' in bid) {
    adm += utils.createTrackPixelHtml(`${bid.nurl}&px=1`);
  }
  return `<!DOCTYPE html><html><head><title></title><body style='margin:0px;padding:0px;'>${adm}</body></head>`;
}
