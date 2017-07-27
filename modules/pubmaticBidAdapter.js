var utils = require('src/utils.js');
var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adaptermanager = require('src/adaptermanager');

/**
 * Adapter for requesting bids from Pubmatic.
 *
 * @returns {{callBids: _callBids}}
 * @constructor
 */
function PubmaticAdapter() {
  var bids;
  var _pm_pub_id;
  var _pm_pub_age;
  var _pm_pub_gender;
  var _pm_pub_kvs;
  var _pm_optimize_adslots = [];
  let iframe;

  function _callBids(params) {
    bids = params.bids;
    _pm_optimize_adslots = [];
    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];
      // bidmanager.pbCallbackMap['' + bid.params.adSlot] = bid;
      _pm_pub_id = _pm_pub_id || bid.params.publisherId;
      _pm_pub_age = _pm_pub_age || (bid.params.age || '');
      _pm_pub_gender = _pm_pub_gender || (bid.params.gender || '');
      _pm_pub_kvs = _pm_pub_kvs || (bid.params.kvs || '');
      _pm_optimize_adslots.push(bid.params.adSlot);
    }

    // Load pubmatic script in an iframe, because they call document.write
    _getBids();
  }

  function _getBids() {
    // create the iframe
    iframe = utils.createInvisibleIframe();

    var elToAppend = document.getElementsByTagName('head')[0];

    // insert the iframe into document
    elToAppend.insertBefore(iframe, elToAppend.firstChild);

    var iframeDoc = utils.getIframeDocument(iframe);
    iframeDoc.write(_createRequestContent());
    iframeDoc.close();
  }

  function _createRequestContent() {
    var content = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"' +
      ' "http://www.w3.org/TR/html4/loose.dtd"><html><head><base target="_top" /><scr' +
      'ipt>inDapIF=true;</scr' + 'ipt></head>';
    content += '<body>';
    content += '<scr' + 'ipt>';
    content += '' +
      'window.pm_pub_id  = "%%PM_PUB_ID%%";' +
      'window.pm_optimize_adslots     = [%%PM_OPTIMIZE_ADSLOTS%%];' +
      'window.kaddctr = "%%PM_ADDCTR%%";' +
      'window.kadgender = "%%PM_GENDER%%";' +
      'window.kadage = "%%PM_AGE%%";' +
      'window.pm_async_callback_fn = "window.parent.$$PREBID_GLOBAL$$.handlePubmaticCallback";';

    content += '</scr' + 'ipt>';

    var map = {};
    map.PM_PUB_ID = _pm_pub_id;
    map.PM_ADDCTR = _pm_pub_kvs;
    map.PM_GENDER = _pm_pub_gender;
    map.PM_AGE = _pm_pub_age;
    map.PM_OPTIMIZE_ADSLOTS = _pm_optimize_adslots.map(function (adSlot) {
      return "'" + adSlot + "'";
    }).join(',');

    content += '<scr' + 'ipt src="https://ads.pubmatic.com/AdServer/js/gshowad.js"></scr' + 'ipt>';
    content += '<scr' + 'ipt>';
    content += '</scr' + 'ipt>';
    content += '</body></html>';
    content = utils.replaceTokenInString(content, map, '%%');

    return content;
  }

  $$PREBID_GLOBAL$$.handlePubmaticCallback = function () {
    let bidDetailsMap = {};
    let progKeyValueMap = {};
    try {
      bidDetailsMap = iframe.contentWindow.bidDetailsMap;
      progKeyValueMap = iframe.contentWindow.progKeyValueMap;
    } catch (e) {
      utils.logError(e, 'Error parsing Pubmatic response');
    }

    var i;
    var adUnit;
    var adUnitInfo;
    var bid;
    var bidResponseMap = bidDetailsMap || {};
    var bidInfoMap = progKeyValueMap || {};
    var dimensions;

    for (i = 0; i < bids.length; i++) {
      var adResponse;
      bid = bids[i].params;

      adUnit = bidResponseMap[bid.adSlot] || {};

      // adUnitInfo example: bidstatus=0;bid=0.0000;bidid=39620189@320x50;wdeal=

      // if using DFP GPT, the params string comes in the format:
      // "bidstatus;1;bid;5.0000;bidid;hb_test@468x60;wdeal;"
      // the code below detects and handles this.
      if (bidInfoMap[bid.adSlot] && bidInfoMap[bid.adSlot].indexOf('=') === -1) {
        bidInfoMap[bid.adSlot] = bidInfoMap[bid.adSlot].replace(/([a-z]+);(.[^;]*)/ig, '$1=$2');
      }

      adUnitInfo = (bidInfoMap[bid.adSlot] || '').split(';').reduce(function (result, pair) {
        var parts = pair.split('=');
        result[parts[0]] = parts[1];
        return result;
      }, {});

      if (adUnitInfo.bidstatus === '1') {
        dimensions = adUnitInfo.bidid.split('@')[1].split('x');
        adResponse = bidfactory.createBid(1);
        adResponse.bidderCode = 'pubmatic';
        adResponse.adSlot = bid.adSlot;
        adResponse.cpm = Number(adUnitInfo.bid);
        adResponse.ad = unescape(adUnit.creative_tag);
        adResponse.ad += utils.createTrackPixelIframeHtml(decodeURIComponent(adUnit.tracking_url));
        adResponse.width = dimensions[0];
        adResponse.height = dimensions[1];
        adResponse.dealId = adUnitInfo.wdeal;

        bidmanager.addBidResponse(bids[i].placementCode, adResponse);
      } else {
        // Indicate an ad was not returned
        adResponse = bidfactory.createBid(2);
        adResponse.bidderCode = 'pubmatic';
        bidmanager.addBidResponse(bids[i].placementCode, adResponse);
      }
    }
  };

  return {
    callBids: _callBids
  };
}

adaptermanager.registerBidAdapter(new PubmaticAdapter(), 'pubmatic');

module.exports = PubmaticAdapter;
