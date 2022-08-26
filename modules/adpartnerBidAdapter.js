import {registerBidder} from '../src/adapters/bidderFactory.js';
import { buildUrl } from '../src/utils.js'
import {ajax} from '../src/ajax.js';

const BIDDER_CODE = 'adpartner';
export const ENDPOINT_PROTOCOL = 'https';
export const ENDPOINT_DOMAIN = 'a4p.adpartner.pro';
export const ENDPOINT_PATH = '/hb/bid';

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function (bidRequest) {
    return !!parseInt(bidRequest.params.unitId) || !!parseInt(bidRequest.params.partnerId);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    // TODO does it make sense to fall back to window.location.href?
    const referer = bidderRequest?.refererInfo?.page || window.location.href;

    let bidRequests = [];
    let beaconParams = {
      tag: [],
      partner: [],
      sizes: [],
      referer: ''
    };

    validBidRequests.forEach(function(validBidRequest) {
      let bidRequestObject = {
        adUnitCode: validBidRequest.adUnitCode,
        sizes: validBidRequest.sizes,
        bidId: validBidRequest.bidId,
        referer: referer
      };

      if (parseInt(validBidRequest.params.unitId)) {
        bidRequestObject.unitId = parseInt(validBidRequest.params.unitId);
        beaconParams.tag.push(validBidRequest.params.unitId);
      }

      if (parseInt(validBidRequest.params.partnerId)) {
        bidRequestObject.unitId = 0;
        bidRequestObject.partnerId = parseInt(validBidRequest.params.partnerId);
        beaconParams.partner.push(validBidRequest.params.partnerId);
      }

      bidRequests.push(bidRequestObject);

      beaconParams.sizes.push(spec.joinSizesToString(validBidRequest.sizes));
      beaconParams.referer = encodeURIComponent(referer);
    });

    if (beaconParams.partner.length > 0) {
      beaconParams.partner = beaconParams.partner.join(',');
    } else {
      delete beaconParams.partner;
    }

    beaconParams.tag = beaconParams.tag.join(',');
    beaconParams.sizes = beaconParams.sizes.join(',');

    let adPartnerRequestUrl = buildUrl({
      protocol: ENDPOINT_PROTOCOL,
      hostname: ENDPOINT_DOMAIN,
      pathname: ENDPOINT_PATH,
      search: beaconParams
    });

    return {
      method: 'POST',
      url: adPartnerRequestUrl,
      data: JSON.stringify(bidRequests)
    };
  },

  joinSizesToString: function(sizes) {
    let res = [];
    sizes.forEach(function(size) {
      res.push(size.join('x'));
    });

    return res.join('|');
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const validBids = JSON.parse(bidRequest.data);

    if (typeof serverResponse.body === 'undefined') {
      return [];
    }

    return validBids
      .map(bid => ({
        bid: bid,
        ad: serverResponse.body[bid.adUnitCode]
      }))
      .filter(item => item.ad)
      .map(item => spec.adResponse(item.bid, item.ad));
  },

  adResponse: function(bid, ad) {
    const bidObject = {
      requestId: bid.bidId,
      ad: ad.ad,
      cpm: ad.cpm,
      width: ad.width,
      height: ad.height,
      ttl: 60,
      creativeId: ad.creativeId,
      netRevenue: ad.netRevenue,
      currency: ad.currency,
      winNotification: ad.winNotification
    }

    bidObject.meta = {};
    if (ad.adomain && ad.adomain.length > 0) {
      bidObject.meta.advertiserDomains = ad.adomain;
    }

    return bidObject;
  },

  onBidWon: function(data) {
    data.winNotification.forEach(function(unitWon) {
      let adPartnerBidWonUrl = buildUrl({
        protocol: ENDPOINT_PROTOCOL,
        hostname: ENDPOINT_DOMAIN,
        pathname: unitWon.path
      });

      if (unitWon.method === 'POST') {
        spec.postRequest(adPartnerBidWonUrl, JSON.stringify(unitWon.data));
      }
    });

    return true;
  },

  postRequest(endpoint, data) {
    ajax(endpoint, null, data, {method: 'POST'});
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = [];

    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      return syncs;
    }

    let appendGdprParams = function (url, gdprParams) {
      if (gdprParams === null) {
        return url;
      }

      return url + (url.indexOf('?') >= 0 ? '&' : '?') + gdprParams;
    };

    let gdprParams = null;
    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        gdprParams = `gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        gdprParams = `gdpr_consent=${gdprConsent.consentString}`;
      }
    }

    serverResponses.forEach(resp => {
      if (resp.body) {
        Object.keys(resp.body).map(function(key, index) {
          let respObject = resp.body[key];
          if (respObject['syncs'] !== undefined &&
            Array.isArray(respObject.syncs) &&
            respObject.syncs.length > 0) {
            if (syncOptions.iframeEnabled) {
              respObject.syncs.filter(function (syncIframeObject) {
                if (syncIframeObject['type'] !== undefined &&
                  syncIframeObject['link'] !== undefined &&
                  syncIframeObject.type === 'iframe') { return true; }
                return false;
              }).forEach(function (syncIframeObject) {
                syncs.push({
                  type: 'iframe',
                  url: appendGdprParams(syncIframeObject.link, gdprParams)
                });
              });
            }
            if (syncOptions.pixelEnabled) {
              respObject.syncs.filter(function (syncImageObject) {
                if (syncImageObject['type'] !== undefined &&
                  syncImageObject['link'] !== undefined &&
                  syncImageObject.type === 'image') { return true; }
                return false;
              }).forEach(function (syncImageObject) {
                syncs.push({
                  type: 'image',
                  url: appendGdprParams(syncImageObject.link, gdprParams)
                });
              });
            }
          }
        });
      }
    });

    return syncs;
  },

}

registerBidder(spec);
