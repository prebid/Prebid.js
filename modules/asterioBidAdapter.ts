import { type AdapterRequest, type BidderSpec, type ServerResponse, registerBidder } from '../src/adapters/bidderFactory.js';
import { deepAccess, deepClone } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import type { BidRequest } from '../src/adapterManager.js';
import type { Size } from '../src/types/common.d.ts';

const BIDDER_CODE = 'asterio';
export const ENDPOINT = 'https://bid.asterio.ai/prebid/bid';

export type AsterioBidParams = {
  adUnitToken: string;
  pos?: number;
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: AsterioBidParams;
  }
}

type AsterioBidPayload = {
  bidId: string;
  adUnitToken: string;
  pos?: number;
  sizes: Array<{ width: number; height: number }>;
};

type AsterioServerBid = {
  ad?: string;
  requestId: string;
  cpm: string | number;
  currency?: string;
  width: number;
  height: number;
  ttl: number;
  creativeId: string;
  netRevenue?: boolean;
  mediaType?: string;
  format?: string;
  adomain?: string[];
};

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.adUnitToken);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const bids: AsterioBidPayload[] = validBidRequests.map(bidRequest => ({
      bidId: bidRequest.bidId,
      adUnitToken: bidRequest.params.adUnitToken,
      pos: getPosition(bidRequest),
      sizes: prepareSizes(bidRequest.sizes)
    }));

    const payload: {
      requestId: string;
      bids: AsterioBidPayload[];
      referer: string;
      schain: unknown;
      gdprConsent?: {
        consentRequired: boolean;
        consentString?: string;
      };
    } = {
      requestId: bidderRequest.bidderRequestId,
      bids,
      referer: bidderRequest.refererInfo?.page,
      schain: validBidRequests[0]?.ortb2?.source?.ext?.schain
    };

    if (bidderRequest?.gdprConsent) {
      payload.gdprConsent = {
        consentRequired: typeof bidderRequest.gdprConsent.gdprApplies === 'boolean' ? bidderRequest.gdprConsent.gdprApplies : false,
        consentString: bidderRequest.gdprConsent.consentString
      };
    }

    return {
      method: 'POST',
      url: ENDPOINT,
      data: payload,
      options: {
        contentType: 'text/plain',
        customHeaders: {
          'Rtb-Direct': 'true'
        }
      }
    };
  },

  interpretResponse: function (serverResponse: ServerResponse, _request: AdapterRequest) {
    const serverBody = serverResponse.body;
    if (!serverBody || typeof serverBody !== 'object' || !Array.isArray(serverBody.bids)) {
      return [];
    }

    return serverBody.bids.map((bidResponse: AsterioServerBid) => {
      const bid = deepClone(bidResponse);

      bid.cpm = parseFloat(String(bidResponse.cpm));
      bid.requestId = bidResponse.requestId;
      bid.ad = bidResponse.ad;
      bid.width = bidResponse.width;
      bid.height = bidResponse.height;
      bid.currency = bidResponse.currency || 'USD';
      bid.netRevenue = typeof bidResponse.netRevenue === 'boolean' ? bidResponse.netRevenue : true;
      bid.ttl = bidResponse.ttl;
      bid.creativeId = bidResponse.creativeId;
      bid.mediaType = bidResponse.mediaType || bidResponse.format || 'banner';

      if (VIDEO === bid.mediaType && bidResponse.ad) {
        bid.vastXml = bidResponse.ad;
      }

      bid.meta = {};
      bid.meta.advertiserDomains = bid.adomain || [];

      return bid;
    });
  },

  onBidWon: function (bid: { winUrl?: string; cpm: number }) {
    if (bid.winUrl) {
      const winUrl = bid.winUrl.replace(/\$\{AUCTION_PRICE}/, String(bid.cpm));
      ajax(winUrl, null, undefined, { keepalive: true });
      return true;
    }
    return false;
  }
};

function prepareSizes(sizes: Size | Size[]) {
  if (!Array.isArray(sizes) || sizes.length === 0) {
    return [];
  }
  const normalizedSizes = typeof sizes[0] === 'number' ? [sizes] : sizes;
  return normalizedSizes.map(size => ({ width: size[0], height: size[1] }));
}

function getPosition(bidRequest: BidRequest<typeof BIDDER_CODE>): number | undefined {
  return bidRequest.params.pos ?? deepAccess(bidRequest, 'mediaTypes.banner.pos') ?? deepAccess(bidRequest, 'mediaTypes.video.pos');
}

registerBidder(spec);
