import {ajax} from '../src/ajax.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

const BIDDER_CODE = 'mediasquare';
const BIDDER_URL_PROD = 'https://pbs-front.mediasquare.fr/'
const BIDDER_URL_TEST = 'https://bidder-test.mediasquare.fr/'
const BIDDER_ENDPOINT_AUCTION = 'msq_prebid';
const BIDDER_ENDPOINT_SYNC = 'cookie_sync';
const BIDDER_ENDPOINT_WINNING = 'winning';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['msq'], // short code
  supportedMediaTypes: [BANNER],
  /**
         * Determines whether or not the given bid request is valid.
         *
         * @param {BidRequest} bid The bid params to validate.
         * @return boolean True if this is a valid bid, and false otherwise.
         */
  isBidRequestValid: function(bid) {
    return !!(bid.params.owner || bid.params.code);
  },
  /**
         * Make a server request from the list of BidRequests.
         *
         * @param {validBidRequests[]} - an array of bids
         * @return ServerRequest Info describing the request to the server.
         */
  buildRequests: function(validBidRequests, bidderRequest) {
    let codes = [];
    let endpoint = document.location.search.match(/msq_test=true/) ? BIDDER_URL_TEST : BIDDER_URL_PROD;
    const test = config.getConfig('debug') ? 1 : 0;
    let adunitValue = null;
    Object.keys(validBidRequests).forEach(key => {
      adunitValue = validBidRequests[key];
      codes.push({
        owner: adunitValue.params.owner,
        code: adunitValue.params.code,
        adunit: adunitValue.adUnitCode,
        bidId: adunitValue.bidId,
        auctionId: adunitValue.auctionId,
        transactionId: adunitValue.transactionId,
        mediatypes: adunitValue.mediaTypes
      });
    });
    const payload = {
      codes: codes,
      referer: encodeURIComponent(bidderRequest.refererInfo.referer)
      // schain: validBidRequests.schain,
    };
    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr = {
        consent_string: bidderRequest.gdprConsent.consentString,
        consent_required: bidderRequest.gdprConsent.gdprApplies
      };
    };
    if (test) { payload.debug = true; }
    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: endpoint + BIDDER_ENDPOINT_AUCTION,
      data: payloadString,
    };
  },
  /**
         * Unpack the response from the server into a list of bids.
         *
         * @param {ServerResponse} serverResponse A successful response from the server.
         * @return {Bid[]} An array of bids which were nested inside the server.
         */
  interpretResponse: function(serverResponse, bidRequest) {
    const serverBody = serverResponse.body;
    // const headerValue = serverResponse.headers.get('some-response-header');
    const bidResponses = [];
    let bidResponse = null;
    let value = null;
    if (serverBody.hasOwnProperty('responses')) {
      Object.keys(serverBody['responses']).forEach(key => {
        value = serverBody['responses'][key];
        bidResponse = {
          requestId: value['bid_id'],
          cpm: value['cpm'],
          width: value['width'],
          height: value['height'],
          creativeId: value['creative_id'],
          currency: value['currency'],
          netRevenue: value['net_revenue'],
          ttl: value['ttl'],
          ad: value['ad'],
          mediasquare: {
            'bidder': value['bidder'],
            'code': value['code']
          }
        };
        if (value.hasOwnProperty('deal_id')) { bidResponse['dealId'] = value['deal_id']; }
        bidResponses.push(bidResponse);
      });
    }
    return bidResponses;
  },

  /**
     * Register the user sync pixels which should be dropped after the auction.
     *
     * @param {SyncOptions} syncOptions Which user syncs are allowed?
     * @param {ServerResponse[]} serverResponses List of server's responses.
     * @return {UserSync[]} The user syncs which should be dropped.
     */
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent) {
    let params = '';
    let endpoint = document.location.search.match(/msq_test=true/) ? BIDDER_URL_TEST : BIDDER_URL_PROD;
    if (gdprConsent && typeof gdprConsent.consentString === 'string') {
      if (typeof gdprConsent.gdprApplies === 'boolean') { params += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`; } else { params += `&gdpr_consent=${gdprConsent.consentString}`; }
    }
    if (syncOptions.iframeEnabled) {
      return {
        type: 'iframe',
        url: endpoint + BIDDER_ENDPOINT_SYNC + '?type=iframe' + params
      };
    }
    if (syncOptions.pixelEnabled) {
      return {
        type: 'image',
        url: endpoint + BIDDER_ENDPOINT_SYNC + '?type=pixel' + params
      };
    }
    return false;
  },

  /**
     * Register bidder specific code, which will execute if a bid from this bidder won the auction
     * @param {Bid} The bid that won the auction
     */
  onBidWon: function(bid) {
    // fires a pixel to confirm a winning bid
    let params = [];
    let endpoint = document.location.search.match(/msq_test=true/) ? BIDDER_URL_TEST : BIDDER_URL_PROD;
    let paramsToSearchFor = ['cpm', 'size', 'mediaType', 'currency', 'creativeId', 'adUnitCode', 'timeToRespond']
    if (bid.hasOwnProperty('mediasquare')) {
      if (bid['mediasquare'].hasOwnProperty('bidder')) { params.push('bidder=' + bid['mediasquare']['bidder']); }
      if (bid['mediasquare'].hasOwnProperty('code')) { params.push('code=' + bid['mediasquare']['code']); }
    };
    for (let i = 0; i < paramsToSearchFor.length; i++) {
      if (bid.hasOwnProperty(paramsToSearchFor[i])) { params.push(paramsToSearchFor[i] + '=' + bid[paramsToSearchFor[i]]); }
    }
    if (params.length > 0) { params = '?' + params.join('&'); }
    ajax(endpoint + BIDDER_ENDPOINT_WINNING + params, null);
    return true;
  }

}
registerBidder(spec);
