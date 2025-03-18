import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { deepSetValue, deepAccess, mergeDeep, logWarn, parseSizesInput, isNumber, isInteger, replaceAuctionPrice, getDNT, formatQS } from '../src/utils.js';
import { config } from '../src/config.js';
import { getConnectionType } from '../libraries/connectionInfo/connectionUtils.js'
import {getUserSyncParams} from '../libraries/userSyncUtils/userSyncUtils.js';

const BIDDER_CODE = 'stackadapt';
const ENDPOINT_URL = 'https://pjs.stackadapt.com/br';
const USER_SYNC_ENDPOINT = 'https://sync.srv.stackadapt.com/sync?nid=pjs';

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
    currency: 'USD',
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const bid = context.bidRequests[0];
    request.id = bidderRequest.bidderRequestId

    deepSetValue(request, 'site.publisher.id', bid.params.publisherId);
    deepSetValue(request, 'test', bid.params.testMode);

    setDevice(request)
    setSite(request, bidderRequest)
    setUser(request, bidderRequest)

    return request;
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    if (bidRequest.params.bidfloor) {
      deepSetValue(imp, 'bidfloor', bidRequest.params.bidfloor);
    }
    if (bidRequest.params.placementId) {
      deepSetValue(imp, 'tagid', bidRequest.params.placementId);
    }
    if (bidRequest.params.banner?.expdir) {
      deepSetValue(imp, 'banner.expdir', bidRequest.params.banner.expdir);
    }

    if (!isNumber(imp.secure)) {
      imp.secure = 1
    }

    return imp;
  },

  bidResponse(buildBidResponse, bid, context) {
    const { bidRequest } = context;
    const requestMediaTypes = Object.keys(bidRequest.mediaTypes);

    if (requestMediaTypes.length === 1) {
      context.mediaType = requestMediaTypes[0];
    } else {
      if (bid.adm?.search(/^(<\?xml|<vast)/i) !== -1) {
        context.mediaType = VIDEO;
      } else {
        context.mediaType = BANNER;
      }
    }

    bid.adm = replaceAuctionPrice(bid.adm, bid.price)
    return buildBidResponse(bid, context);
  }
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: 238,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function(bid) {
    if (!bid || !bid.params) {
      logWarn('StackAdapt bidder adapter - Missing bid.params');
      return false;
    }
    if (!bid.params.publisherId) {
      logWarn(BIDDER_CODE + 'StackAdapt bidder adapter -  Missing required bid.params.publisherId');
      return false;
    }
    if (bid.params.bidfloor && isNaN(parseFloat(bid.params.bidfloor))) {
      logWarn('StackAdapt bidder adapter -  bid.params.bidfloor must be a float');
      return false;
    }

    const mediaTypesBanner = bid.mediaTypes?.banner;
    const mediaTypesVideo = bid.mediaTypes?.video;
    if (!mediaTypesBanner && !mediaTypesVideo) {
      logWarn('StackAdapt bidder adapter - bid must contain bid.mediaTypes.banner or bid.mediaTypes.video');
      return false;
    }

    if (mediaTypesBanner) {
      const sizes = mediaTypesBanner.sizes;
      if (!sizes || parseSizesInput(sizes).length == 0) {
        logWarn('StackAdapt bidder adapter - banner bid requires bid.mediaTypes.banner.sizes of valid format');
        return false;
      }
    }

    if (mediaTypesVideo) {
      if (!mediaTypesVideo.plcmt) {
        logWarn('StackAdapt bidder adapter - video bid requires bid.mediaTypes.video.plcmt');
        return false;
      }
      if (!mediaTypesVideo.maxduration || !isInteger(mediaTypesVideo.maxduration)) {
        logWarn('StackAdapt bidder adapter - video bid requires bid.mediaTypes.video.maxduration in seconds');
        return false;
      }
      if (!mediaTypesVideo.api || mediaTypesVideo.api.length === 0) {
        logWarn('StackAdapt bidder adapter - video bid requires bid.mediaTypes.video.api to be an array of supported api frameworks. See ORTB spec for valid values');
        return false;
      }
      if (!mediaTypesVideo.mimes || mediaTypesVideo.mimes.length === 0) {
        logWarn('StackAdapt bidder adapter - video bid requires bid.mediaTypes.video.mimes to be an array of supported mime types');
        return false;
      }
      if (!mediaTypesVideo.protocols) {
        logWarn('StackAdapt bidder adapter - video bid bid.mediaTypes.video.protocols to be an array of supported protocols. See the ORTB spec for valid values');
        return false;
      }
    }

    return true;
  },

  buildRequests: function(bidRequests, bidderRequest) {
    if (!Array.isArray(bidRequests)) {
      throw new TypeError('Expected bidRequests to be an array');
    }

    const data = converter.toORTB({
      bidRequests: bidRequests,
      bidderRequest: bidderRequest
    });

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: data,
      options: {
        contentType: 'application/json',
        withCredentials: true
      }
    };
  },

  interpretResponse: function(response, request) {
    if (!response || !response.body || !request || !request.data) {
      return [];
    }

    const result = converter.fromORTB({
      response: response.body,
      request: request.data
    });

    return result.bids;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs = [];

    if (syncOptions.pixelEnabled) {
      let params = getUserSyncParams(gdprConsent, uspConsent, gppConsent);
      params = Object.keys(params).length ? `&${formatQS(params)}` : '';

      syncs.push({
        type: 'image',
        url: USER_SYNC_ENDPOINT + params
      });
    }

    return syncs;
  },
};

function setSite(request, bidderRequest) {
  request.site = mergeDeep(
    {
      page: bidderRequest.refererInfo?.page,
      ref: bidderRequest.refererInfo?.ref,
      publisher: bidderRequest.refererInfo?.domain ? { domain: bidderRequest.refererInfo?.domain } : undefined
    },
    request.site
  )
}

function setDevice(request) {
  request.device = mergeDeep(
    {
      ua: navigator.userAgent,
      dnt: getDNT() ? 1 : 0,
      language: navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage,
      connectiontype: getConnectionType()
    },
    request.device
  )
};

function setUser(request, bidderRequest) {
  request.regs = mergeDeep(
    {
      coppa: config.getConfig('coppa') === true ? 1 : request.regs?.coppa,
      gpp: bidderRequest.gppConsent?.gppString,
      gpp_sid: bidderRequest.gppConsent?.applicableSections,
      ext: {
        gdpr: bidderRequest.gdprConsent?.gdprApplies ? 1 : 0,
        us_privacy: bidderRequest.uspConsent
      }
    },
    request.regs
  )

  if (bidderRequest.gdprConsent?.consentString && !request.user?.ext?.consent) {
    deepSetValue(request, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
  }

  var eids = deepAccess(bidderRequest, 'bids.0.userIdAsEids')
  if (eids && eids.length && !request.user?.ext?.eids) {
    deepSetValue(request, 'user.ext.eids', eids);
  }
}

registerBidder(spec);
