import * as utils from 'src/utils';
import { BANNER, VIDEO } from 'src/mediaTypes';
import {registerBidder} from 'src/adapters/bidderFactory';
import find from 'core-js/library/fn/array/find';
import includes from 'core-js/library/fn/array/includes';

const VIDEO_TARGETING = ['mimes', 'minduration', 'maxduration', 'protocols',
  'startdelay', 'linearity', 'boxingallowed', 'playbackmethod', 'delivery',
  'pos', 'api', 'ext'];
const VERSION = '1.0';

/**
 * Adapter for requesting bids from AdKernel white-label display platform
 */
export const spec = {

  code: 'adkernel',
  aliases: ['headbidding'],
  supportedMediaTypes: [VIDEO],
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
          url: `${window.location.protocol}//${host}/rtbg`,
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
        prBid.width = imp.banner.w;
        prBid.height = imp.banner.h;
        prBid.ad = formatAdMarkup(rtbBid);
      }
      if ('video' in imp) {
        prBid.mediaType = VIDEO;
        prBid.vastUrl = rtbBid.nurl;
        prBid.width = imp.video.w;
        prBid.height = imp.video.h;
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
      .map(sync_url => {
        return {
          type: 'iframe',
          url: sync_url
        }
      });
  }
};

registerBidder(spec);

/**
 *  Builds parameters object for single impression
 */
function buildImp(bid) {
  const size = getAdUnitSize(bid);
  const imp = {
    'id': bid.bidId,
    'tagid': bid.placementCode
  };

  if (bid.mediaType === 'video') {
    imp.video = {w: size[0], h: size[1]};
    if (bid.params.video) {
      Object.keys(bid.params.video)
        .filter(param => includes(VIDEO_TARGETING, param))
        .forEach(param => imp.video[param] = bid.params.video[param]);
    }
  } else {
    imp.banner = {w: size[0], h: size[1]};
  }
  if (utils.getTopWindowLocation().protocol === 'https:') {
    imp.secure = 1;
  }
  return imp;
}

/**
 * Return ad unit single size
 * @param bid adunit size definition
 * @return {*}
 */
function getAdUnitSize(bid) {
  if (bid.mediaType === 'video') {
    return bid.sizes;
  }
  return bid.sizes[0];
}

/**
 * Builds complete rtb request
 * @param imps collection of impressions
 * @param auctionId
 */
function buildRtbRequest(imps, auctionId) {
  return {
    'id': auctionId,
    'imp': imps,
    'site': createSite(),
    'at': 1,
    'device': {
      'ip': 'caller',
      'ua': 'caller'
    }
  };
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
