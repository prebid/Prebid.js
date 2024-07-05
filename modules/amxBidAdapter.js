import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {
  _each,
  deepAccess,
  formatQS,
  getUniqueIdentifierStr,
  isArray,
  isFn,
  logError,
  parseUrl,
  triggerPixel,
  generateUUID,
} from '../src/utils.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';
import { fetch } from '../src/ajax.js';

const BIDDER_CODE = 'amx';
const storage = getStorageManager({ bidderCode: BIDDER_CODE });
const SIMPLE_TLD_TEST = /\.com?\.\w{2,4}$/;
const DEFAULT_ENDPOINT = 'https://prebid.a-mo.net/a/c';
const VERSION = 'pba1.3.4';
const VAST_RXP = /^\s*<\??(?:vast|xml)/i;
const TRACKING_BASE = 'https://1x1.a-mo.net/';
const TRACKING_ENDPOINT = TRACKING_BASE + 'hbx/';
const POST_TRACKING_ENDPOINT = TRACKING_BASE + 'e';
const AMUID_KEY = '__amuidpb';

function getLocation(request) {
  return parseUrl(request.refererInfo?.topmostLocation || window.location.href);
}

function getTimeoutSize(timeoutData) {
  if (timeoutData.sizes == null || timeoutData.sizes.length === 0) {
    return [0, 0];
  }

  return timeoutData.sizes[0];
}

const largestSize = (sizes, mediaTypes) => {
  const allSizes = sizes
    .concat(deepAccess(mediaTypes, `${BANNER}.sizes`, []) || [])
    .concat(deepAccess(mediaTypes, `${VIDEO}.sizes`, []) || []);

  return allSizes.sort((a, b) => b[0] * b[1] - a[0] * a[1])[0];
};

function flatMap(input, mapFn) {
  if (input == null) {
    return [];
  }
  return input
    .map(mapFn)
    .reduce((acc, item) => item != null && acc.concat(item), []);
}

const isVideoADM = (html) => html != null && VAST_RXP.test(html);

function getMediaType(bid) {
  if (isVideoADM(bid.adm)) {
    return VIDEO;
  }

  return BANNER;
}

const nullOrType = (value, type) => value == null || typeof value === type; // eslint-disable-line valid-typeof

function getID(loc) {
  const host = loc.hostname.split('.');
  const short = host
    .slice(host.length - (SIMPLE_TLD_TEST.test(loc.hostname) ? 3 : 2))
    .join('.');
  return btoa(short).replace(/=+$/, '');
}

const enc = encodeURIComponent;

function getUIDSafe() {
  try {
    return storage.getDataFromLocalStorage(AMUID_KEY);
  } catch (e) {
    return null;
  }
}

function setUIDSafe(uid) {
  try {
    storage.setDataInLocalStorage(AMUID_KEY, uid);
  } catch (e) {
    // do nothing
  }
}

function nestedQs(qsData) {
  const out = [];
  Object.keys(qsData || {}).forEach((key) => {
    out.push(enc(key) + '=' + enc(String(qsData[key])));
  });

  return enc(out.join('&'));
}

function createBidMap(bids) {
  const out = {};
  _each(bids, (bid) => {
    out[bid.bidId] = convertRequest(bid);
  });
  return out;
}

const trackEvent = (eventName, data) =>
  triggerPixel(
    `${TRACKING_ENDPOINT}g_${eventName}?${formatQS({
      ...data,
      ts: Date.now(),
      eid: getUniqueIdentifierStr(),
    })}`
  );

const DEFAULT_MIN_FLOOR = 0;

function ensureFloor(floorValue) {
  return typeof floorValue === 'number' &&
    isFinite(floorValue) &&
    floorValue > 0.0
    ? floorValue
    : DEFAULT_MIN_FLOOR;
}

function getFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return deepAccess(bid, 'params.floor', DEFAULT_MIN_FLOOR);
  }

  try {
    const floor = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*',
      bidRequest: bid,
    });
    return floor.floor;
  } catch (e) {
    logError('call to getFloor failed: ', e);
    return DEFAULT_MIN_FLOOR;
  }
}

function refInfo(bidderRequest, subKey, defaultValue) {
  return deepAccess(bidderRequest, 'refererInfo.' + subKey, defaultValue);
}

function convertRequest(bid) {
  const size = largestSize(bid.sizes, bid.mediaTypes) || [0, 0];
  const isVideoBid = bid.mediaType === VIDEO || VIDEO in bid.mediaTypes;
  const av = isVideoBid || size[1] > 100;
  const tid = deepAccess(bid, 'params.tagId');

  const au =
    bid.params != null &&
      typeof bid.params.adUnitId === 'string' &&
      bid.params.adUnitId !== ''
      ? bid.params.adUnitId
      : bid.adUnitCode;

  const multiSizes = [
    bid.sizes,
    deepAccess(bid, `mediaTypes.${BANNER}.sizes`, []) || [],
    deepAccess(bid, `mediaTypes.${VIDEO}.sizes`, []) || [],
  ];

  const videoData = deepAccess(bid, `mediaTypes.${VIDEO}`, {}) || {};

  const params = {
    au,
    av,
    vd: videoData,
    vr: isVideoBid,
    ms: multiSizes,
    aw: size[0],
    ah: size[1],
    tf: 0,
    sc: bid.schain || {},
    f: ensureFloor(getFloor(bid)),
    rtb: bid.ortb2Imp,
  };

  if (typeof tid === 'string' && tid.length > 0) {
    params.i = tid;
  }
  return params;
}

function resolveSize(bid, request, bidId) {
  if (bid.w != null && bid.w > 1 && bid.h != null && bid.h > 1) {
    return [bid.w, bid.h];
  }

  const bidRequest = request.m[bidId];
  if (bidRequest == null) {
    return [0, 0];
  }

  return [bidRequest.aw, bidRequest.ah];
}

function isSyncEnabled(syncConfigP, syncType) {
  if (syncConfigP == null) return false;

  const syncConfig = syncConfigP[syncType];
  if (syncConfig == null) {
    return false;
  }

  if (
    syncConfig.bidders === '*' ||
    (isArray(syncConfig.bidders) && syncConfig.bidders.indexOf('amx') !== -1)
  ) {
    return syncConfig.filter == null || syncConfig.filter === 'include';
  }

  return false;
}

const SYNC_IMAGE = 1;
const SYNC_IFRAME = 2;

function getSyncSettings() {
  const syncConfig = config.getConfig('userSync');
  if (syncConfig == null) {
    return {
      d: 0,
      l: 0,
      t: 0,
      e: true,
    };
  }

  const settings = {
    d: syncConfig.syncDelay,
    l: syncConfig.syncsPerBidder,
    t: 0,
    e: syncConfig.syncEnabled,
  };
  const all = isSyncEnabled(syncConfig.filterSettings, 'all');

  if (all) {
    settings.t = SYNC_IMAGE & SYNC_IFRAME;
    return settings;
  }

  if (isSyncEnabled(syncConfig.filterSettings, 'iframe')) {
    settings.t |= SYNC_IFRAME;
  }
  if (isSyncEnabled(syncConfig.filterSettings, 'image')) {
    settings.t |= SYNC_IMAGE;
  }

  return settings;
}

function values(source) {
  if (Object.values != null) {
    return Object.values(source);
  }

  return Object.keys(source).map((key) => {
    return source[key];
  });
}

function getGpp(bidderRequest) {
  if (bidderRequest?.gppConsent != null) {
    return bidderRequest.gppConsent;
  }

  return (
    bidderRequest?.ortb2?.regs?.gpp ?? { gppString: '', applicableSections: '' }
  );
}

function buildReferrerInfo(bidderRequest) {
  if (bidderRequest.refererInfo == null) {
    return { r: '', t: false, c: '', l: 0, s: [] };
  }

  const re = bidderRequest.refererInfo;

  return {
    r: re.topmostLocation,
    t: re.reachedTop,
    l: re.numIframes,
    s: re.stack,
    c: re.canonicalUrl,
  };
}

const isTrue = (boolValue) =>
  boolValue === true || boolValue === 1 || boolValue === 'true';

export const spec = {
  code: BIDDER_CODE,
  gvlid: 737,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid(bid) {
    return (
      nullOrType(deepAccess(bid, 'params.endpoint', null), 'string') &&
      nullOrType(deepAccess(bid, 'params.tagId', null), 'string')
    );
  },

  buildRequests(bidRequests, bidderRequest) {
    const loc = getLocation(bidderRequest);
    const tagId = deepAccess(bidRequests[0], 'params.tagId', null);
    const testMode = deepAccess(bidRequests[0], 'params.testMode', 0);
    const fbid =
      bidRequests[0] != null
        ? bidRequests[0]
        : {
          bidderRequestsCount: 0,
          bidderWinsCount: 0,
          bidRequestsCount: 0,
        };

    const payload = {
      a: generateUUID(),
      B: 0,
      b: loc.host,
      brc: fbid.bidderRequestsCount || 0,
      bwc: fbid.bidderWinsCount || 0,
      trc: fbid.bidRequestsCount || 0,
      tm: isTrue(testMode),
      V: '$prebid.version$',
      vg: '$$PREBID_GLOBAL$$',
      i: testMode && tagId != null ? tagId : getID(loc),
      l: {},
      f: 0.01,
      cv: VERSION,
      st: 'prebid',
      h: screen.height,
      w: screen.width,
      gs: deepAccess(bidderRequest, 'gdprConsent.gdprApplies', ''),
      gc: deepAccess(bidderRequest, 'gdprConsent.consentString', ''),
      gpp: getGpp(bidderRequest),
      u: refInfo(bidderRequest, 'page', loc.href),
      do: refInfo(bidderRequest, 'site', loc.hostname),
      re: refInfo(bidderRequest, 'ref'),
      am: getUIDSafe(),
      usp: bidderRequest.uspConsent || '1---',
      smt: 1,
      d: '',
      m: createBidMap(bidRequests),
      cpp: config.getConfig('coppa') ? 1 : 0,
      fpd2: bidderRequest.ortb2,
      tmax: bidderRequest.timeout,
      amp: refInfo(bidderRequest, 'isAmp', null),
      ri: buildReferrerInfo(bidderRequest),
      sync: getSyncSettings(),
      eids: values(
        bidRequests.reduce((all, bid) => {
          // we only want unique ones in here
          if (bid == null || bid.userIdAsEids == null) {
            return all;
          }

          _each(bid.userIdAsEids, (value) => {
            if (value == null) {
              return;
            }
            all[value.source] = value;
          });
          return all;
        }, {})
      ),
    };

    return {
      data: payload,
      method: 'POST',
      browsingTopics: true,
      url: deepAccess(bidRequests[0], 'params.endpoint', DEFAULT_ENDPOINT),
      withCredentials: true,
    };
  },

  getUserSyncs(
    syncOptions,
    serverResponses,
    gdprConsent,
    uspConsent,
    gppConsent
  ) {
    const qp = {
      gdpr_consent: enc(gdprConsent?.consentString || ''),
      gdpr: enc(gdprConsent?.gdprApplies ? 1 : 0),
      us_privacy: enc(uspConsent || ''),
      gpp: enc(gppConsent?.gppString || ''),
      gpp_sid: enc(gppConsent?.applicableSections || ''),
    };

    const iframeSync = {
      url: `https://prebid.a-mo.net/isyn?${formatQS(qp)}`,
      type: 'iframe',
    };

    if (serverResponses == null || serverResponses.length === 0) {
      if (syncOptions.iframeEnabled) {
        return [iframeSync];
      }

      return [];
    }

    const output = [];
    let hasFrame = false;

    _each(serverResponses, function({ body: response }) {
      if (response != null && response.p != null && response.p.hreq) {
        _each(response.p.hreq, function(syncPixel) {
          const pixelType =
            syncPixel.indexOf('__st=iframe') !== -1 ? 'iframe' : 'image';
          if (syncOptions.iframeEnabled || pixelType === 'image') {
            hasFrame =
              hasFrame ||
              pixelType === 'iframe' ||
              syncPixel.indexOf('cchain') !== -1;
            output.push({
              url: syncPixel,
              type: pixelType,
            });
          }
        });
      }
    });

    if (!hasFrame && output.length < 2) {
      output.push(iframeSync);
    }

    return output;
  },

  interpretResponse(serverResponse, request) {
    const response = serverResponse.body;
    if (response == null || typeof response === 'string') {
      return [];
    }

    if (response.am && typeof response.am === 'string') {
      setUIDSafe(response.am);
    }

    const bidderSettings = config.getConfig('bidderSettings');
    const settings = bidderSettings?.amx ?? bidderSettings?.standard ?? {};
    const allowAlternateBidderCodes = !!settings.allowAlternateBidderCodes;

    return flatMap(Object.keys(response.r), (bidID) => {
      return flatMap(response.r[bidID], (siteBid) =>
        siteBid.b.map((bid) => {
          const mediaType = getMediaType(bid);
          const ad = bid.adm;

          if (ad == null) {
            return null;
          }

          const size = resolveSize(bid, request.data, bidID);
          const defaultExpiration = mediaType === BANNER ? 240 : 300;
          const { bc: bidderCode, ds: demandSource } = bid.ext ?? {};

          return {
            ...(bidderCode != null && allowAlternateBidderCodes ? { bidderCode } : {}),
            requestId: bidID,
            cpm: bid.price,
            width: size[0],
            height: size[1],
            creativeId: bid.crid,
            currency: 'USD',
            netRevenue: true,
            [mediaType === VIDEO ? 'vastXml' : 'ad']: ad,
            meta: {
              advertiserDomains: bid.adomain,
              mediaType,
              ...(demandSource != null ? { demandSource } : {}),
            },
            mediaType,
            ttl: typeof bid.exp === 'number' ? bid.exp : defaultExpiration,
          };
        })
      ).filter((possibleBid) => possibleBid != null);
    });
  },

  onSetTargeting(targetingData) {
    if (targetingData == null) {
      return;
    }

    trackEvent('pbst', {
      A: targetingData.bidder,
      w: targetingData.width,
      h: targetingData.height,
      bid: targetingData.adId,
      c1: targetingData.mediaType,
      np: targetingData.cpm,
      aud: targetingData.requestId,
      a: targetingData.adUnitCode,
      c2: nestedQs(targetingData.adserverTargeting),
      cn3: targetingData.timeToRespond,
    });
  },

  onTimeout(timeoutData) {
    if (timeoutData == null || !timeoutData.length) {
      return;
    }

    let common = null;
    const events = timeoutData.map((timeout) => {
      const params = timeout.params || {};
      const size = getTimeoutSize(timeout);
      const { domain, page, ref } =
        timeout.ortb2 != null && timeout.ortb2.site != null
          ? timeout.ortb2.site
          : {};

      if (common == null) {
        common = {
          do: domain,
          u: page,
          U: getUIDSafe(),
          re: ref,
          V: '$prebid.version$',
          vg: '$$PREBID_GLOBAL$$',
        };
      }

      return {
        A: timeout.bidder,
        mid: params.tagId,
        a: params.adunitId || timeout.adUnitCode,
        bid: timeout.bidId,
        n: 'g_pbto',
        aud: timeout.transactionId,
        w: size[0],
        h: size[1],
        cn: timeout.timeout,
        cn2: timeout.bidderRequestsCount,
        cn3: timeout.bidderWinsCount,
      };
    });

    const payload = JSON.stringify({ c: common, e: events });
    fetch(POST_TRACKING_ENDPOINT, {
      body: payload,
      keepalive: true,
      withCredentials: true,
      method: 'POST'
    }).catch((_e) => {
      // do nothing; ignore errors
    });
  },

  onBidWon(bidWinData) {
    if (bidWinData == null) {
      return;
    }

    trackEvent('pbwin', {
      A: bidWinData.bidder,
      w: bidWinData.width,
      h: bidWinData.height,
      bid: bidWinData.adId,
      C: bidWinData.mediaType === BANNER ? 0 : 1,
      np: bidWinData.cpm,
      a: bidWinData.adUnitCode,
    });
  },
};

registerBidder(spec);
