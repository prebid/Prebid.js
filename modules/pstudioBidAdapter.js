import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {
  deepAccess,
  isArray,
  isNumber,
  isEmpty,
  logError,
  generateUUID,
} from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'pstudio';
const ENDPOINT = 'https://exchange.pstudio.tadex.id/prebid-bid';
const TIME_TO_LIVE = 300;
const UNOMI_URL = 'https://revamp-unomi.techgadgetforus.com/context.json';
const BIMAX_URL = 'https://bimax.telkomsel.com/oc/';
const TMA_SCOPE = 'Digiads';
const LOCAL_STORAGE_KEY = 'u_profile_id';
const SESSION_STORAGE_KEY = 'u_session_id';

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

let _tmaLock = false;
let _tmaPrimed = false;
let _cachedUserId;

export function __forTestingResetState() {
  _tmaLock = false;
  _tmaPrimed = false;
  _cachedUserId = undefined;
}

// ---------------------------------------------------------------------------
// Hook-safety helpers
// ---------------------------------------------------------------------------
// fun-hooks returns `undefined` when a hooked function is called before
// Prebid's ready() fires. We treat that as "not ready" and skip — never throw.
function storageReady() {
  try {
    return typeof storage.localStorageIsEnabled() === 'boolean'
      ? storage.localStorageIsEnabled()
      : false;
  } catch {
    return false;
  }
}

function lsGet(key) {
  try {
    if (!storageReady()) return undefined;
    return storage.getDataFromLocalStorage(key);
  } catch {
    return undefined;
  }
}
function lsSet(key, val) {
  try {
    if (!storageReady()) return;
    storage.setDataInLocalStorage(key, val);
  } catch {
    /* empty */
  }
}
function ssGet(key) {
  try {
    if (!storage.hasSessionStorage || !storage.hasSessionStorage()) { return undefined; }
    return storage.getDataFromSessionStorage(key) || undefined;
  } catch {
    return undefined;
  }
}

function ssSet(key, val) {
  try {
    if (!storage.hasSessionStorage || !storage.hasSessionStorage()) return;
    storage.setDataInSessionStorage(key, val);
  } catch {
    /* empty */
  }
}

// ---------------------------------------------------------------------------
// TMA helpers
// ---------------------------------------------------------------------------
function tmaDetectPublisherDomain() {
  try {
    const host = window.location?.hostname || '';
    const valid =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)+$/.test(host);
    return valid ? host : 'unknown';
  } catch {
    logError('[pstudio] Error when detect publisher domain');
    return 'unknown';
  }
}

async function tmaSyncIdentity({
  timeoutMs = 10000,
  gdprConsent,
  uspConsent,
} = {}) {
  const gdprApplies =
    typeof gdprConsent?.gdprApplies === 'boolean'
      ? gdprConsent.gdprApplies
      : undefined;
  const hasGdprConsent = !gdprApplies || !!gdprConsent?.consentString;
  const ccpaOptOut = typeof uspConsent === 'string' && /^1Y/.test(uspConsent);

  // Bail cleanly on consent/storage gates
  if (!storageReady() || (gdprApplies && !hasGdprConsent) || ccpaOptOut) {
    return null;
  }
  if (_tmaLock) return null;
  _tmaLock = true;

  let got = null;
  try {
    // session id
    let sid = ssGet(SESSION_STORAGE_KEY);
    if (!sid) {
      sid = generateUUID();
      ssSet(SESSION_STORAGE_KEY, sid);
    }

    const current = lsGet(LOCAL_STORAGE_KEY);
    const domain = tmaDetectPublisherDomain();
    const payload = {
      profileId: current || null,
      events: [
        {
          eventType: 'view',
          scope: TMA_SCOPE,
          attributes: { publisherDomain: domain },
        },
      ],
      source: { itemId: domain, itemType: 'publisher-site', scope: TMA_SCOPE },
    };

    const ctrl =
      typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    const url = `${UNOMI_URL}?sessionId=${encodeURIComponent(sid)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined,
    });

    if (t) clearTimeout(t);
    if (!res.ok) throw new Error(`Unomi Context Error: ${res.status}`);

    const json = await res.json();
    const pid =
      json && typeof json.profileId === 'string' ? json.profileId : null;
    if (!pid) throw new Error('Invalid profile ID from Unomi');

    lsSet(LOCAL_STORAGE_KEY, pid);
    _cachedUserId = pid;
    got = pid;

    // Fire-and-forget Bimax beacon
    try {
      const u = new URL(BIMAX_URL);
      u.searchParams.append('source_name', 'tma_ads_tech');
      u.searchParams.append('cookies_id', pid);
      fetch(u.toString(), {
        method: 'GET',
        mode: 'no-cors',
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* empty */
    }
  } catch (err) {
    // No longer silent — surface to Prebid's logger only (won't spam console.error in prod)
    logError('[pstudio] tmaSyncIdentity failed:', err);
  } finally {
    _tmaLock = false;
  }
  return got;
}

function tmaGetIdCached() {
  if (_cachedUserId) return _cachedUserId;
  const v = lsGet(LOCAL_STORAGE_KEY);
  if (v) _cachedUserId = v;
  return _cachedUserId || undefined;
}

// Primes _cachedUserId from LS and triggers a background sync, but ONLY when
// invoked from a Prebid lifecycle method (i.e. after fun-hooks is ready).
function tmaPrime(bidderRequest) {
  if (_tmaPrimed) return;
  _tmaPrimed = true;

  if (!_cachedUserId) {
    const v = lsGet(LOCAL_STORAGE_KEY);
    if (v) _cachedUserId = v;
  }

  tmaSyncIdentity({
    timeoutMs: 800,
    gdprConsent: bidderRequest?.gdprConsent,
    uspConsent: bidderRequest?.uspConsent,
  }).catch((e) => logError('[pstudio] sync identity error:', e));
}

// ---------------------------------------------------------------------------
// User syncs config
// ---------------------------------------------------------------------------
const USER_SYNCS = [
  // PARTNER_UID is a partner user id
  {
    type: 'img',
    url: 'https://match.adsrvr.org/track/cmf/generic?ttd_pid=k1on5ig&ttd_tpi=1&ttd_puid=%PARTNER_UID%&dsp=ttd',
    macro: '%PARTNER_UID%',
  },
  {
    type: 'img',
    url: 'https://dsp.myads.telkomsel.com/api/v1/pixel?uid=%USERID%',
    macro: '%USERID%',
  },
];

// ============================
// Adapter spec
// ============================
const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO];
const VIDEO_PARAMS = [
  'mimes',
  'minduration',
  'maxduration',
  'protocols',
  'startdelay',
  'placement',
  'skip',
  'skipafter',
  'minbitrate',
  'maxbitrate',
  'delivery',
  'playbackmethod',
  'api',
  'linearity',
];

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: function (bid) {
    const params = bid.params || {};
    return !!params.pubid && !!params.adtagid && isVideoRequestValid(bid);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    tmaPrime(bidderRequest);

    return validBidRequests.map((bid) => ({
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(buildRequestData(bid, bidderRequest)),
      options: { contentType: 'application/json', withCredentials: true },
    }));
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    if (!serverResponse.body.bids) return [];
    const { id } = JSON.parse(bidRequest.data);

    serverResponse.body.bids.forEach((bid) => {
      const { cpm, width, height, currency, ad, meta } = bid;
      let bidResponse = {
        requestId: id,
        cpm,
        width,
        height,
        creativeId: bid.creative_id,
        currency,
        netRevenue: bid.net_revenue,
        ttl: TIME_TO_LIVE,
        meta: { advertiserDomains: meta.advertiser_domains },
      };
      if (bid.vast_url || bid.vast_xml) {
        bidResponse.vastUrl = bid.vast_url;
        bidResponse.vastXml = bid.vast_xml;
        bidResponse.mediaType = VIDEO;
      } else {
        bidResponse.ad = ad;
      }
      bidResponses.push(bidResponse);
    });
    return bidResponses;
  },

  getUserSyncs(syncOptions, _serverResponse, gdprConsent, uspConsent) {
    const syncs = [];
    if (!syncOptions) return syncs;

    const gdprApplies =
      typeof gdprConsent?.gdprApplies === 'boolean'
        ? gdprConsent.gdprApplies
        : undefined;
    const hasGdprConsent = !gdprApplies || !!gdprConsent?.consentString;
    const ccpaOptOut = typeof uspConsent === 'string' && /^1Y/.test(uspConsent);

    if ((gdprApplies && !hasGdprConsent) || ccpaOptOut) return syncs;

    const userId = tmaGetIdCached();
    USER_SYNCS.forEach((us) => {
      if (us.type === 'img' && syncOptions.pixelEnabled) {
        syncs.push({
          type: 'image',
          url: us.url.replace(us.macro, encodeURIComponent(userId || '')),
        });
      } else if (us.type === 'iframe' && syncOptions.iframeEnabled) {
        syncs.push({
          type: 'iframe',
          url: us.url.replace(us.macro, encodeURIComponent(userId || '')),
        });
      }
    });

    return syncs;
  },
};

// ---------------------------------------------------------------------------
// Request building
// ---------------------------------------------------------------------------
function buildRequestData(bid, bidderRequest) {
  let payloadObject = buildBaseObject(bid, bidderRequest);
  if (bid.mediaTypes.banner) {
    return buildBannerObject(bid, payloadObject);
  } else if (bid.mediaTypes.video) {
    return buildVideoObject(bid, payloadObject);
  }
}

function buildBaseObject(bid, bidderRequest) {
  const firstPartyData = prepareFirstPartyData(bidderRequest.ortb2);
  const { pubid, adtagid, bcat, badv, bapp } = bid.params;

  const { userId } = bid;
  const uid2Token = userId?.uid2?.id;
  if (uid2Token) {
    if (firstPartyData.user) {
      firstPartyData.user.uid2_token = uid2Token;
    } else {
      firstPartyData.user = { uid2_token: uid2Token };
    }
  }

  const userProfileId = tmaGetIdCached();
  if (userProfileId) {
    if (firstPartyData.user) {
      firstPartyData.user.id = userProfileId;
    } else {
      firstPartyData.user = { id: userProfileId };
    }
  }

  return {
    id: bid.bidId,
    pubid,
    adtagid: adtagid,
    ...(bcat && { bcat }),
    ...(badv && { badv }),
    ...(bapp && { bapp }),
    ...firstPartyData,
  };
}

function buildBannerObject(bid, payloadObject) {
  const { sizes, pos, name } = bid.mediaTypes.banner;
  payloadObject.banner_properties = { name, sizes, pos };
  return payloadObject;
}

function buildVideoObject(bid, payloadObject) {
  const { context, playerSize, w, h } = bid.mediaTypes.video;
  payloadObject.video_properties = {
    context,
    w: w || playerSize[0][0],
    h: h || playerSize[0][1],
  };
  for (const param of VIDEO_PARAMS) {
    const paramValue = deepAccess(bid, `mediaTypes.video.${param}`);
    if (paramValue) payloadObject.video_properties[param] = paramValue;
  }
  return payloadObject;
}

function prepareFirstPartyData({ user, device, site, app, regs } = {}) {
  let userData, deviceData, siteData, appData, regsData;

  if (user) userData = { yob: user.yob, gender: user.gender };
  if (device) {
    deviceData = {
      ua: device.ua,
      dnt: device.dnt,
      lmt: device.lmt,
      ip: device.ip,
      ipv6: device.ipv6,
      devicetype: device.devicetype,
      make: device.make,
      model: device.model,
      os: device.os,
      osv: device.osv,
      js: device.js,
      language: device.language,
      carrier: device.carrier,
      connectiontype: device.connectiontype,
      ifa: device.ifa,
      ...(device.geo && {
        geo: {
          lat: device.geo.lat,
          lon: device.geo.lon,
          country: device.geo.country,
          region: device.geo.region,
          regionfips104: device.geo.regionfips104,
          metro: device.geo.metro,
          city: device.geo.city,
          zip: device.geo.zip,
          type: device.geo.type,
        },
      }),
      ...(device.ext && { ext: { ifatype: device.ext.ifatype } }),
    };
  }
  if (site) {
    siteData = {
      id: site.id,
      name: site.name,
      domain: site.domain,
      page: site.page,
      cat: site.cat,
      sectioncat: site.sectioncat,
      pagecat: site.pagecat,
      ref: site.ref,
      ...(site.publisher && {
        publisher: {
          name: site.publisher.name,
          cat: site.publisher.cat,
          domain: site.publisher.domain,
        },
      }),
      ...(site.content && {
        content: {
          id: site.content.id,
          episode: site.content.episode,
          title: site.content.title,
          series: site.content.series,
          artist: site.content.artist,
          genre: site.content.genre,
          album: site.content.album,
          isrc: site.content.isrc,
          season: site.content.season,
        },
      }),
      mobile: site.mobile,
    };
  }
  if (app) {
    appData = {
      id: app.id,
      name: app.name,
      bundle: app.bundle,
      domain: app.domain,
      storeurl: app.storeurl,
      cat: app.cat,
      sectioncat: app.sectioncat,
      pagecat: app.pagecat,
      ver: app.ver,
      privacypolicy: app.privacypolicy,
      paid: app.paid,
      ...(app.publisher && {
        publisher: {
          name: app.publisher.name,
          cat: app.publisher.cat,
          domain: app.publisher.domain,
        },
      }),
      keywords: app.keywords,
      ...(app.content && {
        content: {
          id: app.content.id,
          episode: app.content.episode,
          title: app.content.title,
          series: app.content.series,
          artist: app.content.artist,
          genre: app.content.genre,
          album: app.content.album,
          isrc: app.content.isrc,
          season: app.content.season,
        },
      }),
    };
  }
  if (regs) regsData = { coppa: regs.coppa };

  return cleanObject({
    user: userData,
    device: deviceData,
    site: siteData,
    app: appData,
    regs: regsData,
  });
}

function cleanObject(data) {
  for (let key in data) {
    if (typeof data[key] === 'object') {
      cleanObject(data[key]);
      if (isEmpty(data[key])) delete data[key];
    }
    if (data[key] === undefined) delete data[key];
  }
  return data;
}

function isVideoRequestValid(bidRequest) {
  if (bidRequest.mediaTypes.video) {
    const { w, h, playerSize, mimes, protocols } = deepAccess(
      bidRequest,
      'mediaTypes.video',
      {}
    );
    const areSizesValid =
      (isNumber(w) && isNumber(h)) || validateSizes(playerSize);
    const areMimesValid = isArray(mimes) && mimes.length > 0;
    const areProtocolsValid =
      isArray(protocols) && protocols.length > 0 && protocols.every(isNumber);
    return areSizesValid && areMimesValid && areProtocolsValid;
  }
  return true;
}

function validateSizes(sizes) {
  return (
    isArray(sizes) &&
    sizes.length > 0 &&
    sizes.every(
      (size) => isArray(size) && size.length === 2 && size.every(isNumber)
    )
  );
}

registerBidder(spec);
