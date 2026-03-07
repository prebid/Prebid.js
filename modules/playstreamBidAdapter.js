import { ortbConverter } from '../libraries/ortbConverter/converter.js'
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ajax } from '../src/ajax.js';
import {
  groupBy,
  logMessage,
  deepAccess,
  mergeDeep,
  isFn,
  isStr,
  isPlainObject,
} from '../src/utils.js';

const BIDDER_CODE = 'playstream';
const TTL = 300;
const DEFAULT_CURRENCY = 'USD';
const NET_REVENUE = true;
const ENDPOINT_PATH = '/server/adserver/hb';

const converter = ortbConverter({
  context: {
    netRevenue: NET_REVENUE,
    ttl: TTL,
    currency: DEFAULT_CURRENCY
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context) || {};
    const mediaType = getMediaType(bidRequest);
    const sizes = uniqSizes(resolveSizes(bidRequest, mediaType));
    const [w, h] = sizes[0] || [0, 0];

    imp.id = imp.id || bidRequest.bidId;

    imp.tagid = String(`${bidRequest?.params?.adUnitId}-${bidRequest?.params?.publisherId}`);

    const floor = getFloor(bidRequest, { width: w, height: h }, mediaType);

    if (Number.isFinite(floor) && floor > 0) {
      imp.bidfloor = floor;
      imp.bidfloorcur = DEFAULT_CURRENCY;
    }

    const tid =
      deepAccess(bidRequest, 'ortb2Imp.ext.tid') ||
      deepAccess(bidRequest, 'ortb2Imp.ext.prebid.tid') ||
      deepAccess(bidRequest, 'ortb2Imp.ext.data.tid');

    if (tid && !imp.ext.tid) imp.ext.tid = tid;

    mergeDeep(imp, {
      ext: {
        playstream: {
          publisherId: bidRequest?.params?.publisherId,
          adUnitId: bidRequest?.params?.adUnitId,
          type: mediaType,
          sizes: sizes.map(([sw, sh]) => ({ w: sw, h: sh })),

          maxSlotPerPod: toFiniteNumber(bidRequest?.params?.maxSlotPerPod),
          maxAdDuration: toFiniteNumber(bidRequest?.params?.maxAdDuration),
        }
      }
    });

    if (mediaType === BANNER) {
      imp.banner = isPlainObject(imp.banner) ? imp.banner : {};
      mergeDeep(imp.banner, {
        w: Number(w) || undefined,
        h: Number(h) || undefined,
        format: sizes.map(([fw, fh]) => ({ w: fw, h: fh })),
        topframe: context?.pageCtx?.topframe ? 1 : 0,
      });
      if (imp.video) delete imp.video;
    }

    if (mediaType === VIDEO) {
      imp.video = isPlainObject(imp.video) ? imp.video : {};
      mergeDeep(imp.video, {
        w: Number(w) || undefined,
        h: Number(h) || undefined,
        mimes: deepAccess(bidRequest, 'mediaTypes.video.mimes') || ['video/mp4'],
      });

      const maxAdDur = toFiniteNumber(bidRequest?.params?.maxAdDuration);
      if (Number.isFinite(maxAdDur)) {
        imp.video.maxduration = maxAdDur; // OpenRTB standard field
      }

      if (imp.banner) delete imp.banner;
    }

    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context) || {};
    const pageCtx = context?.pageCtx || {};

    const pageUrl =
      deepAccess(bidderRequest, 'ortb2.site.page') ||
      deepAccess(bidderRequest, 'refererInfo.page') ||
      window?.location?.href;

    const ua =
      deepAccess(bidderRequest, 'ortb2.device.ua') ||
      navigator?.userAgent;

    const pubId = getCommonParam(context?.bidRequests, 'publisherId');

    const schain = getFirstSchain(context?.bidRequests);

    const gdpr = resolveGdpr(bidderRequest, context?.bidRequests);
    const consent = resolveConsent(bidderRequest, context?.bidRequests);

    const ip = getFirstParam(context?.bidRequests, 'ip');
    const lat = toFiniteNumber(getFirstParam(context?.bidRequests, 'latitude'));
    const lon = toFiniteNumber(getFirstParam(context?.bidRequests, 'longitude'));

    mergeDeep(request, {
      site: {
        page: pageUrl,
        ...(pubId != null ? { publisher: { id: String(pubId) } } : {})
      },
      device: {
        ua,
        w: Number(pageCtx?.width) || undefined,
        h: Number(pageCtx?.height) || undefined,
        ...(isNonEmptyString(ip) ? { ip } : {}),
        ...(Number.isFinite(lat) || Number.isFinite(lon)
          ? { geo: { ...(Number.isFinite(lat) ? { lat } : {}), ...(Number.isFinite(lon) ? { lon } : {}) } }
          : {})
      },
      regs: { ext: { gdpr } },
      user: { ext: { ...(consent ? { consent } : {}) } },
      source: { ext: { ...(schain ? { schain } : {}) } },
      ext: {
        format: 'web',
        referer: bidderRequest?.refererInfo || undefined,
        [BIDDER_CODE]: {
          pbjs: 1,
          pbv: '$prebid.version$'
        }
      }
    });

    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    const prebidBid = buildBidResponse(bid, context) || {};

    mergeDeep(prebidBid, {
      meta: {
        advertiserDomains: Array.isArray(bid?.adomain) ? bid.adomain : []
      }
    });

    const reqMediaType = getMediaTypeFromImp(context?.imp);
    let mt = prebidBid.mediaType || reqMediaType || inferMediaTypeFromAdm(bid?.adm);

    if (!mt) {
      mt = reqMediaType
    }

    prebidBid.mediaType = mt;
    prebidBid.meta = isPlainObject(prebidBid.meta) ? prebidBid.meta : {};
    prebidBid.meta.mediaType = mt;

    if (isNonEmptyString(bid?.nurl)) {
      prebidBid.nurl = bid.nurl;
    }

    if (!prebidBid.width && Number.isFinite(Number(bid?.w))) prebidBid.width = Number(bid.w);
    if (!prebidBid.height && Number.isFinite(Number(bid?.h))) prebidBid.height = Number(bid.h);

    if (mt === VIDEO) {
      if (isNonEmptyString(bid?.adm) && looksLikeVast(bid.adm)) {
        prebidBid.vastXml = bid.adm;

        if (prebidBid.vastUrl) delete prebidBid.vastUrl;
      } else if (isNonEmptyString(bid?.nurl)) {
        prebidBid.vastUrl = bid.nurl;
      }

      if (prebidBid.ad) delete prebidBid.ad;
      return prebidBid;
    }

    if (mt === BANNER) {
      if (isNonEmptyString(bid?.adm)) {
        prebidBid.ad = bid.adm;
      }

      if (prebidBid.vastXml) delete prebidBid.vastXml;
      if (prebidBid.vastUrl) delete prebidBid.vastUrl;

      return prebidBid;
    }

    return prebidBid;
  }
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER],

  isBidRequestValid: (bid) => {
    if (!bid || typeof bid !== 'object') return false;
    const p = bid.params || {};
    if (!isNonEmptyString(p.host)) return false;

    const host = sanitizeHost(p.host);
    if (!host) return false;

    if (!isNonEmptyString(p.type)) return false;
    if (p.type !== VIDEO && p.type !== BANNER) return false;

    if (!isNonEmptyString(p.adUnitId) && typeof p.adUnitId !== 'number') return false;
    if (!isNonEmptyString(p.publisherId) && typeof p.publisherId !== 'number') return false;

    if (p.price !== undefined && p.price !== null && p.price !== '') {
      const priceNum = Number(p.price);
      if (!Number.isFinite(priceNum) || priceNum < 0) return false;
    }

    const sizes = resolveSizes(bid);
    if (!sizes.length) return false;

    return true;
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    if (!Array.isArray(validBidRequests) || !validBidRequests.length) return [];

    const pageCtx = getPageContext();

    const grouped = groupBy(
      validBidRequests.map(br => ({ host: sanitizeHost(br?.params?.host), br })),
      'host'
    );

    const scheme = (location.protocol === 'https:') ? 'https' : 'http';

    const data = Object.keys(grouped)
      .filter(h => isNonEmptyString(h))
      .map((host) => {
        const bids = grouped[host].map(x => x.br);

        const { adUnitId, publisherId } = bids[0].params || {};

        const ortb = converter.toORTB({
          bidderRequest,
          bidRequests: bids,
          context: { pageCtx }
        });

        return {
          method: 'POST',
          url: `${scheme}://${host}${ENDPOINT_PATH}?adUnitId=${adUnitId}&publisherId=${publisherId}`,
          bids,
          data: ortb,
          options: { contentType: 'application/json' }
        };
      });

    return data;
  },

  interpretResponse: (serverResponse, request) => {
    const body = serverResponse?.body;

    if (!body || !request?.data) return [];

    const converted = converter.fromORTB({ response: body, request: request.data });

    const bids = Array.isArray(converted?.bids) ? converted.bids : [];

    return bids.filter(b => {
      if (b?.meta?.mediaType === VIDEO) return !!b.vastXml || !!b.vastUrl;
      if (b?.meta?.mediaType === BANNER) return !!b.ad;
      return false;
    });
  },

  onBidWon: (bid) => {
    const cpm = Number(bid?.cpm);
    if (!Number.isFinite(cpm)) return;

    if (isNonEmptyString(bid?.nurl)) {
      const url = bid.nurl.replace(/\$\{AUCTION_PRICE\}/g, String(cpm));
      ajax(url, () => { }, null, { method: 'GET' });
    }
  },

  getUserSyncs: () => []
}

registerBidder(spec);

function getMediaType(bidRequest) {
  const t = bidRequest?.params?.type;
  return (t === VIDEO || t === BANNER) ? t : BANNER;
}

function getMediaTypeFromImp(imp) {
  if (!imp || typeof imp !== 'object') return null;
  if (imp.video) return VIDEO;
  if (imp.banner) return BANNER;
  return null;
}

function resolveSizes(bidRequest, mediaType) {
  const mt = mediaType || getMediaType(bidRequest);

  if (bidRequest?.mediaTypes) {
    if (mt === VIDEO && bidRequest.mediaTypes.video?.playerSize) {
      return toSizeArray(bidRequest.mediaTypes.video.playerSize);
    }
    if (mt === BANNER && bidRequest.mediaTypes.banner?.sizes) {
      return toSizeArray(bidRequest.mediaTypes.banner.sizes);
    }
  }

  return toSizeArray(bidRequest?.sizes);
}

function toSizeArray(input) {
  if (!input) return [];

  if (Array.isArray(input) && input.length === 2 && typeof input[0] === 'number' && typeof input[1] === 'number') {
    return [input];
  }

  if (Array.isArray(input) && Array.isArray(input[0])) {
    return input;
  }

  return [];
}

function uniqSizes(sizes) {
  const seen = new Set();
  const out = [];

  for (const s of (sizes || [])) {
    if (!Array.isArray(s) || s.length < 2) continue;
    const w = Number(s[0]);
    const h = Number(s[1]);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) continue;

    const key = `${w}x${h}`;
    if (seen.has(key)) continue;

    seen.add(key);
    out.push([w, h]);
  }

  return out;
}

function sanitizeHost(host) {
  if (!isNonEmptyString(host)) return null;

  let h = host.trim();
  h = h.replace(/^https?:\/\//i, '');
  h = h.split('/')[0].split('?')[0].split('#')[0];

  if (!h || /\s/.test(h)) return null;
  return h;
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function toFiniteNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function getPageContext() {
  const ctx = { width: 0, height: 0, topframe: false };

  try {
    ctx.width = window.top.screen.width;
    ctx.height = window.top.screen.height;
    window.top.location.toString();
    ctx.topframe = true;
  } catch (error) {
    logMessage('Error getting top frame context', error);
    ctx.width = window.screen.width;
    ctx.height = window.screen.height;
    ctx.topframe = false;
  }

  return ctx;
}

function getFloor(bidRequest, size, mediaType) {
  try {
    const paramFloor = Number(bidRequest?.params?.price);
    if (Number.isFinite(paramFloor) && paramFloor > 0) {
      return paramFloor;
    }
  } catch (error) { }

  if (!isFn(bidRequest?.getFloor)) return;

  try {
    const bidFloor = bidRequest.getFloor({
      currency: DEFAULT_CURRENCY,
      mediaType,
      size: [size.width, size.height],
    });

    if (isPlainObject(bidFloor) && !isNaN(bidFloor.floor) && bidFloor.currency === DEFAULT_CURRENCY) {
      return bidFloor.floor;
    }
  } catch { }
}

function getFirstSchain(bidRequests) {
  for (const br of (bidRequests || [])) {
    const schain =
      deepAccess(br, 'ortb2.source.ext.schain') ||
      deepAccess(br, 'ortb2Imp.ext.schain') ||
      deepAccess(br, 'ortb2Imp.ext.prebid.schain');
    if (schain) return schain;
  }
  return null;
}

function getCommonParam(bidRequests, key) {
  const vals = new Set();
  for (const br of (bidRequests || [])) {
    const v = br?.params?.[key];
    if (v != null) vals.add(String(v));
  }
  return vals.size === 1 ? Array.from(vals)[0] : null;
}

function getFirstParam(bidRequests, key) {
  for (const br of (bidRequests || [])) {
    const v = br?.params?.[key];
    if (v != null && v !== '') return v;
  }
  return undefined;
}

function resolveGdpr(bidderRequest, bidRequests) {
  const applies = bidderRequest?.gdprConsent?.gdprApplies;
  if (typeof applies === 'boolean') return applies ? 1 : 0;

  const v = getFirstParam(bidRequests, 'gdpr');
  if (v == null) return 0;

  return Number(v) ? 1 : 0;
}

function resolveConsent(bidderRequest, bidRequests) {
  const cs = bidderRequest?.gdprConsent?.consentString;
  if (isNonEmptyString(cs)) return cs;

  const v = getFirstParam(bidRequests, 'consent');
  return isNonEmptyString(v) ? v : undefined;
}

function looksLikeVast(adm) {
  return isStr(adm) && /<\s*VAST[\s>]/i.test(adm);
}

function inferMediaTypeFromAdm(adm) {
  return looksLikeVast(adm) ? VIDEO : BANNER;
}
