import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
import { BANNER, VIDEO } from '../src/mediaTypes';

const BIDDER_CODE = 'lifestreet';
const ADAPTER_VERSION = 'prebidJS-2.0';

const urlTemplate = template`https://ads.lfstmedia.com/gate/${'adapter'}/${'slot'}?adkey=${'adkey'}&ad_size=${'ad_size'}&__location=${'location'}&__referrer=${'referrer'}&__wn=${'wn'}&__sf=${'sf'}&__fif=${'fif'}&__if=${'if'}&__stamp=${'stamp'}&__pp=1&__hb=1&_prebid_json=1&__gz=1&deferred_format=vast_2_0,vast_3_0&__hbver=${'hbver'}`;

/**
 * Creates a bid requests for a given bid.
 *
 * @param {BidRequest} bid The bid params to use for formatting a request
 */
function formatBidRequest(bid, bidderRequest) {
  let url = urlTemplate({
    adapter: 'prebid',
    slot: bid.params.slot,
    adkey: bid.params.adkey,
    ad_size: bid.params.ad_size,
    location: encodeURIComponent(utils.getTopWindowLocation()),
    referrer: encodeURIComponent(utils.getTopWindowReferrer()),
    wn: boolToString(/fb_http/i.test(window.name)),
    sf: boolToString(window['sfAPI'] || window['$sf']),
    fif: boolToString(window['inDapIF'] === true),
    if: boolToString(window !== window.top),
    stamp: new Date().getTime(),
    hbver: ADAPTER_VERSION
  });

  if (bidderRequest && bidderRequest.gdprConsent) {
    if (bidderRequest.gdprConsent.gdprApplies !== undefined) {
      const gdpr = '&__gdpr=' + (bidderRequest.gdprConsent.gdprApplies ? '1' : '0');
      url += gdpr;
    }
    if (bidderRequest.gdprConsent.consentString !== undefined) {
      url += '&__consent=' + bidderRequest.gdprConsent.consentString;
    }
  }

  return {
    method: 'GET',
    url: url,
    bidId: bid.bidId
  };
}

/**
 * A helper function to form URL from the template
 */
function template(strings, ...keys) {
  return function(...values) {
    let dict = values[values.length - 1] || {};
    let result = [strings[0]];
    keys.forEach(function(key, i) {
      let value = isInteger(key) ? values[key] : dict[key];
      result.push(value, strings[i + 1]);
    });
    return result.join('');
  };
}

/**
 * A helper function for template to generate string from boolean
 */
function boolToString(value) {
  return value ? '1' : '0';
}

/**
 * A helper function for template
 */
function isInteger(value) {
  return typeof value === 'number' &&
    isFinite(value) && Math.floor(value) === value;
}

/**
 * Validates response from Lifestreet AD server
 */
function isResponseValid(response) {
  return !/^\s*\{\s*"advertisementAvailable"\s*:\s*false/i.test(response.content) &&
    response.content.indexOf('<VAST version="2.0"></VAST>') === -1 && (typeof response.cpm !== 'undefined') &&
    response.status === 1;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['lsm'], // short code
  supportedMediaTypes: [BANNER, VIDEO], // Lifestreet supports banner and video media types

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
  */
  isBidRequestValid: function(bid) {
    return !!(bid.params.slot && bid.params.adkey && bid.params.ad_size);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
  */
  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bid => {
      return formatBidRequest(bid, bidderRequest)
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
  */
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    let response = serverResponse.body;
    if (!isResponseValid(response)) {
      return bidResponses;
    }

    const bidResponse = {
      requestId: bidRequest.bidId,
      cpm: response.cpm,
      width: response.width,
      height: response.height,
      creativeId: response.creativeId,
      currency: response.currency ? response.currency : 'USD',
      netRevenue: response.netRevenue ? response.netRevenue : true,
      ttl: response.ttl ? response.ttl : 86400
    };

    if (response.hasOwnProperty('dealId')) {
      bidResponse.dealId = response.dealId;
    }

    if (response.content_type.indexOf('vast') > -1) {
      if (typeof response.vastUrl !== 'undefined') {
        bidResponse.vastUrl = response.vastUrl;
      } else {
        bidResponse.vastXml = response.content;
      }
      bidResponse.mediaType = VIDEO;
    } else {
      bidResponse.ad = response.content;
      bidResponse.mediaType = BANNER;
    }

    bidResponses.push(bidResponse);
    return bidResponses;
  }
};

registerBidder(spec);
