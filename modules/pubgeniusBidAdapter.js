import { registerBidder } from '../src/adapters/bidderFactory';
import { config } from '../src/config';
import { BANNER } from '../src/mediaTypes';
import { deepAccess, deepSetValue, inIframe, isArrayOfNums, isInteger, isNumber, isStr, logError } from '../src/utils';

const BIDDER_VERSION = '1.0.0';
const BASE_URL = 'https://blackpearl-test.api.pubgenius.io/api/v1';
const AUCTION_URL = BASE_URL + '/auction';

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

    return {
      method: 'POST',
      url: AUCTION_URL,
      data,
      options: { contentType: 'application/json' },
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

  // getUserSyncs

  onTimeout(data) {
    // empty
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
  return imp;
}

function buildSite(bidderRequest) {
  const pageUrl = config.getConfig('pageUrl') || bidderRequest.refererInfo.referer;
  if (pageUrl) {
    return {
      page: encodeURIComponent(pageUrl),
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
