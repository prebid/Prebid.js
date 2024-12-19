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
const BIDDER_VERSION = '1.0.4';
const BIDDER_URL = 'https://z.cdn.adtarget.market/ssp?prebid&s=';
const PREBIDJS_VERSION = '$prebid.version$';
const DEFAULT_TTL = 300;
const DEFAULT_CUR = 'USD';

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

function getBidfloor(b) {
  return isFn(b.getFloor) ? b.getFloor({size: '*',
    currency: deepAccess(b, 'params.bidOverride.cur') ?? DEFAULT_CUR,
    mediaType: BANNER}) : false
}

function getTtl(bR) {
  const t = config.getConfig('adtrgtme.ttl');
  const validate = (t) => (isNumber(t) && t > 0 && t < 3000) ? t : DEFAULT_TTL;
  return t
    ? validate(t)
    : validate(deepAccess(bR, 'params.ttl'));
}

function createORTB(bR, bid) {
  if (!bR) return;

  const { currency = deepAccess(bid, 'params.bidOverride.cur') || DEFAULT_CUR } = getBidfloor(bR);
  const ip = deepAccess(bid, 'params.bidOverride.device.ip') || deepAccess(bid, 'params.ext.ip');
  const gdpr = bR.gdprConsent?.gdprApplies ? 1 : 0;
  const consentString = gdpr ? bR.gdprConsent?.consentString : '';
  const usPrivacy = bR.uspConsent || '';

  let oR = {
    id: generateUUID(),
    cur: [currency],
    imp: [],
    site: {
      page: deepAccess(bR, 'refererInfo.page'),
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
        bidderver: BIDDER_VERSION,
        prebidjsver: PREBIDJS_VERSION,
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

  if (bR.ortb2) {
    oR = appendSiteData(oR, bid);
  }

  if (deepAccess(bid, 'schain')) {
    oR.source.ext.schain.nodes[0].rid = oR.id;
  }

  return oR;
}

function appendImp(bid, oRtb) {
  if (!oRtb || !bid) return;

  const type = getType(bid);
  const { floor: bidfloor = 0, currency: bidfloorcur = '' } = getBidfloor(bid);
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

function appendSiteData(oR, bid) {
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
    oR.site = appObj(
      isStr,
      keys,
      site,
      oR.site
    );
    oR.site = appObj(
      isArray,
      ['cat', 'sectioncat', 'pagecat'],
      site,
      oR.site
    );
    oR.site = appObj(
      isPlainObject,
      ['ext'],
      site,
      oR.site
    );
  }

  if (content && isPlainObject(content)) {
    oR.site.content = appObj(
      isStr,
      ['id', 'title', 'language', 'keywords'],
      content,
      oR.site.content
    );
    oR.site.content = appObj(
      isArray,
      ['cat'],
      content,
      oR.site.content
    );
  }

  if (user && isPlainObject(user)) {
    oR.user = appObj(
      isStr,
      [
        'id',
        'buyeruid',
        'gender',
        'keywords',
        'customdata',
      ],
      user,
      oR.user
    );
    oR.user.ext = appObj(
      isPlainObject,
      ['ext'],
      user,
      oR.user.ext
    );
  }
  return oR;
}

function createRequest({ data, options, bidderRequest }) {
  return {
    url: `${config.getConfig('adtrgtme.endpoint') || BIDDER_URL}${data.site?.id || ''}`,
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

  isOK: function (bid) {
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
      logWarn('Adtrgtme request invalid');
      return false;
    }
  },

  buildRequests: function (bR, aR) {
    if (isEmpty(bR) || isEmpty(aR)) {
      logWarn('Adtrgtme Adapter: buildRequests called with empty request');
      return undefined;
    }

    const options = {
      contentType: 'application/json',
      withCredentials: hasPurpose1Consent(
        aR.gdprConsent
      )
    };

    if (config.getConfig('adtrgtme.singleRequestMode') === true) {
      const data = createORTB(aR, bR[0]);
      bR.forEach((bid) => {
        appendImp(bid, data);
      });

      return createRequest({ data, options, bidderRequest: aR });
    }

    return bR.map((b) => {
      const data = createORTB(aR, b);
      appendImp(b, data);

      return createRequest({
        data,
        options,
        bidderRequest: b,
      });
    });
  },

  interpretResponse: function (sR, { data, bidderRequest }) {
    const res = [];
    if (!sR.body || !Array.isArray(sR.body.seatbid)) {
      return res;
    }

    sR.body.seatbid.forEach((sb) => {
      try {
        let b = sb.bid[0];

        res.push({
          adId: deepAccess(b, 'adId') ? b.adId : b.impid || b.crid,
          ad: b.adm,
          adUnitCode: bidderRequest.adUnitCode,
          requestId: b.impid,
          cpm: b.price,
          width: b.w,
          height: b.h,
          mediaType: BANNER,
          creativeId: b.crid || 0,
          currency: b.cur || DEFAULT_CUR,
          dealId: b.dealid ? b.dealid : null,
          netRevenue: true,
          ttl: getTtl(bidderRequest),
          meta: {
            advertiserDomains: b.adomain || [],
            mediaType: BANNER,
          },
        });
      } catch (e) {
        return res;
      }
    });

    return res;
  },
  getUserSyncs: function (options, sR) {
    const s = [];
    if (!options.pixelEnabled && !options.iframeEnabled) {
      return s;
    }
    if (Array.isArray(sR)) {
      sR.forEach((response) => {
        const p = response.body?.ext?.pixels;
        if (Array.isArray(p)) {
          p.forEach(([stype, url]) => {
            const type = stype.toLowerCase();
            if (
              typeof url === 'string' && url.startsWith('http') &&
              (((type === 'image' || type === 'img') && options.pixelEnabled) ||
              (type === 'iframe' && options.iframeEnabled))
            ) {
              s.push({type, url});
            }
          });
        }
      });
    }
    return s;
  }
};

registerBidder(spec);
