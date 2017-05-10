let events = require('../events');
let CONSTANTS = require('../constants.json');
let utils = require('../utils');
let bidfactory = require('../bidfactory');
let bidmanager = require('../bidmanager');
let adloader = require('../adloader');

let roxotUrl = "//r.rxthdr.com";
let roxotAnalyticUrl = "//d.rxthdr.com/save_analytic";
let bidderCode = 'roxotanalytic';

if (roxotAnalyticEnabled()) {
  storeEventsRoxotAnalytic();
}

let RoxotAnalyticAdapter = Adapter;

module.exports = RoxotAnalyticAdapter;

function roxotAnalyticEnabled() {
  return $$PREBID_GLOBAL$$.roxotAnalyticDisable !== true;
}

function Adapter() {
  $$PREBID_GLOBAL$$.roxotResponseHandler = roxotResponseHandler;

  return {
    callBids: callBids
  };
}

function storeEventsRoxotAnalytic() {
  storeAuctionTimeout();
  storeFiredEvents();
  subscribeToFutureEvents();
}

function storeAuctionTimeout() {
  let timeoutArgs = {
    'bidderTimeout': $$PREBID_GLOBAL$$.bidderTimeout,
    'cbTimeout': $$PREBID_GLOBAL$$.cbTimeout,
    'PREBID_TIMEOUT': typeof window.PREBID_TIMEOUT !== 'undefined' ? window.PREBID_TIMEOUT : '-'
  };

  storeEvent('timeout', timeoutArgs);
}

function storeFiredEvents() {
  events.getEvents().forEach(function (event) {
    storeEvent(event.eventType, event.args);
  });
}

function subscribeToFutureEvents() {
  storedEventNames().forEach(function (eventName) {
    events.on(eventName, storeNamedEvent(eventName));
  });
}

function storedEventNames() {
  return utils._map(CONSTANTS.EVENTS, function (v) {
    return v;
  });
}

function storeNamedEvent(eventName) {
  return function (args) {
    storeEvent(eventName, args);
  };
}

function storeEvent(eventName, args) {
  let xhr = new XMLHttpRequest();

  xhr.open('POST', roxotAnalyticUrl, true);
  xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xhr.send(JSON.stringify({'eventType': eventName, 'args': args}));
}

function callBids(bidReqs) {
  utils.logInfo('callBids roxot adapter invoking');

  let domain = window.location.host || window.location.origin;
  let page = window.location.pathname + location.search + location.hash;

  let roxotBidReqs = {
    id: utils.getUniqueIdentifierStr(),
    bids: bidReqs,
    site: {
      domain: domain,
      page: page
    }
  };

  let scriptUrl = roxotUrl + '?callback=$$PREBID_GLOBAL$$.roxotResponseHandler' + '&src=' + CONSTANTS.REPO_AND_VERSION +
    '&br=' + encodeURIComponent(JSON.stringify(roxotBidReqs));

  adloader.loadScript(scriptUrl);
}

function roxotResponseHandler(roxotResponseObject) {
  utils.logInfo('roxotResponseHandler invoking');

  if (isResponseInvalid(roxotResponseObject)) {
    return fillPlacementEmptyBid();
  }

  let placements = [];

  roxotResponseObject.bids.forEach(function (bidResponse) {
    let bidRequest = findBidRequest(bidResponse.bidId);
    if(bidRequest){
      bidRequest.status = CONSTANTS.STATUS.GOOD;
      placements.push(bidRequest.placementCode);
      pushRoxotBid(bidRequest, bidResponse);
    }
  });

  let allBidResponse = fillPlacementEmptyBid(placements);
  utils.logInfo('roxotResponse handler finish');

  return allBidResponse;
}

function isResponseInvalid(response) {
  return !response || !response.bids || !Array.isArray(response.bids) || response.bids.length <= 0;
}

function findBidRequest(bidId) {
  let bidRequest = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === bidderCode);

  if (!bidRequest) {
    return;
  }

  return bidRequest.bids.find(bid => bid.bidId === bidId);
}

function pushSuccessBid(bidRequest, bidResponse) {
  let bid = bidfactory.createBid(1, bidRequest);
  bid.bidderCode = bidderCode;

  let responseNurl = '<img src="' + bidResponse.nurl + '">';

  bid.creative_id = bidResponse.id;
  bid.cpm = bidResponse.cpm;
  bid.ad = decodeURIComponent(bidResponse.adm + responseNurl);
  bid.width = parseInt(bidResponse.w);
  bid.height = parseInt(bidResponse.h);

  bidmanager.addBidResponse(bidRequest.placementCode, bid);
}

function pushRoxotBid(bidRequest, bidResponse) {
  if (!bidResponse.cpm) {
    return pushErrorBid(bidRequest.placementCode);
  }

  pushSuccessBid(bidRequest, bidResponse);
}

function fillPlacementEmptyBid(places) {
  let bidRequest = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === bidderCode);
  if (!bidRequest) {
    return;
  }

  bidRequest.bids
    .filter(bidRequest => !utils.contains(places, bidRequest.placementCode))
    .forEach(pushErrorBid);
}

function pushErrorBid(bidRequest) {
  let bid = bidfactory.createBid(2, bidRequest);
  bid.bidderCode = bidderCode;
  bidmanager.addBidResponse(bidRequest.placementCode, bid);
}
