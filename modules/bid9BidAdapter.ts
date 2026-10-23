import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { toOrtb26 } from '../libraries/ortb2.5Translator/translator.js';
import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import type { MediaType } from '../src/mediaTypes.ts';
import type { BidResponse } from '../src/bidfactory.ts';
import type { ORTBImp, ORTBRequest } from '../src/types/ortb/request.d.ts';
import {
  debugTurnedOn,
  deepAccess,
  deepSetValue,
  isArray,
  isNumber,
  isPlainObject,
  isStr,
  logInfo,
  logWarn,
  replaceAuctionPrice,
  triggerPixel
} from '../src/utils.js';

const BIDDER_CODE = 'bid9';

interface Bid9BidParams {
  /**
   * bid9 channel ID. Required; sent as the endpoint's `tagid` query parameter and as `imp.tagid`.
   */
  channelId: string;
  /**
   * bid9 publisher ID. Optional; sent as `site.publisher.id` / `app.publisher.id` unless already set.
   */
  publisherId?: string;
  /**
   * Static floor used only when the Price Floors Module provides none.
   */
  bidFloor?: number;
  /**
   * Currency of `bidFloor`.
   * @default 'USD'
   */
  bidFloorCur?: string;
}

interface Bid9Config {
  /**
   * Overrides the bidder endpoint URL. Honoured only for approved endpoints, or when Prebid debug mode is on.
   */
  endpoint?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: Bid9BidParams;
  }
}

declare module '../src/config' {
  interface Config {
    [BIDDER_CODE]?: Bid9Config;
  }
}

export const ENDPOINT = 'https://rtb.bid9.ad/sspRTB2';
export const APPROVED_ENDPOINTS: readonly string[] = [ENDPOINT];
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 300;
const ORTB_MTYPES = { 1: BANNER, 2: VIDEO } as const;
const VAST_PATTERN = /^\s*(<\?xml|<VAST)/i;

function isValidChannelId(channelId: unknown): channelId is string {
  return typeof channelId === 'string' && channelId.trim() !== '';
}

/**
 * Returns the bid params with invalid optional values removed (each one is reported through `logWarn`).
 */
export function normalizeParams(params: Partial<Bid9BidParams> = {}): Partial<Bid9BidParams> {
  const { channelId, publisherId, bidFloor, bidFloorCur } = params;
  const result: Partial<Bid9BidParams> = { channelId };
  if (publisherId != null) {
    if (isStr(publisherId) && publisherId !== '') {
      result.publisherId = publisherId;
    } else {
      logWarn(`${BIDDER_CODE}: ignoring invalid params.publisherId`, publisherId);
    }
  }
  if (bidFloor != null) {
    if (isNumber(bidFloor) && bidFloor > 0) {
      result.bidFloor = bidFloor;
    } else {
      logWarn(`${BIDDER_CODE}: ignoring invalid params.bidFloor`, bidFloor);
    }
  }
  if (bidFloorCur != null) {
    if (isStr(bidFloorCur) && /^[A-Z]{3}$/.test(bidFloorCur)) {
      result.bidFloorCur = bidFloorCur;
    } else {
      logWarn(`${BIDDER_CODE}: ignoring invalid params.bidFloorCur`, bidFloorCur);
    }
  }
  return result;
}

export function resolveEndpoint(): string {
  const override = config.getConfig(BIDDER_CODE)?.endpoint;
  if (!override) {
    return ENDPOINT;
  }
  if (APPROVED_ENDPOINTS.includes(override)) {
    return override;
  }
  if (debugTurnedOn() && isStr(override)) {
    logInfo(`${BIDDER_CODE}: debug mode, using endpoint override "${override}"`);
    return override;
  }
  logWarn(`${BIDDER_CODE}: ignoring unapproved endpoint override "${override}"`);
  return ENDPOINT;
}

/**
 * The bid9 endpoint routes each request by the channel ID in its `tagid` query parameter.
 */
export function endpointFor(base: string, channelId: string): string {
  return `${base}${base.includes('?') ? '&' : '?'}tagid=${encodeURIComponent(channelId)}`;
}

/**
 * Puts consent, privacy and supply-chain signals in their OpenRTB 2.6 locations only. Prebid still writes some of them
 * in the 2.5 `ext` form (e.g. `regs.ext.gdpr`, `user.ext.consent`); keeping both forms is invalid in 2.6.
 * User IDs are the one exception: they also stay in `user.ext.eids`, which many exchanges still read.
 */
function normalizeToOrtb26(request: ORTBRequest) {
  toOrtb26(request);
  if (isArray(request.user?.eids) && request.user.eids.length > 0) {
    deepSetValue(request, 'user.ext.eids', request.user.eids);
  }
  ['regs', 'user', 'source'].forEach(section => {
    const ext = request[section]?.ext;
    if (isPlainObject(ext) && Object.keys(ext).length === 0) {
      delete request[section].ext;
    }
  });
}

/**
 * Determines the media type of a response bid: `mtype` when usable, otherwise inferred from the imp and markup.
 */
export function getBidMediaType(bid: { mtype?: number; adm?: string }, imp: ORTBImp): MediaType {
  const fromMtype = ORTB_MTYPES[bid.mtype as keyof typeof ORTB_MTYPES];
  if (fromMtype) {
    return fromMtype;
  }
  if (imp?.video && !imp?.banner) {
    return VIDEO;
  }
  if (imp?.banner && !imp?.video) {
    return BANNER;
  }
  return isStr(bid.adm) && VAST_PATTERN.test(bid.adm) ? VIDEO : BANNER;
}

function isValidResponseBid(bid: any): boolean {
  if (!isPlainObject(bid)) {
    return false;
  }
  if (!isNumber(bid.price) || bid.price <= 0) {
    logWarn(`${BIDDER_CODE}: discarding bid with non-positive or missing price`, bid);
    return false;
  }
  if (!(isStr(bid.adm) && bid.adm !== '') && !(isStr(bid.nurl) && bid.nurl !== '')) {
    logWarn(`${BIDDER_CODE}: discarding bid without adm or nurl`, bid);
    return false;
  }
  return true;
}

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    // no default `currency` here: it would take precedence over the Currency module's adServerCurrency
    netRevenue: true,
    ttl: DEFAULT_TTL
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const params = normalizeParams(bidRequest.params);
    imp.tagid = params.channelId;
    deepSetValue(imp, `ext.${BIDDER_CODE}`, params);
    if (imp.bidfloor == null && params.bidFloor != null) {
      imp.bidfloor = params.bidFloor;
      imp.bidfloorcur = params.bidFloorCur || DEFAULT_CURRENCY;
    }
    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    const publisherId = (context.bidRequests || [])
      .map(bidRequest => bidRequest.params?.publisherId)
      .find(id => isStr(id) && id !== '');
    if (publisherId) {
      const client = request.app ? 'app' : request.dooh ? 'dooh' : 'site';
      if (deepAccess(request, `${client}.publisher.id`) == null) {
        deepSetValue(request, `${client}.publisher.id`, publisherId);
      }
    }

    if (!isArray(request.cur) || request.cur.length === 0) {
      request.cur = [DEFAULT_CURRENCY];
    }
    deepSetValue(request, 'ext.prebid.channel', { name: 'pbjs', version: '$prebid.version$' });
    normalizeToOrtb26(request);
    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    context.mediaType = getBidMediaType(bid, context.imp);
    const bidResponse = buildBidResponse(bid, context) as any;

    // ORTB: an absent response `cur` means USD
    bidResponse.currency = bidResponse.currency || DEFAULT_CURRENCY;
    bidResponse.creativeId = bidResponse.creativeId ?? bid.id;
    bidResponse.meta = {
      ...bidResponse.meta,
      advertiserDomains: bidResponse.meta?.advertiserDomains ?? [],
      mediaType: bidResponse.mediaType
    };
    if (context.seatbid?.seat) {
      bidResponse.meta.networkName = context.seatbid.seat;
    }

    if (bidResponse.mediaType === VIDEO) {
      if (bidResponse.vastXml) {
        bidResponse.vastXml = replaceAuctionPrice(bidResponse.vastXml, bidResponse.cpm);
        // with inline VAST, nurl is a win notice rather than the VAST location
        delete bidResponse.vastUrl;
        if (bid.nurl) {
          bidResponse.nurl = bid.nurl;
        }
      } else if (bidResponse.vastUrl) {
        bidResponse.vastUrl = replaceAuctionPrice(bidResponse.vastUrl, bidResponse.cpm);
      }
    }
    return bidResponse;
  }
});

const isBidRequestValid: BidderSpec<typeof BIDDER_CODE>['isBidRequestValid'] = (bidRequest) => {
  if (!isValidChannelId(bidRequest?.params?.channelId)) {
    logWarn(`${BIDDER_CODE}: params.channelId must be a non-empty string`, bidRequest?.params);
    return false;
  }
  return true;
};

const buildRequests: BidderSpec<typeof BIDDER_CODE>['buildRequests'] = (validBidRequests, bidderRequest) => {
  const base = resolveEndpoint();
  // the bid9 endpoint reads only the first imp of a request, so each ad unit gets its own request
  return validBidRequests.map(bidRequest => ({
    method: 'POST' as const,
    url: endpointFor(base, bidRequest.params.channelId),
    data: converter.toORTB({ bidRequests: [bidRequest], bidderRequest })
  }));
};

const interpretResponse: BidderSpec<typeof BIDDER_CODE>['interpretResponse'] = (serverResponse, request) => {
  const body = serverResponse?.body;
  if (!isPlainObject(body)) {
    // an empty body (e.g. HTTP 204) is a regular no-bid
    if (body != null && body !== '') {
      logWarn(`${BIDDER_CODE}: unexpected response body, treating as no-bid`, body);
    }
    return [];
  }
  if (body.seatbid == null) {
    return [];
  }
  if (!isArray(body.seatbid)) {
    logWarn(`${BIDDER_CODE}: response seatbid is not an array, treating as no-bid`, body);
    return [];
  }

  const seatbid = body.seatbid
    .filter(isPlainObject)
    .map(seat => ({ ...seat, bid: (isArray(seat.bid) ? seat.bid : []).filter(isValidResponseBid) }))
    .filter(seat => seat.bid.length > 0);
  if (seatbid.length === 0) {
    return [];
  }

  try {
    const { bids } = converter.fromORTB({ response: { ...body, seatbid }, request: (request as any).data }) as { bids: BidResponse[] };
    return bids;
  } catch (e) {
    logWarn(`${BIDDER_CODE}: could not interpret response, treating as no-bid`, e);
    return [];
  }
};

function firePixel(url: unknown, cpm: number) {
  if (isStr(url) && url !== '') {
    triggerPixel(replaceAuctionPrice(url, cpm));
  }
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,

  onBidWon(bid) {
    firePixel((bid as any).nurl, bid.originalCpm ?? bid.cpm);
  },

  onBidBillable(bid) {
    firePixel((bid as any).burl, bid.originalCpm ?? bid.cpm);
  },

  onTimeout(timeoutData) {
    logWarn(`${BIDDER_CODE}: bid request timed out`, (timeoutData || []).map(({ adUnitCode, bidId, timeout }) => ({ adUnitCode, bidId, timeout })));
  },

  onBidderError({ error, bidderRequest }) {
    logWarn(`${BIDDER_CODE}: bid request failed with HTTP status ${error?.status}`, { auctionId: bidderRequest?.auctionId, error });
  }
};

registerBidder(spec);
