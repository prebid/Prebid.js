import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
const BIDDER_CODE = 'dianomi';
const TIME_TO_LIVE = 360;

const URL = 'https://dev-prebid.dianomi.net/cgi-bin/smartads_prebid.pl';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['dia'], // short code
  supportedMediaTypes: ['banner', 'native'],
  isBidRequestValid: function (bid) {
    return true;
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const requests = validBidRequests.map((bidRequest) => {
      const data = {
        at: 1,
        id: bidRequest.bidId,
        cur: config.getConfig('currency.adServerCurrency'),
        imp: [
          {
            ext: {
              [bidRequest.bidder]: bidRequest.params,
            },
            id: bidRequest.adUnitCode,
            secure: 1,
          },
        ],
        regs: {
          coppa: config.getConfig('coppa'),
          ext: {
            gdpr: bidderRequest.gdprApplies,
          },
        },
        site: {
          ext: {
            amp: 0,
          },
          page: bidderRequest.refererInfo.referer,
        },
        source: {
          tid: bidRequest.transactionId,
        },
        test: config.getConfig('debug') ? 1 : 0,
        tmax: bidderRequest.timeout,
        user: {
          ext: {
            consent:
              bidderRequest.gdprConsent &&
              bidderRequest.gdprConsent.consentString,
          },
        },
        ext: {
          prebid: {
            channel: {
              name: 'pbjs',
              version: $$PREBID_GLOBAL$$.version,
            },
          },
        },
      };

      if (typeof config.getConfig('device') === 'object') {
        data.device = config.getConfig('device');
      }

      if (bidderRequest.uspConsent) {
        data.regs.ext.us_privacy = bidderRequest.uspConsent;
      }

      for (let mediaType in bidRequest.mediaTypes) {
        data.imp[0][mediaType] = {
          format: bidRequest.mediaTypes[mediaType].sizes
        };
      }

      return {
        method: 'POST',
        url: URL,
        data: data,
      };
    });
    return requests;
  },
  interpretResponse: function (serverResponse, request) {
    const data = serverResponse.body;
    const bidResponses = [];
    const bidResponse = {
      requestId: data.request_bid_id,
      cpm: data.bid_amount,
      width: data.width,
      height: data.height,
      creativeId: data.crid,
      currency: data.bid_currency,
      netRevenue: true,
      ttl: TIME_TO_LIVE,
      ad: data.content,
    };
    bidResponses.push(bidResponse);
    return bidResponses;
  },
  getUserSyncs: function (
    syncOptions,
    serverResponses,
    gdprConsent,
    uspConsent
  ) {},
  onTimeout: function (timeoutData) {},
  onBidWon: function (bid) {},
  onSetTargeting: function (bid) {},
};
registerBidder(spec);
