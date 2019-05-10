import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER } from 'src/mediaTypes';

const BIDDER_CODE = 'cedato';
const BID_URL = '//h.cedatoplayer.com/hb';
const SYNC_URL = '//h.cedatoplayer.com/hb_usync?uid={UUID}';
const COOKIE_NAME = 'hb-cedato-id';
const UUID_LEN = 36;
const TTL = 10000;
const CURRENCY = 'USD';
const FIRST_PRICE = 1;
const NET_REVENUE = true;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function(bid) {
    return !!(
      bid &&
      bid.params &&
      bid.params.player_id &&
      utils.checkCookieSupport() &&
      utils.cookiesAreEnabled()
    );
  },

  buildRequests: function(bidRequests, bidderRequest) {
    const req = bidRequests[Math.floor(Math.random() * bidRequests.length)];
    const params = req.params;
    const at = FIRST_PRICE;
    const site = { id: params.player_id, domain: document.domain };
    const device = { ua: navigator.userAgent, ip: '' };
    const user = { id: getUserID() }
    const currency = CURRENCY;
    const tmax = bidderRequest.timeout;

    const imp = bidRequests.map(req => {
      const banner = { 'format': getFormats(utils.deepAccess(req, 'mediaTypes.banner.sizes')) };
      const bidfloor = params.bidfloor;
      const bidId = req.bidId;

      return {
        bidId,
        banner,
        bidfloor,
      };
    });

    const payload = {
      version: '$prebid.version$',
      at,
      site,
      device,
      user,
      imp,
      currency,
      tmax,
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr_consent = {
        consent_string: bidderRequest.gdprConsent.consentString,
        consent_required: bidderRequest.gdprConsent.gdprApplies
      };
    }

    return {
      method: 'POST',
      url: BID_URL,
      data: JSON.stringify(payload),
    };
  },

  interpretResponse: function(resp) {
    if (resp.body === '') return [];

    const bids = resp.body.seatbid[0].bid.map(bid => {
      const cpm = bid.price;
      const requestId = bid.uuid;
      const width = bid.w;
      const height = bid.h;
      const creativeId = bid.crid;
      const dealId = bid.dealid;
      const currency = resp.body.cur;
      const netRevenue = NET_REVENUE;
      const ttl = TTL;
      const ad = bid.adm;

      return {
        cpm,
        requestId,
        width,
        height,
        creativeId,
        dealId,
        currency,
        netRevenue,
        ttl,
        ad,
      };
    });

    return bids;
  },

  getUserSyncs: function(syncOptions, resps, gdprConsent) {
    const syncs = [];
    if (syncOptions.pixelEnabled) {
      resps.forEach(() => {
        const uuid = getUserID();
        const syncUrl = SYNC_URL;
        let params = '';
        if (gdprConsent && typeof gdprConsent.consentString === 'string') {
          if (typeof gdprConsent.gdprApplies === 'boolean') {
            params += `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
          } else {
            params += `?gdpr_consent=${gdprConsent.consentString}`;
          }
        }
        syncs.push({
          type: 'image',
          url: syncUrl.replace('{UUID}', uuid) + params,
        });
      });
    }
    return syncs;
  }
}

const getUserID = () => {
  const cookieName = COOKIE_NAME;
  const uuidLen = UUID_LEN;

  const i = document.cookie.indexOf(cookieName);

  if (i === -1) {
    const uuid = utils.generateUUID();
    document.cookie = `${cookieName}=${uuid}; path=/`;
    return uuid;
  }

  const j = i + cookieName.length + 1;
  return document.cookie.substring(j, j + uuidLen);
};

const getFormats = arr => arr.map((s) => {
  return { w: s[0], h: s[1] };
});

registerBidder(spec);
