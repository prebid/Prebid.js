import * as utils from 'src/utils';
import { BANNER, VIDEO } from 'src/mediaTypes';
import {registerBidder} from 'src/adapters/bidderFactory';
import find from 'core-js/library/fn/array/find';
import includes from 'core-js/library/fn/array/includes';

const VIDEO_TARGETING = ['mimes', 'minduration', 'maxduration', 'protocols',
  'startdelay', 'linearity', 'boxingallowed', 'playbackmethod', 'delivery',
  'pos', 'api', 'ext'];
const VERSION = '1.2';

/**
 * Adapter for requesting bids from AdKernel white-label display platform
 */
export const spec = {

  code: 'adkernel',
  aliases: ['headbidding'],
  supportedMediaTypes: [BANNER, VIDEO],
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
        prBid.width = rtbBid.w;
        prBid.height = rtbBid.h;
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
      .map(sync_url => ({type: 'iframe', url: sync_url}));
  }
};

registerBidder(spec);

/**
 *  Builds parameters object for single impression
 */
function buildImp(bidRequest) {
  const imp = {
    'id': bidRequest.bidId,
    'tagid': bidRequest.adUnitCode
  };

  if (bidRequest.mediaType === BANNER || utils.deepAccess(bidRequest, `mediaTypes.banner`) ||
    (bidRequest.mediaTypes === undefined && bidRequest.mediaType === undefined)) {
    let sizes = canonicalizeSizesArray(utils.deepAccess(bidRequest, `mediaTypes.banner.sizes`) || bidRequest.sizes);
    imp.banner = {
      format: sizes.map(s => ({'w': s[0], 'h': s[1]})),
      topframe: 0
    };
  } else if (bidRequest.mediaType === VIDEO || utils.deepAccess(bidRequest, 'mediaTypes.video')) {
    let size = utils.deepAccess(bidRequest, 'mediaTypes.video.playerSize') || canonicalizeSizesArray(bidRequest.sizes)[0];
    imp.video = {
      w: size[0],
      h: size[1]
    };
    if (bidRequest.params.video) {
      Object.keys(bidRequest.params.video)
        .filter(param => includes(VIDEO_TARGETING, param))
        .forEach(param => imp.video[param] = bidRequest.params.video[param]);
    }
  }
  if (utils.getTopWindowLocation().protocol === 'https:') {
    imp.secure = 1;
  }
  return imp;
}

/**
 * Convert input array of sizes to canonical form Array[Array[Number]]
 * @param sizes
 * @return Array[Array[Number]]
 */
function canonicalizeSizesArray(sizes) {
  if (sizes.length == 2 && !utils.isArray(sizes[0])) {
    return [sizes];
  }
  return sizes;
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
