import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import {
  deepAccess,
  isFn,
  isStr,
  isNumber,
  isArray,
  isEmpty,
  isPlainObject,
  generateUUID,
  logWarn,
} from '../src/utils.js';
import { config } from '../src/config.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';

const BIDDER_CODE = 'adtrgtme';
const ENDPOINT = 'https://z.cdn.adtarget.market/ssp?prebid&s=';
const ADAPTER_VERSION = '1.0.2';
const PREBID_VERSION = '$prebid.version$';
const DEFAULT_BID_TTL = 300;
const DEFAULT_CURRENCY = 'USD';

function getFormat(s) {
  const parseSize = ([w, h]) => ({ w: parseInt(w, 10), h: parseInt(h, 10) });
  return Array.isArray(s) && s.length === 2 && !Array.isArray(s[0])
    ? [parseSize(s)]
    : s.map(parseSize);
}

function getType(bid) {
  return deepAccess(bid, 'mediaTypes.banner') ? BANNER : false;
}

function appObj(
  checker,
  keys,
  obj,
  appObj
) {
  const res = {
    ...appObj,
  };
  if (keys.length > 0 && typeof checker === 'function') {
    for (const oKey in obj) {
      if (
        keys.indexOf(oKey) !== -1 &&
        checker(obj[oKey])
      ) {
        res[oKey] = obj[oKey];
      }
    }
  }
  return res;
}

function getTtl(bidderRequest) {
  const t = config.getConfig('adtrgtme.ttl');
  const validate = (t) => (isNumber(t) && t > 0 && t < 3000) ? t : DEFAULT_BID_TTL;
  return t
    ? validate(t)
    : validate(deepAccess(bidderRequest, 'params.ttl'));
}

function getBidfloorData(bid) {
  return isFn(bid.getFloor) ? bid.getFloor({
    currency: deepAccess(bid, 'params.bidOverride.cur') ?? DEFAULT_CURRENCY,
    mediaType: BANNER,
    size: '*'}) : false;
}

function createORTB(bidderRequest, bid) {
  if (!bidderRequest) return;

  const { currency = deepAccess(bid, 'params.bidOverride.cur') || DEFAULT_CURRENCY } = getBidfloorData(bidderRequest);
  const ip = deepAccess(bid, 'params.bidOverride.device.ip') || deepAccess(bid, 'params.ext.ip');
  const gdpr = bidderRequest.gdprConsent?.gdprApplies ? 1 : 0;
  const consentString = gdpr ? bidderRequest.gdprConsent?.consentString : '';
  const usPrivacy = bidderRequest.uspConsent || '';

  let outRequest = {
    id: generateUUID(),
    cur: [currency],
    imp: [],
    site: {
      page: deepAccess(bidderRequest, 'refererInfo.page'),
      id: String(bid.params.sid),
    },
    device: {
      dnt: 0,
      ua: navigator.userAgent,
      ip,
    },
    regs: {
      ext: {
        us_privacy: usPrivacy,
        gdpr,
      },
    },
    source: {
      ext: {
        hb: 1,
        adapterver: ADAPTER_VERSION,
        prebidver: PREBID_VERSION,
        ...(deepAccess(bid, 'schain') && { schain: bid.schain }),
      },
      fd: 1,
    },
    user: {
      ext: {
        consent: consentString,
      },
    },
  };

  if (bidderRequest.ortb2) {
    outRequest = appendSiteData(outRequest, bid);
  }

  if (deepAccess(bid, 'schain')) {
    outRequest.source.ext.schain.nodes[0].rid = outRequest.id;
  }

  return outRequest;
}

function appendImp(bid, oRtb) {
  if (!oRtb || !bid) return;

  const type = getType(bid);
  const { floor: bidfloor = 0, currency: bidfloorcur = '' } = getBidfloorData(bid);
  const overrideFloor = deepAccess(bid, 'params.bidOverride.imp.bidfloor') || bidfloor;
  const overrideCurrency = deepAccess(bid, 'params.bidOverride.imp.bidfloorcur') || bidfloorcur;

  const impObject = {
    id: bid.bidId,
    secure: 1,
    bidfloor: overrideFloor,
    bidfloorcur: overrideCurrency,
    ext: {
      dfp_ad_unit_code: bid.adUnitCode,
      ...(deepAccess(bid, 'ortb2Imp.ext.data') && isPlainObject(bid.ortb2Imp.ext.data) && { data: bid.ortb2Imp.ext.data })
    },
    ...(deepAccess(bid, 'params.zid') && { tagid: String(bid.params.zid) }),
    ...(deepAccess(bid, 'ortb2Imp.instl') === 1 && { instl: 1 }),
  };

  if (type === BANNER) {
    impObject.banner = {
      mimes: bid.mediaTypes.banner.mimes || ['text/html', 'text/javascript', 'application/javascript', 'image/jpg'],
      format: getFormat(bid.sizes),
      ...(bid.mediaTypes.banner.pos && { pos: bid.mediaTypes.banner.pos }),
    };
  }

  oRtb.imp.push(impObject);
};

function appendSiteData(outRequest, bid) {
  const site = deepAccess(bid.ortb2, 'site') || undefined;
  const content = deepAccess(site, 'content') || undefined;
  const user = deepAccess(bid.ortb2, 'user') || undefined;

  if (site && isPlainObject(site)) {
    const keys = [
      'id',
      'name',
      'domain',
      'page',
      'ref',
      'keywords',
    ];
    const allowedSiteArrayKeys = ['cat', 'sectioncat', 'pagecat'];
    const allowedSiteObjectKeys = ['ext'];
    outRequest.site = appObj(
      isStr,
      keys,
      site,
      outRequest.site
    );
    outRequest.site = appObj(
      isArray,
      allowedSiteArrayKeys,
      site,
      outRequest.site
    );
    outRequest.site = appObj(
      isPlainObject,
      allowedSiteObjectKeys,
      site,
      outRequest.site
    );
  }

  if (content && isPlainObject(content)) {
    const allowedContentStringKeys = ['id', 'title', 'language', 'keywords'];
    const allowedContentArrayKeys = ['cat'];
    outRequest.site.content = appObj(
      isStr,
      allowedContentStringKeys,
      content,
      outRequest.site.content
    );
    outRequest.site.content = appObj(
      isArray,
      allowedContentArrayKeys,
      content,
      outRequest.site.content
    );
  }

  if (user && isPlainObject(user)) {
    const allowedUserStrings = [
      'id',
      'buyeruid',
      'gender',
      'keywords',
      'customdata',
    ];
    const allowedUserObjects = ['ext'];
    outRequest.user = appObj(
      isStr,
      allowedUserStrings,
      user,
      outRequest.user
    );
    outRequest.user.ext = appObj(
      isPlainObject,
      allowedUserObjects,
      user,
      outRequest.user.ext
    );
  }
  return outRequest;
}

function createRequest({ data, options, bidderRequest }) {
  return {
    url: `${config.getConfig('adtrgtme.endpoint') || ENDPOINT}${data.site?.id || ''}`,
    method: 'POST',
    data,
    options,
    bidderRequest,
  }
}

export const spec = {
  code: BIDDER_CODE,
  aliases: [],
  supportedMediaTypes: [BANNER],

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
    } else {
      logWarn('Adtrgtme bidder params missing or incorrect');
      return false;
    }
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    if (isEmpty(validBidRequests) || isEmpty(bidderRequest)) {
      logWarn('Adtrgtme Adapter: buildRequests called with empty request');
      return undefined;
    }

    const options = {
      contentType: 'application/json',
      customHeaders: {
        'x-openrtb-version': '2.5',
      },
      withCredentials: hasPurpose1Consent(
        bidderRequest.gdprConsent
      )
    };

    if (config.getConfig('adtrgtme.singleRequestMode') === true) {
      const data = createORTB(bidderRequest, validBidRequests[0]);
      validBidRequests.forEach((bid) => {
        appendImp(bid, data);
      });

      return createRequest({ data, options, bidderRequest });
    }

    return validBidRequests.map((bid) => {
      const clone = createORTB(bidderRequest, bid);
      appendImp(bid, clone);

      return createRequest({
        data: clone,
        options,
        bidderRequest: bid,
      });
    });
  },

  interpretResponse: function (serverResponse, { data, bidderRequest }) {
    const response = [];
    if (!serverResponse.body || !Array.isArray(serverResponse.body.seatbid)) {
      return response;
    }

    let seatbids = serverResponse.body.seatbid;
    seatbids.forEach((seatbid) => {
      let bid;

      try {
        bid = seatbid.bid[0];
      } catch (e) {
        return response;
      }

      let cpm = bid.price;

      let bidResponse = {
        adId: deepAccess(bid, 'adId') ? bid.adId : bid.impid || bid.crid,
        ad: bid.adm,
        adUnitCode: bidderRequest.adUnitCode,
        requestId: bid.impid,
        cpm: cpm,
        width: bid.w,
        height: bid.h,
        mediaType: BANNER,
        creativeId: bid.crid || 0,
        currency: bid.cur || DEFAULT_CURRENCY,
        dealId: bid.dealid ? bid.dealid : null,
        netRevenue: true,
        ttl: getTtl(bidderRequest),
        meta: {
          advertiserDomains: bid.adomain || [],
          mediaType: BANNER,
        },
      };
      response.push(bidResponse);
    });

    return response;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    if (!syncOptions.pixelEnabled && !syncOptions.iframeEnabled) {
      return syncs;
    }
    if (Array.isArray(serverResponses)) {
      serverResponses.forEach((response) => {
        const pixels = response.body?.ext?.pixels;
        if (Array.isArray(pixels)) {
          pixels.forEach(([synctype, url]) => {
            const type = synctype.toLowerCase();
            if (
              typeof url === 'string' && url.startsWith('http') &&
              ((type === 'image' && syncOptions.pixelEnabled) ||
              (type === 'iframe' && syncOptions.iframeEnabled))
            ) {
              syncs.push({type, url});
            }
          });
        }
      });
    }
    return syncs;
  }
};

registerBidder(spec);
