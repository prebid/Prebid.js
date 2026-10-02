import { deepAccess, deepClone, deepSetValue, isArray, isEmpty, isPlainObject, isNumber, isStr, logWarn, replaceAuctionPrice } from '../src/utils.js';
import { getOrigin } from '../libraries/getOrigin/index.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { CLIENT_SECTIONS, hasSection } from '../src/fpd/oneClient.js';

const BIDDER_CODE = 'rtbhouse';
const REGIONS = ['prebid-eu', 'prebid-us', 'prebid-asia'];
const ENDPOINT_URL = 'creativecdn.com/bidder/prebid/bids';

const DEFAULT_CURRENCY_ARR = ['USD'];
const DEFAULT_CURRENCY = DEFAULT_CURRENCY_ARR[0];
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE];
const TTL = 55;
const GVLID = 16;

const DSA_ATTRIBUTES = [
  { name: 'dsarequired', 'min': 0, 'max': 3 },
  { name: 'pubrender', 'min': 0, 'max': 2 },
  { name: 'datatopub', 'min': 0, 'max': 2 }
];

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: TTL,
    currency: DEFAULT_CURRENCY,
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    imp.tagid = bidRequest.adUnitCode.toString();

    if (imp.ext && imp.ext.ae != null) {
      delete imp.ext.ae;
    }

    const paramFloor = parseFloat(bidRequest.params?.bidfloor);
    if (imp.bidfloor == null && bidRequest.params?.bidfloor && !isNaN(paramFloor)) {
      imp.bidfloor = paramFloor;
      imp.bidfloorcur = DEFAULT_CURRENCY;
    }

    if (imp.banner?.format?.length) {
      imp.banner.w = imp.banner.format[0].w;
      imp.banner.h = imp.banner.format[0].h;
    }

    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const bidRequest = context.bidRequests[0];
    const params = bidRequest.params || {};

    request.id = bidderRequest.bidderRequestId;
    request.test = params.test || 0;
    request.cur = DEFAULT_CURRENCY_ARR;

    request.site = request.site || {};
    const pubId = params.publisherId != null ? String(params.publisherId) : 'unknown';
    deepSetValue(request, 'site.publisher.id', pubId);
    const channel = params.channel && params.channel.toString().slice(0, 50);
    if (channel) {
      request.site.channel = channel;
    }
    if (!request.site.name) {
      request.site.name = getOrigin();
    }
    if (!request.site.page && bidderRequest.refererInfo?.page) {
      request.site.page = bidderRequest.refererInfo.page;
    }

    // 'site' is the only client section the endpoint understands, and it must stay the only one
    CLIENT_SECTIONS.filter(section => section !== 'site').forEach(section => {
      if (hasSection(request, section)) {
        logWarn(`${BIDDER_CODE}: dropping '${section}'; only 'site' is supported`);
        delete request[section];
      }
    });

    if (!deepAccess(request, 'source.tid')) {
      deepSetValue(request, 'source.tid', bidderRequest.auctionId || '');
    }

    const dsa = deepAccess(request, 'regs.ext.dsa');
    if (dsa !== undefined && !validateDSA(dsa)) {
      delete request.regs.ext.dsa;
    }

    return request;
  }
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  gvlid: GVLID,

  isBidRequestValid: function (bid) {
    return !!(REGIONS.includes(bid.params.region) && bid.params.publisherId);
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const data = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });

    return {
      method: 'POST',
      url: 'https://' + validBidRequests[0].params.region + '.' + ENDPOINT_URL,
      data: JSON.stringify(data)
    };
  },
  interpretOrtbResponse: function (serverResponse, originalRequest) {
    const responseBody = serverResponse.body;
    if (!isArray(responseBody)) {
      return [];
    }

    const bids = [];
    responseBody.forEach(serverBid => {
      if (!serverBid.price) {
        return;
      }

      const interpretedBid = serverBid.adm.indexOf('{') === 0
        ? interpretNativeBid(serverBid)
        : interpretBannerBid(serverBid);

      if (!interpretedBid) {
        return;
      }

      if (serverBid.ext) {
        interpretedBid.ext = deepClone(serverBid.ext);
        if (serverBid.ext.dsa) {
          interpretedBid.meta = Object.assign({}, interpretedBid.meta, { dsa: serverBid.ext.dsa });
        }
      }

      bids.push(interpretedBid);
    });
    return bids;
  },
  interpretResponse: function (serverResponse, originalRequest) {
    return this.interpretOrtbResponse(serverResponse, originalRequest);
  }
};
registerBidder(spec);

/**
 * @param {object} serverBid Bid by OpenRTB 2.5 §4.2.3
 * @returns {object} Prebid banner bidObject
 */
function interpretBannerBid(serverBid) {
  return {
    requestId: serverBid.impid,
    mediaType: BANNER,
    cpm: serverBid.price,
    creativeId: serverBid.adid,
    ad: serverBid.adm,
    width: serverBid.w,
    height: serverBid.h,
    ttl: TTL,
    meta: {
      advertiserDomains: serverBid.adomain
    },
    netRevenue: true,
    currency: 'USD'
  };
}

/**
 * @param {object} serverBid Bid by OpenRTB 2.5 §4.2.3
 * @returns {object|null} Prebid native bidObject, or null if the adm is not parseable
 */
function interpretNativeBid(serverBid) {
  const ortb = parseNativeOrtb(serverBid);
  if (!ortb) {
    return null;
  }

  return {
    requestId: serverBid.impid,
    mediaType: NATIVE,
    cpm: serverBid.price,
    creativeId: serverBid.adid || serverBid.crid,
    width: 1,
    height: 1,
    ttl: TTL,
    meta: {
      advertiserDomains: serverBid.adomain
    },
    netRevenue: true,
    currency: DEFAULT_CURRENCY,
    native: { ortb }
  };
}

/**
 * The endpoint wraps the native response in a `native` object (the OpenRTB Native 1.1
 * convention); 1.2 puts the same fields at the root. Accept either shape.
 *
 * @param {object} serverBid Bid by OpenRTB 2.5 §4.2.3
 * @returns {object|null} OpenRTB native response object, or null if the adm is not parseable
 */
function parseNativeOrtb(serverBid) {
  let parsed;
  try {
    parsed = JSON.parse(replaceAuctionPrice(serverBid.adm, serverBid.price));
  } catch (e) {
    logWarn(`${BIDDER_CODE}: could not parse native adm`, serverBid.adm);
    return null;
  }

  const ortb = parsed?.native ?? parsed;
  if (!isPlainObject(ortb) || !isArray(ortb.assets)) {
    logWarn(`${BIDDER_CODE}: native response contained no assets`, parsed);
    return null;
  }
  return ortb;
}

/**
 * https://github.com/InteractiveAdvertisingBureau/openrtb/blob/main/extensions/community_extensions/dsa_transparency.md
 *
 * @param {object} dsa
 * @returns {boolean} whether dsa object contains valid attributes values
 */
function validateDSA(dsa) {
  if (isEmpty(dsa) || !isPlainObject(dsa)) return false;

  return DSA_ATTRIBUTES.reduce((prev, attr) => {
    const dsaEntry = dsa[attr.name];
    return prev && (
      !dsa.hasOwnProperty(attr.name) ||
      (isNumber(dsaEntry) && dsaEntry >= attr.min && dsaEntry <= attr.max)
    );
  }, true) &&
    (!dsa.hasOwnProperty('transparency') ||
      (isArray(dsa.transparency) && dsa.transparency.every(
        v => isPlainObject(v) && isStr(v.domain) && v.domain && isArray(v.dsaparams) &&
          v.dsaparams.every(x => isNumber(x))
      ))
    );
}
