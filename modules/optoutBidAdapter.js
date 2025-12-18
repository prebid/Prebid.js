import { deepAccess } from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';

const BIDDER_CODE = 'optout';
const GVLID = 227;

function getDomain(bidderRequest) {
  return (
    deepAccess(bidderRequest, 'refererInfo.canonicalUrl') ||
    deepAccess(bidderRequest, 'refererInfo.page') ||
    deepAccess(window, 'location.href')
  );
}

function getCurrency() {
  let cur = config.getConfig('currency');
  if (cur === undefined) {
    cur = { adServerCurrency: 'EUR', granularityMultiplier: 1 };
  }
  return cur;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,

  isBidRequestValid: function (bid) {
    return !!bid?.params?.publisher && !!bid?.params?.adSlot;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const firstBid = validBidRequests[0];

    let endPoint = 'https://prebid.optoutadserving.com/prebid/display';

    const gdprConsent = bidderRequest?.gdprConsent;
    let consentString = '';
    let gdpr = 0;

    if (gdprConsent) {
      gdpr =
        typeof gdprConsent.gdprApplies === 'boolean'
          ? Number(gdprConsent.gdprApplies)
          : 0;
      consentString = gdprConsent.consentString || '';

      if (!gdpr || hasPurpose1Consent(gdprConsent)) {
        endPoint = 'https://prebid.optinadserving.com/prebid/display';
      }
    }
    const addOrtb = validBidRequests.find((f) => {
      return f.params.includeOrtb2
    })

    const slots = validBidRequests.map((b) => {
      let customs = Object.assign({}, b?.params?.customs);
      let slot = {
        adSlot: b.params.adSlot,
        id: String(b.params.id ?? b.params.adSlot),
        requestId: b.bidId,
      };
      if (Object.keys(customs).length) slot.customs = customs;
      return slot;
    }
    );

    const customs = Object.assign(
      {},
      firstBid?.params?.customs,
      bidderRequest?.ortb2?.ext?.data,
      bidderRequest?.ortb2?.site?.ext?.data,
      bidderRequest?.ortb2?.app?.ext?.data,
      bidderRequest?.ortb2?.user?.ext?.data
    );
    Object.entries(customs).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        customs[key] = value.join(',');
      } else if (value === null || value === undefined) {
        delete customs[key]; // omit keys with null/undefined values so they are not sent to the ad server
      } else {
        customs[key] = String(value);
      }
    });

    const data = {
      publisher: firstBid.params.publisher,
      slots,
      cur: getCurrency(),
      url: getDomain(bidderRequest),
      sdk_version: 'prebid',
      consent: consentString,
      gdpr,
      ortb2: addOrtb ? JSON.stringify(bidderRequest.ortb2) : undefined
    };
    if (Object.keys(customs).length) data.customs = customs;

    return [
      {
        method: 'POST',
        url: endPoint,
        data: data
      }
    ];
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const body = serverResponse?.body;

    const bids = Array.isArray(body)
      ? body
      : Array.isArray(body?.bids)
        ? body.bids
        : [];

    const sentSlots = bidRequest?.data?.slots || [];

    const slotIdToPrebidId = new Map(
      sentSlots.map((s) => [String(s.id), String(s.requestId)])
    );

    const prebidIds = new Set(sentSlots.map((s) => String(s.requestId)));

    return bids
      .map((bid) => {
        const serverSlotOrReq = String(bid.requestId);

        let prebidRequestId = prebidIds.has(serverSlotOrReq)
          ? serverSlotOrReq
          : slotIdToPrebidId.get(serverSlotOrReq);

        if (!prebidRequestId) return null;

        return {
          requestId: prebidRequestId,
          cpm: Number(bid.cpm) || 0,
          currency: bid.currency,
          width: Number(bid.width),
          height: Number(bid.height),
          ad: bid.ad,
          ttl: Number(bid.ttl) || 300,
          creativeId: bid.creativeId,
          netRevenue: true,
          optOutExt: bid.optOutExt,
          meta: bid.meta
        };
      })
      .filter(Boolean);
  },

  getUserSyncs: function (syncOptions, responses, gdprConsent) {
    if (!gdprConsent) return [];

    const gdpr =
      typeof gdprConsent.gdprApplies === 'boolean'
        ? Number(gdprConsent.gdprApplies)
        : 0;

    if (
      syncOptions.iframeEnabled &&
      (!gdprConsent.gdprApplies || hasPurpose1Consent(gdprConsent))
    ) {
      return [
        {
          type: 'iframe',
          url:
            'https://umframe.optinadserving.com/matching/iframe?gdpr=' +
            gdpr +
            '&gdpr_consent=' +
            encodeURIComponent(gdprConsent.consentString || '')
        }
      ];
    }

    return [];
  }
};

registerBidder(spec);
