import { generateUUID, deepAccess, logWarn, deepSetValue } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'bmtm';
const AD_URL = 'https://one.elitebidder.com/api/hb?sid=';
const SYNC_URL = 'https://console.brightmountainmedia.com:8443/cookieSync';
const CURRENCY = 'USD';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['brightmountainmedia'],
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: (bid) => {
    if (bid.bidId && bid.bidder && bid.params && bid.params.placement_id) {
      return true;
    }
    if (bid.params.placement_id == 0 && bid.params.test === 1) {
      return true;
    }
    return false;
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    let requestData = [];
    let size = [0, 0];
    let oRTBRequest = {
      at: 2,
      site: buildSite(bidderRequest),
      device: buildDevice(),
      cur: [CURRENCY],
      tmax: 1000,
      regs: buildRegs(bidderRequest),
      user: {},
      source: {},
    };

    validBidRequests.forEach((bid) => {
      oRTBRequest['id'] = generateUUID();
      oRTBRequest['imp'] = [
        {
          id: '1',
          bidfloor: 0,
          bidfloorcur: CURRENCY,
          secure: document.location.protocol === 'https:' ? 1 : 0,
          ext: {
            placement_id: bid.params.placement_id,
            prebidVersion: '$prebid.version$',
          }
        },
      ];

      if (deepAccess(bid, 'mediaTypes.banner')) {
        if (bid.mediaTypes.banner.sizes) {
          size = bid.mediaTypes.banner.sizes[0];
        }

        oRTBRequest.imp[0].banner = {
          h: size[0],
          w: size[1],
        }
      } else {
        if (bid.mediaTypes.video.playerSize) {
          size = bid.mediaTypes.video.playerSize[0];
        }

        oRTBRequest.imp[0].video = {
          h: size[0],
          w: size[1],
          mimes: bid.mediaTypes.video.mimes ? bid.mediaTypes.video.mimes : [],
          skip: bid.mediaTypes.video.skip ? 1 : 0,
          playbackmethod: bid.mediaTypes.video.playbackmethod ? bid.mediaTypes.video.playbackmethod : [],
          protocols: bid.mediaTypes.video.protocols ? bid.mediaTypes.video.protocols : [],
          api: bid.mediaTypes.video.api ? bid.mediaTypes.video.api : [],
          minduration: bid.mediaTypes.video.minduration ? bid.mediaTypes.video.minduration : 1,
          maxduration: bid.mediaTypes.video.maxduration ? bid.mediaTypes.video.maxduration : 999,
        }
      }

      oRTBRequest.imp[0].bidfloor = getFloor(bid, size);
      oRTBRequest.user = getUserIdAsEids(bid.userIdAsEids)
      oRTBRequest.source = getSchain(bid.schain)

      requestData.push({
        method: 'POST',
        url: `${AD_URL}${bid.params.placement_id}`,
        data: JSON.stringify(oRTBRequest),
        bidRequest: bid,
      })
    });
    return requestData;
  },

  interpretResponse: (serverResponse, { bidRequest }) => {
    let bidResponse = [];
    let bid;
    let response;

    try {
      response = serverResponse.body
      bid = response.seatbid[0].bid[0];
    } catch (e) {
      response = null;
    }

    if (!response || !bid || !bid.adm || !bid.price) {
      logWarn(`Bidder ${spec.code} no valid bid`);
      return [];
    }

    let tempResponse = {
      requestId: bidRequest.bidId,
      cpm: bid.price,
      currency: response.cur,
      width: bid.w,
      height: bid.h,
      creativeId: bid.crid,
      mediaType: deepAccess(bidRequest, 'mediaTypes.banner') ? BANNER : VIDEO,
      ttl: 3000,
      netRevenue: true,
      meta: {
        advertiserDomains: bid.adomain
      }
    };

    if (tempResponse.mediaType === BANNER) {
      tempResponse.ad = replaceAuctionPrice(bid.adm, bid.price);
    } else {
      tempResponse.vastXml = replaceAuctionPrice(bid.adm, bid.price);
    }

    bidResponse.push(tempResponse);
    return bidResponse;
  },

  getUserSyncs: (syncOptions) => {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: SYNC_URL
      }];
    }
  },

};

registerBidder(spec);

function buildSite(bidderRequest) {
  // TODO: should name/domain be the domain?
  let site = {
    name: window.location.hostname,
    publisher: {
      domain: window.location.hostname,
    }
  };

  if (bidderRequest && bidderRequest.refererInfo) {
    deepSetValue(
      site,
      'page',
      bidderRequest.refererInfo.page
    );
    deepSetValue(
      site,
      'ref',
      bidderRequest.refererInfo.ref
    );
  }
  return site;
}

function buildDevice() {
  return {
    ua: navigator.userAgent,
    w: window.top.screen.width,
    h: window.top.screen.height,
    js: 1,
    language: navigator.language,
    dnt: navigator.doNotTrack === 'yes' || navigator.doNotTrack == '1' ||
      navigator.msDoNotTrack == '1' ? 1 : 0,
  }
}

function buildRegs(bidderRequest) {
  let regs = {
    coppa: config.getConfig('coppa') == true ? 1 : 0,
  };

  if (bidderRequest && bidderRequest.gdprConsent) {
    deepSetValue(
      regs,
      'ext.gdpr',
      bidderRequest.gdprConsent.gdprApplies ? 1 : 0,
    );
    deepSetValue(
      regs,
      'ext.gdprConsentString',
      bidderRequest.gdprConsent.consentString || 'ALL',
    );
  }

  if (bidderRequest && bidderRequest.uspConsent) {
    deepSetValue(regs,
      'ext.us_privacy',
      bidderRequest.uspConsent);
  }
  return regs;
}

function replaceAuctionPrice(str, cpm) {
  if (!str) return;
  return str.replace(/\$\{AUCTION_PRICE\}/g, cpm);
}

function getFloor(bid, size) {
  if (typeof bid.getFloor === 'function') {
    let floorInfo = {};
    floorInfo = bid.getFloor({
      currency: 'USD',
      mediaType: 'banner',
      size: size,
    });

    if (typeof floorInfo === 'object' && floorInfo.currency === 'USD') {
      return parseFloat(floorInfo.floor);
    }
  }
  return 0;
}

function getUserIdAsEids(userIds) {
  if (userIds) {
    return {
      ext: {
        eids: userIds,
      }
    }
  };
  return {};
}

function getSchain(schain) {
  if (schain) {
    return {
      ext: {
        schain: schain,
      }
    }
  }
  return {};
}
