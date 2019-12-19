import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
import {BANNER, VIDEO} from '../src/mediaTypes';
import {parse as parseUrl} from '../src/url';

const DEFAULT_ADKERNEL_DSP_DOMAIN = 'tag.adkernel.com';
const DEFAULT_MIMES = ['video/mp4', 'video/webm', 'application/x-shockwave-flash', 'application/javascript'];
const DEFAULT_PROTOCOLS = [2, 3, 5, 6];
const DEFAULT_APIS = [1, 2];

function isRtbDebugEnabled(refInfo) {
  return refInfo.referer.indexOf('adk_debug=true') !== -1;
}

function buildImp(bidRequest) {
  let imp = {
    id: bidRequest.bidId,
    tagid: bidRequest.adUnitCode
  };
  let bannerReq = utils.deepAccess(bidRequest, `mediaTypes.banner`);
  let videoReq = utils.deepAccess(bidRequest, `mediaTypes.video`);
  if (bannerReq) {
    let sizes = canonicalizeSizesArray(bannerReq.sizes);
    imp.banner = {
      format: utils.parseSizesInput(sizes)
    }
  } else if (videoReq) {
    let size = canonicalizeSizesArray(videoReq.playerSize)[0];
    imp.video = {
      w: size[0],
      h: size[1],
      mimes: videoReq.mimes || DEFAULT_MIMES,
      protocols: videoReq.protocols || DEFAULT_PROTOCOLS,
      api: videoReq.api || DEFAULT_APIS
    };
  }
  return imp;
}

/**
 * Convert input array of sizes to canonical form Array[Array[Number]]
 * @param sizes
 * @return Array[Array[Number]]
 */
function canonicalizeSizesArray(sizes) {
  if (sizes.length === 2 && !utils.isArray(sizes[0])) {
    return [sizes];
  }
  return sizes;
}

function buildRequestParams(tags, auctionId, transactionId, gdprConsent, refInfo) {
  let req = {
    id: auctionId,
    tid: transactionId,
    site: buildSite(refInfo),
    imp: tags
  };

  if (gdprConsent && (gdprConsent.gdprApplies !== undefined || gdprConsent.consentString !== undefined)) {
    req.user = {};
    if (gdprConsent.gdprApplies !== undefined) {
      req.user.gdpr = ~~(gdprConsent.gdprApplies);
    }
    if (gdprConsent.consentString !== undefined) {
      req.user.consent = gdprConsent.consentString;
    }
  }
  return req;
}

function buildSite(refInfo) {
  let loc = parseUrl(refInfo.referer);
  let result = {
    page: `${loc.protocol}://${loc.hostname}${loc.pathname}`,
    secure: ~~(loc.protocol === 'https')
  };
  if (self === top && document.referrer) {
    result.ref = document.referrer;
  }
  let keywords = document.getElementsByTagName('meta')['keywords'];
  if (keywords && keywords.content) {
    result.keywords = keywords.content;
  }
  return result;
}

function buildBid(tag) {
  let bid = {
    requestId: tag.impid,
    bidderCode: spec.code,
    cpm: tag.bid,
    width: tag.w,
    height: tag.h,
    creativeId: tag.crid,
    currency: 'USD',
    ttl: 720,
    netRevenue: true
  };
  if (tag.tag) {
    bid.ad = tag.tag;
    bid.mediaType = BANNER;
  } else if (tag.vast_url) {
    bid.vastUrl = tag.vast_url;
    bid.mediaType = VIDEO;
  }
  return bid;
}

export const spec = {
  code: 'adkernelAdn',
  supportedMediaTypes: [BANNER, VIDEO],
  aliases: ['engagesimply'],

  isBidRequestValid: function(bidRequest) {
    return 'params' in bidRequest &&
      (typeof bidRequest.params.host === 'undefined' || typeof bidRequest.params.host === 'string') &&
      typeof bidRequest.params.pubId === 'number' &&
      'mediaTypes' in bidRequest &&
      ('banner' in bidRequest.mediaTypes || 'video' in bidRequest.mediaTypes);
  },

  buildRequests: function(bidRequests, bidderRequest) {
    let dispatch = bidRequests.map(buildImp)
      .reduce((acc, curr, index) => {
        let bidRequest = bidRequests[index];
        let pubId = bidRequest.params.pubId;
        let host = bidRequest.params.host || DEFAULT_ADKERNEL_DSP_DOMAIN;
        acc[host] = acc[host] || {};
        acc[host][pubId] = acc[host][pubId] || [];
        acc[host][pubId].push(curr);
        return acc;
      }, {});

    let {auctionId, gdprConsent, transactionId, refererInfo} = bidderRequest;
    let requests = [];
    Object.keys(dispatch).forEach(host => {
      Object.keys(dispatch[host]).forEach(pubId => {
        let request = buildRequestParams(dispatch[host][pubId], auctionId, transactionId, gdprConsent, refererInfo);
        requests.push({
          method: 'POST',
          url: `https://${host}/tag?account=${pubId}&pb=1${isRtbDebugEnabled(refererInfo) ? '&debug=1' : ''}`,
          data: JSON.stringify(request)
        })
      });
    });
    return requests;
  },

  interpretResponse: function(serverResponse) {
    let response = serverResponse.body;
    if (!response.tags) {
      return [];
    }
    if (response.debug) {
      utils.logInfo(`ADKERNEL DEBUG:\n${response.debug}`);
    }
    return response.tags.map(buildBid);
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    if (!syncOptions.iframeEnabled || !serverResponses || serverResponses.length === 0) {
      return [];
    }
    return serverResponses.filter(rps => rps.body && rps.body.syncpages)
      .map(rsp => rsp.body.syncpages)
      .reduce((a, b) => a.concat(b), [])
      .map(syncUrl => ({type: 'iframe', url: syncUrl}));
  }
};

registerBidder(spec);
