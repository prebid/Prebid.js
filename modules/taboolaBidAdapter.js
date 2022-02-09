// jshint esversion: 6, es3: false, node: true
'use strict';

import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import {getWindowSelf, getWindowTop} from '../src/utils.js'

const BIDDER_CODE = 'taboola';
const GVLID = 42;
const CURRENCY = 'USD';
const END_POINT_URL = 'http://taboolahb.bidder.taboolasyndication.com'

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
  getUserSyncs: (syncOptions, responses, gdprConsent, uspConsent) => {
    return [];
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    const [bidRequest] = validBidRequests;
    const {refererInfo, gdprConsent = {}, uspConsent} = bidderRequest;
    const {bcat = [], badv = [], publisherId} = bidRequest.params;
    const site = getSiteProperties(bidRequest.params, refererInfo);
    const device = {ua: navigator.userAgent};
    const imps = getImps(validBidRequests);
    const user = {
      buyerid: window.TRC ? window.TRC.user_id : 0,
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

    if (config.getConfig('coppa')) {
      regs.coppa = 1
    }

    const request = {
      id: bidderRequest.auctionId,
      imp: imps,
      site,
      device,
      source: {fd: 1},
      tmax: bidderRequest.timeout,
      bcat,
      badv,
      user,
      regs
    };

    const url = [END_POINT_URL, publisherId].join('?pid=');

    return {
      url,
      method: 'POST',
      data: JSON.stringify(request),
      bids: validBidRequests
    };
  },
  interpretResponse: (serverResponse, {bids}) => {
    if (!bids) {
      return [];
    }

    const {bidResponses, cur: currency} = getBidResponses(serverResponse);

    if (!bidResponses) {
      return [];
    }

    return bids.map((bid, id) => getBid(bid.bidId, currency, bidResponses[id])).filter(Boolean);
  },
};
export const internal = {
  getPageUrl: (refererInfo = {}) => {
    if (refererInfo.canonicalUrl) {
      return refererInfo.canonicalUrl;
    }

    if (config.getConfig('pageUrl')) {
      return config.getConfig('pageUrl');
    }

    try {
      return getWindowTop().location.href;
    } catch (e) {
      return getWindowSelf().location.href;
    }
  },
  getReferrer: (refererInfo = {}) => {
    if (refererInfo.referer) {
      return refererInfo.referer;
    }

    try {
      return getWindowTop().document.referrer;
    } catch (e) {
      return getWindowSelf().document.referrer;
    }
  }
}

registerBidder(spec);

function getSiteProperties({publisherId, bcat = []}, refererInfo) {
  const {getPageUrl, getReferrer} = internal;
  return {
    id: publisherId,
    name: publisherId,
    domain: window.location.host,
    page: getPageUrl(refererInfo),
    ref: getReferrer(refererInfo),
    publisher: {
      id: publisherId
    },
    content: {
      language: navigator.language
    }
  }
}

function getImps(validBidRequests) {
  return validBidRequests.map((bid, id) => {
    const {tagId, bidfloor = null, bidfloorcur = CURRENCY} = bid.params;

    return {
      id: id + 1,
      banner: getBanners(bid),
      tagid: tagId,
      bidfloor,
      bidfloorcur,
    };
  });
}

function getBanners(bid) {
  return getSizes(bid.sizes);
}

function getSizes(sizes) {
  return sizes.map(size => {
    return {
      h: size[0],
      w: size[1]
    }
  })
}

function getBidResponses({body}) {
  if (!body || (body && !body.bidResponse)) {
    return [];
  }

  const {seatbid, cur} = body.bidResponse;

  if (!seatbid.length || !seatbid[0].bid) {
    return [];
  }

  return {
    bidResponses: seatbid[0].bid,
    cur
  };
}

function getBid(requestId, currency, bidResponse) {
  if (!bidResponse) {
    return;
  }

  const {
    price: cpm, crid: creativeId, adm: ad, w: width, h: height, adomain: advertiserDomains, meta = {}
  } = bidResponse;

  if (advertiserDomains && advertiserDomains.length > 0) {
    meta.advertiserDomains = advertiserDomains
  }

  return {
    requestId,
    ttl: 360,
    mediaType: BANNER,
    cpm,
    creativeId,
    currency,
    ad,
    width,
    height,
    meta,
    netRevenue: false
  };
}
