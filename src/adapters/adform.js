var utils = require('../utils.js');
var adloader = require('../adloader.js');
var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');
var STATUSCODES = require('../constants.json').STATUS;

function AdformAdapter() {

  return {
    callBids: _callBids
  };

  function _callBids(params) {
    var bid, _value, _key, i, j, k, l;
    var bids = params.bids;
    var request = [];
    var callbackName = '_adf_' + utils.getUniqueIdentifierStr();
    var globalParams = [ [ 'adxDomain', 'adx.adform.net' ], [ 'url', null ], [ 'tid', null ], [ 'callback', '$$PREBID_GLOBAL$$.' + callbackName ] ];

    for (i = 0, l = bids.length; i < l; i++) {
      bid = bids[i];

      for (j = 0, k = globalParams.length; j < k; j++) {
        _key = globalParams[j][0];
        _value = bid[_key] || bid.params[_key];
        if (_value) {
          bid[_key] = bid.params[_key] = null;
          globalParams[j][1] = _value;
        }
      }

      request.push(formRequestUrl(bid.params));
    }

    request.unshift('//' + globalParams[0][1]+ '/adx/?rp=4');

    for (i = 1, l = globalParams.length; i < l; i++) {
      _key = globalParams[i][0];
      _value = globalParams[i][1];
      if (_value) {
        request.push(globalParams[i][0] + '='+ encodeURIComponent(_value));
      }
    }

    $$PREBID_GLOBAL$$[callbackName] = handleCallback(bids);

    adloader.loadScript(request.join('&'));
  }

  function formRequestUrl(reqData) {
    var key;
    var url = [];

    for (key in reqData) {
      if (reqData.hasOwnProperty(key) && reqData[key])
        url.push(key, '=', reqData[key], '&');
    }

    return encode64(url.join('').slice(0, -1));
  }

  function handleCallback(bids) {
    return function handleResponse(adItems) {
      var bidObject;
      var bidder = 'adform';
      var adItem;
      var bid;
      for (var i = 0, l = adItems.length; i < l; i++) {
        adItem = adItems[i];
        bid = bids[i];
        if (adItem && adItem.response === 'banner' &&
            verifySize(adItem, bid.sizes)) {

          bidObject = bidfactory.createBid(STATUSCODES.GOOD, bid);
          bidObject.bidderCode = bidder;
          bidObject.cpm = adItem.win_bid;
          bidObject.cur = adItem.win_cur;
          bidObject.ad = adItem.banner;
          bidObject.width = adItem.width;
          bidObject.height = adItem.height;
          bidObject.dealId = adItem.deal_id;
          bidmanager.addBidResponse(bid.placementCode, bidObject);
        } else {
          bidObject = bidfactory.createBid(STATUSCODES.NO_BID, bid);
          bidObject.bidderCode = bidder;
          bidmanager.addBidResponse(bid.placementCode, bidObject);
        }
      }
    };

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
      if (enc3 !== 64)
          out.push(_keyStr.charAt(enc3));
      if (enc4 !== 64)
          out.push(_keyStr.charAt(enc4));
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

}

module.exports = AdformAdapter;
