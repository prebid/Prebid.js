'use strict';

import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import {deepAccess, deepSetValue, getWindowSelf, replaceAuctionPrice} from '../src/utils.js';
import {getStorageManager} from '../src/storageManager.js';
import {ajax} from '../src/ajax.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'taboola';
const GVLID = 42;
const CURRENCY = 'USD';
export const END_POINT_URL = 'https://display.bidder.taboola.com/OpenRTB/TaboolaHB/auction';
export const USER_SYNC_IMG_URL = 'https://trc.taboola.com/sg/prebidJS/1/cm';
export const USER_SYNC_IFRAME_URL = 'https://cdn.taboola.com/scripts/prebid_iframe_sync.html';
const USER_ID = 'user-id';
const STORAGE_KEY = `taboola global:${USER_ID}`;
const COOKIE_KEY = 'trc_cookie_storage';
const TGID_COOKIE_KEY = 't_gid';
const TBLA_ID_COOKIE_KEY = 'tbla_id';
export const EVENT_ENDPOINT = 'https://beacon.bidder.taboola.com';

/**
 *  extract User Id by that order:
 * 1. local storage
 * 2. first party cookie
 * 3. rendered trc
 * 4. new user set it to 0
 */
export const userData = {
  storageManager: getStorageManager({bidderCode: BIDDER_CODE}),
  getUserId: () => {
    const {getFromLocalStorage, getFromCookie, getFromTRC} = userData;

    try {
      return getFromLocalStorage() || getFromCookie() || getFromTRC();
    } catch (ex) {
      return 0;
    }
  },
  getFromCookie() {
    const {cookiesAreEnabled, getCookie} = userData.storageManager;
    if (cookiesAreEnabled()) {
      const cookieData = getCookie(COOKIE_KEY);
      let userId = userData.getCookieDataByKey(cookieData, USER_ID);
      if (userId) {
        return userId;
      }
      userId = getCookie(TGID_COOKIE_KEY);
      if (userId) {
        return userId;
      }
      const tblaId = getCookie(TBLA_ID_COOKIE_KEY);
      if (tblaId) {
        return tblaId;
      }
    }
  },
  getCookieDataByKey(cookieData, key) {
    const [, value = ''] = cookieData.split(`${key}=`)
    return value;
  },
  getFromLocalStorage() {
    const {hasLocalStorage, localStorageIsEnabled, getDataFromLocalStorage} = userData.storageManager;

    if (hasLocalStorage() && localStorageIsEnabled()) {
      return getDataFromLocalStorage(STORAGE_KEY);
    }
  },
  getFromTRC() {
    return window.TRC ? window.TRC.user_id : 0;
  }
}

export const internal = {
  getPageUrl: (refererInfo = {}) => {
    return refererInfo?.page || getWindowSelf().location.href;
  },
  getReferrer: (refererInfo = {}) => {
    return refererInfo?.ref || getWindowSelf().document.referrer;
  }
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    mediaType: BANNER,
    ttl: 300
  },
  imp(buildImp, bidRequest, context) {
    let imp = buildImp(bidRequest, context);
    fillTaboolaImpData(bidRequest, imp);
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const reqData = buildRequest(imps, bidderRequest, context);
    fillTaboolaReqData(bidderRequest, context.bidRequests[0], reqData)
    return reqData;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    bidResponse.nurl = bid.nurl;
    bidResponse.ad = replaceAuctionPrice(bid.adm, bid.price);
    return bidResponse
  }
});

export const spec = {
  supportedMediaTypes: [BANNER],
  gvlid: GVLID,
  code: BIDDER_CODE,
  isBidRequestValid: (bidRequest) => {
    return !!(bidRequest.sizes &&
              bidRequest.params &&
              bidRequest.params.publisherId &&
              bidRequest.params.tagId);
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    const [bidRequest] = validBidRequests;
    const data = converter.toORTB({bidderRequest: bidderRequest, bidRequests: validBidRequests});
    const {publisherId} = bidRequest.params;
    const url = END_POINT_URL + '?publisher=' + publisherId;

    return {
      url,
      method: 'POST',
      data: data,
      bids: validBidRequests,
      options: {
        withCredentials: false
      },
    };
  },
  interpretResponse: (serverResponse, request) => {
    if (!request || !request.bids || !request.data) {
      return [];
    }

    if (!serverResponse || !serverResponse.body) {
      return [];
    }

    if (!serverResponse.body.seatbid || !serverResponse.body.seatbid.length || !serverResponse.body.seatbid[0].bid || !serverResponse.body.seatbid[0].bid.length) {
      return [];
    }

    const bids = converter.fromORTB({response: serverResponse.body, request: request.data}).bids;
    return bids;
  },
  onBidWon: (bid) => {
    if (bid.nurl) {
      const resolvedNurl = replaceAuctionPrice(bid.nurl, bid.originalCpm);
      ajax(resolvedNurl);
    }
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs = []
    const queryParams = [];
    if (gdprConsent) {
      queryParams.push(`gdpr=${Number(gdprConsent.gdprApplies && 1)}&gdpr_consent=${encodeURIComponent(gdprConsent.consentString || '')}`);
    }

    if (uspConsent) {
      queryParams.push('us_privacy=' + encodeURIComponent(uspConsent));
    }

    if (gppConsent) {
      queryParams.push('gpp=' + encodeURIComponent(gppConsent));
    }

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: USER_SYNC_IFRAME_URL + (queryParams.length ? '?' + queryParams.join('&') : '')
      });
    }

    if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: USER_SYNC_IMG_URL + (queryParams.length ? '?' + queryParams.join('&') : '')
      });
    }
    return syncs;
  },
  onTimeout: (timeoutData) => {
    ajax(EVENT_ENDPOINT + '/timeout', null, JSON.stringify(timeoutData), {method: 'POST'});
  },

  onBidderError: ({ error, bidderRequest }) => {
    ajax(EVENT_ENDPOINT + '/bidError', null, JSON.stringify(error, bidderRequest), {method: 'POST'});
  },
};

function getSiteProperties({publisherId}, refererInfo, ortb2) {
  const {getPageUrl, getReferrer} = internal;
  return {
    id: publisherId,
    name: publisherId,
    domain: ortb2?.site?.domain || refererInfo?.domain || window.location?.host,
    page: ortb2?.site?.page || getPageUrl(refererInfo),
    ref: ortb2?.site?.ref || getReferrer(refererInfo),
    publisher: {
      id: publisherId
    },
    content: {
      language: navigator.language
    }
  }
}

function fillTaboolaReqData(bidderRequest, bidRequest, data) {
  const {refererInfo, gdprConsent = {}, uspConsent} = bidderRequest;
  const site = getSiteProperties(bidRequest.params, refererInfo, bidderRequest.ortb2);
  const device = {ua: navigator.userAgent};
  const user = {
    buyeruid: userData.getUserId(gdprConsent, uspConsent),
    ext: {}
  };
  const regs = {
    coppa: 0,
    ext: {}
  };

  if (gdprConsent.gdprApplies) {
    user.ext.consent = bidderRequest.gdprConsent.consentString;
    regs.ext.gdpr = 1;
  }

  if (uspConsent) {
    regs.ext.us_privacy = uspConsent;
  }

  if (bidderRequest.ortb2?.regs?.gpp) {
    regs.ext.gpp = bidderRequest.ortb2.regs.gpp;
    regs.ext.gpp_sid = bidderRequest.ortb2.regs.gpp_sid;
  }

  if (config.getConfig('coppa')) {
    regs.coppa = 1;
  }

  const ortb2 = bidderRequest.ortb2 || {
    bcat: [],
    badv: [],
    wlang: []
  };

  data.id = bidderRequest.bidderRequestId;
  data.site = site;
  data.device = device;
  data.source = {fd: 1};
  data.tmax = (bidderRequest.timeout == undefined) ? undefined : parseInt(bidderRequest.timeout);
  data.bcat = ortb2.bcat || bidRequest.params.bcat || [];
  data.badv = ortb2.badv || bidRequest.params.badv || [];
  data.wlang = ortb2.wlang || bidRequest.params.wlang || [];
  data.user = user;
  data.regs = regs;
  deepSetValue(data, 'ext.pageType', ortb2?.ext?.data?.pageType || ortb2?.ext?.data?.section || bidRequest.params.pageType);
}

function fillTaboolaImpData(bid, imp) {
  const {tagId, position} = bid.params;
  imp.banner = getBanners(bid, position);
  imp.tagid = tagId;

  if (typeof bid.getFloor === 'function') {
    const floorInfo = bid.getFloor({
      currency: CURRENCY,
      size: '*'
    });
    if (typeof floorInfo === 'object' && floorInfo.currency === CURRENCY && !isNaN(parseFloat(floorInfo.floor))) {
      imp.bidfloor = parseFloat(floorInfo.floor);
      imp.bidfloorcur = CURRENCY;
    }
  } else {
    const {bidfloor = null, bidfloorcur = CURRENCY} = bid.params;
    imp.bidfloor = bidfloor;
    imp.bidfloorcur = bidfloorcur;
  }
  deepSetValue(imp, 'ext.gpid', deepAccess(bid, 'ortb2Imp.ext.gpid'));
}

function getBanners(bid, pos) {
  return {
    ...getSizes(bid.sizes),
    pos: pos
  }
}

function getSizes(sizes) {
  return {
    format: sizes.map(size => {
      return {
        w: size[0],
        h: size[1]
      }
    })
  }
}

registerBidder(spec);
