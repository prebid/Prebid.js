import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';

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
      setConsentParams(bidderRequest.gdprConsent, payload);

      return {
        method: 'GET',
        url: 'https://' + server + '/delivery/hb.php',
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
      var url = 'https://' + BIDDER_SERVER + '/delivery/matches.php';
      var payload = {
        type: 'iframe'
      };
      setConsentParams(gdprConsent, payload);

      return [{
        type: 'iframe',
        url: url + '?' + utils.parseQueryStringParameters(payload).replace(/\&$/, '')
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

function setConsentParams(gdprConsent, payload) {
  if (gdprConsent) {
    payload.gdpr = 0;
    payload.consent_str = '';
    payload.consent_given = 0;
    if (typeof gdprConsent.gdprApplies !== 'undefined') {
      payload.gdpr = gdprConsent.gdprApplies ? 1 : 0;
    }
    if (typeof gdprConsent.consentString !== 'undefined') {
      payload.consent_str = gdprConsent.consentString;
    }
    if (gdprConsent.vendorData && gdprConsent.vendorData.vendorConsents && typeof gdprConsent.vendorData.vendorConsents[FIDELITY_VENDOR_ID.toString(10)] !== 'undefined') {
      payload.consent_given = gdprConsent.vendorData.vendorConsents[FIDELITY_VENDOR_ID.toString(10)] ? 1 : 0;
    }
  }
}

registerBidder(spec);
