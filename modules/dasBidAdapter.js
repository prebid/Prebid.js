import { getAllOrtbKeywords } from '../libraries/keywords/keywords.js';
import { getAdUnitSizes } from '../libraries/sizeUtils/sizeUtils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { deepAccess } from '../src/utils.js';

const BIDDER_CODE = 'das';

const getEndpoint = (network) => {
  return `https://csr.onet.pl/${encodeURIComponent(network)}/bid`;
};

function parseParams(params, bidderRequest) {
  const customParams = {};
  const keyValues = {};

  if (params.site) {
    customParams.site = params.site;
  }

  if (params.area) {
    customParams.area = params.area;
  }

  if (params.network) {
    customParams.network = params.network;
  }

  // Custom parameters
  if (params.customParams && typeof params.customParams === 'object') {
    Object.assign(customParams, params.customParams);
  }

  const pageContext = params.pageContext;
  if (pageContext) {
    // Document URL override
    if (pageContext.du) {
      customParams.du = pageContext.du;
    }

    // Referrer override
    if (pageContext.dr) {
      customParams.dr = pageContext.dr;
    }

    // Document virtual address
    if (pageContext.dv) {
      customParams.DV = pageContext.dv;
    }

    // Keywords
    const keywords = getAllOrtbKeywords(
      bidderRequest?.ortb2,
      pageContext.keyWords,
    );
    if (keywords.length > 0) {
      customParams.kwrd = keywords.join('+');
    }

    // Local capping
    if (pageContext.capping) {
      customParams.local_capping = pageContext.capping;
    }

    // Key values
    if (pageContext.keyValues && typeof pageContext.keyValues === 'object') {
      Object.entries(pageContext.keyValues).forEach(([key, value]) => {
        keyValues[`kv${key}`] = value;
      });
    }
  }

  const du = customParams.du || deepAccess(bidderRequest, 'refererInfo.page');
  const dr = customParams.dr || deepAccess(bidderRequest, 'refererInfo.ref');

  if (du) customParams.du = du;
  if (dr) customParams.dr = dr;

  const dsaRequired = deepAccess(bidderRequest, 'ortb2.regs.ext.dsa.required');
  if (dsaRequired !== undefined) {
    customParams.dsainfo = dsaRequired;
  }

  return {
    customParams,
    keyValues,
  };
}

function buildUserIds(customParams) {
  const userIds = {};
  if (customParams.lu) {
    userIds.lu = customParams.lu;
  }
  if (customParams.aid) {
    userIds.aid = customParams.aid;
  }
  return userIds;
}

function getNpaFromPubConsent(pubConsent) {
  const params = new URLSearchParams(pubConsent);
  return params.get('npa') == '1';
}

function buildOpenRTBRequest(bidRequests, bidderRequest) {
  const { customParams, keyValues } = parseParams(
    bidRequests[0].params,
    bidderRequest,
  );
  const imp = bidRequests.map((bid, index) => {
    const sizes = getAdUnitSizes(bid);
    const imp = {
      id: bid.bidId,
      tagid: bid.params.slot,
      secure: 1,
    };
    if (bid.params.slotSequence) {
      imp.ext = {
        pos: bid.params.slotSequence
      }
    }

    if (bid.mediaTypes?.banner) {
      imp.banner = {
        format: sizes.map((size) => ({
          w: size[0],
          h: size[1],
        })),
      };
    }

    return imp;
  });

  const request = {
    id: bidderRequest.bidderRequestId,
    imp,
    site: {
      id: customParams.site,
      page: customParams.du,
      ref: customParams.dr,
      ext: {
        area: customParams.area,
        kwrd: customParams.kwrd,
        dv: customParams.DV
      },
      ...bidderRequest.ortb2.site,
    },
    device: bidderRequest.device,
    user: {
      ext: {
        ids: buildUserIds(customParams),
      },
    },
    ext: {
      network: customParams.network,
      keyvalues: keyValues,
    },
    at: 1,
    tmax: bidderRequest.timeout
  };

  if (bidderRequest.gdprConsent) {
    request.user = {
      ext: {
        npa: getNpaFromPubConsent(customParams.pubconsent),
        localcapping: customParams.local_capping,
        ...request.user.ext,
      },
    };
    request.regs = {
      gdpr: bidderRequest.gdprConsent.gdprApplies ? 1 : 0,
      ext: {
        dsa: customParams.dsainfo,
      },
    }
  }

  return request;
}

function interpretResponse(serverResponse) {
  const bidResponses = [];
  const response = serverResponse.body;

  if (!response || !response.seatbid || !response.seatbid.length) {
    return bidResponses;
  }

  response.seatbid.forEach((seatbid) => {
    seatbid.bid.forEach((bid) => {
      const bidResponse = {
        requestId: bid.impid,
        cpm: bid.price,
        currency: response.cur || 'USD',
        width: bid.w,
        height: bid.h,
        creativeId: bid.crid || bid.id,
        netRevenue: true,
        dealId: bid.dealid || null,
        actgMatch: bid.ext?.actgMatch || 0,
        ttl: 300,
        meta: {
          advertiserDomains: bid.adomain || [],
        },
      };
      // first implementation only supports banner
      if (bid.mtype === 1) {
        bidResponse.mediaType = BANNER;
        bidResponse.ad = bid.adm;
        bidResponses.push(bidResponse);
      }
    });
  });

  return bidResponses;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    if (!bid || !bid.params) {
      return false;
    }
    return !!(
      bid.params?.network &&
      bid.params?.site &&
      bid.params?.area &&
      bid.params?.slot
    );
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const data = buildOpenRTBRequest(validBidRequests, bidderRequest);
    return {
      method: 'POST',
      url: getEndpoint(data.ext.network),
      data,
      options: {
        withCredentials: true,
        crossOrigin: true,
      },
    };
  },

  interpretResponse: function (serverResponse) {
    return interpretResponse(serverResponse);
  },
};

registerBidder(spec);
