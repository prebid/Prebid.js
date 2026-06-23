import { type AdapterRequest, type BidderSpec, type ServerResponse, registerBidder } from '../src/adapters/bidderFactory.js';
import { deepAccess, deepClone } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import type { BidRequest } from '../src/adapterManager.js';
import type { Size } from '../src/types/common.d.ts';

const BIDDER_CODE = 'asterio';
export const ENDPOINT = 'https://bid.asterio.ai/prebid/bid';

export const dep = {
  ajax
};

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

type AsterioNativeImage = {
  url: string;
  width?: number;
  height?: number;
};

type AsterioNativeResponse = {
  link?: {
    url?: string;
    clicktrackers?: string[];
  };
  imptrackers?: string[];
  eventtrackers?: Array<{
    event?: number;
    method?: number;
    url?: string;
  }>;
  assets?: Array<{
    title?: {
      text?: string;
    };
    img?: {
      url?: string;
      w?: number;
      h?: number;
      type?: number;
    };
    data?: {
      value?: string;
      type?: number;
    };
  }>;
};

type AsterioNativeBid = {
  clickUrl?: string;
  clickTrackers: string[];
  impressionTrackers: string[];
  ortb: AsterioNativeResponse;
  title?: string;
  image?: AsterioNativeImage;
  icon?: AsterioNativeImage;
  body?: string;
};

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.adUnitToken);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const bids: AsterioBidPayload[] = validBidRequests.map(bidRequest => ({
      bidId: bidRequest.bidId,
      adUnitToken: bidRequest.params.adUnitToken,
      pos: getPosition(bidRequest),
      sizes: prepareSizes(getSizes(bidRequest))
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

      if (NATIVE === bid.mediaType && bidResponse.ad) {
        const native = parseNativeAd(bidResponse.ad);
        if (native) {
          bid.native = native;
          delete bid.ad;
        }
      }

      bid.meta = {};
      bid.meta.advertiserDomains = bid.adomain || [];

      return bid;
    });
  },

  onBidWon: function (bid: { winUrl?: string; cpm: number }) {
    if (bid.winUrl) {
      const winUrl = bid.winUrl.replace(/\$\{AUCTION_PRICE}/, String(bid.cpm));
      dep.ajax(winUrl, null, undefined, { keepalive: true });
      return true;
    }
    return false;
  }
};

function prepareSizes(sizes: Size | Size[] | undefined): AsterioBidPayload['sizes'] {
  if (!Array.isArray(sizes) || sizes.length === 0) {
    return [];
  }
  const normalizedSizes: Size[] = typeof sizes[0] === 'number' ? [sizes as Size] : sizes as Size[];
  return normalizedSizes.map(size => ({ width: size[0], height: size[1] }));
}

function getSizes(bidRequest: BidRequest<typeof BIDDER_CODE>): Size | Size[] | undefined {
  return bidRequest.mediaTypes?.banner?.sizes ?? deepAccess(bidRequest, 'sizes');
}

function getPosition(bidRequest: BidRequest<typeof BIDDER_CODE>): number | undefined {
  return bidRequest.params.pos ?? deepAccess(bidRequest, 'mediaTypes.banner.pos') ?? deepAccess(bidRequest, 'mediaTypes.video.pos');
}

function parseNativeAd(ad: string): AsterioNativeBid | undefined {
  let parsedResponse: { native?: AsterioNativeResponse };
  try {
    parsedResponse = JSON.parse(ad);
  } catch (e) {
    return;
  }

  const nativeResponse = parsedResponse.native;
  if (!nativeResponse) {
    return;
  }

  const native: AsterioNativeBid = {
    clickUrl: nativeResponse.link?.url,
    clickTrackers: [...(nativeResponse.link?.clicktrackers || [])],
    impressionTrackers: [...(nativeResponse.imptrackers || [])],
    ortb: nativeResponse
  };

  nativeResponse.eventtrackers?.forEach(tracker => {
    if (tracker.event === 1 && tracker.method === 1 && tracker.url) {
      native.impressionTrackers.push(tracker.url);
    }
  });

  nativeResponse.assets?.forEach(asset => {
    if (asset.title?.text) {
      native.title = asset.title.text;
    } else if (asset.img?.url) {
      const image: AsterioNativeImage = {
        url: asset.img.url,
        width: asset.img.w,
        height: asset.img.h
      };
      if (asset.img.type === 1) {
        native.icon = image;
      } else if (asset.img.type === 3 || !native.image) {
        native.image = image;
      }
    } else if (asset.data?.value && (asset.data.type === 2 || !native.body)) {
      native.body = asset.data.value;
    }
  });

  return native;
}

registerBidder(spec);
