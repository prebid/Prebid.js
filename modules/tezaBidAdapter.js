// modules/tezaBidAdapter.js
// Minimal banner-only adapter for OpenRTB 2.x endpoint
// npm i -g gulp-cli  # one time command
// npm ci  # one time command
// Build:
// `gulp build --modules=tezaBidAdapter`
// Compiled output: ./build/dist/prebid.js

// modules/tezaBidAdapter.js
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'teza';
const ENDPOINT = 'https://dsp-us-east-1-nyc.tezatags.com/openrtb2/auction';

function sizesToFormat(sizes) {
  return (sizes || []).map(s => ({ w: s[0], h: s[1] }));
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid(bid) {
    return !!(bid?.params?.account);
  },

  buildRequests(validBidRequests, bidderRequest) {
    if (!validBidRequests?.length) return [];

    const b0 = validBidRequests[0];
    const account = b0.params.account;
    const test = b0.params.test ? 1 : 0;

    const ortb2 = bidderRequest?.ortb2 || config.getConfig('ortb2') || {};
    const eids = b0.userIdAsEids || [];
    const schain = b0.schain || null;
    const ri = bidderRequest?.refererInfo || {};

    const imps = validBidRequests.map(bid => {
      const sizes = bid.mediaTypes?.banner?.sizes || bid.sizes || [];
      const tagid = bid.params.tagid || bid.ortb2Imp?.tagid || bid.ortb2Imp?.ext?.gpid;
      return {
        id: bid.bidId,
        tagid: tagid,
        secure: 1,
        banner: { format: sizesToFormat(sizes) },
        bidfloor: bid.params.bidfloor || 0.01,
        bidfloorcur: bid.params.bidfloorcur || 'USD'
      };
    });

    const regs = {
      coppa: bidderRequest?.coppa ? 1 : 0,
      ext: {
        gdpr: bidderRequest?.gdprConsent?.gdprApplies ? 1 : 0,
        us_privacy: bidderRequest?.uspConsent || undefined
      },
      gpp: bidderRequest?.gppConsent?.gppString,
      gpp_sid: bidderRequest?.gppConsent?.applicableSections
    };

    const user = {
      ...ortb2.user,
      ext: {
        ...(ortb2.user?.ext || {}),
        consent: bidderRequest?.gdprConsent?.consentString,
        eids
      }
    };

    const device = {
      ...ortb2.device,
      ua: (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
      language: (typeof navigator !== 'undefined' ? navigator.language : undefined),
      dnt: (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') ? 1 : 0
    };

    const ortb = {
      id: bidderRequest?.auctionId || String(Date.now()),
      imp: imps,
      at: 1,
      tmax: bidderRequest?.timeout || 1000,
      cur: ['USD'],
      test,
      site: {
        ...ortb2.site,
        domain: ri.domain || (typeof location !== 'undefined' ? location.hostname : ''),
        page: ri.page || (typeof location !== 'undefined' ? location.href : '')
      },
      device,
      user,
      regs,
      source: schain ? { ext: { schain } } : undefined
    };

    const url = `${ENDPOINT}?test=${test}&account=${encodeURIComponent(account)}`;
    return { method: 'POST', url, data: ortb };
  },

  interpretResponse(serverResponse) {
    const res = serverResponse?.body || {};
    const cur = Array.isArray(res.cur) ? (res.cur[0] || 'USD') : (res.cur || 'USD');
    const out = [];

    (res.seatbid || []).forEach(sb => {
      (sb.bid || []).forEach(b => {
        out.push({
          requestId: b.impid,
          cpm: b.price || 0,
          currency: cur,
          width: b.w,
          height: b.h,
          creativeId: b.crid || b.id || 'teza-crid',
          ttl: 30,
          netRevenue: true,
          ad: b.adm,
          nurl: b.nurl,
          burl: b.burl,
          meta: { advertiserDomains: b.adomain || [] }
        });
      });
    });

    return out;
  },

  getUserSyncs() { return []; },

  onBidWon(bid) {
    const url = (bid.burl || bid.nurl || '').replace(/\{AUCTION_PRICE\}/g, String(bid.cpm));
    if (url) { new Image().src = url; }
  }
};

registerBidder(spec);
