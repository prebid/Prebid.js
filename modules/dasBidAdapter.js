import { getAllOrtbKeywords } from '../libraries/keywords/keywords.js';
import { getAdUnitSizes } from '../libraries/sizeUtils/sizeUtils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { deepAccess, safeJSONParse } from '../src/utils.js';

const BIDDER_CODE = 'das';
const GDE_SCRIPT_URL = 'https://ocdn.eu/adp/static/embedgde/latest/bundle.min.js';
const GDE_PARAM_PREFIX = 'gde_';
const REQUIRED_GDE_PARAMS = [
  'gde_subdomena',
  'gde_id',
  'gde_stparam',
  'gde_fastid',
  'gde_inscreen'
];

function parseNativeResponse(ad) {
  if (!(ad.data?.fields && ad.data?.meta)) {
    return false;
  }

  const { click, Thirdpartyimpressiontracker, Thirdpartyimpressiontracker2, thirdPartyClickTracker2, imp, impression, impression1, impressionJs1, image, Image, title, leadtext, url, Calltoaction, Body, Headline, Thirdpartyclicktracker, adInfo, partner_logo: partnerLogo } = ad.data.fields;

  const { dsaurl, height, width, adclick } = ad.data.meta;
  const emsLink = ad.ems_link;
  const link = adclick + (url || click);
  const nativeResponse = {
    sendTargetingKeys: false,
    title: title || Headline || '',
    image: {
      url: image || Image || '',
      width,
      height
    },
    icon: {
      url: partnerLogo || '',
      width,
      height
    },
    clickUrl: link,
    cta: Calltoaction || '',
    body: leadtext || Body || '',
    body2: adInfo || '',
    sponsoredBy: deepAccess(ad, 'data.meta.advertiser_name', null) || '',
  };

  nativeResponse.impressionTrackers = [emsLink, imp, impression, impression1, Thirdpartyimpressiontracker, Thirdpartyimpressiontracker2].filter(Boolean);
  nativeResponse.javascriptTrackers = [impressionJs1, getGdeScriptUrl(ad.data.fields)].map(url => url ? `<script async src=${url}></script>` : null).filter(Boolean);
  nativeResponse.clickTrackers = [Thirdpartyclicktracker, thirdPartyClickTracker2].filter(Boolean);

  if (dsaurl) {
    nativeResponse.privacyLink = dsaurl;
  }

  return nativeResponse
}

function getGdeScriptUrl(adDataFields) {
  if (REQUIRED_GDE_PARAMS.every(param => adDataFields[param])) {
    const params = new URLSearchParams();
    Object.entries(adDataFields)
      .filter(([key]) => key.startsWith(GDE_PARAM_PREFIX))
      .forEach(([key, value]) => params.append(key, value));

    return `${GDE_SCRIPT_URL}?${params.toString()}`;
  }
  return null;
}

function getEndpoint(network) {
  return `https://csr.onet.pl/${encodeURIComponent(network)}/bid`;
}

function parseParams(params, bidderRequest) {
  const customParams = {};
  const keyValues = {};

  if (params.adbeta) {
    customParams.adbeta = params.adbeta;
  }

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
  return params.get('npa') === '1';
}

function buildOpenRTBRequest(bidRequests, bidderRequest) {
  const { customParams, keyValues } = parseParams(
    bidRequests[0].params,
    bidderRequest,
  );
  const imp = bidRequests.map((bid) => {
    const sizes = getAdUnitSizes(bid);
    const imp = {
      id: bid.bidId,
      tagid: bid.params.slot,
      secure: 1,
    };
    if (bid.params.slotSequence) {
      imp.ext = {
        pos: String(bid.params.slotSequence)
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
    if (bid.mediaTypes?.native) {
      imp.native = {
        request: '{}',
        ver: '1.2',
      };
    }

    return imp;
  });

  const request = {
    id: bidderRequest.bidderRequestId,
    imp,
    site: {
      ...bidderRequest.ortb2?.site,
      id: customParams.site,
      page: customParams.du,
      ref: customParams.dr,
      ext: {
        ...bidderRequest.ortb2?.site?.ext,
        area: customParams.area,
        kwrd: customParams.kwrd,
        dv: customParams.DV
      },
    },
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

  if (customParams.adbeta) {
    request.ext.adbeta = customParams.adbeta;
  }

  if (bidderRequest.device) {
    request.device = bidderRequest.device;
  }

  if (bidderRequest.gdprConsent) {
    request.user = {
      ext: {
        npa: getNpaFromPubConsent(customParams.pubconsent),
        localcapping: customParams.local_capping,
        localadpproduts: customParams.adp_products,
        ...request.user.ext,
      },
    };
    request.regs = {
      gpp: bidderRequest.gdprConsent.consentString,
      gdpr: bidderRequest.gdprConsent.gdprApplies ? 1 : 0,
      ext: {
        dsa: customParams.dsainfo,
      },
    }
  }

  return request;
}

function prepareNativeMarkup(bid) {
  const parsedNativeMarkup = safeJSONParse(bid.adm)
  const ad = {
    data: parsedNativeMarkup || {},
    ems_link: bid.ext?.ems_link || '',
  };
  const nativeResponse = parseNativeResponse(ad) || {};
  return nativeResponse;
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

      if (bid.mtype === 1) {
        bidResponse.mediaType = BANNER;
        bidResponse.ad = bid.adm;
      } else if (bid.mtype === 4) {
        bidResponse.mediaType = NATIVE;
        bidResponse.native = prepareNativeMarkup(bid);
        delete bidResponse.ad;
      }
      bidResponses.push(bidResponse);
    });
  });

  return bidResponses;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['ringieraxelspringer'],
  supportedMediaTypes: [BANNER, NATIVE],

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
    const jsonData = JSON.stringify(data);
    const baseUrl = getEndpoint(data.ext.network);
    const fullUrl = `${baseUrl}?data=${encodeURIComponent(jsonData)}`;

    // adbeta needs credentials omitted to avoid CORS issues, especially in Firefox
    const useCredentials = !data.ext?.adbeta;

    // Switch to POST if URL exceeds 8k characters
    if (fullUrl.length > 8192) {
      return {
        method: 'POST',
        url: baseUrl,
        data: jsonData,
        options: {
          withCredentials: useCredentials,
          crossOrigin: true,
          customHeaders: {
            'Content-Type': 'text/plain'
          }
        },
      };
    }

    return {
      method: 'GET',
      url: fullUrl,
      options: {
        withCredentials: useCredentials,
        crossOrigin: true,
      },
    };
  },

  interpretResponse: function (serverResponse) {
    return interpretResponse(serverResponse);
  },
};

registerBidder(spec);
