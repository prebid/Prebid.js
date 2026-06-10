import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { deepAccess, deepSetValue } from '../src/utils.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';

export const dep = {
  ajax
};

type AdelerateBidParams = {
  placementId: string;
  publisherId: string;
  floor?: number;
  floorCurrency?: string;
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: AdelerateBidParams;
  }
}

const ADAPTER_VERSION = '1.0.0';
const BIDDER_CODE = 'adelerate';
const ENDPOINT = 'https://pbs.bidelerate.com/openrtb2/auction';
const SYNC_ENDPOINT = 'https://pbs.bidelerate.com/cookie_sync';
const EVENTS_ENDPOINT = 'https://pbs.bidelerate.com/event';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 300;
const VIDEO_TTL = 600;

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
    nativeRequest: {
      eventtrackers: [{
        event: 1,
        methods: [1, 2],
      }],
    },
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    if (!imp.banner && !imp.video && !imp.native) {
      return null;
    }
    const params = bidRequest.params as AdelerateBidParams;
    imp.tagid = bidRequest.adUnitCode;
    imp.displaymanager = 'Prebid.js';
    imp.displaymanagerver = '$prebid.version$';
    deepSetValue(imp, 'ext.bidder', {
      placementId: params.placementId,
      publisherId: params.publisherId,
    });
    if (params.floor && !imp.bidfloor) {
      imp.bidfloor = params.floor;
      imp.bidfloorcur = params.floorCurrency || DEFAULT_CURRENCY;
    }
    imp.secure = 1;
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    deepSetValue(req, 'ext.prebid.bidder.adelerate.version', ADAPTER_VERSION);
    return req;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    if (bidResponse.mediaType === VIDEO && Number(bidResponse.ttl) === DEFAULT_TTL) {
      bidResponse.ttl = VIDEO_TTL;
    }
    if (bid.ext) {
      const meta = bidResponse.meta || {};
      const extFields = {
        networkId: bid.ext.networkId,
        networkName: bid.ext.networkName,
        advertiserId: bid.ext.advertiserId,
        advertiserName: bid.ext.advertiserName,
        agencyId: bid.ext.agencyId,
        agencyName: bid.ext.agencyName,
        brandId: bid.ext.brandId,
        brandName: bid.ext.brandName,
        demandSource: bid.ext.demandSource,
        dchain: bid.ext.dchain,
      };
      Object.keys(extFields).forEach(key => {
        if (extFields[key] != null) {
          meta[key] = extFields[key];
        }
      });
      if (bid.ext.dsa && Object.keys(bid.ext.dsa).length) {
        meta.dsa = bid.ext.dsa;
      }
      bidResponse.meta = meta;
    }
    return bidResponse;
  },
  overrides: {
    imp: {
      video(orig, imp, bidRequest, context) {
        if (FEATURES.VIDEO) {
          orig(imp, bidRequest, context);
        }
      },
      native(orig, imp, bidRequest, context) {
        if (FEATURES.NATIVE) {
          orig(imp, bidRequest, context);
        }
      }
    }
  }
});

function isBidRequestValid(bid) {
  const hasPlacement = !!deepAccess(bid, 'params.placementId');
  const hasPublisher = !!deepAccess(bid, 'params.publisherId');
  const hasBanner = !!deepAccess(bid, 'mediaTypes.banner');
  const hasVideo = !!deepAccess(bid, 'mediaTypes.video');
  const hasNative = !!deepAccess(bid, 'mediaTypes.native');

  return hasPlacement && hasPublisher && (hasBanner || hasVideo || hasNative);
}

function buildRequests(validBidRequests, bidderRequest) {
  const data = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });

  if (!data?.imp?.length) {
    return null;
  }

  return {
    method: 'POST' as const,
    url: ENDPOINT,
    data,
    options: {
      contentType: 'text/plain',
      withCredentials: true,
    }
  };
}

function interpretResponse(serverResponse, request) {
  if (!serverResponse.body) {
    return [];
  }
  const result = converter.fromORTB({ request: request.data, response: serverResponse.body });
  return (result as { bids: any[] }).bids;
}

function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
  const params = [];

  if (gdprConsent) {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      params.push(`gdpr=${Number(gdprConsent.gdprApplies)}`);
    }
    if (typeof gdprConsent.consentString === 'string' && gdprConsent.consentString.trim() !== '') {
      params.push(`gdpr_consent=${encodeURIComponent(gdprConsent.consentString)}`);
    }
  }

  if (uspConsent) {
    params.push(`us_privacy=${encodeURIComponent(uspConsent)}`);
  }

  if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
    params.push(`gpp=${encodeURIComponent(gppConsent.gppString)}`);
    params.push(`gpp_sid=${gppConsent.applicableSections.join(',')}`);
  }

  if (config.getConfig('coppa') === true) {
    params.push('coppa=1');
  }

  const query = params.length ? `?${params.join('&')}` : '';

  if (syncOptions?.iframeEnabled) {
    return [{ type: 'iframe' as const, url: `${SYNC_ENDPOINT}${query}` }];
  }

  if (syncOptions?.pixelEnabled) {
    return [{ type: 'image' as const, url: `${SYNC_ENDPOINT}/pixel${query}` }];
  }

  return [];
}

function onTimeout(data) {
  if (!data || !data.length) {
    return;
  }
  dep.ajax(`${EVENTS_ENDPOINT}/timeout`, undefined, JSON.stringify(data), {
    method: 'POST',
    keepalive: true,
    withCredentials: true,
  });
}

function onBidWon(bid) {
  if (!bid) {
    return;
  }
  dep.ajax(`${EVENTS_ENDPOINT}/win`, undefined, JSON.stringify({
    requestId: bid.requestId,
    adId: bid.adId,
    cpm: bid.cpm,
    currency: bid.currency,
    mediaType: bid.mediaType,
  }), {
    method: 'POST',
    keepalive: true,
    withCredentials: true,
  });
}

function onBidderError(args) {
  const { error, bidderRequest } = args || {};
  dep.ajax(`${EVENTS_ENDPOINT}/error`, undefined, JSON.stringify({
    error: error?.status,
    bidderCode: BIDDER_CODE,
    auctionId: bidderRequest?.auctionId,
  }), {
    method: 'POST',
    keepalive: true,
    withCredentials: true,
  });
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],

  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onTimeout,
  onBidWon,
  onBidderError,
};

registerBidder(spec);
