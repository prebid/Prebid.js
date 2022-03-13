import { isArray, deepAccess } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import { config } from '../src/config.js';

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
      let adSlot = {
        bidId: bid.bidId,
        zoneId: bid.params.zoneid || ''
      };

      if (typeof bid.getFloor === 'function') {
        const mediaType = (Object.keys(bid.mediaTypes).length == 1) ? Object.keys(bid.mediaTypes)[0] : '*';
        const sizes = bid.sizes || '*';
        const floorInfo = bid.getFloor({currency: 'USD', mediaType: mediaType, size: sizes});
        if (typeof floorInfo === 'object' && floorInfo.currency === 'USD') {
          let floor = parseFloat(floorInfo.floor)
          if (!isNaN(floor) && floor > 0) {
            adSlot.floor = parseFloat(floorInfo.floor);
          }
        }
      }

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
      }

      if (config.getConfig('coppa') === true) {
        data.coppa = 1
      }

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
    let kubientSync = kubientGetSyncInclude(config);

    if (!syncOptions.pixelEnabled || kubientSync.image === 'exclude') {
      return [];
    }

    let values = {};
    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        values['gdpr'] = Number(gdprConsent.gdprApplies);
      }
      if (typeof gdprConsent.consentString === 'string') {
        values['consent'] = gdprConsent.consentString;
      }
    }

    if (uspConsent) {
      values['usp'] = uspConsent;
    }

    return [{
      type: 'image',
      url: 'https://matching.kubient.net/match/sp?' + encodeQueryData(values)
    }];
  }
};

function encodeQueryData(data) {
  return Object.keys(data).map(function(key) {
    return [key, data[key]].map(encodeURIComponent).join('=');
  }).join('&');
}

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

function kubientGetSyncInclude(config) {
  try {
    let kubientSync = {};
    if (config.getConfig('userSync').filterSettings != null && typeof config.getConfig('userSync').filterSettings != 'undefined') {
      let filterSettings = config.getConfig('userSync').filterSettings
      if (filterSettings.iframe !== null && typeof filterSettings.iframe !== 'undefined') {
        kubientSync.iframe = ((isArray(filterSettings.image.bidders) && filterSettings.iframe.bidders.indexOf('kubient') !== -1) || filterSettings.iframe.bidders === '*') ? filterSettings.iframe.filter : 'exclude';
      }
      if (filterSettings.image !== null && typeof filterSettings.image !== 'undefined') {
        kubientSync.image = ((isArray(filterSettings.image.bidders) && filterSettings.image.bidders.indexOf('kubient') !== -1) || filterSettings.image.bidders === '*') ? filterSettings.image.filter : 'exclude';
      }
    }
    return kubientSync;
  } catch (e) {
    return null;
  }
}
registerBidder(spec);
