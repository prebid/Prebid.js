import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { EVENT_TYPE_IMPRESSION, TRACKER_METHOD_IMG } from '../src/eventTrackers.js';
import { BANNER } from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_BIDDER } from '../src/activities/modules.js';
import { config } from '../src/config.js';

export const BIDDER_CODE = 'eightpod';
export const GVLID = 1497;
const EIGHTPOD_EID_SOURCE = '8podx.com';
const storage = getStorageManager({ moduleType: MODULE_TYPE_BIDDER, bidderCode: BIDDER_CODE });
const url = 'https://wild.8podx.com/bidder/rtb/eightpod_exchange/bid';
const tealiumUrl = 'https://lib-cdn.8pod.com/main/prod/utag.js';

/**
 * @typedef {Object} EightPodBidParams
 * @property {string} [placementId] - Optional placement ID, sent as OpenRTB imp.tagid.
 * @property {string} [publisherId] - Legacy override for ortb2.site.publisher.id.
 * @property {string} [dealId] - Optional PMP deal ID override.
 * @property {string} [userId] - Legacy override for ortb2.user.id; prefer user.ext.eids.
 * @property {string} [eightPodVisitorId] - Optional EightPod/Tealium visitor ID for user.ext.eids.
 * @property {boolean|string} [trace] - Enables trace mode for debugging.
 * @property {string} [country] - Legacy override for ortb2.device.geo.country and ortb2.user.geo.country.
 * @property {string} [language] - Legacy override for ortb2.device.language.
 * @property {string} [publishercat] - Legacy comma-separated override for ortb2.site.publisher.cat.
 * @property {string} [sitecat] - Legacy comma-separated override for ortb2.site.cat.
 * @property {string} [pagecat] - Legacy comma-separated override for ortb2.site.pagecat.
 * @property {string} [sectioncat] - Legacy comma-separated override for ortb2.site.sectioncat.
 * @property {number|string} [yob] - Legacy override for ortb2.user.yob.
 * @property {string} [gender] - Legacy override for ortb2.user.gender.
 * @property {string} [city] - Legacy override for ortb2.user.geo.city.
 * @property {string} [region] - Legacy override for ortb2.user.geo.region.
 */

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  isBannerBid,
};

registerBidder(spec);

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    return req;
  },
  response(buildResponse, bidResponses, ortbResponse, context) {
    const response = buildResponse(bidResponses, ortbResponse, context);
    return response.bids;
  },
  imp(buildImp, bidRequest, context) {
    return buildImp(bidRequest, context);
  },
  bidResponse
});

function isBidRequestValid(bidRequest) {
  return !!bidRequest;
}

function buildRequests(bids, bidderRequest) {
  let bannerBids = bids.filter((bid) => isBannerBid(bid));
  let requests = bannerBids.length
    ? createRequest(bannerBids, bidderRequest, BANNER)
    : [];

  return requests;
}

function bidResponse(buildBidResponse, bid, context) {
  const nurl = replacePriceInUrl(bid.nurl, bid.price);
  const bidWithoutNurl = {
    ...bid,
    nurl: undefined,
  };

  const bidResponse = buildBidResponse(bidWithoutNurl, context);

  bidResponse.height = context?.imp?.banner?.format?.[0].h;
  bidResponse.width = context?.imp?.banner?.format?.[0].w;
  bidResponse.cid = bid.cid;
  bidResponse.ext = bid.ext;
  bidResponse.crid = bid.crid;
  bidResponse.burl = replacePriceInUrl(bid.burl, bidResponse.originalCpm || bidResponse.cpm);
  bidResponse.ad = addWinNoticeTracker(bidResponse.ad, nurl);
  addBillingEventTracker(bidResponse, bidResponse.burl);

  bidResponse.meta = {
    advertiserDomains: bid.adomain || [],
    mediaType: BANNER,
  };

  return bidResponse;
}

function addBillingEventTracker(bidResponse, burl) {
  if (typeof burl !== 'string') {
    return;
  }

  bidResponse.eventtrackers = [
    ...(Array.isArray(bidResponse.eventtrackers) ? bidResponse.eventtrackers : []),
    {
      event: EVENT_TYPE_IMPRESSION,
      method: TRACKER_METHOD_IMG,
      url: burl,
    },
  ];
}

function addWinNoticeTracker(ad, nurl) {
  if (typeof ad !== 'string' || typeof nurl !== 'string') {
    return ad;
  }

  const trackingPixel = `<div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="${escapeAttribute(nurl)}"></div>`;
  const bodyMatch = /<body(\s[^>]*)?>/i.exec(ad);

  if (bodyMatch) {
    const insertAt = bodyMatch.index + bodyMatch[0].length;
    return `${ad.slice(0, insertAt)}${trackingPixel}${ad.slice(insertAt)}`;
  }

  return `${trackingPixel}${ad}`;
}

function escapeAttribute(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function replacePriceInUrl(url, price) {
  if (typeof url !== 'string') {
    return url;
  }
  return url.replace(/\${AUCTION_PRICE}/, price);
}

function isValidBidResponse(bid) {
  const hasAd = typeof bid?.ad === 'string' && bid.ad.length > 0;
  const hasValidNurl = bid.nurl === undefined || typeof bid.nurl === 'string';
  const hasValidBurl = bid.burl === undefined || typeof bid.burl === 'string';
  return hasAd && hasValidNurl && hasValidBurl;
}

export function parseUserAgent() {
  const ua = navigator.userAgent.toLowerCase();

  // Check if it's iOS
  if (/iphone|ipad|ipod/.test(ua)) {
    // Extract iOS version and device type
    const iosInfo = /\b(iphone|ipad|ipod)\b.*?\bos\s+(\d+(?:[._\s]\d+)*)/.exec(ua);
    const iosVersion = iosInfo?.[2] || '';
    return {
      platform: 'ios',
      device: iosInfo?.[1] || '',
      version: iosVersion.replace(/[._\s]+/g, '.')
    };
  } else if (/android/.test(ua)) {
    // Check if it's Android
    // Extract Android version
    const androidVersion = /android (\d+([._]\d+)?)/.exec(ua);
    return {
      platform: 'android',
      version: androidVersion ? androidVersion[1].replace('_', '.') : '',
      device: ''
    };
  } else {
    // If neither iOS nor Android, return unknown
    return {
      platform: 'Unknown',
      version: '',
      device: ''
    };
  }
}

export function getPageKeywords(win = window) {
  let element;

  try {
    element = win.top.document.querySelector('meta[name="keywords"]');
  } catch (e) {
    element = document.querySelector('meta[name="keywords"]');
  }

  return ((element && element.content) || '').replaceAll(' ', '');
}

function getCookie(name) {
  return storage.cookiesAreEnabled() ? storage.getCookie(name) : undefined;
}

function appendEightPodEid(eids, eightPodVisitorId) {
  if (!eightPodVisitorId) {
    return eids;
  }

  const existingEids = Array.isArray(eids) ? eids : [];
  const eightPodEid = existingEids.find(eid => eid.source === EIGHTPOD_EID_SOURCE);
  const eightPodUid = { id: eightPodVisitorId, atype: 1 };

  if (eightPodEid) {
    const existingUids = Array.isArray(eightPodEid.uids) ? eightPodEid.uids : [];
    if (existingUids.some(uid => uid.id === eightPodVisitorId)) {
      return existingEids;
    }

    return existingEids.map(eid => eid === eightPodEid
      ? { ...eid, uids: [...existingUids, eightPodUid] }
      : eid
    );
  }

  return [
    ...existingEids,
    {
      source: EIGHTPOD_EID_SOURCE,
      uids: [eightPodUid],
    }
  ];
}

function getExistingEids(data, bidRequest, bidderRequest) {
  return [
    data.user?.ext?.eids,
    bidRequest.userIdAsEids,
    utils.deepAccess(bidRequest, 'ortb2.user.ext.eids'),
    utils.deepAccess(bidderRequest, 'ortb2.user.ext.eids'),
  ].reduce((eids, value) => Array.isArray(value) ? eids.concat(value) : eids, []);
}

function hasParam(params, key) {
  return params?.[key] !== undefined && params[key] !== null && params[key] !== '';
}

function parseCategoryParam(value) {
  return String(value).split(',').map(s => s.trim()).filter(Boolean);
}

function setOverride(target, path, value) {
  if (value !== undefined) {
    utils.deepSetValue(target, path, value);
  }
}

function getLegacyDeviceOverrides(params) {
  const device = {};

  setOverride(device, 'geo.country', hasParam(params, 'country') ? params.country : undefined);
  setOverride(device, 'language', hasParam(params, 'language') ? params.language : undefined);

  return device;
}

function getLegacySiteOverrides(params) {
  const site = {};

  setOverride(site, 'publisher.id', hasParam(params, 'publisherId') ? params.publisherId : undefined);
  setOverride(site, 'publisher.cat', hasParam(params, 'publishercat') ? parseCategoryParam(params.publishercat) : undefined);
  setOverride(site, 'cat', hasParam(params, 'sitecat') ? parseCategoryParam(params.sitecat) : undefined);
  setOverride(site, 'pagecat', hasParam(params, 'pagecat') ? parseCategoryParam(params.pagecat) : undefined);
  setOverride(site, 'sectioncat', hasParam(params, 'sectioncat') ? parseCategoryParam(params.sectioncat) : undefined);

  return site;
}

function getLegacyUserOverrides(params) {
  const user = {};

  setOverride(user, 'id', hasParam(params, 'userId') ? params.userId : undefined);
  setOverride(user, 'yob', hasParam(params, 'yob') ? params.yob : undefined);
  setOverride(user, 'gender', hasParam(params, 'gender') ? params.gender : undefined);
  setOverride(user, 'geo.city', hasParam(params, 'city') ? params.city : undefined);
  setOverride(user, 'geo.region', hasParam(params, 'region') ? params.region : undefined);
  setOverride(user, 'geo.country', hasParam(params, 'country') ? params.country : undefined);

  return user;
}

export function applyPrivacyConsent(data, bidderRequest) {
  const { gdprConsent, uspConsent, gppConsent } = bidderRequest || {};

  if (gdprConsent) {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      utils.deepSetValue(data, 'regs.ext.gdpr', gdprConsent.gdprApplies ? 1 : 0);
    }
    if (gdprConsent.consentString) {
      utils.deepSetValue(data, 'user.ext.consent', gdprConsent.consentString);
    }
  }

  if (uspConsent) {
    utils.deepSetValue(data, 'regs.ext.us_privacy', uspConsent);
  }

  if (gppConsent) {
    if (gppConsent.gppString) {
      utils.deepSetValue(data, 'regs.gpp', gppConsent.gppString);
      utils.deepSetValue(data, 'regs.ext.gpp', gppConsent.gppString);
    }
    if (Array.isArray(gppConsent.applicableSections)) {
      utils.deepSetValue(data, 'regs.gpp_sid', gppConsent.applicableSections);
      utils.deepSetValue(data, 'regs.ext.gpp_sid', gppConsent.applicableSections);
    }
  } else if (utils.deepAccess(bidderRequest, 'ortb2.regs.gpp')) {
    utils.deepSetValue(data, 'regs.gpp', bidderRequest.ortb2.regs.gpp);
    utils.deepSetValue(data, 'regs.ext.gpp', bidderRequest.ortb2.regs.gpp);
    if (utils.deepAccess(bidderRequest, 'ortb2.regs.gpp_sid')) {
      utils.deepSetValue(data, 'regs.gpp_sid', bidderRequest.ortb2.regs.gpp_sid);
      utils.deepSetValue(data, 'regs.ext.gpp_sid', bidderRequest.ortb2.regs.gpp_sid);
    }
  }

  if (config.getConfig('coppa') === true) {
    utils.deepSetValue(data, 'regs.coppa', 1);
  }
}

export function createRequest(bidRequests, bidderRequest, mediaType) {
  const requests = bidRequests.map((bidRequest) => {
    const data = converter.toORTB({
      bidRequests: [bidRequest],
      bidderRequest,
      context: { mediaType },
    });

    data.at = 1;

    const params = getBidderParams(bidRequest);
    data.device = utils.mergeDeep({}, data.device, getLegacyDeviceOverrides(params));
    data.site = utils.mergeDeep({}, data.site, getLegacySiteOverrides(params));
    if (hasParam(params, 'publishercat')) {
      data.site.publisher = data.site.publisher || {};
      data.site.publisher.cat = parseCategoryParam(params.publishercat);
    }
    if (hasParam(params, 'sitecat')) {
      data.site.cat = parseCategoryParam(params.sitecat);
    }
    if (hasParam(params, 'pagecat')) {
      data.site.pagecat = parseCategoryParam(params.pagecat);
    }
    if (hasParam(params, 'sectioncat')) {
      data.site.sectioncat = parseCategoryParam(params.sectioncat);
    }
    data.ext = utils.mergeDeep({}, data.ext, {
      adSlotPositionOnScreen: '1',
      ...(hasParam(params, 'placementId') ? { adSlotPlacementId: params.placementId } : {}),
    });
    const existingPmp = data.imp?.[0]?.pmp;
    data.imp = [
      {
        ...data.imp?.[0],
        secure: 1,
        ...(hasParam(params, 'placementId') ? { tagid: params.placementId } : {}),
        pmp: params.dealId
          ? {
              ...(existingPmp || {}),
              deals: [
                {
                  id: params.dealId,
                },
              ],
              private_auction: 1,
            }
          : existingPmp,
      }
    ];

    const eightPodVisitorId = params.eightPodVisitorId || getCookie('utag_main_v_id');
    const eids = getExistingEids(data, bidRequest, bidderRequest);

    data.user = utils.mergeDeep({}, data.user, getLegacyUserOverrides(params), {
      ext: {
        eightPodVisitorId,
        eids: appendEightPodEid(eids, eightPodVisitorId),
      }
    });

    applyPrivacyConsent(data, bidderRequest);

    const req = {
      method: 'POST',
      url: url && params.trace ? url + '?trace=true' : url,
      options: { withCredentials: false },
      data
    };
    return req;
  });

  return requests;
}

function getBidderParams(bid) {
  return bid?.params || {};
}

function isBannerBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.banner');
}

function interpretResponse(resp, req) {
  if (!resp?.body) {
    return [];
  }

  const bidResponses = converter.fromORTB({ request: req.data, response: resp.body });

  if (!Array.isArray(bidResponses) || bidResponses.length === 0) {
    return [];
  }

  const validBids = bidResponses.filter(isValidBidResponse);
  if (validBids.length === 0) {
    return [];
  }

  const trackingTag = `<script type="text/javascript">
            var utag_data = {
            }
        </script>
        <!-- Tealium Universal Tag -->
        <script type="text/javascript">
          (function(a,b,c,d) {
              a='${tealiumUrl}';
              b=document;c='script';d=b.createElement(c);d.src=a;
              d.type='text/java'+c;d.async=true;
              a=b.getElementsByTagName(c)[0];a.parentNode.insertBefore(d,a)})();
        </script>
        `;

  validBids.forEach((bid) => {
    bid.ad = bid.ad.replace('</head>', trackingTag + '</head>');
  });
  return validBids;
}
