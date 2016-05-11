var utils = require('../utils.js');
var adloader = require('../adloader.js');
var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');

function AdformAdapter() {

  return {
    callBids: _callBids
  };

  function _callBids(params) {
    //var callbackName = '_adf_' + utils.getUniqueIdentifierStr();
    var bid;
    var noDomain = true;
    var bids = params.bids;
    var request = [];
    var callbackName = utils.getUniqueIdentifierStr();

    for (var i = 0, l = bids.length; i < l; i++) {
      bid = bids[i];
      if (bid.adxDomain && noDomain) {
        noDomain = false;
        request.unshift('//' + bid.adxDomain + '/adx/?rp=4');
      }

      request.push(formRequestUrl(bid.params));
    }

    if (noDomain) {
      request.unshift('//adx.adform.net/adx/?rp=4');
    }

    pbjs[callbackName] = handleCallback(bids);
    request.push('callback=pbjs.' + callbackName);

    adloader.loadScript(request.join('&'));
  }

  function formRequestUrl(reqData) {
    var key;
    var url = [];

    var validProps = [
        'mid', 'inv', 'pdom', 'mname', 'mkw', 'mkv', 'cat', 'bcat', 'bcatrt', 'adv', 'advt', 'cntr', 'cntrt', 'maxp',
        'minp', 'sminp', 'w', 'h', 'pb', 'pos', 'cturl', 'iturl', 'cttype', 'hidedomain', 'cdims', 'test'
    ];

    for (var i = 0, l = validProps.length; i < l; i++) {
      key = validProps[i];
      if (reqData.hasOwnProperty(key))
          url.push(key, '=', reqData[key], '&');
    }

    return encode64(url.join(''));
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

          bidObject = bidfactory.createBid(1);
          bidObject.bidderCode = bidder;
          bidObject.cpm = adItem.win_bid;
          bidObject.cur = adItem.win_cur;
          bidObject.ad = adItem.banner;
          bidObject.width = adItem.width;
          bidObject.height = adItem.height;
          bidmanager.addBidResponse(bid.placementCode, bidObject);
        } else {
          bidObject = bidfactory.createBid(2);
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
