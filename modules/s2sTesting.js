import { config } from 'src/config';

var events = require('src/events');
var CONSTANTS = require('src/constants.json');
const BID_ADJUSTMENT = CONSTANTS.EVENTS.BID_ADJUSTMENT;
const AST = CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING;
export const SERVER = 'server';
export const CLIENT = 'client';
const BOTH = 'both';

var randNumber; // define random number for testing
var bidSource = {}; // store bidder sources determined from s2sConfing bidderControl

// load s2sConfig
config.getConfig('s2sConfig', config => {
  addBidderSourceTargeting(config.s2sConfig)
  calculateBidSources(config.s2sConfig);
});

// function to add hb_source_<bidder> adServerTargeting (AST) kvp to bidder settings
function addBidderSourceTargeting(s2sConfig = {}) {
  // bail if testing is not turned on
  if (!s2sConfig.testing) {
    return;
  }
  var bidderSettings = $$PREBID_GLOBAL$$.bidderSettings || {};
  var bidderControl = s2sConfig.bidderControl || {};
  // for each configured bidder
  (s2sConfig.bidders || []).forEach((bidder) => {
    // remove any existing kvp setting
    if (bidderSettings[bidder] && bidderSettings[bidder][AST]) {
      bidderSettings[bidder][AST] = bidderSettings[bidder][AST].filter((kvp) => {
        return kvp.key !== `hb_source_${bidder}`;
      });
    }
    // if includeSourceKvp === true add new kvp setting
    if (bidderControl[bidder] && bidderControl[bidder].includeSourceKvp) {
      bidderSettings[bidder] = bidderSettings[bidder] || {};
      bidderSettings[bidder][AST] = bidderSettings[bidder][AST] || [];
      bidderSettings[bidder][AST].push({
        key: `hb_source_${bidder}`,
        val: function (bidResponse) {
          return adUnitBidderResponseSrc[bidResponse.requestId] && adUnitBidderResponseSrc[bidResponse.requestId][bidResponse.bidderCode];
        }
      });
      // make sure "alwaysUseBid" is set so targeting is set
      bidderSettings[bidder].alwaysUseBid = true;
    }
  });
}

// on BID_ADJUSTMENT store bidder response sources by requestId
var adUnitBidderResponseSrc = {};
events.on(BID_ADJUSTMENT, (bid) => {
  // initialize data structure for this request
  adUnitBidderResponseSrc[bid.requestId] = adUnitBidderResponseSrc[bid.requestId] || {};
  // get current source of this bid response (currently only S2S sets this)
  var src = bid.source || CLIENT; // default to client
  // get previous source for this bid, if one exists
  var prevSrc = adUnitBidderResponseSrc[bid.requestId][bid.bidder];
  // if prevSrc is same as current src, there is a problem
  if (prevSrc === src) {
    logError('bidder with multiple bids from the same source', bid.bidder, src);
  } else if (prevSrc) {
    // if there's a previous source, set to "both"
    adUnitBidderResponseSrc[bid.requestId][bid.bidder] = BOTH;
  } else {
    // set to current src
    adUnitBidderResponseSrc[bid.requestId][bid.bidder] = src;
  }
});

export function getSourceBidderMap(adUnits = []) {
  var sourceBidders = {[SERVER]: {}, [CLIENT]: {}};

  // function to add bidders to sourceBidders data structure
  var addSourceBidder = function(src, bidder) {
    if (src === CLIENT || src === BOTH) {
      sourceBidders[CLIENT][bidder] = true;
    }
    if (src === SERVER || src === BOTH) {
      sourceBidders[SERVER][bidder] = true;
    }
  };

  adUnits.forEach((adUnit) => {
    // if any adUnit bidders specify a bidSource, include them
    (adUnit.bids || []).forEach((bid) => {
      // calculate the source once and store on bid object
      bid.calcSource = bid.calcSource || getSource(bid.bidSource);
      // if no bidSource at bid level, default to bidSource from bidder
      bid.finalSource = bid.calcSource || bidSource[bid.bidder] || CLIENT; // default to client
      addSourceBidder(bid.finalSource, bid.bidder);
    });
  });

  // make sure all bidders in bidSource are in sourceBidders
  Object.keys(bidSource).forEach((bidder) => {
    addSourceBidder(bidSource[bidder], bidder);
  });

  // return map of source => array of bidders
  return {
    [SERVER]: Object.keys(sourceBidders[SERVER]),
    [CLIENT]: Object.keys(sourceBidders[CLIENT])
  };
}

/**
 * @function calculateBidSources determines the source for each s2s bidder based on bidderControl weightings.  these can be overridden at the adUnit level
 * @param s2sConfig server-to-server configuration
 */
function calculateBidSources(s2sConfig = {}) {
  // bail if testing is not turned on
  if (!s2sConfig.testing) {
    return;
  }
  bidSource = {}; // reset bid sources
  // calculate bid source (server/client/both) for each s2s bidder
  var bidderControl = s2sConfig.bidderControl || {};
  (s2sConfig.bidders || []).forEach((bidder) => {
    bidSource[bidder] = getSource(bidderControl[bidder] && bidderControl[bidder].bidSource) || SERVER; // default to server
  });
}

/**
 * @function getSource() gets a random source based on the given sourceWeights (export just for testing)
 * @param sourceWeights mapping of relative weights of potential sources. for example {server: 1, client: 2, both: 1} should do a server request 25% of the time, client request 50% of the time, and both 25% of the time.
 * @param bidSources list of possible bid sources: "server", "client", "both".  In theory could get the sources from the sourceWeights keys, but this is publisher config defined, so bidSources let's us constrain that.
 * @param testRand a random number for testing
 * @return the chosen source ("server", "client", or "both"), or undefined if none chosen
 */
export function getSource(sourceWeights = {}, bidSources = [SERVER, CLIENT, BOTH]) {
  var srcIncWeight = {}; // store incremental weights of each source
  var totWeight = 0;
  bidSources.forEach((source) => {
    totWeight += (sourceWeights[source] || 0);
    srcIncWeight[source] = totWeight;
  });
  if (!totWeight) return; // bail if no source weights
  // choose a source randomly based on weights (randNumber for testing)
  var rndWeight = ((randNumber || randNumber === 0) ? randNumber : Math.random()) * totWeight;
  for (var i = 0; i < bidSources.length; i++) {
    let source = bidSources[i];
    // choose the first source with an incremental weight > random weight
    if (rndWeight < srcIncWeight[source]) return source;
  }
}

/*
 * overrides random number used in getSource() for testing
 * @param number the "random" number to use in the range 0 <= number < 1, or undefined to reset
 */
export function setRandom(number) {
  // verify the number is in range 0 <= number < 1, or undefined
  if (typeof number === 'undefined' || (number >= 0 && number < 1)) {
    // set the random number
    randNumber = number;
  } else {
    throw 'random number in setRandom(<number>) out of range (0 <= number < 1): ' + number;
  }
}
