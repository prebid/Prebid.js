import {PARTITIONS, partitionBidders, filterBidsForAdUnit, getS2SBidderSet} from '../src/adapterManager.js';
import {find} from '../src/polyfill.js';
import {getBidderCodes, logWarn} from '../src/utils.js';

const {CLIENT, SERVER} = PARTITIONS;
export const s2sTesting = {
  ...PARTITIONS,
  clientTestBidders: new Set()
};

s2sTesting.bidSource = {}; // store bidder sources determined from s2sConfig bidderControl
s2sTesting.globalRand = Math.random(); // if 10% of bidderA and 10% of bidderB should be server-side, make it the same 10%

s2sTesting.getSourceBidderMap = function(adUnits = [], allS2SBidders = []) {
  var sourceBidders = {[SERVER]: {}, [CLIENT]: {}};

  adUnits.forEach((adUnit) => {
    // if any adUnit bidders specify a bidSource, include them
    (adUnit.bids || []).forEach((bid) => {
      // When a s2sConfig does not have testing=true and did not calc bid sources
      if (allS2SBidders.indexOf(bid.bidder) > -1 && !s2sTesting.bidSource[bid.bidder]) {
        s2sTesting.bidSource[bid.bidder] = SERVER;
      }
      // calculate the source once and store on bid object
      bid.calcSource = bid.calcSource || s2sTesting.getSource(bid.bidSource);
      // if no bidSource at bid level, default to bidSource from bidder
      bid.finalSource = bid.calcSource || s2sTesting.bidSource[bid.bidder] || CLIENT; // default to client
      // add bidder to sourceBidders data structure
      sourceBidders[bid.finalSource][bid.bidder] = true;
    });
  });

  // make sure all bidders in bidSource are in sourceBidders
  Object.keys(s2sTesting.bidSource).forEach((bidder) => {
    sourceBidders[s2sTesting.bidSource[bidder]][bidder] = true;
  });

  // return map of source => array of bidders
  return {
    [SERVER]: Object.keys(sourceBidders[SERVER]),
    [CLIENT]: Object.keys(sourceBidders[CLIENT])
  };
}

/**
 * @function calculateBidSources determines the source for each s2s bidder based on bidderControl weightings.  these can be overridden at the adUnit level
 * @param s2sConfigs server-to-server configuration
 */
s2sTesting.calculateBidSources = function(s2sConfig = {}) {
  // calculate bid source (server/client) for each s2s bidder

  var bidderControl = s2sConfig.bidderControl || {};
  (s2sConfig.bidders || []).forEach((bidder) => {
    s2sTesting.bidSource[bidder] = s2sTesting.getSource(bidderControl[bidder] && bidderControl[bidder].bidSource) || SERVER; // default to server
  });
}

/**
 * @function getSource() gets a random source based on the given sourceWeights (export just for testing)
 * @param sourceWeights mapping of relative weights of potential sources. for example {server: 1, client: 3} should do a server request 25% of the time and a client request 75% of the time.
 * @param bidSources list of possible bid sources: "server", "client".  In theory could get the sources from the sourceWeights keys, but this is publisher config defined, so bidSources let's us constrain that.
 * @return the chosen source ("server" or "client"), or undefined if none chosen
 */
s2sTesting.getSource = function(sourceWeights = {}, bidSources = [SERVER, CLIENT]) {
  var srcIncWeight = {}; // store incremental weights of each source
  var totWeight = 0;
  bidSources.forEach((source) => {
    totWeight += (sourceWeights[source] || 0);
    srcIncWeight[source] = totWeight;
  });
  if (!totWeight) return; // bail if no source weights
  // choose a source randomly based on weights
  var rndWeight = s2sTesting.globalRand * totWeight;
  for (var i = 0; i < bidSources.length; i++) {
    let source = bidSources[i];
    // choose the first source with an incremental weight > random weight
    if (rndWeight < srcIncWeight[source]) return source;
  }
}

function doingS2STesting(s2sConfig) {
  return s2sConfig && s2sConfig.enabled && s2sConfig.testing;
}

function isTestingServerOnly(s2sConfig) {
  return Boolean(doingS2STesting(s2sConfig) && s2sConfig.testServerOnly);
}

const adUnitsContainServerRequests = (adUnits, s2sConfig) => Boolean(
  find(adUnits, adUnit => find(adUnit.bids, bid => (
    bid.bidSource ||
    (s2sConfig.bidderControl && s2sConfig.bidderControl[bid.bidder])
  ) && bid.finalSource === SERVER))
);

partitionBidders.before(function (next, adUnits, s2sConfigs) {
  const serverBidders = getS2SBidderSet(s2sConfigs);
  let serverOnly = false;

  s2sConfigs.forEach((s2sConfig) => {
    if (doingS2STesting(s2sConfig)) {
      s2sTesting.calculateBidSources(s2sConfig);
      const bidderMap = s2sTesting.getSourceBidderMap(adUnits, [...serverBidders]);
      // get all adapters doing client testing
      bidderMap[CLIENT].forEach((bidder) => s2sTesting.clientTestBidders.add(bidder))
    }
    if (isTestingServerOnly(s2sConfig) && adUnitsContainServerRequests(adUnits, s2sConfig)) {
      logWarn('testServerOnly: True.  All client requests will be suppressed.');
      serverOnly = true;
    }
  });

  next.bail(getBidderCodes(adUnits).reduce((memo, bidder) => {
    if (serverBidders.has(bidder)) {
      memo[SERVER].push(bidder);
    }
    if (!serverOnly && (!serverBidders.has(bidder) || s2sTesting.clientTestBidders.has(bidder))) {
      memo[CLIENT].push(bidder);
    }
    return memo;
  }, {[CLIENT]: [], [SERVER]: []}));
});

filterBidsForAdUnit.before(function(next, bids, s2sConfig) {
  if (s2sConfig == null) {
    next.bail(bids.filter((bid) => !s2sTesting.clientTestBidders.size || bid.finalSource !== SERVER));
  } else {
    const serverBidders = getS2SBidderSet(s2sConfig);
    next.bail(bids.filter((bid) => serverBidders.has(bid.bidder) &&
      (!doingS2STesting(s2sConfig) || bid.finalSource !== CLIENT)));
  }
});

export default s2sTesting;
