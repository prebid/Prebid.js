import {
  deepAccess,
  mergeDeep,
  logError,
  replaceAuctionPrice,
  triggerPixel,
  deepSetValue,
  isStr,
  isArray,
  getWinDimensions
} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { VIDEO, BANNER } from '../src/mediaTypes.js';

export const ENDPOINT = 'https://bid.virgul.com/prebid';

const BIDDER_CODE = 'empower';

export const spec = {
  code: BIDDER_CODE,

  supportedMediaTypes: [VIDEO, BANNER],

  isBidRequestValid: (bid) =>
    !!(bid && bid.params && bid.params.zone && bid.bidder === BIDDER_CODE),

  buildRequests: (bidRequests, bidderRequest) => {
    const currencyObj = config.getConfig('currency');
    const currency = (currencyObj && currencyObj.adServerCurrency) || 'USD';

    const request = {
      id: bidRequests[0].bidderRequestId,
      at: 1,
      imp: bidRequests.map((slot) => impression(slot, currency)),
      site: {
        page: config.pageURL || bidderRequest?.refererInfo?.page,
        domain: bidderRequest?.refererInfo?.domain,
        ref: config.refURL,
        publisher: { domain: bidderRequest?.refererInfo?.domain },
      },
      device: {
        ua: navigator.userAgent,
        js: 1,
        dnt:
          navigator.doNotTrack === 'yes' ||
          navigator.doNotTrack === '1' ||
          navigator.msDoNotTrack === '1'
            ? 1
            : 0,
        h: screen.height,
        w: screen.width,
        language: navigator.language,
        connectiontype: getDeviceConnectionType(),
      },
      cur: [currency],
      source: {
        fd: 1,
        tid: bidderRequest.ortb2?.source?.tid,
        ext: {
          prebid: '$prebid.version$',
        },
      },
      user: {},
      regs: {},
      ext: {},
    };

    if (bidderRequest.gdprConsent) {
      request.user = {
        ext: {
          consent: bidderRequest.gdprConsent.consentString || '',
        },
      };
      request.regs = {
        ext: {
          gdpr:
            bidderRequest.gdprConsent.gdprApplies !== undefined
              ? bidderRequest.gdprConsent.gdprApplies
              : true,
        },
      };
    }

    let bidUserIdAsEids = deepAccess(bidRequests, '0.userIdAsEids');
    if (isArray(bidUserIdAsEids) && bidUserIdAsEids.length > 0) {
      deepSetValue(request, 'user.eids', bidUserIdAsEids);
    }

    // First Party Data
    const commonFpd = (bidderRequest && bidderRequest.ortb2) || {};
    const { user, device, site, bcat, badv } = commonFpd;
    if (site) {
      const { page, domain, ref } = request.site;
      mergeDeep(request, { site: site });
      request.site.page = page;
      request.site.domain = domain;
      request.site.ref = ref;
    }
    if (user) {
      mergeDeep(request, { user: user });
    }
    if (badv) {
      mergeDeep(request, { badv: badv });
    }
    if (bcat) {
      mergeDeep(request, { bcat: bcat });
    }
    // check if fpd ortb2 contains device property with sua object
    if (device?.sua) {
      request.device.sua = device?.sua;
    }

    if (user?.geo && device?.geo) {
      request.device.geo = { ...request.device.geo, ...device.geo };
      request.user.geo = { ...request.user.geo, ...user.geo };
    } else {
      if (user?.geo || device?.geo) {
        request.user.geo = request.device.geo = user?.geo
          ? { ...request.user.geo, ...user.geo }
          : { ...request.user.geo, ...device.geo };
      }
    }

    // if present, merge device object from ortb2 into `payload.device`
    if (bidderRequest?.ortb2?.device) {
      mergeDeep(request.device, bidderRequest.ortb2.device);
    }

    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(request),
    };
  },

  interpretResponse: (bidResponse, bidRequest) => {
    const idToImpMap = {};
    const idToBidMap = {};

    if (!bidResponse['body']) {
      return [];
    }
    parse(bidRequest.data).imp.forEach((imp) => {
      idToImpMap[imp.id] = imp;
    });
    bidResponse = bidResponse.body;
    if (bidResponse) {
      bidResponse.seatbid.forEach((seatBid) =>
        seatBid.bid.forEach((bid) => {
          idToBidMap[bid.impid] = bid;
        })
      );
    }
    const bids = [];
    Object.keys(idToImpMap).forEach((id) => {
      var imp = idToImpMap[id];
      var result = idToBidMap[id];

      if (result) {
        const bid = {
          requestId: id,
          cpm: result.price,
          creativeId: result.crid,
          ttl: 300,
          netRevenue: true,
          mediaType: imp.video ? VIDEO : BANNER,
          currency: bidResponse.cur,
        };
        if (imp.video) {
          bid.vastXml = result.adm;
          if (bidResponse.nurl) bid.vastUrl = result.nurl;
        } else if (imp.banner) {
          bid.ad = result.adm;
          bid.width = result.w;
          bid.height = result.h;
          bid.burl = result.burl;
        }
        if (result.adomain) {
          bid.meta = {
            advertiserDomains: result.adomain,
          };
        }
        bids.push(bid);
      }
    });
    return bids;
  },

  onBidWon: (bid) => {
    if (bid.burl && isStr(bid.burl)) {
      bid.burl = replaceAuctionPrice(bid.burl, bid.cpm);
      triggerPixel(bid.burl);
    }
  },
};

function impression(slot, currency) {
  let bidFloorFromModule;
  if (typeof slot.getFloor === 'function') {
    const floorInfo = slot.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*',
    });
    bidFloorFromModule =
      floorInfo?.currency === 'USD' ? floorInfo?.floor : undefined;
  }
  const imp = {
    id: slot.bidId,
    bidfloor: bidFloorFromModule || slot.params.bidfloor || 0,
    bidfloorcur:
     (bidFloorFromModule && 'USD') || slot.params.bidfloorcur || currency || 'USD',
    tagid: '' + (slot.params.zone || ''),
  };

  if (slot.mediaTypes.banner) {
    imp.banner = bannerImpression(slot);
  } else if (slot.mediaTypes.video) {
    imp.video = deepAccess(slot, 'mediaTypes.video');
  }
  imp.ext = slot.params || {};
  const { innerWidth, innerHeight } = getWinDimensions();
  imp.ext.ww = innerWidth || '';
  imp.ext.wh = innerHeight || '';
  return imp;
}

function bannerImpression(slot) {
  var sizes = slot.mediaTypes.banner.sizes || slot.sizes;
  return {
    format: sizes.map((s) => ({ w: s[0], h: s[1] })),
    w: sizes[0][0],
    h: sizes[0][1],
  };
}

function parse(rawResponse) {
  try {
    if (rawResponse) {
      if (typeof rawResponse === 'object') {
        return rawResponse;
      } else {
        return JSON.parse(rawResponse);
      }
    }
  } catch (ex) {
    logError('empowerBidAdapter', 'ERROR', ex);
  }
  return null;
}

function getDeviceConnectionType() {
  let connection =
    window.navigator &&
    (window.navigator.connection ||
      window.navigator.mozConnection ||
      window.navigator.webkitConnection);
  switch (connection?.effectiveType) {
    case 'ethernet':
      return 1;
    case 'wifi':
      return 2;
    case 'slow-2g':
    case '2g':
      return 4;
    case '3g':
      return 5;
    case '4g':
      return 6;
    default:
      return 0;
  }
}

registerBidder(spec);
