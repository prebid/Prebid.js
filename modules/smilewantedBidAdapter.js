import * as utils from '../src/utils';
import { config } from '../src/config';
import { registerBidder } from '../src/adapters/bidderFactory';

export const spec = {
  code: 'smilewanted',
  aliases: ['smile', 'sw'],

  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.zoneId);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bid => {
      var payload = {
        zoneId: bid.params.zoneId,
        currencyCode: config.getConfig('currency.adServerCurrency'),
        bidfloor: bid.params.bidfloor || 0.0,
        tagId: bid.adUnitCode,
        sizes: bid.sizes.map(size => ({
          w: size[0],
          h: size[1]
        })),
        pageDomain: utils.getTopWindowUrl(),
        transactionId: bid.transactionId,
        timeout: config.getConfig('bidderTimeout'),
        bidId: bid.bidId,
        prebidVersion: '$prebid.version$'
      };

      if (bidderRequest && bidderRequest.gdprConsent) {
        payload.gdpr_consent = bidderRequest.gdprConsent.consentString;
        payload.gdpr = bidderRequest.gdprConsent.gdprApplies; // we're handling the undefined case server side
      }
      var payloadString = JSON.stringify(payload);
      return {
        method: 'POST',
        url: 'https://prebid.smilewanted.com',
        data: payloadString,
      };
    });
  },

  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    var response = serverResponse.body;
    try {
      if (response) {
        const bidResponse = {
          requestId: JSON.parse(bidRequest.data).bidId,
          cpm: response.cpm,
          width: response.width,
          height: response.height,
          creativeId: response.creativeId,
          dealId: response.dealId,
          currency: response.currency,
          netRevenue: response.isNetCpm,
          ttl: response.ttl,
          referrer: utils.getTopWindowUrl(),
          adUrl: response.adUrl,
          ad: response.ad
        };

        bidResponses.push(bidResponse);
      }
    } catch (error) {
      utils.logError('Error while parsing smilewanted response', error);
    }
    return bidResponses;
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = []
    if (syncOptions.iframeEnabled && serverResponses.length > 0) {
      syncs.push({
        type: 'iframe',
        url: serverResponses[0].body.cSyncUrl
      });
    }
    return syncs;
  }
}

registerBidder(spec);
