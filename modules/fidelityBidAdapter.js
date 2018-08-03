import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'fidelity';
const BIDDER_SERVER = 'x.fidelity-media.com';
const FIDELITY_VENDOR_ID = 408;
export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.zoneid);
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      var server = bidRequest.params.server || BIDDER_SERVER;

      const payload = {
        from: 'hb',
        v: '1.0',
        requestid: bidRequest.bidderRequestId,
        impid: bidRequest.bidId,
        zoneid: bidRequest.params.zoneid,
        floor: parseFloat(bidRequest.params.floor) > 0 ? bidRequest.params.floor : 0,
        charset: document.charSet || document.characterSet,
        subid: 'hb',
        flashver: getFlashVersion(),
        tmax: bidderRequest.timeout,
        defloc: utils.getTopWindowUrl(),
        referrer: utils.getTopWindowReferrer(),
      };
      if (bidderRequest.gdprConsent) {
        payload.gdpr = 0;
        payload.consent_str = '';
        payload.consent_given = 0;
        if (typeof bidderRequest.gdprConsent.gdprApplies !== 'undefined') {
          payload.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
        }
        if (typeof bidderRequest.gdprConsent.consentString !== 'undefined') {
          payload.consent_str = bidderRequest.gdprConsent.consentString;
        }
        if (bidderRequest.gdprConsent.vendorData && bidderRequest.gdprConsent.vendorData.vendorConsents && typeof bidderRequest.gdprConsent.vendorData.vendorConsents[FIDELITY_VENDOR_ID.toString(10)] !== 'undefined') {
          payload.consent_given = bidderRequest.gdprConsent.vendorData.vendorConsents[FIDELITY_VENDOR_ID.toString(10)] ? 1 : 0;
        }
      }

      return {
        method: 'GET',
        url: '//' + server + '/delivery/hb.php',
        data: payload
      };
    });
  },
  interpretResponse: function(serverResponse) {
    serverResponse = serverResponse.body;
    const bidResponses = [];
    if (serverResponse && serverResponse.seatbid) {
      serverResponse.seatbid.forEach(seatBid => seatBid.bid.forEach(bid => {
        const bidResponse = {
          requestId: bid.impid,
          creativeId: bid.impid,
          cpm: bid.price,
          width: bid.width,
          height: bid.height,
          ad: bid.adm,
          netRevenue: bid.netRevenue,
          currency: bid.cur,
          ttl: bid.ttl,
        };

        bidResponses.push(bidResponse);
      }));
    }
    return bidResponses;
  },
  getUserSyncs: function getUserSyncs(syncOptions, serverResponses, gdprConsent) {
    if (syncOptions.iframeEnabled) {
      var url = '//' + BIDDER_SERVER + '/delivery/matches.php?type=iframe';
      if (gdprConsent) {
        var gdpr = 0;
        var consent_str = '';
        var consent_given = 0;
        if (typeof gdprConsent.gdprApplies !== 'undefined') {
          gdpr = gdprConsent.gdprApplies ? 1 : 0;
        }
        if (typeof gdprConsent.consentString !== 'undefined') {
          consent_str = gdprConsent.consentString;
        }
        if (gdprConsent.vendorData && gdprConsent.vendorData.vendorConsents && typeof gdprConsent.vendorData.vendorConsents[FIDELITY_VENDOR_ID.toString(10)] !== 'undefined') {
          consent_given = gdprConsent.vendorData.vendorConsents[FIDELITY_VENDOR_ID.toString(10)] ? 1 : 0;
        }
        url += '&gdpr=' + gdpr + '&consent_str=' + encodeURIComponent(consent_str) + '&consent_given=' + consent_given;
      }
      return [{
        type: 'iframe',
        url: url,
      }];
    }
  }
}

function getFlashVersion() {
  var plugins, plugin, result;

  if (navigator.plugins && navigator.plugins.length > 0) {
    plugins = navigator.plugins;
    for (var i = 0; i < plugins.length && !result; i++) {
      plugin = plugins[i];
      if (plugin.name.indexOf('Shockwave Flash') > -1) {
        result = plugin.description.split('Shockwave Flash ')[1];
      }
    }
  }
  return result || '';
}

registerBidder(spec);
