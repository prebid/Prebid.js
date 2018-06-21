var CONSTANTS = require('src/constants.json');
var utils = require('src/utils.js');
var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader');
var adaptermanager = require('src/adaptermanager');
import {config} from 'src/config';

var bidderName = 'memegen';
/**
 * General Adapter for requesting bids from Meme Global Media Group
 * OpenRTB compatible
 */
var MemeGenAdapter = function MemeGenAdapter() {
  var openRtbAdapterHost = 'ssp.velemh.com';
  var timeout;
  function _callBids(params) {
    timeout = params.timeout;
    var bids = params.bids;

    if (!bids) return;

    for (var i = 0; i < bids.length; i++) {
      _requestBid(bids[i]);
    }
  }

  function _requestBid(bidReq) {
    timeout = timeout || config.getConfig('bidderTimeout');
    // build bid request object
    var domain = window.location.host;
    var page = window.location.host + window.location.pathname + location.search + location.hash;

    var isInapp = utils.getBidIdParameter('isInapp', bidReq.params);
    var publisherId = utils.getBidIdParameter('publisherId', bidReq.params);
    var rtbTagId = Number(utils.getBidIdParameter('rtbTagId', bidReq.params));
    var rtbSiteId = utils.getBidIdParameter('rtbSiteId', bidReq.params);
    var bidFloor = Number(utils.getBidIdParameter('bidfloor', bidReq.params));
    var buyerUid = utils.getBidIdParameter('buyerUid', bidReq.params);
    var ua = utils.getBidIdParameter('ua', bidReq.params) || window.navigator.userAgent;

    var adW = 0;
    var adH = 0;

    var bidSizes = Array.isArray(bidReq.params.sizes) ? bidReq.params.sizes : bidReq.sizes;
    var sizeArrayLength = bidSizes.length;
    if (sizeArrayLength === 2 && typeof bidSizes[0] === 'number' && typeof bidSizes[1] === 'number') {
      adW = bidSizes[0];
      adH = bidSizes[1];
    } else {
      adW = bidSizes[0][0];
      adH = bidSizes[0][1];
    }

    function isSecure() {
      return window && window.location &&
        window.location.protocol == 'https:' || window.location.protocol == 'https'; // without ":" to support an older FF version
    }

    function secureValue() {
      return isSecure() ? 1: 0;
    }

    function buildInappRequest() {
      return {
        id: utils.getUniqueIdentifierStr(),
        imp: [{
          id: bidReq.bidId,
          banner: {
            w: adW,
            h: adH
          },
          tagid: toStringIfExists(rtbTagId || bidReq.placementCode),
          bidfloor: bidFloor,
          secure: secureValue()
        }],
        app: {
          id: publisherId,
          name: utils.getBidIdParameter('appName', bidReq.params),
          bundle: utils.getBidIdParameter('appBundle', bidReq.params),
          storeurl: utils.getBidIdParameter('appStoreurl', bidReq.params),
          publisher: {
            id: publisherId
          }
        },
        at: 1,
        device: {
          ua: ua,
          ifa: utils.getBidIdParameter('deviceIfa', bidReq.params)
        }
      };
    }

    function buildWebRequest() {
      return {
        id: utils.getUniqueIdentifierStr(),
        imp: [{
          id: bidReq.bidId,
          banner: {
            w: adW,
            h: adH
          },
          tagid: toStringIfExists(rtbTagId || bidReq.placementCode),
          bidfloor: bidFloor,
          secure: secureValue()
        }],
        site: {
          domain: domain,
          page: page,
          publisher: {
            id: publisherId
          }
        },
        at: 1,
        device: {
          ua: ua,
        },
      };
    }

    // build bid request with impressions
    var bidRequest;

    if (isInapp) {
      bidRequest = buildInappRequest();
    } else {
      bidRequest = buildWebRequest();
    }

    var pageUrl = utils.getBidIdParameter('pageUrl', bidReq.params);
    var pageDomain = utils.getBidIdParameter('pageDomain', bidReq.params);
    var ip = utils.getBidIdParameter('ip', bidReq.params);
    bidRequest.tmax = timeout;
    bidRequest.cur = ["USD"];

    if (bidRequest.site) {
      if (pageUrl) {
        bidRequest.site.page = pageUrl;
      }

      if (pageDomain) {
        bidRequest.site.domain = pageDomain;
      }

      if (rtbSiteId) {
        bidRequest.site.id = rtbSiteId;
      }
    }

    if (buyerUid) {
      bidRequest.user = bidRequest.user || {};
      bidRequest.user.buyeruid = buyerUid;
    }

    if (ip && bidRequest.device) {
      bidRequest.device.ip = ip;
    }

    var tagId = utils.getBidIdParameter('tagId', bidReq.params);

    var scriptUrl = '//' + openRtbAdapterHost + '/api/v2/services/prebid?callback=window.$$PREBID_GLOBAL$$.mgres' +
      '&br=' + encodeURIComponent(JSON.stringify(bidRequest)) +
      '&tmax=' + timeout +
      '&tag_id=' + tagId +
      '&bidder_url=' + encodeURIComponent(utils.getBidIdParameter('bidderUrl', bidReq.params));
    adloader.loadScript(scriptUrl);
  }

  function getBidSetForBidder() {
    return $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === bidderName);
  }

  function fillAuctionPricePLaceholder(str, auctionPrice) {
    if (typeof str != 'string') {
      return str;
    }
    return str.replace(/\${AUCTION_PRICE}/g, auctionPrice);
  }

  // expose the callback to the global object:
  $$PREBID_GLOBAL$$.mgres = function (bidRespWrapper) {
    // valid object?
    var bidResp = bidRespWrapper.response;
    if ((!bidResp || !bidResp.id) ||
      (!bidResp.seatbid || bidResp.seatbid.length === 0 || !bidResp.seatbid[0].bid || bidResp.seatbid[0].bid.length === 0)) {
      return;
    }

    bidResp.seatbid[0].bid.forEach(function (bidderBid) {
      var responseCPM;
      var placementCode = '';

      var bidSet = getBidSetForBidder();
      var memegenTagId = bidRespWrapper.tag;

      var bidRequested = bidSet.bids.find(b => b.bidId === bidderBid.impid);
      if (bidRequested) {
        var bidResponse = bidfactory.createBid(1);
        placementCode = bidRequested.placementCode;
        bidRequested.status = CONSTANTS.STATUS.GOOD;

        responseCPM = parseFloat(bidderBid.price);

        bidderBid.nurl = fillAuctionPricePLaceholder(bidderBid.nurl, responseCPM);
        bidderBid.adm = fillAuctionPricePLaceholder(bidderBid.adm, responseCPM);

        if (responseCPM === 0) {
          var bid = bidfactory.createBid(2);
          bid.bidderCode = bidderName;
          bidmanager.addBidResponse(placementCode, bid);
          return;
        }
        bidResponse.placementCode = placementCode;
        bidResponse.size = bidRequested.sizes;
        var responseAd = bidderBid.adm;
        var responseNurl = '<img src="' + bidderBid.nurl + '" height="0px" width="0px" style="display: none;">';
        bidResponse.creative_id = bidderBid.id;
        bidResponse.bidderCode = bidderName;
        bidResponse.cpm = responseCPM;
        bidResponse.ad = decodeURIComponent(responseAd + responseNurl);
        bidResponse.width = parseInt(bidderBid.w);
        bidResponse.height = parseInt(bidderBid.h);
        bidResponse.memegenTagId = memegenTagId;
        bidmanager.addBidResponse(placementCode, bidResponse);
      }
    });
  };

  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new MemeGenAdapter(), bidderName);

module.exports = MemeGenAdapter;

function toStringIfExists(val) {
  if (val === undefined || val === null) {
    return val;
  }
  return String(val);
}
