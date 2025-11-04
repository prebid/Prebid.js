import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { deepSetValue, logWarn, parseSizesInput, isNumber, isInteger, replaceAuctionPrice, formatQS, isFn, isPlainObject } from '../src/utils.js';
import {getUserSyncParams} from '../libraries/userSyncUtils/userSyncUtils.js';

const BIDDER_CODE = 'stackadapt';
const ENDPOINT_URL = 'https://pjs.srv.stackadapt.com/br';
const USER_SYNC_ENDPOINT = 'https://sync.srv.stackadapt.com/sync?nid=pjs';
const CURRENCY = 'USD';

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
    currency: CURRENCY,
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const bid = context.bidRequests[0];
    request.id = bidderRequest.bidderRequestId

    deepSetValue(request, 'site.publisher.id', bid.params.publisherId);
    deepSetValue(request, 'test', bid.params.testMode);

    return request;
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    if (bidRequest.params.placementId) {
      deepSetValue(imp, 'tagid', bidRequest.params.placementId);
    }
    if (bidRequest.params.banner?.expdir) {
      deepSetValue(imp, 'banner.expdir', bidRequest.params.banner.expdir);
    }

    const bidfloor = getBidFloor(bidRequest);
    if (bidfloor) {
      imp.bidfloor = parseFloat(bidfloor);
      imp.bidfloorcur = CURRENCY;
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
      if (!sizes || parseSizesInput(sizes).length === 0) {
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

function getBidFloor(bidRequest) {
  if (bidRequest.params.bidfloor) {
    return bidRequest.params.bidfloor;
  }

  if (isFn(bidRequest.getFloor)) {
    const floor = bidRequest.getFloor({
      currency: CURRENCY,
      mediaType: '*',
      size: '*'
    });
    if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === CURRENCY) {
      return floor.floor;
    }
  }
  return null;
}

registerBidder(spec);
