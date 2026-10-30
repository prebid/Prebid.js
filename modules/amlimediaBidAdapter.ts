import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { AUDIO, BANNER, NATIVE, VIDEO, type MediaType } from '../src/mediaTypes.js';
import { ajax } from '../src/ajax.js';
import { convertCurrency } from '../libraries/currencyUtils/currency.js';
import { deepSetValue, isArray, isPlainObject, logInfo, logWarn, replaceAuctionPrice } from '../src/utils.js';
import { parseUntrustedJSON } from '../src/utils/untrustedJson.js';
import { getUserSyncParams } from '../libraries/userSyncUtils/userSyncUtils.js';
import { getConnectionType } from '../libraries/connectionInfo/connectionUtils.js';
import { getDevicePixelRatio } from '../libraries/devicePixelRatio/devicePixelRatio.js';
import { getDeviceType, getOS } from '../libraries/userAgentUtils/index.js';
import { deviceTypes, osTypes } from '../libraries/userAgentUtils/userAgentTypes.enums.js';
import { getTimeZone } from '../libraries/timezone/timezone.js';

const BIDDER_CODE = 'amlimedia';
const ADAPTER_VERSION = '1.0.0';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 300;

export const ENDPOINT_URL = 'https://rtb.amlimedia.com/';
const INTEGRATION = 'pbjs';
export const SYNC_URL = `https://rtb.amlimedia.com/?type=u_sync&intg=${INTEGRATION}`;

export type AmlimediaBidParams = {
  /**
   * Placement id shown in the Amli Media dashboard when the publisher creates an end point.
   */
  pid: string | number;
  /**
   * 1 switches the placement to test mode: the request carries `test: 1`, the endpoint answers
   * with non-billable test creatives and the request is logged to the console.
   */
  test?: 0 | 1 | '0' | '1';
  /**
   * Static floor in USD. Only used when the price floors module has not produced one for the imp.
   */
  bidfloor?: number;
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: AmlimediaBidParams;
  }
}

const MEDIA_TYPE_BY_MTYPE: Record<number, MediaType> = { 1: BANNER, 2: VIDEO, 3: AUDIO, 4: NATIVE };
const MTYPE_BY_MEDIA_TYPE: Record<string, number> = { [BANNER]: 1, [VIDEO]: 2, [AUDIO]: 3, [NATIVE]: 4 };
const MEDIA_TYPE_ALIASES: Record<string, MediaType> = {
  banner: BANNER,
  display: BANNER,
  video: VIDEO,
  audio: AUDIO,
  native: NATIVE
};

const ORTB_DEVICE_TYPE = {
  [deviceTypes.DESKTOP]: 2,
  [deviceTypes.MOBILE]: 4,
  [deviceTypes.TABLET]: 5
};
const OS_NAME = {
  [osTypes.WINDOWS]: 'Windows',
  [osTypes.MAC]: 'macOS',
  [osTypes.LINUX]: 'Linux',
  [osTypes.UNIX]: 'Unix',
  [osTypes.IOS]: 'iOS',
  [osTypes.ANDROID]: 'Android'
};

/**
 * Fields that moved out of `ext` between OpenRTB 2.5 and 2.6. They are written to both
 * locations so the request reads the same to a 2.5 and a 2.6 parser.
 */
const VERSIONED_FIELDS: Array<[string, string]> = [
  ['regs', 'gdpr'],
  ['regs', 'us_privacy'],
  ['regs', 'gpp'],
  ['regs', 'gpp_sid'],
  ['user', 'consent'],
  ['user', 'eids'],
  ['source', 'schain']
];

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isValidPid(pid: unknown): boolean {
  if (typeof pid === 'number') return Number.isFinite(pid);
  return isString(pid) && pid.trim().length > 0;
}

function isValidTestFlag(test: unknown): boolean {
  return test == null || [0, 1, '0', '1'].includes(test as any);
}

function pidOf(bidRequest: any): string {
  return String(bidRequest?.params?.pid).trim();
}

export function endpointFor(pid: string): string {
  return `${ENDPOINT_URL}?intg=${INTEGRATION}&pid=${encodeURIComponent(pid)}`;
}

function isTestMode(params: Partial<AmlimediaBidParams> = {}): boolean {
  return Number(params.test) === 1;
}

function parseJson(text: string): any {
  try {
    return parseUntrustedJSON(text);
  } catch (e) {
    return null;
  }
}

function withoutUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function fillDevice(request: any): void {
  const device = request.device = request.device || {};
  const sua = device.sua;
  if (device.devicetype == null) {
    device.devicetype = ORTB_DEVICE_TYPE[getDeviceType()];
  }
  if (!device.os) {
    device.os = sua?.platform?.brand || OS_NAME[getOS()];
  }
  if (!device.osv && isArray(sua?.platform?.version) && sua.platform.version.length) {
    device.osv = sua.platform.version.join('.');
  }
  if (device.js == null) {
    device.js = 1;
  }
  if (device.pxratio == null) {
    device.pxratio = getDevicePixelRatio(window);
  }
  if (device.connectiontype == null) {
    const connectionType = getConnectionType();
    if (connectionType) device.connectiontype = connectionType;
  }
  if (!device.geo && isPlainObject(request.user?.geo)) {
    device.geo = { ...request.user.geo };
  }
  if (!device.ext?.timezone) {
    const timezone = getTimeZone();
    if (timezone) deepSetValue(device, 'ext.timezone', timezone);
  }
}

function fillSite(request: any, bidderRequest: any): void {
  if (request.app || request.dooh) return;
  const page = bidderRequest?.refererInfo?.page;
  if (page && !request.site?.page) {
    deepSetValue(request, 'site.page', page);
  }
  const ref = bidderRequest?.refererInfo?.ref;
  if (ref && !request.site?.ref) {
    deepSetValue(request, 'site.ref', ref);
  }
}

function alignVersionedFields(request: any, bidderRequest: any, bidRequests: any[]): void {
  const gdpr = bidderRequest?.gdprConsent;
  const gpp = bidderRequest?.gppConsent;
  const firstBid = bidRequests[0] || {};
  const fallback: Record<string, unknown> = {
    'regs.gdpr': typeof gdpr?.gdprApplies === 'boolean' ? (gdpr.gdprApplies ? 1 : 0) : undefined,
    'regs.us_privacy': bidderRequest?.uspConsent || undefined,
    'regs.gpp': gpp?.gppString || undefined,
    'regs.gpp_sid': gpp?.gppString ? (gpp.applicableSections || []) : undefined,
    'user.consent': gdpr?.consentString || undefined,
    'user.eids': isArray(firstBid.userIdAsEids) && firstBid.userIdAsEids.length ? firstBid.userIdAsEids : undefined,
    'source.schain': firstBid.ortb2?.source?.schain || firstBid.ortb2?.source?.ext?.schain
  };
  VERSIONED_FIELDS.forEach(([section, field]) => {
    const value = request[section]?.[field] ?? request[section]?.ext?.[field] ?? fallback[`${section}.${field}`];
    if (value != null) {
      deepSetValue(request, `${section}.${field}`, value);
      deepSetValue(request, `${section}.ext.${field}`, value);
    }
  });
}

function offeredMediaTypes(imp: any): MediaType[] {
  return ([BANNER, VIDEO, NATIVE, AUDIO] as MediaType[]).filter(mediaType => imp?.[mediaType] != null);
}

function readNativeMarkup(adm: unknown): any {
  let doc = isString(adm) ? parseJson(adm) : adm;
  // OpenRTB Native 1.0/1.1 responses wrap the document in a `native` object; 1.2 does not.
  if (isPlainObject(doc) && isPlainObject(doc.native)) {
    doc = doc.native;
  }
  return isPlainObject(doc) && isArray(doc.assets) ? doc : null;
}

function sniffMarkup(bid: any, offered: MediaType[]): MediaType | undefined {
  const { adm } = bid;
  if (adm == null || adm === '') {
    if (bid.nurl) {
      return offered.find(mediaType => mediaType === VIDEO || mediaType === AUDIO);
    }
    return undefined;
  }
  if (isPlainObject(adm)) {
    return readNativeMarkup(adm) ? NATIVE : undefined;
  }
  const text = String(adm).trim();
  if (/^<\?xml|<VAST[\s>]/i.test(text)) {
    const audioFiles = /<MediaFile[^>]+type\s*=\s*["']audio\//i.test(text);
    if (offered.includes(AUDIO) && (audioFiles || !offered.includes(VIDEO))) return AUDIO;
    return VIDEO;
  }
  if (text.charAt(0) === '{') {
    return readNativeMarkup(text) ? NATIVE : undefined;
  }
  return BANNER;
}

/**
 * Works out what a bid is, from the most to the least explicit signal: OpenRTB 2.6 `mtype`, the
 * Prebid Server style `ext.prebid.type`, the shape of the markup, then the formats the imp offered.
 * A signal naming a format the imp never asked for is skipped.
 */
export function resolveMediaType(bid: any, imp: any): MediaType | undefined {
  const offered = offeredMediaTypes(imp);
  const declaredType = bid.ext?.prebid?.type ?? bid.ext?.mediaType ?? bid.ext?.mediatype;
  const candidates = [
    MEDIA_TYPE_BY_MTYPE[bid.mtype],
    isString(declaredType) ? MEDIA_TYPE_ALIASES[declaredType.toLowerCase()] : undefined,
    sniffMarkup(bid, offered),
    offered.length === 1 ? offered[0] : undefined
  ];
  return candidates.find(mediaType => mediaType != null && (offered.length === 0 || offered.includes(mediaType)));
}

function prepareBid(bid: any, imp: any): any {
  const price = isString(bid.price) ? parseFloat(bid.price) : bid.price;
  if (typeof price !== 'number' || !(price > 0)) {
    return null;
  }
  const hasMarkup = bid.adm != null && bid.adm !== '';
  if (!hasMarkup && !(isString(bid.nurl) && bid.nurl !== '')) {
    logWarn(`${BIDDER_CODE}: bid ${bid.id} has neither adm nor nurl, bid skipped`, bid);
    return null;
  }
  const mediaType = resolveMediaType(bid, imp);
  if (!mediaType) {
    logWarn(`${BIDDER_CODE}: could not determine the media type of bid ${bid.id}, bid skipped`, bid);
    return null;
  }
  const prepared = { ...bid, price, mtype: MTYPE_BY_MEDIA_TYPE[mediaType] };
  if (mediaType === NATIVE) {
    prepared.adm = readNativeMarkup(bid.adm);
    if (!prepared.adm) {
      logWarn(`${BIDDER_CODE}: native bid ${bid.id} has no readable assets, bid skipped`, bid);
      return null;
    }
  }
  if (mediaType === BANNER && (prepared.w == null || prepared.h == null)) {
    const size = imp?.banner?.w != null ? imp.banner : imp?.banner?.format?.[0];
    if (size) {
      prepared.w = prepared.w ?? size.w;
      prepared.h = prepared.h ?? size.h;
    }
  }
  return prepared;
}

function fromOrtb3Bid(bid: any): any {
  const ad = bid?.media?.ad || {};
  const display = ad.display || {};
  let mtype;
  let adm;
  if (display.native) {
    [mtype, adm] = [4, display.native];
  } else if (display.adm != null) {
    [mtype, adm] = [1, display.adm];
  } else if (ad.video) {
    [mtype, adm] = [2, ad.video.adm];
  } else if (ad.audio) {
    [mtype, adm] = [3, ad.audio.adm];
  }
  return withoutUndefined({
    id: bid.id,
    impid: bid.item,
    price: bid.price,
    adm,
    mtype,
    nurl: bid.purl,
    burl: bid.burl,
    lurl: bid.lurl,
    dealid: bid.deal,
    cid: bid.cid,
    crid: ad.id,
    adomain: ad.adomain,
    cat: ad.cat,
    attr: ad.attr,
    w: display.w,
    h: display.h,
    exp: bid.exp,
    ext: bid.ext
  });
}

/**
 * Brings any response the endpoint may produce into the OpenRTB 2.x shape `ortbConverter` reads:
 * 2.0 - 2.6 `seatbid[].bid[]`, the OpenRTB 3.0 `{openrtb: {response}}` envelope, a single seatbid,
 * a flat `bids` array, or any of those as a JSON string. Returns null when there is nothing to bid.
 */
export function normalizeOrtbResponse(body: unknown): any {
  let doc: any = isString(body) ? parseJson(body) : body;
  if (isPlainObject(doc?.openrtb)) {
    const response = (doc.openrtb as any).response;
    if (!isPlainObject(response)) return null;
    doc = {
      ...response,
      seatbid: (isArray(response.seatbid) ? response.seatbid : []).map((seatbid: any) => ({
        seat: seatbid?.seat,
        bid: (isArray(seatbid?.bid) ? seatbid.bid : []).filter(isPlainObject).map(fromOrtb3Bid)
      }))
    };
  }
  if (isPlainObject(doc) && !doc.seatbid && (isPlainObject(doc.body) || isArray(doc.body))) {
    doc = doc.body;
  }
  let seatbids: any[];
  if (isArray(doc)) {
    seatbids = doc.some((item: any) => isArray(item?.bid)) ? doc : [{ bid: doc }];
    doc = {};
  } else if (!isPlainObject(doc)) {
    return null;
  } else if (isArray(doc.seatbid)) {
    seatbids = doc.seatbid;
  } else if (isArray(doc.bids)) {
    seatbids = [{ seat: BIDDER_CODE, bid: doc.bids }];
  } else if (isArray(doc.bid)) {
    seatbids = [{ seat: doc.seat, bid: doc.bid }];
  } else {
    seatbids = [];
  }
  const seatbid = seatbids
    .filter((item: any) => isPlainObject(item) && isArray(item.bid))
    .map((item: any) => ({
      ...item,
      bid: item.bid
        .filter(isPlainObject)
        .map((bid: any) => (bid.impid == null ? bid : { ...bid, impid: String(bid.impid) }))
    }))
    .filter((item: any) => item.bid.length > 0);
  if (!seatbid.length) {
    if (doc.nbr != null) {
      logInfo(`${BIDDER_CODE}: no bid, reason ${doc.nbr}`);
    }
    return null;
  }
  return { ...doc, seatbid };
}

function syncTypeOf(type: unknown): 'iframe' | 'image' | undefined {
  if (!isString(type)) return undefined;
  const name = type.toLowerCase();
  if (name === 'iframe') return 'iframe';
  if (['image', 'img', 'pixel', 'redirect'].includes(name)) return 'image';
  return undefined;
}

/**
 * Sync URLs the endpoint asked for in `ext.usersync`, either as a list of `{type, url}` or keyed by
 * bidder as `{amlimedia: {syncs: [...]}}`. Only https URLs are kept.
 */
function readServerSyncs(body: unknown): Array<{ type: 'iframe' | 'image', url: string }> {
  let doc: any = isString(body) ? parseJson(body) : body;
  doc = doc?.openrtb?.response ?? doc;
  const usersync = doc?.ext?.usersync;
  let entries: any[] = [];
  if (isArray(usersync)) {
    entries = usersync;
  } else if (isPlainObject(usersync)) {
    entries = isArray(usersync.syncs)
      ? usersync.syncs
      : Object.values(usersync).flatMap((value: any) => (isArray(value?.syncs) ? value.syncs : []));
  }
  return entries
    .map((entry: any) => ({ type: syncTypeOf(entry?.type), url: entry?.url }))
    .filter((entry): entry is { type: 'iframe' | 'image', url: string } =>
      entry.type != null && isString(entry.url) && /^https:\/\//i.test(entry.url));
}

function appendQuery(url: string, query: string): string {
  if (!query) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${query}`;
}

function fireTracker(url: unknown, bid: any): void {
  if (!isString(url) || !url) return;
  ajax(replaceAuctionPrice(url, bid.originalCpm ?? bid.cpm), undefined, undefined, { method: 'GET', keepalive: true });
}

/**
 * The exchange trades in USD only; a floor in any other currency is converted through the currency
 * module, or dropped when no conversion is available.
 */
function floorInUsd(imp: any): void {
  if (imp.bidfloor == null) return;
  const currency = String(imp.bidfloorcur || DEFAULT_CURRENCY).toUpperCase();
  if (currency !== DEFAULT_CURRENCY) {
    try {
      imp.bidfloor = Math.round(convertCurrency(imp.bidfloor, currency, DEFAULT_CURRENCY, false) * 10000) / 10000;
    } catch (e) {
      logWarn(`${BIDDER_CODE}: cannot convert the ${currency} floor to USD, sending the impression without a floor`);
      delete imp.bidfloor;
      delete imp.bidfloorcur;
      return;
    }
  }
  imp.bidfloorcur = DEFAULT_CURRENCY;
}

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY
  },

  imp(buildImp, bidRequest, context) {
    const imp: any = buildImp(bidRequest, context);
    const params: any = bidRequest.params || {};
    const pid = pidOf(bidRequest);
    imp.tagid = pid;
    if (imp.bidfloor == null && typeof params.bidfloor === 'number') {
      imp.bidfloor = params.bidfloor;
      imp.bidfloorcur = DEFAULT_CURRENCY;
    }
    floorInUsd(imp);
    imp.displaymanager = imp.displaymanager || 'Prebid.js';
    imp.displaymanagerver = imp.displaymanagerver || '$prebid.version$';
    deepSetValue(imp, `ext.${BIDDER_CODE}`, {
      pid,
      test: isTestMode(params) ? 1 : 0,
      adUnitCode: bidRequest.adUnitCode
    });
    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request: any = buildRequest(imps, bidderRequest, context);
    const bidRequests: any[] = context.bidRequests || [];
    fillSite(request, bidderRequest);
    fillDevice(request);
    alignVersionedFields(request, bidderRequest, bidRequests);
    request.cur = [DEFAULT_CURRENCY];
    deepSetValue(request, 'ext.prebid.channel', { name: 'pbjs', version: '$prebid.version$' });
    deepSetValue(request, `ext.${BIDDER_CODE}`, {
      adapterVersion: ADAPTER_VERSION,
      prebidVersion: '$prebid.version$'
    });
    if (bidRequests.some(bidRequest => isTestMode(bidRequest.params))) {
      request.test = 1;
      logInfo(`${BIDDER_CODE}: test mode is on, sending`, request);
    }
    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    const prepared = prepareBid(bid, context.imp);
    if (!prepared) return undefined;
    const bidResponse: any = buildBidResponse(prepared, context);
    if (!bidResponse) return undefined;
    if (!bidResponse.currency) {
      bidResponse.currency = DEFAULT_CURRENCY;
    }
    const isVast = bidResponse.mediaType === VIDEO || bidResponse.mediaType === AUDIO;
    if (isVast && prepared.adm) {
      // with inline VAST, nurl is a win notice rather than the VAST location
      delete bidResponse.vastUrl;
    }
    // banner nurl is already rendered by the converter, as a pixel next to adm or as adUrl
    if (prepared.nurl && bidResponse.mediaType !== BANNER && (!isVast || prepared.adm)) {
      bidResponse.nurl = prepared.nurl;
    }
    bidResponse.meta = {
      ...bidResponse.meta,
      advertiserDomains: isArray(prepared.adomain) ? prepared.adomain : [],
      mediaType: bidResponse.mediaType
    };
    if (prepared.ext?.networkId != null) bidResponse.meta.networkId = prepared.ext.networkId;
    if (prepared.ext?.brandName) bidResponse.meta.brandName = prepared.ext.brandName;
    return bidResponse;
  }
});

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE, AUDIO],

  isBidRequestValid(bid) {
    const params: any = bid?.params;
    if (!isPlainObject(params) || !isValidPid(params.pid)) {
      logWarn(`${BIDDER_CODE}: params.pid is required and must be a non-empty string or a number`, bid);
      return false;
    }
    if (!isValidTestFlag(params.test)) {
      logWarn(`${BIDDER_CODE}: params.test must be 0 or 1`, bid);
      return false;
    }
    if (params.bidfloor != null && (typeof params.bidfloor !== 'number' || !(params.bidfloor >= 0))) {
      logWarn(`${BIDDER_CODE}: params.bidfloor must be a non-negative number`, bid);
      return false;
    }
    return true;
  },

  // one ad unit per request: the exchange runs its auction on a single imp
  buildRequests(validBidRequests, bidderRequest) {
    return (validBidRequests || []).map(bidRequest => ({
      method: 'POST' as const,
      url: endpointFor(pidOf(bidRequest)),
      data: converter.toORTB({ bidRequests: [bidRequest], bidderRequest }),
      options: { withCredentials: true }
    }));
  },

  interpretResponse(serverResponse, request) {
    const response = normalizeOrtbResponse(serverResponse?.body);
    if (!response || !request?.data) return [];
    return (converter.fromORTB({ request: request.data, response }) as any).bids || [];
  },

  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent, coppa) {
    const { iframeEnabled, pixelEnabled } = syncOptions || ({} as any);
    if (!iframeEnabled && !pixelEnabled) return [];
    const params: Record<string, unknown> = { ...getUserSyncParams(gdprConsent, uspConsent, gppConsent) };
    if (coppa) params.coppa = 1;
    const query = Object.entries(params)
      .filter(([, value]) => value != null)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');
    const allowed = (type: string) => (type === 'iframe' ? iframeEnabled : pixelEnabled);
    const candidates = [
      iframeEnabled
        ? { type: 'iframe' as const, url: `${SYNC_URL}&f=iframe` }
        : { type: 'image' as const, url: `${SYNC_URL}&f=image` },
      ...(serverResponses || []).flatMap(response => readServerSyncs(response?.body))
    ];
    const seen = new Set<string>();
    return candidates
      .filter(sync => allowed(sync.type))
      .map(sync => ({ type: sync.type, url: appendQuery(sync.url, query) }))
      .filter(sync => !seen.has(sync.url) && !!seen.add(sync.url));
  },

  onBidWon(bid) {
    fireTracker((bid as any).nurl, bid);
  },

  onBidBillable(bid) {
    fireTracker(bid.burl, bid);
  }
};

registerBidder(spec);
