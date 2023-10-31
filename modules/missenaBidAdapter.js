import { buildUrl, formatQS, logInfo, triggerPixel } from '../src/utils.js';
import { BANNER } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'missena';
const ENDPOINT_URL = 'https://bid.missena.io/';
const EVENTS_DOMAIN = 'events.missena.io';
const EVENTS_DOMAIN_DEV = 'events.staging.missena.xyz';

export const spec = {
  aliases: ['msna'],
  code: BIDDER_CODE,
  gvlid: 687,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return typeof bid == 'object' && !!bid.params.apiKey;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map((bidRequest) => {
      const payload = {
        adunit: bidRequest.adUnitCode,
        request_id: bidRequest.bidId,
        timeout: bidderRequest.timeout,
      };

      if (bidderRequest && bidderRequest.refererInfo) {
        // TODO: is 'topmostLocation' the right value here?
        payload.referer = bidderRequest.refererInfo.topmostLocation;
        payload.referer_canonical = bidderRequest.refererInfo.canonicalUrl;
      }

      if (bidderRequest && bidderRequest.gdprConsent) {
        payload.consent_string = bidderRequest.gdprConsent.consentString;
        payload.consent_required = bidderRequest.gdprConsent.gdprApplies;
      }
      const baseUrl = bidRequest.params.baseUrl || ENDPOINT_URL;
      if (bidRequest.params.test) {
        payload.test = bidRequest.params.test;
      }
      if (bidRequest.params.placement) {
        payload.placement = bidRequest.params.placement;
      }
      if (bidRequest.params.formats) {
        payload.formats = bidRequest.params.formats;
      }
      if (bidRequest.params.isInternal) {
        payload.is_internal = bidRequest.params.isInternal;
      }
      payload.userEids = bidRequest.userIdAsEids || [];
      return {
        method: 'POST',
        url: baseUrl + '?' + formatQS({ t: bidRequest.params.apiKey }),
        data: JSON.stringify(payload),
      };
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    const response = serverResponse.body;

    if (response && !response.timeout && !!response.ad) {
      bidResponses.push(response);
    }

    return bidResponses;
  },
  getUserSyncs: function (
    syncOptions,
    serverResponses,
    gdprConsent,
    uspConsent
  ) {
    if (!syncOptions.iframeEnabled) {
      return [];
    }

    let gdprParams = '';
    if (
      gdprConsent &&
      'gdprApplies' in gdprConsent &&
      typeof gdprConsent.gdprApplies === 'boolean'
    ) {
      gdprParams = `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${
        gdprConsent.consentString
      }`;
    }
    return [
      { type: 'iframe', url: 'https://sync.missena.io/iframe' + gdprParams },
    ];
  },
  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {data} Containing timeout specific data
   */
  onTimeout: function onTimeout(timeoutData) {
    logInfo('Missena - Timeout from adapter', timeoutData);
  },

  /**
   * Register bidder specific code, which@ will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
   */
  onBidWon: function (bid) {
    const hostname = bid.params[0].baseUrl ? EVENTS_DOMAIN_DEV : EVENTS_DOMAIN;
    triggerPixel(
      buildUrl({
        protocol: 'https',
        hostname,
        pathname: '/v1/bidsuccess',
        search: { t: bid.params[0].apiKey, provider: bid.meta?.networkName, cpm: bid.cpm, currency: bid.currency },
      })
    );
    logInfo('Missena - Bid won', bid);
  },
};

registerBidder(spec);
