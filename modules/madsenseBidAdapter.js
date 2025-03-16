import {
  logError,
  logWarn,
  logMessage,
  deepSetValue,
  mergeDeep,
} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'madsense';
const DEFAULT_BID_TTL = 55;
const DEFAULT_NET_REVENUE = true;
const DEFAULT_CURRENCY = 'USD';
const MS_EXCHANGE_BASE_URL = 'https://ads.madsense.io/pbjs';

const buildImpWithDefaults = (buildImp, bidRequest, context) => {
  const imp = buildImp(bidRequest, context);

  imp.bidfloor = imp.bidfloor || bidRequest.params.bidfloor || 0;
  imp.bidfloorcur = imp.bidfloorcur || bidRequest.params.currency || DEFAULT_CURRENCY;

  return imp;
};

const enrichRequestWithConsent = (req, bidderRequest) => {
  if (bidderRequest.gdprConsent) {
    deepSetValue(req, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
    deepSetValue(req, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies ? 1 : 0);
  }

  if (bidderRequest.uspConsent) {
    deepSetValue(req, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }
};

const determineMediaType = (bid) => {
  if (bid.mtype === 2) {
    return VIDEO;
  }

  if (bid.mtype === 1) {
    return BANNER;
  }

  logWarn('Unrecognized media type, defaulting to BANNER (madSense)');
  return BANNER;
};

const converter = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_BID_TTL,
  },
  imp: (buildImp, bidRequest, context) => buildImpWithDefaults(buildImp, bidRequest, context),
  request: (buildRequest, imps, bidderRequest, context) => {
    const req = buildRequest(imps, bidderRequest, context);

    mergeDeep(req, {
      ext: {
        hb: 1,
        prebidver: '$prebid.version$',
        adapterver: '1.0.0',
      },
    });

    enrichRequestWithConsent(req, bidderRequest);
    return req;
  },
  bidResponse: (buildBidResponse, bid, context) => {
    const resMediaType = determineMediaType(bid);

    Object.assign(context, {
      mediaType: resMediaType,
      currency: DEFAULT_CURRENCY,
      ...(resMediaType === VIDEO && { vastXml: bid.adm }),
    });

    return buildBidResponse(bid, context);
  },
});

export const spec = {
  code: BIDDER_CODE,
  VERSION: '1.0.0',
  supportedMediaTypes: [BANNER, VIDEO],
  ENDPOINT: MS_EXCHANGE_BASE_URL,

  isBidRequestValid: function (bid) {
    return validateBidRequest(bid);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const contextMediaType = determineMediaType(validBidRequests[0]);
    const data = converter.toORTB({
      bidRequests: validBidRequests,
      bidderRequest,
      context: { contextMediaType },
    });

    const companyId = getCompanyId(validBidRequests);
    const madsenseExchangeEndpointUrl = buildEndpointUrl(companyId);

    return {
      method: 'POST',
      url: madsenseExchangeEndpointUrl,
      data: data,
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bids = parseServerResponse(serverResponse, bidRequest);
    return filterValidBids(bids);
  },
};

function validateBidRequest(bid) {
  return (
    _validateParams(bid) &&
    _validateBanner(bid) &&
    _validateVideo(bid)
  );
}

function getCompanyId(validBidRequests) {
  let companyId = validBidRequests[0].params.company_id;

  if (validBidRequests[0].params.test) {
    logMessage('madsense: test mode');
    companyId = 'test';
  }

  return companyId;
}

function buildEndpointUrl(companyId) {
  return `${spec.ENDPOINT}?company_id=${companyId}`;
}

function parseServerResponse(serverResponse, bidRequest) {
  return converter.fromORTB({
    response: serverResponse.body,
    request: bidRequest.data,
  }).bids;
}

function filterValidBids(bids) {
  return bids
    .map((bid) => {
      if (bid.mtype === 2 && bid.adm) {
        if (!config.getConfig('cache.url')) {
          bid.vastXml = bid.adm;
          delete bid.adm;
        } else {
          logError('Prebid Cache is not configured (madSense)');
          return null;
        }
      }
      return bid;
    })
    .filter((bid) => bid !== null);
}

function hasBannerMediaType(bidRequest) {
  return !!bidRequest.mediaTypes?.banner;
}

function hasVideoMediaType(bidRequest) {
  return !!bidRequest.mediaTypes?.video;
}

function _validateParams(bidRequest) {
  if (!bidRequest.params) {
    return false;
  }

  if (bidRequest.params.test) {
    return true;
  }

  if (!bidRequest.params.company_id) {
    logError('company_id not declared (madSense)');
    return false;
  }

  const mediaTypesExists = hasVideoMediaType(bidRequest) || hasBannerMediaType(bidRequest);
  if (!mediaTypesExists) {
    return false;
  }

  return true;
}

function _validateBanner(bidRequest) {
  if (!hasBannerMediaType(bidRequest)) {
    return true;
  }

  const bannerSizes = bidRequest.mediaTypes?.banner?.sizes;

  if (!Array.isArray(bannerSizes)) {
    return false;
  }

  return true;
}

function _validateVideo(bidRequest) {
  if (!hasVideoMediaType(bidRequest)) {
    return true;
  }

  const videoPlacement = bidRequest.mediaTypes?.video || {};
  const videoBidderParams = bidRequest.params?.video || {};
  const params = bidRequest.params || {};

  if (params && params.test) {
    return true;
  }

  const videoParams = {
    ...videoPlacement,
    ...videoBidderParams,
  };

  if (!Array.isArray(videoParams.mimes) || videoParams.mimes.length === 0) {
    logWarn('Invalid MIME types (madSense)');
    return false;
  }

  if (!Array.isArray(videoParams.protocols) || videoParams.protocols.length === 0) {
    logWarn('Invalid protocols (madSense)');
    return false;
  }

  if (!videoParams.context) {
    logWarn('Context not declared (madSense)');
    return false;
  }

  if (videoParams.context !== 'instream') {
    if (hasBannerMediaType(bidRequest)) {
      logWarn('Context is not instream, preferring banner (madSense)');
      return true;
    } else {
      logWarn('Only instream context is supported (madSense)');
    }
  }

  if (
    typeof videoParams.playerSize === 'undefined' ||
    !Array.isArray(videoParams.playerSize) ||
    !Array.isArray(videoParams.playerSize[0])
  ) {
    logWarn('Player size not declared or not in [[w,h]] format');
    return false;
  }

  return true;
}

registerBidder(spec);
