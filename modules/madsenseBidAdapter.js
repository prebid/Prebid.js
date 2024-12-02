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
const DEFAULT_BID_TTL = 55;
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
  ENDPOINT: 'https://ads.madsense.io/pbjs',

  isBidRequestValid: function (bid) {
    return (
      _validateParams(bid) &&
      _validateBanner(bid) &&
      _validateVideo(bid)
    );
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let contextMediaType;

    if (hasVideoMediaType(validBidRequests)) {
      contextMediaType = VIDEO;
    } else {
      contextMediaType = BANNER;
    }

    const data = converter.toORTB({
      bidRequests: validBidRequests,
      bidderRequest,
      context: {contextMediaType}
    });

    let companyId = validBidRequests[0].params.company_id;

    if (validBidRequests[0].params.test) {
      logMessage('madsense: test mode');
      companyId = 'test'
    }
    let madsenseExchangeEndpointUrl = spec.ENDPOINT + '?company_id=' + companyId;

    return {
      method: 'POST',
      url: madsenseExchangeEndpointUrl,
      data: data
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bids = converter.fromORTB({ response: serverResponse.body, request: bidRequest.data }).bids;

    return bids.map(bid => {
        if (bid.mtype === 2 && bid.adm) {
            if (pbjs.getConfig('cache') && pbjs.getConfig('cache').url) {
                bid.vastXml = bid.adm;
                delete bid.adm;
            } else {
                logError('Prebid Cache is not configured (madSense)');
                return null;
            }
        }

        return bid;
    }).filter(bid => bid !== null);
}
};


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
    logError('Invalid MIME types (madSense)');
    return false;
  }

  if (!Array.isArray(videoParams.protocols) || videoParams.protocols.length === 0) {
    logError('Invalid protocols (madSense)');
    return false;
  }

  if (!videoParams.context) {
    logError('Context not declared (madSense)');
    return false;
  }

  if (videoParams.context !== 'instream') {
    logError('Only instream context is supported (madSense)');
    return false;
  }

  if (typeof videoParams.playerSize === 'undefined' ||
    !Array.isArray(videoParams.playerSize) ||
    !Array.isArray(videoParams.playerSize[0])
  ) {
    logError('Player size not declared or not in [[w,h]] format');
    return false;
  }

  return true;
}

registerBidder(spec);