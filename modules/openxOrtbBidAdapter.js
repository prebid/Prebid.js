import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {includes} from '../src/polyfill.js';

const bidderConfig = 'hb_pb_ortb';
const bidderVersion = '1.0';
const VIDEO_TARGETING = ['startdelay', 'mimes', 'minduration', 'maxduration', 'delivery',
  'startdelay', 'skip', 'playbackmethod', 'api', 'protocol', 'boxingallowed', 'maxextended',
  'linearity', 'delivery', 'protocols', 'placement', 'minbitrate', 'maxbitrate', 'battr', 'ext'];
export const REQUEST_URL = 'https://rtb.openx.net/openrtbb/prebidjs';
export const SYNC_URL = 'https://u.openx.net/w/1.0/pd';
export const DEFAULT_PH = '2d1251ae-7f3a-47cf-bd2a-2f288854a0ba';
export const spec = {
  code: 'openx',
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  transformBidParams
};

registerBidder(spec);

function transformBidParams(params, isOpenRtb) {
  return utils.convertTypes({
    'unit': 'string',
    'customFloor': 'number'
  }, params);
}

function isBidRequestValid(bidRequest) {
  const hasDelDomainOrPlatform = bidRequest.params.delDomain ||
    bidRequest.params.platform;

  if (utils.deepAccess(bidRequest, 'mediaTypes.banner') &&
    hasDelDomainOrPlatform) {
    return !!bidRequest.params.unit ||
      utils.deepAccess(bidRequest, 'mediaTypes.banner.sizes.length') > 0;
  }

  return !!(bidRequest.params.unit && hasDelDomainOrPlatform);
}

function buildRequests(bids, bidderRequest) {
  let videoBids = bids.filter(bid => isVideoBid(bid));
  let bannerBids = bids.filter(bid => isBannerBid(bid));
  let requests = bannerBids.length ? [createBannerRequest(bannerBids, bidderRequest)] : [];
  videoBids.forEach(bid => {
    requests.push(createVideoRequest(bid, bidderRequest));
  });
  return requests;
}

function createBannerRequest(bids, bidderRequest) {
  let data = getBaseRequest(bids[0], bidderRequest);
  data.imp = bids.map(bid => {
    const floor = getFloor(bid, BANNER);
    let imp = {
      id: bid.bidId,
      tagid: bid.params.unit,
      banner: {
        format: toFormat(bid.mediaTypes.banner.sizes),
        topframe: utils.inIframe() ? 0 : 1
      },
      ext: {divid: bid.adUnitCode}
    };
    enrichImp(imp, bid, floor);
    return imp;
  });
  return {
    method: 'POST',
    url: REQUEST_URL,
    data: data
  }
}

function toFormat(sizes) {
  return sizes.map((s) => {
    return { w: s[0], h: s[1] };
  });
}

function enrichImp(imp, bid, floor) {
  if (bid.params.customParams) {
    utils.deepSetValue(imp, 'ext.customParams', bid.params.customParams);
  }
  if (floor > 0) {
    imp.bidfloor = floor;
    imp.bidfloorcur = 'USD';
  } else if (bid.params.customFloor) {
    imp.bidfloor = bid.params.customFloor;
  }
  if (bid.ortb2Imp && bid.ortb2Imp.ext && bid.ortb2Imp.ext.data) {
    imp.ext.data = bid.ortb2Imp.ext.data;
  }
}

function createVideoRequest(bid, bidderRequest) {
  let width;
  let height;
  const videoMediaType = utils.deepAccess(bid, `mediaTypes.video`);
  const playerSize = utils.deepAccess(bid, 'mediaTypes.video.playerSize');
  const context = utils.deepAccess(bid, 'mediaTypes.video.context');
  const floor = getFloor(bid, VIDEO);

  // normalize config for video size
  if (utils.isArray(bid.sizes) && bid.sizes.length === 2 && !utils.isArray(bid.sizes[0])) {
    width = parseInt(bid.sizes[0], 10);
    height = parseInt(bid.sizes[1], 10);
  } else if (utils.isArray(bid.sizes) && utils.isArray(bid.sizes[0]) && bid.sizes[0].length === 2) {
    width = parseInt(bid.sizes[0][0], 10);
    height = parseInt(bid.sizes[0][1], 10);
  } else if (utils.isArray(playerSize) && playerSize.length === 2) {
    width = parseInt(playerSize[0], 10);
    height = parseInt(playerSize[1], 10);
  }

  let data = getBaseRequest(bid, bidderRequest);
  data.imp = [{
    id: bid.bidId,
    tagid: bid.params.unit,
    video: {
      w: width,
      h: height,
      topframe: utils.inIframe() ? 0 : 1
    },
    ext: {divid: bid.adUnitCode}
  }];

  enrichImp(data.imp[0], bid, floor);

  if (context) {
    if (context === 'instream') {
      data.imp[0].video.placement = 1;
    } else if (context === 'outstream') {
      data.imp[0].video.placement = 4;
    }
  }

  // backward compatability for video params
  let videoParams = bid.params.video || bid.params.openrtb || {};
  if (utils.isArray(videoParams.imp)) {
    videoParams = videoParams[0].video;
  }

  Object.keys(videoParams)
    .filter(param => includes(VIDEO_TARGETING, param))
    .forEach(param => data.imp[0].video[param] = videoParams[param]);
  Object.keys(videoMediaType)
    .filter(param => includes(VIDEO_TARGETING, param))
    .forEach(param => data.imp[0].video[param] = videoMediaType[param]);

  return {
    method: 'POST',
    url: REQUEST_URL,
    data: data
  }
}

function getBaseRequest(bid, bidderRequest) {
  let req = {
    id: bidderRequest.auctionId,
    cur: [config.getConfig('currency.adServerCurrency') || 'USD'],
    at: 1,
    tmax: config.getConfig('bidderTimeout'),
    site: {
      page: config.getConfig('pageUrl') || bidderRequest.refererInfo.referer
    },
    regs: {
      coppa: (config.getConfig('coppa') === true || bid.params.coppa) ? 1 : 0,
    },
    device: {
      dnt: (utils.getDNT() || bid.params.doNotTrack) ? 1 : 0,
      h: screen.height,
      w: screen.width,
      ua: window.navigator.userAgent,
      language: window.navigator.language.split('-').shift()
    },
    ext: {
      bc: `${bidderConfig}_${bidderVersion}`
    }
  };

  if (bid.params.platform) {
    utils.deepSetValue(req, 'ext.platform', bid.params.platform);
  }
  if (bid.params.delDomain) {
    utils.deepSetValue(req, 'ext.delDomain', bid.params.delDomain);
  }
  if (bid.params.test) {
    req.test = 1
  }
  if (bidderRequest.gdprConsent) {
    if (bidderRequest.gdprConsent.gdprApplies !== undefined) {
      utils.deepSetValue(req, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies === true ? 1 : 0);
    }
    if (bidderRequest.gdprConsent.consentString !== undefined) {
      utils.deepSetValue(req, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
    }
    if (bidderRequest.gdprConsent.addtlConsent !== undefined) {
      utils.deepSetValue(req, 'user.ext.ConsentedProvidersSettings.consented_providers', bidderRequest.gdprConsent.addtlConsent);
    }
  }
  if (bidderRequest.uspConsent) {
    utils.deepSetValue(req, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }
  if (bid.schain) {
    utils.deepSetValue(req, 'source.ext.schain', bid.schain);
  }
  if (bid.userIdAsEids) {
    utils.deepSetValue(req, 'user.ext.eids', bid.userIdAsEids);
  }
  const commonFpd = bidderRequest.ortb2 || {};
  if (commonFpd.site) {
    utils.mergeDeep(req, {site: commonFpd.site});
  }
  if (commonFpd.user) {
    utils.mergeDeep(req, {user: commonFpd.user});
  }
  return req;
}

function isVideoBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.video');
}

function isBannerBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.banner') || !isVideoBid(bid);
}

function getFloor(bid, mediaType) {
  let floor = 0;

  if (typeof bid.getFloor === 'function') {
    const floorInfo = bid.getFloor({
      currency: 'USD',
      mediaType: mediaType,
      size: '*'
    });

    if (typeof floorInfo === 'object' &&
      floorInfo.currency === 'USD' &&
      !isNaN(parseFloat(floorInfo.floor))) {
      floor = Math.max(floor, parseFloat(floorInfo.floor));
    }
  }

  return floor;
}

function interpretResponse(resp, req) {
  // pass these from request to the responses for use in userSync
  if (req.data.ext) {
    if (req.data.ext.delDomain) {
      utils.deepSetValue(resp, 'body.ext.delDomain', req.data.ext.delDomain);
    }
    if (req.data.ext.platform) {
      utils.deepSetValue(resp, 'body.ext.platform', req.data.ext.platform);
    }
  }

  const respBody = resp.body;
  if ('nbr' in respBody) {
    return [];
  }

  let bids = [];
  respBody.seatbid.forEach(seatbid => {
    bids = [...bids, ...seatbid.bid.map(bid => {
      let response = {
        requestId: bid.impid,
        cpm: bid.price,
        width: bid.w,
        height: bid.h,
        creativeId: bid.crid,
        dealId: bid.dealid,
        currency: respBody.cur || 'USD',
        netRevenue: true,
        ttl: 300,
        mediaType: 'banner' in req.data.imp[0] ? BANNER : VIDEO,
        meta: { advertiserDomains: bid.adomain }
      };

      if (response.mediaType === VIDEO) {
        if (bid.nurl) {
          response.vastUrl = bid.nurl;
        } else {
          response.vastXml = bid.adm;
        }
      } else {
        response.ad = bid.adm;
      }

      if (bid.ext) {
        response.meta.networkId = bid.ext.dsp_id;
        response.meta.advertiserId = bid.ext.buyer_id;
        response.meta.brandId = bid.ext.brand_id;
      }

      if (respBody.ext && respBody.ext.paf) {
        response.meta.paf = respBody.ext.paf;
        response.meta.paf.content_id = utils.deepAccess(bid, 'ext.paf.content_id');
      }

      return response
    })];
  });

  return bids;
}

/**
 * @param syncOptions
 * @param responses
 * @param gdprConsent
 * @param uspConsent
 * @return {{type: (string), url: (*|string)}[]}
 */
function getUserSyncs(syncOptions, responses, gdprConsent, uspConsent) {
  if (syncOptions.iframeEnabled || syncOptions.pixelEnabled) {
    let pixelType = syncOptions.iframeEnabled ? 'iframe' : 'image';
    let queryParamStrings = [];
    let syncUrl = SYNC_URL;
    if (gdprConsent) {
      queryParamStrings.push('gdpr=' + (gdprConsent.gdprApplies ? 1 : 0));
      queryParamStrings.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || ''));
    }
    if (uspConsent) {
      queryParamStrings.push('us_privacy=' + encodeURIComponent(uspConsent));
    }
    if (responses.length > 0 && responses[0].body && responses[0].body.ext) {
      const ext = responses[0].body.ext;
      if (ext.delDomain) {
        syncUrl = `https://${ext.delDomain}/w/1.0/pd`
      } else if (ext.platform) {
        queryParamStrings.push('ph=' + ext.platform)
      }
    } else {
      queryParamStrings.push('ph=' + DEFAULT_PH)
    }
    return [{
      type: pixelType,
      url: `${syncUrl}${queryParamStrings.length > 0 ? '?' + queryParamStrings.join('&') : ''}`
    }];
  }
}
