var utils = require('src/utils.js');
var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adaptermanager = require('src/adaptermanager');
const constants = require('src/constants.json');

/**
 * Adapter for requesting bids from Pubmatic.
 *
 * @returns {{callBids: _callBids}}
 * @constructor
 */
const PubmaticAdapter = function PubmaticAdapter() {
  let bids;
  let usersync = false;
  let _secure = 0;
  let _protocol = (window.location.protocol === 'https:' ? (_secure = 1, 'https') : 'http') + '://';
  let iframe;

  let dealChannelValues = {
    1: 'PMP',
    5: 'PREF',
    6: 'PMPG'
  };

  let customPars = {
    'kadgender': 'gender',
    'age': 'kadage',
    'dctr': 'dctr', // Custom Targeting
    'wiid': 'wiid', // Wrapper Impression ID
    'profId': 'profId', // Legacy: Profile ID
    'verId': 'verId', // Legacy: version ID
    'pmzoneid': { // Zone ID
      n: 'pmZoneId',
      m: function(zoneId) {
        if (utils.isStr(zoneId)) {
          return zoneId.split(',').slice(0, 50).join();
        } else {
          return undefined;
        }
      }
    }
  };

  function _initConf() {
    var conf = {};
    var currTime = new Date();

    conf.SAVersion = '1100';
    conf.wp = 'PreBid';
    conf.js = 1;
    conf.wv = constants.REPO_AND_VERSION;
    _secure && (conf.sec = 1);
    conf.screenResolution = screen.width + 'x' + screen.height;
    conf.ranreq = Math.random();
    conf.inIframe = window != top ? '1' : '0';

    // istanbul ignore else
    if (window.navigator.cookieEnabled === false) {
      conf.fpcd = '1';
    }

    try {
      conf.pageURL = window.top.location.href;
      conf.refurl = window.top.document.referrer;
    } catch (e) {
      conf.pageURL = window.location.href;
      conf.refurl = window.document.referrer;
    }

    conf.kltstamp = currTime.getFullYear() +
      '-' + (currTime.getMonth() + 1) +
      '-' + currTime.getDate() +
      ' ' + currTime.getHours() +
      ':' + currTime.getMinutes() +
      ':' + currTime.getSeconds();
    conf.timezone = currTime.getTimezoneOffset() / 60 * -1;

    return conf;
  }

  function _handleCustomParams(params, conf) {
    // istanbul ignore else
    if (!conf.kadpageurl) {
      conf.kadpageurl = conf.pageURL;
    }

    var key, value, entry;
    for (key in customPars) {
      // istanbul ignore else
      if (customPars.hasOwnProperty(key)) {
        value = params[key];
        // istanbul ignore else
        if (value) {
          entry = customPars[key];

          if (typeof entry === 'object') {
            value = entry.m(value, conf);
            key = entry.n;
          } else {
            key = customPars[key];
          }

          if (utils.isStr(value)) {
            conf[key] = value;
          } else {
            utils.logWarn('PubMatic: Ignoring param key: ' + customPars[key] + ', expects string-value, found ' + typeof value);
          }
        }
      }
    }
    return conf;
  }

  function _cleanSlot(slotName) {
    // istanbul ignore else
    if (utils.isStr(slotName)) {
      return slotName.replace(/^\s+/g, '').replace(/\s+$/g, '');
    }
    return '';
  }

  function _legacyExecution(conf, slots) {
    var url = _generateLegacyCall(conf, slots);
    iframe = utils.createInvisibleIframe();
    var elToAppend = document.getElementsByTagName('head')[0];
    elToAppend.insertBefore(iframe, elToAppend.firstChild);
    var iframeDoc = utils.getIframeDocument(iframe);
    var content = utils.createContentToExecuteExtScriptInFriendlyFrame(url);
    content = content.replace(`<!--POST_SCRIPT_TAG_MACRO-->`, `<script>window.parent.$$PREBID_GLOBAL$$.handlePubmaticCallback(window.bidDetailsMap, window.progKeyValueMap);</script>`);
    iframeDoc.write(content);
    iframeDoc.close();
  }

  function _generateLegacyCall(conf, slots) {
    var request_url = 'gads.pubmatic.com/AdServer/AdCallAggregator';
    return _protocol + request_url + '?' + utils.parseQueryStringParameters(conf) + 'adslots=' + encodeURIComponent('[' + slots.join(',') + ']');
  }

  function _initUserSync(pubId) {
    // istanbul ignore else
    if (!usersync) {
      var iframe = utils.createInvisibleIframe();
      iframe.src = _protocol + 'ads.pubmatic.com/AdServer/js/showad.js#PIX&kdntuid=1&p=' + pubId;
      utils.insertElement(iframe, document);
      usersync = true;
    }
  }

  function _callBids(params) {
    var conf = _initConf();
    var slots = [];

    conf.pubId = 0;
    bids = params.bids || [];

    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];
      conf.pubId = conf.pubId || bid.params.publisherId;
      conf = _handleCustomParams(bid.params, conf);
      bid.params.adSlot = _cleanSlot(bid.params.adSlot);
      bid.params.adSlot.length && slots.push(bid.params.adSlot);
    }

    // istanbul ignore else
    if (conf.pubId && slots.length > 0) {
      _legacyExecution(conf, slots);
    }

    _initUserSync(conf.pubId);
  }

  $$PREBID_GLOBAL$$.handlePubmaticCallback = function(bidDetailsMap, progKeyValueMap) {
    var i;
    var adUnit;
    var adUnitInfo;
    var bid;
    var bidResponseMap = bidDetailsMap;
    var bidInfoMap = progKeyValueMap;

    if (!bidResponseMap || !bidInfoMap) {
      return;
    }

    for (i = 0; i < bids.length; i++) {
      var adResponse;
      bid = bids[i].params;
      adUnit = bidResponseMap[bid.adSlot] || {};
      // adUnitInfo example: bidstatus=0;bid=0.0000;bidid=39620189@320x50;wdeal=
      // if using DFP GPT, the params string comes in the format:
      // "bidstatus;1;bid;5.0000;bidid;hb_test@468x60;wdeal;"
      // the code below detects and handles this.
      // istanbul ignore else
      if (bidInfoMap[bid.adSlot] && bidInfoMap[bid.adSlot].indexOf('=') === -1) {
        bidInfoMap[bid.adSlot] = bidInfoMap[bid.adSlot].replace(/([a-z]+);(.[^;]*)/ig, '$1=$2');
      }

      adUnitInfo = (bidInfoMap[bid.adSlot] || '').split(';').reduce(function(result, pair) {
        var parts = pair.split('=');
        result[parts[0]] = parts[1];
        return result;
      }, {});

      if (adUnitInfo.bidstatus === '1') {
        adResponse = bidfactory.createBid(1);
        adResponse.bidderCode = 'pubmatic';
        adResponse.adSlot = bid.adSlot;
        adResponse.cpm = Number(adUnitInfo.bid);
        adResponse.ad = unescape(adUnit.creative_tag);
        adResponse.ad += utils.createTrackPixelIframeHtml(decodeURIComponent(adUnit.tracking_url));
        adResponse.width = adUnit.width;
        adResponse.height = adUnit.height;
        adResponse.dealId = adUnitInfo.wdeal;
        adResponse.dealChannel = dealChannelValues[adUnit.deal_channel] || null;

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
};

adaptermanager.registerBidAdapter(new PubmaticAdapter(), 'pubmatic');

module.exports = PubmaticAdapter;
