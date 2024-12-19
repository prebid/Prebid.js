import { registerBidder } from '../src/adapters/bidderFactory.js';
import { buildBidRequestsAndParams, postRequest, buildEndpointUrl } from '../libraries/mediaImpactUtils/index.js';

const BIDDER_CODE = 'mediaimpact';
export const ENDPOINT_PROTOCOL = 'https';
export const ENDPOINT_DOMAIN = 'bidder.smartytouch.co';
export const ENDPOINT_PATH = '/hb/bid';

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function (bidRequest) {
    return !!parseInt(bidRequest.params.unitId) || !!parseInt(bidRequest.params.partnerId);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const referer = bidderRequest?.refererInfo?.page || window.location.href;

    // Use the common function to build bidRequests and beaconParams
    const { bidRequests, beaconParams } = buildBidRequestsAndParams(validBidRequests, referer);

    const adRequestUrl = buildEndpointUrl(
      ENDPOINT_PROTOCOL,
      ENDPOINT_DOMAIN,
      ENDPOINT_PATH,
      beaconParams
    );

    return {
      method: 'POST',
      url: adRequestUrl,
      data: JSON.stringify(bidRequests),
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const validBids = JSON.parse(bidRequest.data);

    if (typeof serverResponse.body === 'undefined') {
      return [];
    }

    return validBids
      .map(bid => ({ bid: bid, ad: serverResponse.body[bid.adUnitCode] }))
      .filter(item => item.ad)
      .map(item => spec.adResponse(item.bid, item.ad));
  },

  adResponse: function (bid, ad) {
    return {
      requestId: bid.bidId,
      ad: ad.ad,
      cpm: ad.cpm,
      width: ad.width,
      height: ad.height,
      ttl: 60,
      creativeId: ad.creativeId,
      netRevenue: ad.netRevenue,
      currency: ad.currency,
      winNotification: ad.winNotification,
      meta: ad.meta || {},
    };
  },

  onBidWon: function (data) {
    data.winNotification.forEach(function (unitWon) {
      const adBidWonUrl = buildEndpointUrl(
        ENDPOINT_PROTOCOL,
        ENDPOINT_DOMAIN,
        unitWon.path
      );

      if (unitWon.method === 'POST') {
        postRequest(adBidWonUrl, JSON.stringify(unitWon.data));
      }
    });

    return true;
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
};

registerBidder(spec);
