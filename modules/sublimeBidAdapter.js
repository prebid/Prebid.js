import { registerBidder } from 'src/adapters/bidderFactory';
import * as utils from '../src/utils';

const BIDDER_CODE = 'sublime';
const DEFAULT_BID_HOST = 'pbjs.ayads.co';
const DEFAULT_SAC_HOST = 'sac.ayads.co';
const DEFAULT_CALLBACK_NAME = 'sublime_prebid_callback';
const DEFAULT_PROTOCOL = 'https';
const SUBLIME_VERSION = '0.1';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['sskz', 'sublime-skinz'],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    return !!bid.params.zoneId;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests An array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    if (bidderRequest && bidderRequest.gdprConsent) {
      const gdpr = {
        consentString: bidderRequest.gdprConsent.consentString,
        gdprApplies: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : true
      };

      window.sublime = (typeof window.sublime !== 'undefined') ? window.sublime : {};
      window.sublime.gdpr = (typeof window.sublime.gdpr !== 'undefined') ? window.sublime.gdpr : {};
      window.sublime.gdpr.injected = {
        consentString: gdpr.consentString,
        gdprApplies: gdpr.gdprApplies
      };
    }
    // Grab only the first `validBidRequest`
    let bid = validBidRequests[0];

    if (validBidRequests.length > 1) {
      let leftoverZonesIds = validBidRequests.slice(1).map(bid => { return bid.params.zoneId }).join(',');
      utils.logWarn(`Sublime Adapter: ZoneIds ${leftoverZonesIds} are ignored. Only one ZoneId per page can be instanciated.`);
    }

    let params = bid.params;
    let requestId = bid.bidId || '';
    let sacHost = params.sacHost || DEFAULT_SAC_HOST;
    let bidHost = params.bidHost || DEFAULT_BID_HOST;
    let protocol = params.protocol || DEFAULT_PROTOCOL;
    let zoneId = params.zoneId;
    let callbackName = (params.callbackName || DEFAULT_CALLBACK_NAME) + '_' + params.zoneId;

    window[callbackName] = (response) => {
      var requestIdEncoded = encodeURIComponent(requestId);
      var hasAd = response.ad ? '1' : '0';
      var xhr = new XMLHttpRequest();
      var url = protocol + '://' + bidHost + '/notify?request_id=' + requestIdEncoded + '&a=' + hasAd;
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.send(
        'notify=1' +
        '&request_id=' + requestIdEncoded +
        '&ad=' + encodeURIComponent(response.ad || '') +
        '&cpm=' + encodeURIComponent(response.cpm || 0) +
        '&currency=' + encodeURIComponent(response.currency || 'USD')
      );
      return xhr;
    };
    let script = document.createElement('script');
    script.type = 'application/javascript';
    script.src = 'https://' + sacHost + '/sublime/' + zoneId + '/prebid?callback=' + callbackName;
    document.body.appendChild(script);

    return {
      method: 'GET',
      url: protocol + '://' + bidHost + '/bid',
      data: {
        prebid: 1,
        request_id: requestId,
      }
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse) => {
    const bidResponses = [];
    const request = serverResponse.body;

    if (request) {
      const bidResponse = {
        requestId: serverResponse.body.request_id || '',
        cpm: serverResponse.body.cpm || 0,
        width: 1800,
        height: 1000,
        creativeId: 1,
        dealId: 1,
        currency: serverResponse.body.currency || 'USD',
        netRevenue: true,
        ttl: 600,
        referrer: '',
        ad: serverResponse.body.ad || '',
      };
      if (bidResponse.cpm) {
        bidResponses.push(bidResponse);
      }
    }
    return bidResponses;
  },

  /**
   * User syncs.
   *
   * @param {*} syncOptions Publisher prebid configuration.
   * @param {*} serverResponses A successful response from the server.
   * @return {Syncs[]} An array of syncs that should be executed.
   */
  getUserSyncs: (syncOptions, serverResponses) => {
    return [];
  }
}

registerBidder(spec);
