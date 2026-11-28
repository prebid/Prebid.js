import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { ORTB_MTYPES } from '../libraries/ortbConverter/processors/mediaType.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import type { BidderSpec } from '../src/adapters/bidderFactory.js';
import type { BidResponse } from '../src/bidfactory.js';
import { BANNER } from '../src/mediaTypes.js';
import type { MediaType } from '../src/mediaTypes.js';
import { noCredsAjax } from '../src/ajax.js';
import { config as pbjsConfig } from '../src/config.js';
import { deepSetValue } from '../src/utils.js';

export interface WbBidParams {
  /**
   * Placement ID (UUID), dashed (`8-4-4-4-12`) or 32 hex characters without dashes.
   */
  placementId: string;
}

export interface WbConfig {
  /**
   * Overrides the bidder endpoint domain. Defaults to `ads-media.wildberries.ru`.
   */
  domain?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: WbBidParams;
  }
}

declare module '../src/config' {
  interface Config {
    [BIDDER_CODE]?: WbConfig;
  }
}

type WbBidderSpec = BidderSpec<typeof BIDDER_CODE>;

const BIDDER_CODE = 'wb';
const DEFAULT_DOMAIN = 'ads-media.wildberries.ru';
const BIDDER_PATH = '/adn/v1/bids';
const DEFAULT_TTL = 300;
const CURRENCY = 'RUB';
const DISPLAY_MANAGER = 'prebid';

const SUPPORTED_MEDIA_TYPES: MediaType[] = [BANNER];

const AUCTION_PRICE_MACRO = /\${AUCTION_PRICE}/g;
const AUCTION_CURRENCY_MACRO = /\${AUCTION_CURRENCY}/g;

const UUID_REGEXP = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32})$/i;

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    mediaType: BANNER,
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: CURRENCY,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.tagid = bidRequest.params.placementId;

    if (imp.bidfloorcur !== CURRENCY) {
      delete imp.bidfloor;
      delete imp.bidfloorcur;
    }

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    request.cur = [CURRENCY];
    deepSetValue(request, 'ext.displaymanager', DISPLAY_MANAGER);
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    if (ORTB_MTYPES[bid.mtype] !== BANNER) {
      return undefined;
    }

    const bidResponse = buildBidResponse(bid, context);
    bidResponse.burl = replaceAuctionMacros(bid.burl, bidResponse.cpm, bidResponse.currency);

    return bidResponse;
  },
});

const isBidRequestValid: WbBidderSpec['isBidRequestValid'] = (bid) => {
  const placementId = bid?.params?.placementId;
  return typeof placementId === 'string' && UUID_REGEXP.test(placementId);
};

const buildRequests: WbBidderSpec['buildRequests'] = (validBidRequests, bidderRequest) => {
  return [{
    method: 'POST' as const,
    url: `https://${getBidderDomain()}${BIDDER_PATH}`,
    data: converter.toORTB({ bidRequests: validBidRequests, bidderRequest }),
    options: {
      contentType: 'text/plain',
      withCredentials: true,
    },
  }];
};

const interpretResponse: WbBidderSpec['interpretResponse'] = (serverResponse, serverRequest) => {
  const response = serverResponse?.body;
  if (!response?.seatbid || !response.cur) {
    return [];
  }

  const { bids } = converter.fromORTB({ request: serverRequest.data, response }) as { bids: BidResponse[] };
  return bids.filter((bid) => bid.cpm > 0);
};

const onBidBillable: WbBidderSpec['onBidBillable'] = (bid) => {
  if (bid.burl) {
    noCredsAjax(bid.burl, undefined, undefined, { method: 'GET', keepalive: true });
  }
};

export const spec: WbBidderSpec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onBidBillable,
};

function replaceAuctionMacros(url: string | undefined, price: number, currency: string) {
  return url
    ?.replace(AUCTION_PRICE_MACRO, String(price))
    .replace(AUCTION_CURRENCY_MACRO, currency);
}

function getBidderDomain() {
  return pbjsConfig.getConfig(BIDDER_CODE)?.domain ?? DEFAULT_DOMAIN;
}

registerBidder(spec);
