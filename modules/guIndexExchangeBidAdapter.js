// Based on v0.34 /modules/indexExchangeBidAdapter.js

import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import {STATUS} from 'src/constants';
import bidfactory from 'src/bidfactory';
import {config} from 'src/config';

const bidderCode = 'indexExchange';
const prebidVersion = encodeURIComponent('$prebid.version$');
const url = 'https://as-sec.casalemedia.com';
const timeToLive = config.getConfig('_bidderTimeout');
const currency = 'USD';

// eslint-disable-next-line
const escapable = /[\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

const escapeCharacter = function (character) {
  const escaped = meta[character];
  if (typeof escaped === 'string') {
    return escaped;
  } else {
    return '\\u' + ('0000' + character.charCodeAt(0).toString(16)).slice(-4);
  }
};

const quote = function (string) {
  escapable.lastIndex = 0;
  if (escapable.test(string)) {
    return string.replace(escapable, escapeCharacter);
  } else {
    return string;
  }
};

const serialize = function (request) {
  if (typeof _IndexRequestData.requestCounter === 'undefined') {
    _IndexRequestData.requestCounter = Math.floor(Math.random() * 256);
  } else {
    _IndexRequestData.requestCounter = (_IndexRequestData.requestCounter + 1) % 256;
  }
  const requestId = String((new Date().getTime() % 2592000) * 256 + _IndexRequestData.requestCounter + 256);
  const sitePage = utils.getTopWindowUrl();

  let json = '{"id":"' + requestId + '","site":{"page":"' + quote(sitePage) + '"';
  if (typeof document.referrer === 'string' && document.referrer !== '') {
    json += ',"ref":"' + quote(document.referrer) + '"';
  }
  json += '},"imp":[';

  for (let i = 0; i < request.sizes.length; i++) {
    const size = request.sizes[i];
    const ext = [];
    const idx = i + 1;
    json += '{"id":"' + idx + '", "banner":{"w":' + size[0] + ',"h":' + size[1] + ',"topframe":1}';
    ext.push('"sid":"' + quote(request.params.id) + '_' + idx + '"');
    ext.push('"siteID":' + request.params.siteID);
    json += ',"ext": {' + ext.join() + '}';
    if (i + 1 === request.sizes.length) {
      json += '}';
    } else {
      json += '},';
    }
  }

  json += ']}';
  return encodeURI(json);
};

const setUpIndexRequestData = function() {
  if (typeof window._IndexRequestData === 'undefined') {
    window._IndexRequestData = {};
    window._IndexRequestData.impIDToSlotID = {};
    window._IndexRequestData.reqOptions = {};
  }
  // clear custom targets at the beginning of every request
  _IndexRequestData.targetAggregate = {'open': {}, 'private': {}};
};

export const spec = {
  code: bidderCode,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} request The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (request) {
    return !!(request.params.id && request.params.siteID);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @return ServerRequest[] Info describing the request to the server.
   */
  buildRequests: function (validBidRequests) {
    const serverRequests = [];

    setUpIndexRequestData();

    for (let i = 0; i < validBidRequests.length; i++) {
      const request = validBidRequests[i];
      const path = '/cygnus?v=7&fn=cygnus_index_parse_res&s=' + request.params.siteID + '&r=' + serialize(request) + '&pid=pb' + prebidVersion;

      serverRequests.push({
        method: 'GET',
        url: url + path,
        bidRequest: request
      });
    }

    return serverRequests;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param {*} bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];

    const response = JSON.parse(serverResponse.body.replace(/^cygnus_index_parse_res\((.+)\);$/, '$1'));
    const seatbidLength = typeof response.seatbid === 'undefined' ? 0 : response.seatbid.length;

    if (seatbidLength === 0) {
      const bidResponse = bidfactory.createBid(STATUS.NO_BID);
      bidResponse.requestId = bidRequest.bidRequest.bidId;
      bidResponse.bidderCode = bidderCode;
      bidResponse.cpm = 0;
      bidResponse.width = 0;
      bidResponse.height = 0;
      bidResponse.ttl = timeToLive;
      bidResponse.creativeId = '';
      bidResponse.netRevenue = true;
      bidResponse.currency = currency;
      bidResponses.push(bidResponse);
    }

    for (let i = 0; i < seatbidLength; i++) {
      for (let j = 0; j < response.seatbid[i].bid.length; j++) {
        const bid = response.seatbid[i].bid[j];
        if (typeof bid.ext !== 'object' || typeof bid.ext.pricelevel !== 'string') {
          continue;
        }
        const bidResponse = bidfactory.createBid(STATUS.GOOD);
        bidResponse.requestId = bidRequest.bidRequest.bidId;
        bidResponse.bidderCode = bidderCode;
        const size = bidRequest.bidRequest.sizes[bid.impid - 1];
        bidResponse.width = size[0];
        bidResponse.height = size[1];
        if (typeof bid.ext.dealid !== 'undefined') {
          bidResponse.dealID = bid.ext.dealid;
        }
        if (typeof bid.ext.pricelevel === 'string') {
          let priceLevel = bid.ext.pricelevel;
          if (priceLevel.charAt(0) === '_') priceLevel = priceLevel.slice(1);
          bidResponse.cpm = priceLevel / 100;
          if (!utils.isNumber(bidResponse.cpm) || isNaN(bidResponse.cpm)) {
            utils.logInfo('Cygnus returned invalid price');
            bidResponse.cpm = 0;
          }
        } else {
          bidResponse.cpm = 0;
        }
        bidResponse.ttl = timeToLive;
        bidResponse.ad = bid.adm;
        bidResponse.creativeId = bid.crid;
        bidResponse.netRevenue = true;
        bidResponse.currency = currency;
        bidResponses.push(bidResponse);
      }
    }

    return bidResponses;
  },
};

registerBidder(spec);
