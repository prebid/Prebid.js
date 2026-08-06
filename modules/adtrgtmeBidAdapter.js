import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import {
  isStr,
  isNumber,
  isEmpty,
  isArray,
  isPlainObject,
  deepSetValue,
  logWarn,
} from '../src/utils.js';
import { config } from '../src/config.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'adtrgtme';
const BIDDER_VERSION = '1.0.8';
const BIDDER_URL = 'https://rtb.cdn.adtarget.market/ssp?prebid&s=';
const PREBIDJS_VERSION = '$prebid.version$';
const DEFAULT_TTL = 300;
const DEFAULT_CUR = 'USD';
const DEFAULT_BANNER_MIMES = [
  'text/html',
  'text/javascript',
  'application/javascript',
  'image/jpg',
];

function readConfig(key) {
  return config.getConfig(`${BIDDER_CODE}.${key}`);
}

function resolveTtl(bidRequest) {
  const withinBounds = (value) =>
    isNumber(value) && value > 0 && value < 3000 ? value : DEFAULT_TTL;
  const globalTtl = readConfig('ttl');
  return globalTtl ? withinBounds(globalTtl) : withinBounds(bidRequest?.params?.ttl);
}

// When every bid in a request shares a single media type, pass it through the
// converter context so price-floor lookups (and imp generation) are scoped to
// that media type instead of the '*' wildcard.
function soleMediaType(bidRequests) {
  const types = new Set();
  bidRequests.forEach((bid) => {
    Object.keys(bid.mediaTypes || {}).forEach((type) => types.add(type));
  });
  return types.size === 1 ? types.values().next().value : undefined;
}

// The SSP omits ORTB "mtype" on some passback responses; infer the media type
// from the markup and, failing that, from the matched impression, so the converter
// can build the proper bid-response shape.
function resolveResponseMediaType(bid, imp) {
  if (isStr(bid.adm)) {
    const markup = bid.adm.trim();
    if (markup.startsWith('{') || markup.startsWith('[')) {
      return NATIVE;
    }
    if (/<vast/i.test(markup)) {
      return VIDEO;
    }
  }
  // No usable markup (e.g. VAST delivered via nurl): fall back to the impression.
  if (imp?.video && (bid.nurl || !imp.banner)) {
    return VIDEO;
  }
  if (imp?.native && !imp.banner && !imp.video) {
    return NATIVE;
  }
  return BANNER;
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CUR,
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const params = bidRequest.params || {};

    if (imp.banner && !imp.banner.mimes) {
      imp.banner.mimes = DEFAULT_BANNER_MIMES;
    }

    deepSetValue(imp, 'ext.dfp_ad_unit_code', bidRequest.adUnitCode);

    const { zid } = params;
    if (zid != null && zid !== '') {
      imp.tagid = String(zid);
    }

    const impOverride = params.bidOverride?.imp;
    if (impOverride?.bidfloor != null) {
      imp.bidfloor = impOverride.bidfloor;
    }
    if (impOverride?.bidfloorcur != null) {
      imp.bidfloorcur = impOverride.bidfloorcur;
    }

    // share the resolved ttl with the matching bid-response via `context`
    context.ttl = resolveTtl(bidRequest);
    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const bid = context.bidRequests?.[0] || bidderRequest.bids?.[0] || {};
    const params = bid.params || {};

    // The converter's one-client processor has already selected the client
    // section (site/app/dooh) from ortb2; write sid into that section so app/dooh
    // requests don't end up with an invalid extra `site` object.
    const clientSection = request.app ? 'app' : request.dooh ? 'dooh' : 'site';
    deepSetValue(request, `${clientSection}.id`, String(params.sid));
    if (
      clientSection === 'site' &&
      !request.site.page &&
      bidderRequest.refererInfo?.page
    ) {
      request.site.page = bidderRequest.refererInfo.page;
    }

    if (!isPlainObject(request.device)) {
      request.device = {};
    }

    // request currency follows the impression floor currency (price floors module
    // or the manual bidfloor override), defaulting to USD.
    const floorCur = imps.find((imp) => imp.bidfloorcur)?.bidfloorcur;
    request.cur = [floorCur || DEFAULT_CUR];

    const gdprApplies = bidderRequest.gdprConsent?.gdprApplies ? 1 : 0;
    deepSetValue(request, 'regs.gdpr', gdprApplies);
    deepSetValue(request, 'regs.us_privacy', bidderRequest.uspConsent || '');
    const gpp = bidderRequest.gppConsent?.gppString;
    if (gpp) {
      deepSetValue(request, 'regs.gpp', gpp);
      deepSetValue(request, 'regs.gpp_sid', bidderRequest.gppConsent.applicableSections || []);
    }
    deepSetValue(
      request,
      'user.consent',
      gdprApplies ? bidderRequest.gdprConsent?.consentString || '' : ''
    );

    deepSetValue(request, 'source.ext', {
      hb: 1,
      bidderver: BIDDER_VERSION,
      prebidjsver: PREBIDJS_VERSION,
    });
    request.source.fd = 1;

    const schain = bid.ortb2?.source?.ext?.schain;
    if (schain && isArray(schain.nodes) && schain.nodes.length) {
      request.source.schain = schain;
      schain.nodes[0].rid = request.id;
    }

    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    if (bid.mtype == null) {
      context.mediaType = resolveResponseMediaType(bid, context.imp);
    }
    const bidResponse = buildBidResponse(bid, context);
    bidResponse.adId = bid.adId || bid.impid || bid.crid;
    // Keep the currency the converter derived from the top-level response `cur`;
    // only a non-standard per-bid `cur` (legacy Adtarget responses) overrides it.
    if (bid.cur) {
      bidResponse.currency = bid.cur;
    }
    if (isPlainObject(bidResponse.meta)) {
      bidResponse.meta.mediaType = bidResponse.mediaType;
    }
    return bidResponse;
  },
});

function buildServerRequest(data, options, bidderRequest) {
  return {
    url: `${readConfig('endpoint') || BIDDER_URL}${
      data.site?.id || data.app?.id || data.dooh?.id || ''
    }`,
    method: 'POST',
    data,
    options,
    bidderRequest,
  };
}

export const spec = {
  code: BIDDER_CODE,
  aliases: [],
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: function (bid) {
    const params = bid.params;
    if (
      isPlainObject(params) &&
      isStr(params.sid) &&
      !isEmpty(params.sid) &&
      params.sid.length > 0 &&
      (isEmpty(params.zid) ||
        isNumber(params.zid) ||
        (isStr(params.zid) && !isNaN(parseInt(params.zid))))
    ) {
      return true;
    }
    logWarn('Adtrgtme request invalid');
    return false;
  },

  buildRequests: function (bidRequests, bidderRequest) {
    if (isEmpty(bidRequests) || isEmpty(bidderRequest)) {
      logWarn('Adtrgtme Adapter: buildRequests called with empty request');
      return undefined;
    }

    const options = {
      contentType: 'application/json',
      withCredentials: hasPurpose1Consent(bidderRequest.gdprConsent),
    };

    if (readConfig('singleRequestMode') === true) {
      const mediaType = soleMediaType(bidRequests);
      const data = converter.toORTB({
        bidRequests,
        bidderRequest,
        context: mediaType ? { mediaType } : {},
      });
      return buildServerRequest(data, options, bidderRequest);
    }

    return bidRequests.map((bid) => {
      const mediaType = soleMediaType([bid]);
      const data = converter.toORTB({
        bidRequests: [bid],
        bidderRequest,
        context: mediaType ? { mediaType } : {},
      });
      return buildServerRequest(data, options, bid);
    });
  },

  interpretResponse: function (serverResponse, request) {
    if (!serverResponse?.body || !Array.isArray(serverResponse.body.seatbid)) {
      return [];
    }
    try {
      return converter.fromORTB({
        response: serverResponse.body,
        request: request.data,
      }).bids;
    } catch (e) {
      logWarn('Adtrgtme: unable to interpret bid-response', e);
      return [];
    }
  },

  getUserSyncs: function (options, res, gdprConsent, uspConsent, gppConsent) {
    const syncs = [];
    if (!options.pixelEnabled && !options.iframeEnabled) {
      return syncs;
    }

    const addConsentParams = (url) => {
      if (gdprConsent) {
        url += `&gdpr=${gdprConsent.gdprApplies ? 1 : 0}&gdpr_consent=${
          encodeURIComponent(gdprConsent.consentString) || ''
        }`;
      }
      if (uspConsent) {
        url += `&us_privacy=${encodeURIComponent(uspConsent)}`;
      }
      if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
        url += `&gpp=${encodeURIComponent(
          gppConsent.gppString
        )}&gpp_sid=${encodeURIComponent(gppConsent.applicableSections.join(','))}`;
      }
      return url;
    };

    if (isArray(res)) {
      res.forEach((response) => {
        const pixels = response.body?.ext?.pixels;
        if (isArray(pixels)) {
          pixels.forEach(([stype, url]) => {
            const type = String(stype).toLowerCase();
            if (
              isStr(url) &&
              url.startsWith('http') &&
              (((type === 'image' || type === 'img') && options.pixelEnabled) ||
                (type === 'iframe' && options.iframeEnabled))
            ) {
              syncs.push({ type, url: addConsentParams(url) });
            }
          });
        }
      });
    }

    return syncs;
  },
};

registerBidder(spec);
