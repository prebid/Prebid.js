import {registerBidder} from '../src/adapters/bidderFactory';
import {config} from '../src/config';
import {BANNER, VIDEO} from '../src/mediaTypes';
import * as utils from '../src/utils';

const BIDDER_CODE = 'richaudience';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['ra'],
  supportedMediaTypes: [BANNER, VIDEO],

  /***
     * Determines whether or not the given bid request is valid
     *
     * @param {bidRequest} bid The bid params to validate.
     * @returns {boolean} True if this is a valid bid, and false otherwise
     */
  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.pid && bid.params.supplyType);
  },
  /***
     * Build a server request from the list of valid BidRequests
     * @param {validBidRequests} is an array of the valid bids
     * @param {bidderRequest} bidder request object
     * @returns {ServerRequest} Info describing the request to the server
     */
  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(bid => {
      var payload = {
        bidfloor: bid.params.bidfloor,
        ifa: bid.params.ifa,
        pid: bid.params.pid,
        supplyType: bid.params.supplyType,
        currencyCode: config.getConfig('currency.adServerCurrency'),
        auctionId: bid.auctionId,
        bidId: bid.bidId,
        BidRequestsCount: bid.bidRequestsCount,
        bidder: bid.bidder,
        bidderRequestId: bid.bidderRequestId,
        tagId: bid.adUnitCode,
        sizes: bid.sizes.map(size => ({
          w: size[0],
          h: size[1],
        })),
        referer: (typeof bidderRequest.refererInfo.referer != 'undefined' ? encodeURIComponent(bidderRequest.refererInfo.referer) : null),
        numIframes: (typeof bidderRequest.refererInfo.numIframes != 'undefined' ? bidderRequest.refererInfo.numIframes : null),
        transactionId: bid.transactionId,
        timeout: config.getConfig('bidderTimeout'),
      };

      if (bidderRequest && bidderRequest.gdprConsent) {
        payload.gdpr_consent = bidderRequest.gdprConsent.consentString;
        payload.gdpr = bidderRequest.gdprConsent.gdprApplies; // we're handling the undefined case server side
      } else {
        payload.gdpr_consent = '';
        payload.gdpr = null;
      }

      var payloadString = JSON.stringify(payload);

      var endpoint = 'https://shb.richaudience.com/hb/';

      return {
        method: 'POST',
        url: endpoint,
        data: payloadString,
      };
    });
  },
  /***
     * Read the response from the server and build a list of bids
     * @param {serverResponse} Response from the server.
     * @param {bidRequest} Bid request object
     * @returns {bidResponses} Array of bids which were nested inside the server
     */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];

    var response = serverResponse.body;

    try {
      if (response) {
        var bidResponse = {
          requestId: JSON.parse(bidRequest.data).bidId,
          cpm: response.cpm,
          width: response.width,
          height: response.height,
          creativeId: response.creative_id,
          mediaType: response.media_type,
          netRevenue: response.netRevenue,
          currency: response.currency,
          ttl: response.ttl,
          dealId: response.dealId,
        };

        if (response.media_type === 'video') {
          bidResponse.vastXml = response.vastXML;
        } else {
          bidResponse.ad = response.adm
        }

        bidResponses.push(bidResponse);
      }
    } catch (error) {
      utils.logError('Error while parsing Rich Audience response', error);
    }
    return bidResponses
  },
  /***
     * User Syncs
     *
     * @param {syncOptions} Publisher prebid configuration
     * @param {serverResponses} Response from the server
     * @param {gdprConsent} GPDR consent object
     * @returns {Array}
     */
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent) {
    const syncs = [];

    var rand = Math.floor(Math.random() * 9999999999);
    var syncUrl = '';

    if (gdprConsent && typeof gdprConsent.consentString === 'string') {
      syncUrl = 'https://sync.richaudience.com/dcf3528a0b8aa83634892d50e91c306e/?ord=' + rand + '&pubconsent=' + gdprConsent.consentString + '&euconsent=' + gdprConsent.consentString;
    } else {
      syncUrl = 'https://sync.richaudience.com/dcf3528a0b8aa83634892d50e91c306e/?ord=' + rand;
    }

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: syncUrl
      });
    }
    return syncs
  },
};

registerBidder(spec);
