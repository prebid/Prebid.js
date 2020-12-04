import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

const BIDDER_CODE = 'kubient';
const END_POINT = 'https://kssp.kbntx.ch/pbjs';
const VERSION = '1.0';
const VENDOR_ID = 794;
export const spec = {
  code: BIDDER_CODE,
  gvlid: VENDOR_ID,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bid) {
    return !!(bid && bid.params);
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    if (!validBidRequests || !bidderRequest) {
      return;
    }
    var result = validBidRequests.map(function (bid) {
      let data = {
        v: VERSION,
        requestId: bid.bidderRequestId,
        adSlots: [{
          bidId: bid.bidId,
          zoneId: bid.params.zoneid || '',
          floor: bid.params.floor || 0.0,
          sizes: bid.sizes || [],
          schain: bid.schain || {},
          mediaTypes: bid.mediaTypes
        }],
        referer: (bidderRequest.refererInfo && bidderRequest.refererInfo.referer) ? bidderRequest.refererInfo.referer : null,
        tmax: bidderRequest.timeout,
        gdpr: (bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) ? 1 : 0,
        consent: (bidderRequest.gdprConsent && bidderRequest.gdprConsent.consentString) ? bidderRequest.gdprConsent.consentString : null,
        consentGiven: kubientGetConsentGiven(bidderRequest.gdprConsent),
        uspConsent: bidderRequest.uspConsent
      };
      return {
        method: 'POST',
        url: END_POINT,
        data: JSON.stringify(data)
      };
    });
    return result;
  },
  interpretResponse: function interpretResponse(serverResponse, request) {
    if (!serverResponse || !serverResponse.body || !serverResponse.body.seatbid) {
      return [];
    }
    let bidResponses = [];
    serverResponse.body.seatbid.forEach(seatbid => {
      let bids = seatbid.bid || [];
      bids.forEach(bid => {
        bidResponses.push({
          requestId: bid.bidId,
          cpm: bid.price,
          currency: bid.cur,
          width: bid.w,
          height: bid.h,
          creativeId: bid.creativeId,
          netRevenue: bid.netRevenue,
          ttl: bid.ttl,
          ad: bid.adm
        });
      });
    });
    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    var syncs = [];
    var gdprParams = '';
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
  if (
    gdprConsent.apiVersion === 1 &&
    gdprConsent.vendorData &&
    gdprConsent.vendorData.vendorConsents &&
    typeof gdprConsent.vendorData.vendorConsents[VENDOR_ID.toString(10)] !== 'undefined'
  ) {
    consentGiven = gdprConsent.vendorData.vendorConsents[VENDOR_ID.toString(10)] ? 1 : 0;
  } else if (
    gdprConsent.apiVersion === 2 &&
    gdprConsent.vendorData &&
    gdprConsent.vendorData.vendor &&
    gdprConsent.vendorData.vendor.consents &&
    typeof gdprConsent.vendorData.vendor.consents[VENDOR_ID.toString(10)] !== 'undefined'
  ) {
    consentGiven = gdprConsent.vendorData.vendor.consents[VENDOR_ID.toString(10)] ? 1 : 0;
  }
  return consentGiven;
}
registerBidder(spec);
