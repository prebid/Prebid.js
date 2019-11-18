import * as utils from '../src/utils';
import { BANNER, VIDEO } from '../src/mediaTypes';
import {registerBidder} from '../src/adapters/bidderFactory';
import find from 'core-js/library/fn/array/find';
import includes from 'core-js/library/fn/array/includes';
import {parse as parseUrl} from '../src/url';

/*
 * In case you're AdKernel whitelable platform's client who needs branded adapter to
 * work with Adkernel platform - DO NOT COPY THIS ADAPTER UNDER NEW NAME
 *
 * Please contact prebid@adkernel.com and we'll add your adapter as an alias.
 */

const VIDEO_TARGETING = ['mimes', 'minduration', 'maxduration', 'protocols',
  'startdelay', 'linearity', 'boxingallowed', 'playbackmethod', 'delivery',
  'pos', 'api', 'ext'];
const VERSION = '1.3';

/**
 * Adapter for requesting bids from AdKernel white-label display platform
 */
export const spec = {

  code: 'adkernel',
  aliases: ['headbidding', 'adsolut', 'oftmediahb', 'audiencemedia', 'waardex_ak'],
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function(bidRequest) {
    return 'params' in bidRequest &&
      typeof bidRequest.params.host !== 'undefined' &&
      'zoneId' in bidRequest.params &&
      !isNaN(Number(bidRequest.params.zoneId)) &&
      bidRequest.params.zoneId > 0 &&
      bidRequest.mediaTypes &&
      (bidRequest.mediaTypes.banner || bidRequest.mediaTypes.video);
  },
  buildRequests: function(bidRequests, bidderRequest) {
    let impDispatch = dispatchImps(bidRequests, bidderRequest.refererInfo);
    const {gdprConsent, auctionId} = bidderRequest;
    const requests = [];
    Object.keys(impDispatch).forEach(host => {
      Object.keys(impDispatch[host]).forEach(zoneId => {
        const request = buildRtbRequest(impDispatch[host][zoneId], auctionId, gdprConsent, bidderRequest.refererInfo);
        requests.push({
          method: 'POST',
          url: `${window.location.protocol}//${host}/hb?zone=${zoneId}&v=${VERSION}`,
          data: JSON.stringify(request)
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

    let rtbRequest = JSON.parse(request.data);
    let rtbBids = response.seatbid
      .map(seatbid => seatbid.bid)
      .reduce((a, b) => a.concat(b), []);

    return rtbBids.map(rtbBid => {
      let imp = find(rtbRequest.imp, imp => imp.id === rtbBid.impid);
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
      .map(syncUrl => ({type: 'iframe', url: syncUrl}));
  }
};

registerBidder(spec);

/**
 *  Dispatch impressions by ad network host and zone
 */
function dispatchImps(bidRequests, refererInfo) {
  let secure = (refererInfo && refererInfo.referer.indexOf('https:') === 0);
  return bidRequests.map(bidRequest => buildImp(bidRequest, secure))
    .reduce((acc, curr, index) => {
      let bidRequest = bidRequests[index];
      let zoneId = bidRequest.params.zoneId;
      let host = bidRequest.params.host;
      acc[host] = acc[host] || {};
      acc[host][zoneId] = acc[host][zoneId] || [];
      acc[host][zoneId].push(curr);
      return acc;
    }, {});
}

/**
 *  Builds parameters object for single impression
 */
function buildImp(bidRequest, secure) {
  const imp = {
    'id': bidRequest.bidId,
    'tagid': bidRequest.adUnitCode
  };

  if (utils.deepAccess(bidRequest, `mediaTypes.banner`)) {
    let sizes = canonicalizeSizesArray(bidRequest.mediaTypes.banner.sizes);
    imp.banner = {
      format: sizes.map(wh => utils.parseGPTSingleSizeArrayToRtbSize(wh)),
      topframe: 0
    };
  } else if (utils.deepAccess(bidRequest, 'mediaTypes.video')) {
    let size = canonicalizeSizesArray(bidRequest.mediaTypes.video.playerSize)[0];
    imp.video = utils.parseGPTSingleSizeArrayToRtbSize(size);
    if (bidRequest.params.video) {
      Object.keys(bidRequest.params.video)
        .filter(key => includes(VIDEO_TARGETING, key))
        .forEach(key => imp.video[key] = bidRequest.params.video[key]);
    }
  }
  if (secure) {
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
  if (sizes.length === 2 && !utils.isArray(sizes[0])) {
    return [sizes];
  }
  return sizes;
}

/**
 * Builds complete rtb request
 * @param imps collection of impressions
 * @param auctionId
 * @param gdprConsent
 * @param refInfo
 * @return Object complete rtb request
 */
function buildRtbRequest(imps, auctionId, gdprConsent, refInfo) {
  let req = {
    'id': auctionId,
    'imp': imps,
    'site': createSite(refInfo),
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
  if (gdprConsent && gdprConsent.gdprApplies !== undefined) {
    req.regs = {ext: {gdpr: Number(gdprConsent.gdprApplies)}};
  }
  if (gdprConsent && gdprConsent.consentString !== undefined) {
    req.user = {ext: {consent: gdprConsent.consentString}};
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
function createSite(refInfo) {
  let url = parseUrl(refInfo.referer);
  let site = {
    'domain': url.hostname,
    'page': url.protocol + '://' + url.hostname + url.pathname
  };
  if (self === top && document.referrer) {
    site.ref = document.referrer;
  }
  let keywords = document.getElementsByTagName('meta')['keywords'];
  if (keywords && keywords.content) {
    site.keywords = keywords.content;
  }
  return site;
}

/**
 *  Format creative with optional nurl call
 *  @param bid rtb Bid object
 */
function formatAdMarkup(bid) {
  let adm = bid.adm;
  if ('nurl' in bid) {
    adm += utils.createTrackPixelHtml(`${bid.nurl}&px=1`);
  }
  return adm;
}
