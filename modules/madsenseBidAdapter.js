import {
  logInfo,
  logWarn,
  logError,
  logMessage,
  deepAccess,
  deepSetValue,
  mergeDeep
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'

const BIDDER_CODE = 'madsense';
const DEFAULT_BID_TTL = 300;
const DEFAULT_NET_REVENUE = true;
const DEFAULT_CURRENCY = 'USD';

const converter = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_BID_TTL
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    if (!imp.bidfloor) {
      imp.bidfloor = bidRequest.params.bidfloor || 0;
      imp.bidfloorcur = bidRequest.params.currency || DEFAULT_CURRENCY;
    }
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    mergeDeep(req, {
      ext: {
        hb: 1,
        prebidver: '$prebid.version$',
        adapterver: '1.0.0',
      }
    })

    if (bidderRequest.gdprConsent) {
      deepSetValue(req, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(req, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
    }

    if (bidderRequest.uspConsent) {
      deepSetValue(req, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    return req;
  },
  bidResponse(buildBidResponse, bid, context) {
    let resMediaType;
    const {bidRequest} = context;

    if (bid.mtype == 2) {
      resMediaType = VIDEO;
    } else {
      resMediaType = BANNER;
    }

    context.mediaType = resMediaType;
    context.currency = DEFAULT_CURRENCY;

    if (resMediaType === VIDEO) {
      context.vastXml = bid.adm;
    }

    const bidResponse = buildBidResponse(bid, context);

    return bidResponse;
  }
});

export const spec = {
  code: BIDDER_CODE,
  VERSION: '1.0.0',
  supportedMediaTypes: [BANNER, VIDEO],
  ENDPOINT: 'https://ads.dev.madsense.io/pbjs',

  isBidRequestValid: function (bid) {
    return (
      _validateParams(bid) &&
      _validateBanner(bid) &&
      _validateVideo(bid)
    );
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let contextMediaType = BANNER;

    if (hasVideoMediaType(validBidRequests)) {
      contextMediaType = VIDEO;
    }

    const data = converter.toORTB({ bidRequests: validBidRequests, bidderRequest, context: {contextMediaType} });

    let companyId = validBidRequests[0].params.company_id;

    if (validBidRequests[0].params.e2etest) {
      logMessage('madsense: test mode');
      companyId = 'test'
    }
    let baseEndpoint = spec.ENDPOINT + '?company_id=' + companyId;

    return {
      method: 'POST',
      url: baseEndpoint,
      data: data
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bids = converter.fromORTB({response: serverResponse.body, request: bidRequest.data}).bids;
    return bids;
  }
};

/* =======================================
 * Util Functions
 *======================================= */

function hasBannerMediaType(bidRequest) {
  return !!deepAccess(bidRequest, 'mediaTypes.banner');
}

function hasVideoMediaType(bidRequest) {
  return !!deepAccess(bidRequest, 'mediaTypes.video');
}

function _validateParams(bidRequest) {
  if (!bidRequest.params) {
    return false;
  }

  if (bidRequest.params.e2etest) {
    return true;
  }

  if (!bidRequest.params.company_id) {
    logError('madsense: Validation failed: company_id not declared');
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
  const banner = deepAccess(bidRequest, 'mediaTypes.banner');
  if (!Array.isArray(banner.sizes)) {
    return false;
  }

  return true;
}

function _validateVideo(bidRequest) {
  if (!hasVideoMediaType(bidRequest)) {
    return true;
  }

  const videoPlacement = deepAccess(bidRequest, 'mediaTypes.video', {});
  const videoBidderParams = deepAccess(bidRequest, 'params.video', {});
  const params = deepAccess(bidRequest, 'params', {});

  if (params && params.e2etest) {
    return true;
  }

  const videoParams = {
    ...videoPlacement,
    ...videoBidderParams
  };

  if (!Array.isArray(videoParams.mimes) || videoParams.mimes.length === 0) {
    logError('madsense: Validation failed: invalid mimes');
    return false;
  }

  if (!Array.isArray(videoParams.protocols) || videoParams.protocols.length === 0) {
    logError('madsense: Validation failed: invalid protocols');
    return false;
  }

  if (!videoParams.context) {
    logError('madsense: Validation failed: context id not declared');
    return false;
  }

  if (videoParams.context !== 'instream') {
    logError('madsense: Validation failed: only context instream is supported');
    return false;
  }

  if (typeof videoParams.playerSize === 'undefined' || !Array.isArray(videoParams.playerSize) || !Array.isArray(videoParams.playerSize[0])) {
    logError('madsense: Validation failed: player size not declared or is not in format [[w,h]]');
    return false;
  }

  return true;
}

registerBidder(spec);
