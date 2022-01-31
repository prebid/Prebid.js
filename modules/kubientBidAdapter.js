import { isArray, deepAccess } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';

const BIDDER_CODE = 'kubient';
const END_POINT = 'https://kssp.kbntx.ch/kubprebidjs';
const VERSION = '1.1';
const VENDOR_ID = 794;
export const spec = {
  code: BIDDER_CODE,
  gvlid: VENDOR_ID,
  supportedMediaTypes: [ BANNER, VIDEO ],
  isBidRequestValid: function (bid) {
    return !!(
      bid &&
      bid.params &&
      bid.params.zoneid &&
      ((!bid.mediaTypes.video) || (bid.mediaTypes.video && bid.mediaTypes.video.playerSize && bid.mediaTypes.video.mimes && bid.mediaTypes.video.protocols))
    );
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    if (!validBidRequests || !bidderRequest) {
      return;
    }
    return validBidRequests.map(function (bid) {
      let floor = 0.0;
      if (typeof bid.getFloor === 'function') {
        const mediaType = (Object.keys(bid.mediaTypes).length == 1) ? Object.keys(bid.mediaTypes)[0] : '*';
        const sizes = bid.sizes || '*';
        const floorInfo = bid.getFloor({currency: 'USD', mediaType: mediaType, size: sizes});
        if (typeof floorInfo === 'object' && floorInfo.currency === 'USD' && !isNaN(parseFloat(floorInfo.floor))) {
          floor = parseFloat(floorInfo.floor);
        }
      }

      let adSlot = {
        bidId: bid.bidId,
        zoneId: bid.params.zoneid || '',
        floor: floor || 0.0
      };

      if (bid.mediaTypes.banner) {
        adSlot.banner = bid.mediaTypes.banner;
      }

      if (bid.mediaTypes.video) {
        adSlot.video = bid.mediaTypes.video;
      }

      if (bid.schain) {
        adSlot.schain = bid.schain;
      }

      let data = {
        v: VERSION,
        requestId: bid.bidderRequestId,
        adSlots: [adSlot],
        tmax: bidderRequest.timeout,
        gdpr: (bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) ? 1 : 0,
        consentGiven: kubientGetConsentGiven(bidderRequest.gdprConsent),
        uspConsent: bidderRequest.uspConsent
      };

      if (bidderRequest.refererInfo && bidderRequest.refererInfo.referer) {
        data.referer = bidderRequest.refererInfo.referer
      }

      if (bidderRequest.gdprConsent && bidderRequest.gdprConsent.consentString) {
        data.consent = bidderRequest.gdprConsent.consentString
      }

      return {
        method: 'POST',
        url: END_POINT,
        data: JSON.stringify(data)
      };
    });
  },
  interpretResponse: function interpretResponse(serverResponse, request) {
    if (!serverResponse || !serverResponse.body || !serverResponse.body.seatbid) {
      return [];
    }
    let bidResponses = [];
    serverResponse.body.seatbid.forEach(seatbid => {
      let bids = seatbid.bid || [];
      bids.forEach(bid => {
        const bidResponse = {
          requestId: bid.bidId,
          cpm: bid.price,
          currency: bid.cur,
          width: bid.w,
          height: bid.h,
          creativeId: bid.creativeId,
          netRevenue: bid.netRevenue,
          ttl: bid.ttl,
          ad: bid.adm,
          meta: {}
        };
        if (bid.meta && bid.meta.adomain && isArray(bid.meta.adomain)) {
          bidResponse.meta.advertiserDomains = bid.meta.adomain;
        }
        if (bid.mediaType === VIDEO) {
          bidResponse.mediaType = VIDEO;
          bidResponse.vastXml = bid.adm;
        }
        bidResponses.push(bidResponse);
      });
    });
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = [];
    let gdprParams = '';
    if (gdprConsent && typeof gdprConsent.consentString === 'string') {
      gdprParams = `?consent_str=${gdprConsent.consentString}`;
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        gdprParams = gdprParams + `&gdpr=${Number(gdprConsent.gdprApplies)}`;
      }
      gdprParams = gdprParams + `&consent_given=` + kubientGetConsentGiven(gdprConsent);
    }
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: 'https://kdmp.kbntx.ch/init.html' + gdprParams
      });
    }
    if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: 'https://kdmp.kbntx.ch/init.png' + gdprParams
      });
    }
    return syncs;
  }
};

function kubientGetConsentGiven(gdprConsent) {
  let consentGiven = 0;
  if (typeof gdprConsent !== 'undefined') {
    let apiVersion = deepAccess(gdprConsent, `apiVersion`);
    switch (apiVersion) {
      case 1:
        consentGiven = deepAccess(gdprConsent, `vendorData.vendorConsents.${VENDOR_ID}`) ? 1 : 0;
        break;
      case 2:
        consentGiven = deepAccess(gdprConsent, `vendorData.vendor.consents.${VENDOR_ID}`) ? 1 : 0;
        break;
    }
  }
  return consentGiven;
}
registerBidder(spec);
