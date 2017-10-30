import { getBidRequest } from 'src/utils';
import adaptermanager from 'src/adaptermanager';

const CONSTANTS = require('src/constants');
const utils = require('src/utils.js');
const adloader = require('src/adloader.js');
const bidmanager = require('src/bidmanager.js');
const bidfactory = require('src/bidfactory.js');
const Adapter = require('src/adapter.js').default;

var RealVuAdapter = function RealVuAdapter() {
  var baseAdapter = new Adapter('realvu');
  baseAdapter.callBids = function (params) {
    var pbids = params.bids;
    var boost_back = function() {
      var top1 = window;
      realvu_frm = 0;
      try {
        var wnd = window;
        while ((top1 != top) && (typeof (wnd.document) != 'undefined')) {
          top1 = wnd;
          wnd = wnd.parent;
        }
      } catch (e) { };
      for (var i = 0; i < pbids.length; i++) {
        var bid_rq = pbids[i];
        var sizes = utils.parseSizesInput(bid_rq.sizes);
        top1.realvu_boost.addUnitById({
          partner_id: bid_rq.params.partnerId,
          unit_id: bid_rq.placementCode,
          callback: baseAdapter.boostCall,
          pbjs_bid: bid_rq,
          size: sizes[0],
          mode: 'kvp'
        });
      }
    };
    adloader.loadScript('//ac.realvu.net/realvu_boost.js', boost_back, 1);
  };

  baseAdapter.boostCall = function(rez) {
    var bid_request = rez.pin.pbjs_bid;
    var callbackId = bid_request.bidId;
    if (rez.realvu === 'yes') {
      var adap = new RvAppNexusAdapter();
      adloader.loadScript(adap.buildJPTCall(bid_request, callbackId));
    } else { // not in view - respond with no bid.
      var adResponse = bidfactory.createBid(2);
      adResponse.bidderCode = 'realvu';
      bidmanager.addBidResponse(bid_request.placementCode, adResponse);
    }
  };

  // +copy/pasted appnexusBidAdapter, "handleAnCB" replaced with "handleRvAnCB"
  var RvAppNexusAdapter = function RvAppNexusAdapter() {
    var usersync = false;

    this.buildJPTCall = function (bid, callbackId) {
      // determine tag params
      var placementId = utils.getBidIdParameter('placementId', bid.params);

      // memberId will be deprecated, use member instead
      var memberId = utils.getBidIdParameter('memberId', bid.params);
      var member = utils.getBidIdParameter('member', bid.params);
      var inventoryCode = utils.getBidIdParameter('invCode', bid.params);
      var query = utils.getBidIdParameter('query', bid.params);
      var referrer = utils.getBidIdParameter('referrer', bid.params);
      var altReferrer = utils.getBidIdParameter('alt_referrer', bid.params);
      var jptCall = '//ib.adnxs.com/jpt?';

      jptCall = utils.tryAppendQueryString(jptCall, 'callback', '$$PREBID_GLOBAL$$.handleRvAnCB');
      jptCall = utils.tryAppendQueryString(jptCall, 'callback_uid', callbackId);
      jptCall = utils.tryAppendQueryString(jptCall, 'psa', '0');
      jptCall = utils.tryAppendQueryString(jptCall, 'id', placementId);
      if (member) {
        jptCall = utils.tryAppendQueryString(jptCall, 'member', member);
      } else if (memberId) {
        jptCall = utils.tryAppendQueryString(jptCall, 'member', memberId);
        utils.logMessage('appnexus.callBids: "memberId" will be deprecated soon. Please use "member" instead');
      }

      jptCall = utils.tryAppendQueryString(jptCall, 'code', inventoryCode);
      jptCall = utils.tryAppendQueryString(jptCall, 'traffic_source_code', (utils.getBidIdParameter('trafficSourceCode', bid.params)));

      // sizes takes a bit more logic
      var sizeQueryString = '';
      var parsedSizes = utils.parseSizesInput(bid.sizes);

      // combine string into proper querystring for impbus
      var parsedSizesLength = parsedSizes.length;
      if (parsedSizesLength > 0) {
        // first value should be "size"
        sizeQueryString = 'size=' + parsedSizes[0];
        if (parsedSizesLength > 1) {
          // any subsequent values should be "promo_sizes"
          sizeQueryString += '&promo_sizes=';
          for (var j = 1; j < parsedSizesLength; j++) {
            sizeQueryString += parsedSizes[j] += ',';
          }

          // remove trailing comma
          if (sizeQueryString && sizeQueryString.charAt(sizeQueryString.length - 1) === ',') {
            sizeQueryString = sizeQueryString.slice(0, sizeQueryString.length - 1);
          }
        }
      }

      if (sizeQueryString) {
        jptCall += sizeQueryString + '&';
      }

      // this will be deprecated soon
      var targetingParams = utils.parseQueryStringParameters(query);

      if (targetingParams) {
        // don't append a & here, we have already done it in parseQueryStringParameters
        jptCall += targetingParams;
      }

      // append custom attributes:
      var paramsCopy = Object.assign({}, bid.params);

      // delete attributes already used
      delete paramsCopy.placementId;
      delete paramsCopy.memberId;
      delete paramsCopy.invCode;
      delete paramsCopy.query;
      delete paramsCopy.referrer;
      delete paramsCopy.alt_referrer;
      delete paramsCopy.member;

      // get the reminder
      var queryParams = utils.parseQueryStringParameters(paramsCopy);

      // append
      if (queryParams) {
        jptCall += queryParams;
      }

      // append referrer
      if (referrer === '') {
        referrer = utils.getTopWindowUrl();
      }

      jptCall = utils.tryAppendQueryString(jptCall, 'referrer', referrer);
      jptCall = utils.tryAppendQueryString(jptCall, 'alt_referrer', altReferrer);

      // remove the trailing "&"
      if (jptCall.lastIndexOf('&') === jptCall.length - 1) {
        jptCall = jptCall.substring(0, jptCall.length - 1);
      }

      // @if NODE_ENV='debug'
      utils.logMessage('jpt request built: ' + jptCall);
      // @endif

      // append a timer here to track latency
      bid.startTime = new Date().getTime();

      return jptCall;
    }

    // expose the callback to the global object:
    $$PREBID_GLOBAL$$.handleRvAnCB = function (jptResponseObj) {
      var bidCode;

      if (jptResponseObj && jptResponseObj.callback_uid) {
        var responseCPM;
        var id = jptResponseObj.callback_uid;
        var placementCode = '';
        var bidObj = getBidRequest(id);
        if (bidObj) {
          bidCode = bidObj.bidder;

          placementCode = bidObj.placementCode;

          // set the status
          bidObj.status = CONSTANTS.STATUS.GOOD;
        }

        // @if NODE_ENV='debug'
        utils.logMessage('JSONP callback function called for ad ID: ' + id);

        // @endif
        var bid = [];
        if (jptResponseObj.result && jptResponseObj.result.cpm && jptResponseObj.result.cpm !== 0) {
          responseCPM = parseInt(jptResponseObj.result.cpm, 10);

          // CPM response from /jpt is dollar/cent multiplied by 10000
          // in order to avoid using floats
          // switch CPM to "dollar/cent"
          responseCPM = responseCPM / 10000;

          // store bid response
          // bid status is good (indicating 1)
          var adId = jptResponseObj.result.creative_id;
          bid = bidfactory.createBid(1, bidObj);
          bid.creative_id = adId;
          bid.bidderCode = bidCode;
          bid.cpm = responseCPM;
          bid.adUrl = jptResponseObj.result.ad;
          bid.width = jptResponseObj.result.width;
          bid.height = jptResponseObj.result.height;
          bid.dealId = jptResponseObj.result.deal_id;

          bidmanager.addBidResponse(placementCode, bid);
        } else {
          // no bid
          bid = bidfactory.createBid(2, bidObj);
          bid.bidderCode = bidCode;
          bidmanager.addBidResponse(placementCode, bid);
        }

        if (!usersync) {
          var iframe = utils.createInvisibleIframe();
          iframe.src = '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html';
          try {
            document.body.appendChild(iframe);
          } catch (error) {
            utils.logError(error);
          }
          usersync = true;
        }
      } else {
        utils.logMessage('No prebid response for placement %%PLACEMENT%%');
      }
    };
  };
  // -copy/pasted appnexusBidAdapter
  return Object.assign(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    boostCall: baseAdapter.boostCall
  });
};

adaptermanager.registerBidAdapter(new RealVuAdapter(), 'realvu');

module.exports = RealVuAdapter;
