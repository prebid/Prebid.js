import * as utils from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { getPageTitle, getPageDescription, getPageKeywords, getConnectionDownLink, getReferrer } from '../libraries/fpdUtils/pageInfo.js';
import { getDevice } from '../libraries/fpdUtils/deviceInfo.js';
import { getBidFloor } from '../libraries/currencyUtils/floor.js';
import { transformSizesOrtb, normalAdSize } from '../libraries/sizeUtils/tranformSize.js';
import { getHLen } from '../libraries/navigatorData/navigatorData.js';
import { getOsInfo } from '../libraries/nexverseUtils/index.js';
import { cookieSync } from '../libraries/cookieSync/cookieSync.js';

type MediaGoTechnologyBidParams = {
  token: string;
  publisher?: string;
  placementId?: string;
  test?: number;
  tagid?: string;
  bidfloor?: number;
};

interface EidEntry {
  source: string;
  uids: Array<{ id: string }>;
}

interface OrtbSize {
  w: number;
  h: number;
}

const BIDDER_CODE = 'mediagoTechnology';
const ENDPOINT_URL = 'https://gbid.mediagotechnology.com/api/bid?tn=';
export const THIRD_PARTY_COOKIE_ORIGIN = 'https://cdn.mediagotechnology.com';

const TIME_TO_LIVE = 500;
const GVLID = 1575;
export const storage = getStorageManager({ bidderCode: BIDDER_CODE });
const globals: Record<string, string> = {};

export const COOKIE_KEY_MGUID = '__mguid_';
const COOKIE_RETENTION_TIME = 365 * 24 * 60 * 60 * 1000;
const COOKY_SYNC_IFRAME_URL = 'https://cdn.mediagotechnology.com/js/cookieSync.html';
let reqTimes = 0;

function getEidUid(eids: EidEntry[] | undefined, source: string): string | undefined {
  if (!Array.isArray(eids)) return;
  const eid = eids.find(e => e && e.source === source);
  return eid && eid.uids && eid.uids[0] && eid.uids[0].id;
}

function getProperty(obj: any, ...keys: Array<string | number>): any {
  let o = obj;

  for (const key of keys) {
    if (o && o[key]) {
      o = o[key];
    } else {
      return '';
    }
  }
  return o;
}

function getDeviceOs(): string {
  if ((navigator as any).userAgentData?.platform) {
    return (navigator as any).userAgentData.platform;
  }
  if (navigator.platform) {
    return navigator.platform;
  }
  return getOsInfo().os || '';
}

const mediagoAdSize = normalAdSize;

function getItems(validBidRequests: any[], bidderRequest: any): any[] {
  const items = validBidRequests.map((req, i) => {
    let ret: Record<string, any> = {};
    const mediaTypes = getProperty(req, 'mediaTypes');

    const bidFloor = getBidFloor(req);
    const gpid =
      utils.deepAccess(req, 'ortb2Imp.ext.gpid') ||
      utils.deepAccess(req, 'params.placementId', '');

    const gdprConsent: Record<string, any> = {};
    if (bidderRequest && bidderRequest.gdprConsent) {
      gdprConsent.consent = bidderRequest.gdprConsent.consentString;
      gdprConsent.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    }

    const id = getProperty(req, 'bidId') || ('' + (i + 1) + Math.random().toString(36).substring(2, 15));
    const ext = {
      adUnitCode: req.adUnitCode,
      referrer: getReferrer(req, bidderRequest),
      ortb2Imp: utils.deepAccess(req, 'ortb2Imp'),
      gpid: gpid + '',
      adslot: utils.deepAccess(req, 'ortb2Imp.ext.data.adserver.adslot', '', ''),
      publisher: req.params.publisher || '',
      transactionId: utils.deepAccess(req, 'ortb2Imp.ext.tid') || req.transactionId || '',
      ...gdprConsent
    };

    if (mediaTypes.native) {
      const nativeOrtbRequest = req.nativeOrtbRequest;
      if (nativeOrtbRequest) {
        ret = {
          id: id,
          bidfloor: bidFloor,
          native: {
            request: JSON.stringify(nativeOrtbRequest),
            ver: '1.2'
          },
          ext: ext,
          tagid: req.params && req.params.tagid
        };
      }
    } else if (mediaTypes.banner) {
      const sizes: OrtbSize[] = transformSizesOrtb(getProperty(req, 'sizes'));
      let matchSize: OrtbSize | undefined;

      for (const size of sizes) {
        matchSize = mediagoAdSize.find((item: OrtbSize) => size.w === item.w && size.h === item.h);
        if (matchSize) {
          break;
        }
      }
      if (!matchSize) {
        matchSize = sizes[0] ? { h: sizes[0].h || 0, w: sizes[0].w || 0 } : { h: 0, w: 0 };
      }

      ret = {
        id: id,
        bidfloor: bidFloor,
        banner: {
          h: matchSize.h,
          w: matchSize.w,
          pos: utils.deepAccess(req, 'mediaTypes.banner.pos') || 1,
          format: sizes
        },
        ext: {
          adUnitCode: req.adUnitCode,
          referrer: getReferrer(req, bidderRequest),
          ortb2Imp: utils.deepAccess(req, 'ortb2Imp'),
          gpid: gpid + '',
          adslot: utils.deepAccess(req, 'ortb2Imp.ext.data.adserver.adslot', '', ''),
          publisher: req.params.publisher || '',
          transactionId: utils.deepAccess(req, 'ortb2Imp.ext.tid') || req.transactionId || '',
          ...gdprConsent
        },
        tagid: req.params && req.params.tagid
      };
    }

    return ret;
  });
  return items;
}

export function getCurrentTimeToUTCString(): string {
  const date = new Date();
  date.setTime(date.getTime() + COOKIE_RETENTION_TIME);
  return date.toUTCString();
}

function getParam(validBidRequests: any[], bidderRequest: any): Record<string, any> | null {
  const bidsUserIdAsEids = validBidRequests[0].userIdAsEids;
  const eids = bidsUserIdAsEids;

  const pubcid = utils.deepAccess(validBidRequests[0], 'crumbs.pubcid') ||
    getEidUid(eids, 'pubcid.org') ||
    getEidUid(eids, 'sharedid.org');
  const content = utils.deepAccess(bidderRequest, 'ortb2.site.content');
  const cat = utils.deepAccess(bidderRequest, 'ortb2.site.cat');
  reqTimes += 1;

  const isMobile = getDevice() ? 1 : 0;
  const isTest = validBidRequests[0].params.test || 0;
  const bidderRequestId = getProperty(bidderRequest, 'bidderRequestId');
  const items = getItems(validBidRequests, bidderRequest);

  const domain = utils.deepAccess(bidderRequest, 'refererInfo.domain') || document.domain;
  const location = utils.deepAccess(bidderRequest, 'refererInfo.location');
  const page = utils.deepAccess(bidderRequest, 'refererInfo.page');
  const referer = utils.deepAccess(bidderRequest, 'refererInfo.ref');

  const timeout = bidderRequest.timeout || 2000;
  const firstPartyData = bidderRequest.ortb2;
  const title = getPageTitle();
  const desc = getPageDescription();
  const keywords = getPageKeywords();

  if (items && items.length) {
    return {
      id: 'mgprebidjs_' + bidderRequestId,
      test: +isTest,
      at: 1,
      cur: ['USD'],
      device: {
        connectiontype: 0,
        js: 1,
        os: getDeviceOs(),
        ua: navigator.userAgent,
        language: /en/.test(navigator.language) ? 'en' : navigator.language
      },
      ext: {
        pbjsversion: '$prebid.version$',
        eids,
        bidsUserIdAsEids,
        firstPartyData,
        content,
        cat,
        reqTimes,
        page: {
          title: title ? title.slice(0, 100) : undefined,
          desc: desc ? desc.slice(0, 300) : undefined,
          keywords: keywords ? keywords.slice(0, 100) : undefined,
          hLen: getHLen(),
        },
        device: {
          nbw: getConnectionDownLink(),
        },
      },
      user: {
        buyeruid: storage.getCookie(COOKIE_KEY_MGUID) || undefined,
        id: pubcid,
      },
      eids,
      site: {
        name: domain,
        domain: domain,
        page: page || location,
        ref: referer,
        mobile: isMobile,
        cat: [],
        publisher: {
          id: globals['publisher']
        }
      },
      imp: items,
      tmax: timeout
    };
  } else {
    return null;
  }
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, NATIVE] as const,

  isBidRequestValid: function (bid: any): boolean {
    const params = bid.params as MediaGoTechnologyBidParams;
    if (params.token) {
      globals['token'] = params.token;
    }
    if (params.publisher) {
      globals['publisher'] = params.publisher;
    }
    return !!params.token;
  },

  buildRequests: function (validBidRequests: any[], bidderRequest: any) {
    const payload = getParam(validBidRequests, bidderRequest);

    const mediaTypeMap: Record<string, string> = {};
    validBidRequests.forEach((req) => {
      const bidId = getProperty(req, 'bidId');
      if (req.mediaTypes && req.mediaTypes.native) {
        mediaTypeMap[bidId] = NATIVE;
      } else {
        mediaTypeMap[bidId] = BANNER;
      }
    });

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST' as const,
      url: ENDPOINT_URL + globals['token'],
      data: payloadString,
      _mediaTypeMap: mediaTypeMap,
    };
  },

  interpretResponse: function (serverResponse: any, bidRequest: any) {
    const bids = getProperty(serverResponse, 'body', 'seatbid', 0, 'bid');
    const cur = getProperty(serverResponse, 'body', 'cur');
    const mediaTypeMap: Record<string, string> = (bidRequest && bidRequest._mediaTypeMap) || {};

    const bidResponses: any[] = [];
    for (const bid of bids) {
      const impid = getProperty(bid, 'impid');
      if (impid) {
        const mediaType = mediaTypeMap[impid] || BANNER;
        const bidResponse: Record<string, any> = {
          requestId: impid,
          cpm: getProperty(bid, 'price'),
          creativeId: getProperty(bid, 'crid'),
          dealId: '',
          currency: cur,
          netRevenue: true,
          ttl: TIME_TO_LIVE,
          nurl: getProperty(bid, 'nurl'),
          meta: {
            advertiserDomains: getProperty(bid, 'adomain') || []
          }
        };

        if (mediaType === NATIVE) {
          bidResponse.mediaType = NATIVE;
          try {
            const admObj = JSON.parse(bid.adm);
            const nativeObj = admObj.native || admObj;
            bidResponse.native = { ortb: nativeObj };
          } catch (e) {
            continue;
          }
          bidResponse.width = 1;
          bidResponse.height = 1;
        } else {
          bidResponse.mediaType = BANNER;
          bidResponse.ad = getProperty(bid, 'adm');
          bidResponse.width = getProperty(bid, 'w');
          bidResponse.height = getProperty(bid, 'h');
        }

        bidResponses.push(bidResponse);
      }
    }

    return bidResponses;
  },

  getUserSyncs: function (syncOptions: any, serverResponse: any, gdprConsent: any, uspConsent: any, gppConsent: any) {
    return cookieSync(syncOptions, gdprConsent, uspConsent, BIDDER_CODE, THIRD_PARTY_COOKIE_ORIGIN, COOKY_SYNC_IFRAME_URL, getCurrentTimeToUTCString());
  },

  onBidWon: function (bid: Record<string, any>) {
    if (bid['nurl']) {
      utils.triggerPixel(bid['nurl']);
    }
  }
};
registerBidder(spec);
