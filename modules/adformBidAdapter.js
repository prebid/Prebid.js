'use strict';

import {config} from 'src/config';
import {registerBidder} from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'adform';
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [],
  isBidRequestValid: function (bid) {
    return !!(bid.params.mid);
  },
  buildRequests: function (validBidRequests) {
    var i, l, j, k, bid, _key, _value, reqParams;
    var bidRequests = [];
    var request = [];
    var globalParams = [ [ 'adxDomain', 'adx.adform.net' ], [ 'fd', 1 ], [ 'url', null ], [ 'tid', null ] ];
    for (i = 0, l = validBidRequests.length; i < l; i++) {
      bid = validBidRequests[i];
      for (j = 0, k = globalParams.length; j < k; j++) {
        _key = globalParams[j][0];
        _value = bid[_key] || bid.params[_key];
        if (_value) {
          bid[_key] = bid.params[_key] = null;
          globalParams[j][1] = _value;
        }
      }
      reqParams = bid.params;
      reqParams.transactionId = bid.transactionId;
      request.push(formRequestUrl(reqParams));
    }

    request.unshift('//' + globalParams[0][1] + '/adx/?rp=4');
    for (i = 1, l = globalParams.length; i < l; i++) {
      _key = globalParams[i][0];
      _value = globalParams[i][1];
      if (_value) {
        request.push(_key + '=' + encodeURIComponent(_value));
      }
    }

    bidRequests.push({
      method: 'GET',
      url: request.join('&'),
      bids: validBidRequests,
      bidder: 'adform'
    });

    return bidRequests;

    function formRequestUrl(reqData) {
      var key;
      var url = [];

      for (key in reqData) {
        if (reqData.hasOwnProperty(key) && reqData[key]) { url.push(key, '=', reqData[key], '&'); }
      }
      return encode64(url.join('').slice(0, -1));
    }

    function encode64(input) {
      var out = [];
      var chr1;
      var chr2;
      var chr3;
      var enc1;
      var enc2;
      var enc3;
      var enc4;
      var i = 0;
      var _keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=';

      input = utf8_encode(input);

      while (i < input.length) {
        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);

        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;

        if (isNaN(chr2)) {
          enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
          enc4 = 64;
        }

        out.push(_keyStr.charAt(enc1), _keyStr.charAt(enc2));
        if (enc3 !== 64) { out.push(_keyStr.charAt(enc3)); }
        if (enc4 !== 64) { out.push(_keyStr.charAt(enc4)); }
      }

      return out.join('');
    }

    function utf8_encode(string) {
      string = string.replace(/\r\n/g, '\n');
      var utftext = '';

      for (var n = 0; n < string.length; n++) {
        var c = string.charCodeAt(n);

        if (c < 128) {
          utftext += String.fromCharCode(c);
        } else if ((c > 127) && (c < 2048)) {
          utftext += String.fromCharCode((c >> 6) | 192);
          utftext += String.fromCharCode((c & 63) | 128);
        } else {
          utftext += String.fromCharCode((c >> 12) | 224);
          utftext += String.fromCharCode(((c >> 6) & 63) | 128);
          utftext += String.fromCharCode((c & 63) | 128);
        }
      }

      return utftext;
    }
  },
  interpretResponse: function (serverResponse, bidRequest) {
    var bidObject, response, bid;
    var bidRespones = [];
    var bids = bidRequest.bids;
    var bidder = bidRequest.bidder;
    var responses = serverResponse.body;
    for (var i = 0; i < responses.length; i++) {
      response = responses[i];
      bid = bids[i];
      if (response.response === 'banner' && verifySize(response, bid.sizes)) {
        bidObject = {
          requestId: bid.bidId,
          cpm: response.win_bid,
          width: response.width,
          height: response.height,
          creativeId: bid.bidId,
          dealId: response.deal_id,
          currency: response.win_cur,
          netRevenue: response.netRevenue || true,
          ttl: config.getConfig('_bidderTimeout'),
          ad: response.banner,
          bidderCode: bidder,
          transactionId: bid.transactionId
        };
        bidRespones.push(bidObject);
      }
    }

    return bidRespones;

    function verifySize(adItem, validSizes) {
      for (var j = 0, k = validSizes.length; j < k; j++) {
        if (adItem.width === validSizes[j][0] &&
            adItem.height === validSizes[j][1]) {
          return true;
        }
      }
      return false;
    }
  }
};
registerBidder(spec);
