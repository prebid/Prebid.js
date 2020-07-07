import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';
import {
  deepAccess,
  deepSetValue,
  inIframe,
  isArrayOfNums,
  isInteger,
  isNumber,
  isStr,
  logError,
  parseQueryStringParameters,
} from '../src/utils.js';

const BIDDER_VERSION = '1.0.0';
const BASE_URL = 'https://ortb.adpearl.io';
const AUCTION_URL = BASE_URL + '/prebid/auction';

export const spec = {
  code: 'pubgenius',

  supportedMediaTypes: [ BANNER ],

  isBidRequestValid(bid) {
    const adUnitId = bid.params.adUnitId;
    if (!isStr(adUnitId) && !isInteger(adUnitId)) {
      logError('pubgenius bidder params: adUnitId must be a string or integer.');
      return false;
    }

    const sizes = deepAccess(bid, 'mediaTypes.banner.sizes');
    return Boolean(sizes && sizes.length) && sizes.every(size => isArrayOfNums(size, 2));
  },

  buildRequests: function (bidRequests, bidderRequest) {
    const data = {
      id: bidderRequest.auctionId,
      imp: bidRequests.map(buildImp),
      tmax: config.getConfig('bidderTimeout'),
      ext: {
        pbadapter: {
          version: BIDDER_VERSION,
        },
      },
    };

    const site = buildSite(bidderRequest);
    if (site) {
      data.site = site;
    }

    const gdpr = bidderRequest.gdprConsent;
    if (gdpr) {
      const applies = gdpr.gdprApplies;
      const consent = gdpr.consentString;
      deepSetValue(data, 'regs.ext.gdpr', numericBoolean(applies));
      if (applies && consent) {
        deepSetValue(data, 'user.ext.consent', consent);
      }
    }

    const usp = bidderRequest.uspConsent;
    if (usp) {
      deepSetValue(data, 'regs.ext.us_privacy', usp);
    }

    const schain = bidderRequest.schain;
    if (schain) {
      deepSetValue(data, 'source.ext.schain', schain);
    }

    if (config.getConfig('coppa')) {
      deepSetValue(data, 'regs.coppa', 1);
    }

    const bidUserIdAsEids = deepAccess(bidRequests, '0.userIdAsEids');
    if (bidUserIdAsEids && bidUserIdAsEids.length) {
      const eids = bidUserIdAsEids.filter(eid => eid.source === 'adserver.org');
      if (eids.length) {
        deepSetValue(data, 'user.ext.eids', eids);
      }
    }

    return {
      method: 'POST',
      url: AUCTION_URL,
      data,
    };
  },

  interpretResponse({ body }) {
    const bidResponses = [];
    const currency = body.cur || 'USD';
    const seatbids = body.seatbid;

    if (seatbids) {
      seatbids.forEach(seatbid => {
        seatbid.bid.forEach(bid => {
          const bidResponse = interpretBid(bid);
          bidResponse.currency = currency;
          bidResponses.push(bidResponse);
        });
      });
    }

    return bidResponses;
  },

  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []

    if (syncOptions.iframeEnabled) {
      let params = {};

      if (gdprConsent) {
        params.gdpr = numericBoolean(gdprConsent.gdprApplies);
        if (gdprConsent.consentString) {
          params.consent = gdprConsent.consentString;
        }
      }

      if (uspConsent) {
        params.us_privacy = uspConsent;
      }

      const qs = parseQueryStringParameters(params);
      syncs.push({
        type: 'iframe',
        url: `${BASE_URL}/usersync/pixels.html?${qs}`,
      });
    }

    return syncs;
  },

  onTimeout(data) {
    ajax(`${BASE_URL}/prebid/events?type=timeout`, null, JSON.stringify(data), {
      method: 'POST',
    });
  },
};

function buildImp(bid) {
  const imp = {
    id: bid.bidId,
    banner: {
      format: deepAccess(bid, 'mediaTypes.banner.sizes').map(size => ({ w: size[0], h: size[1] })),
      topframe: numericBoolean(!inIframe()),
    },
    tagid: String(bid.params.adUnitId),
  };

  const bidFloor = bid.params.bidFloor;
  if (isNumber(bidFloor)) {
    imp.bidfloor = bidFloor;
  }

  const pos = bid.params.position;
  if (isInteger(pos)) {
    imp.banner.pos = pos;
  }

  if (bid.params.test) {
    deepSetValue(imp, 'ext.test', 1);
  }

  return imp;
}

function buildSite(bidderRequest) {
  const pageUrl = config.getConfig('pageUrl') || bidderRequest.refererInfo.referer;
  if (pageUrl) {
    return {
      page: pageUrl,
    };
  }

  return null;
}

function interpretBid(bid) {
  const bidResponse = {
    requestId: bid.impid,
    cpm: bid.price,
    width: bid.w,
    height: bid.h,
    ad: bid.adm,
    ttl: bid.exp,
    creativeId: bid.crid,
    netRevenue: true,
  };

  if (bid.adomain && bid.adomain.length) {
    bidResponse.meta = {
      advertiserDomains: bid.adomain,
    };
  }

  return bidResponse;
}

function numericBoolean(value) {
  return value ? 1 : 0;
}

registerBidder(spec);
