import {ajax} from '../src/ajax.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

const BIDDER_CODE = 'nexx360';
const BIDDER_URL = 'https://fast.nexx360.io/prebid'
const CACHE_URL = 'https://fast.nexx360.io/cache'
const METRICS_TRACKER_URL = 'https://fast.nexx360.io/track-imp'

export const spec = {
  code: BIDDER_CODE,
  aliases: ['revenuemaker'], // short code
  supportedMediaTypes: [BANNER],
  /**
         * Determines whether or not the given bid request is valid.
         *
         * @param {BidRequest} bid The bid params to validate.
         * @return boolean True if this is a valid bid, and false otherwise.
         */
  isBidRequestValid: function(bid) {
    return !!(bid.params.account && bid.params.tagId);
  },
  /**
         * Make a server request from the list of BidRequests.
         *
         * @param {validBidRequests[]} - an array of bids
         * @return ServerRequest Info describing the request to the server.
         */
  buildRequests: function(validBidRequests, bidderRequest) {
    const adUnits = [];
    const test = config.getConfig('debug') ? 1 : 0;
    let adunitValue = null;
    let userEids = null;
    Object.keys(validBidRequests).forEach(key => {
      adunitValue = validBidRequests[key];
      adUnits.push({
        account: adunitValue.params.account,
        tagId: adunitValue.params.tagId,
        label: adunitValue.adUnitCode,
        bidId: adunitValue.bidId,
        auctionId: adunitValue.auctionId,
        transactionId: adunitValue.transactionId,
        mediatypes: adunitValue.mediaTypes
      });
      if (adunitValue.userIdAsEids) userEids = adunitValue.userIdAsEids;
    });
    const payload = {
      adUnits,
      href: encodeURIComponent(bidderRequest.refererInfo.referer)
    };
    if (bidderRequest) { // modules informations (gdpr, ccpa, schain, userId)
      if (bidderRequest.gdprConsent) {
        payload.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
        payload.gdprConsent = bidderRequest.gdprConsent.consentString;
      } else {
        payload.gdpr = 0;
        payload.gdprConsent = '';
      }
      if (bidderRequest.uspConsent) { payload.uspConsent = bidderRequest.uspConsent; }
      if (bidderRequest.schain) { payload.schain = bidderRequest.schain; }
      if (userEids !== null) payload.userEids = userEids;
    };
    if (test) payload.test = 1;
    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: BIDDER_URL,
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
          requestId: value['bidId'],
          cpm: value['cpm'],
          currency: value['currency'],
          width: value['width'],
          height: value['height'],
          adUrl: `${CACHE_URL}?uuid=${value['uuid']}`,
          ttl: value['ttl'],
          creativeId: value['creativeId'],
          netRevenue: true,
          nexx360: {
            'ssp': value['bidder'],
            'consent': value['consent'],
            'tagId': value['tagId']
          },
          /*
          meta: {
            'advertiserDomains': value['adomain']
          }
          */
        };
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
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    if (typeof serverResponses === 'object' && serverResponses != null && serverResponses.length > 0 && serverResponses[0].hasOwnProperty('body') &&
        serverResponses[0].body.hasOwnProperty('cookies') && typeof serverResponses[0].body.cookies === 'object') {
      return serverResponses[0].body.cookies.slice(0, 5);
    } else {
      return [];
    }
  },

  /**
     * Register bidder specific code, which will execute if a bid from this bidder won the auction
     * @param {Bid} The bid that won the auction
     */
  onBidWon: function(bid) {
    // fires a pixel to confirm a winning bid
    const params = { type: 'prebid' };
    if (bid.hasOwnProperty('nexx360')) {
      if (bid.nexx360.hasOwnProperty('ssp')) params.ssp = bid.nexx360.ssp;
      if (bid.nexx360.hasOwnProperty('tagId')) params.tag_id = bid.nexx360.tagId;
      if (bid.nexx360.hasOwnProperty('consent')) params.consent = bid.nexx360.consent;
    };
    params.price = bid.cpm;
    const url = `${METRICS_TRACKER_URL}?${new URLSearchParams(params).toString()}`;
    ajax(url, null, undefined, {method: 'GET', withCredentials: true});
    return true;
  }

}
registerBidder(spec);
