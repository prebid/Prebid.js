import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import {
  isFn,
  isStr,
  isNumber,
  isEmpty,
  isPlainObject,
  generateUUID,
  logWarn,
} from '../src/utils.js';
import { config } from '../src/config.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';

const BIDDER_CODE = 'adtrgtme';
const BIDDER_VERSION = '1.0.5';
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

function getType(b) {
  return b?.mediaTypes?.banner ? BANNER : false;
}

function getBidfloor(b) {
  return isFn(b.getFloor)
    ? b.getFloor({
      size: '*',
      currency: b?.params?.bidOverride?.cur ?? DEFAULT_CUR,
      mediaType: BANNER,
    })
    : false;
}

function getTtl(b) {
  const t = config.getConfig('adtrgtme.ttl');
  const validate = (t) => (isNumber(t) && t > 0 && t < 3000 ? t : DEFAULT_TTL);
  return t ? validate(t) : validate(b?.params?.ttl);
}

function createORTB(bR, bid) {
  if (!bR || !bid) return;

  const { currency = bid.params?.bidOverride?.cur || DEFAULT_CUR } =
    getBidfloor(bR);
  const ip =
    bid.params?.bidOverride?.device?.ip ||
    bid.ortb2?.device?.ip ||
    bid.params?.ext?.ip;
  const site = bid.ortb2?.site || undefined;
  const user = bid.ortb2?.user || undefined;
  const gdpr = bR.gdprConsent?.gdprApplies ? 1 : 0;
  const consentString = gdpr ? bR.gdprConsent?.consentString : '';
  const usPrivacy = bR.uspConsent || '';

  let oR = {
    id: generateUUID(),
    cur: [currency],
    imp: [],
    site: {
      id: String(bid.params?.sid),
      page: bR.refererInfo?.page || '',
      ...site,
    },
    device: {
      dnt: bid?.params?.dnt ? 1 : 0,
      ua: bid?.params?.ua || navigator.userAgent,
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
        ...(bid?.schain && { schain: bid.schain }),
      },
      fd: 1,
    },
    user: {
      ...user,
      ext: {
        consent: consentString,
        ...(user?.ext || {}),
      },
    },
  };

  if (bid?.schain) {
    oR.source.ext.schain.nodes[0].rid = oR.id;
  }

  return oR;
}

function appendImp(bid, oRtb) {
  if (!oRtb || !bid) return;

  const type = getType(bid);
  const { floor: bidfloor = 0, currency: bidfloorcur = '' } = getBidfloor(bid);

  const impObject = {
    id: bid.bidId,
    secure: 1,
    bidfloor: bid?.params?.bidOverride?.imp?.bidfloor || bidfloor,
    bidfloorcur: bid?.params?.bidOverride?.imp?.bidfloorcur || bidfloorcur,
    ext: {
      dfp_ad_unit_code: bid.adUnitCode,
      ...(bid?.ortb2Imp?.ext?.data &&
        isPlainObject(bid.ortb2Imp.ext.data) && {
          data: bid.ortb2Imp.ext.data,
        }),
    },
    ...(bid?.params?.zid && { tagid: String(bid.params.zid) }),
    ...(bid?.ortb2Imp?.instl === 1 && { instl: 1 }),
  };

  if (type === BANNER) {
    impObject.banner = {
      mimes: bid.mediaTypes.banner.mimes || [
        'text/html',
        'text/javascript',
        'application/javascript',
        'image/jpg',
      ],
      format: getFormat(bid.sizes),
      ...(bid.mediaTypes.banner.pos && { pos: bid.mediaTypes.banner.pos }),
    };
  }

  oRtb.imp.push(impObject);
}

function createRequest({ data, options, bidderRequest }) {
  return {
    url: `${config.getConfig('adtrgtme.endpoint') || BIDDER_URL}${
      data.site?.id || ''
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
      withCredentials: hasPurpose1Consent(aR.gdprConsent),
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
          adId: b?.adId ? b.adId : b.impid || b.crid,
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
  getUserSyncs: function (options, res, gdprConsent, uspConsent, gppConsent) {
    const s = [];
    if (!options.pixelEnabled && !options.iframeEnabled) {
      return s;
    }
    if (Array.isArray(res)) {
      res.forEach((response) => {
        const p = response.body?.ext?.pixels;
        if (Array.isArray(p)) {
          p.forEach(([stype, url]) => {
            const type = stype.toLowerCase();
            if (
              typeof url === 'string' &&
              url.startsWith('http') &&
              (((type === 'image' || type === 'img') && options.pixelEnabled) ||
                (type === 'iframe' && options.iframeEnabled))
            ) {
              s.push({ type, url: addConsentParams(url) });
            }
          });
        }
      });
    }
    function addConsentParams(url) {
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
        )}&gpp_sid=${encodeURIComponent(
          gppConsent.applicableSections?.join(',')
        )}`;
      }
      return url;
    }
    return s;
  },
};

registerBidder(spec);
