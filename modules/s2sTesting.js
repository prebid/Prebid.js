import { config } from '../src/config.js';
import { setS2STestingModule } from '../src/adapterManager.js';

let s2sTesting = {};

const SERVER = 'server';
const CLIENT = 'client';

s2sTesting.SERVER = SERVER;
s2sTesting.CLIENT = CLIENT;

var testing = false; // whether testing is turned on
var bidSource = {}; // store bidder sources determined from s2sConfing bidderControl
s2sTesting.globalRand = Math.random(); // if 10% of bidderA and 10% of bidderB should be server-side, make it the same 10%

// load s2sConfig
config.getConfig('s2sConfig', config => {
  testing = config.s2sConfig && config.s2sConfig.testing;
  s2sTesting.calculateBidSources(config.s2sConfig);
});

s2sTesting.getSourceBidderMap = function(adUnits = []) {
  var sourceBidders = {[SERVER]: {}, [CLIENT]: {}};

  // bail if testing is not turned on
  if (!testing) {
    return {[SERVER]: [], [CLIENT]: []};
  }

  adUnits.forEach((adUnit) => {
    // if any adUnit bidders specify a bidSource, include them
    (adUnit.bids || []).forEach((bid) => {
      // calculate the source once and store on bid object
      bid.calcSource = bid.calcSource || s2sTesting.getSource(bid.bidSource);
      // if no bidSource at bid level, default to bidSource from bidder
      bid.finalSource = bid.calcSource || bidSource[bid.bidder] || CLIENT; // default to client
      // add bidder to sourceBidders data structure
      sourceBidders[bid.finalSource][bid.bidder] = true;
    });
  });

  // make sure all bidders in bidSource are in sourceBidders
  Object.keys(bidSource).forEach((bidder) => {
    sourceBidders[bidSource[bidder]][bidder] = true;
  });

  // return map of source => array of bidders
  return {
    [SERVER]: Object.keys(sourceBidders[SERVER]),
    [CLIENT]: Object.keys(sourceBidders[CLIENT])
  };
};

/**
 * @function calculateBidSources determines the source for each s2s bidder based on bidderControl weightings.  these can be overridden at the adUnit level
 * @param s2sConfig server-to-server configuration
 */
s2sTesting.calculateBidSources = function(s2sConfig = {}) {
  // bail if testing is not turned on
  if (!testing) {
    return;
  }
  bidSource = {}; // reset bid sources
  // calculate bid source (server/client) for each s2s bidder
  var bidderControl = s2sConfig.bidderControl || {};
  (s2sConfig.bidders || []).forEach((bidder) => {
    bidSource[bidder] = s2sTesting.getSource(bidderControl[bidder] && bidderControl[bidder].bidSource) || SERVER; // default to server
  });
};

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
};

// inject the s2sTesting module into the adapterManager rather than importing it
// importing it causes the packager to include it even when it's not explicitly included in the build
setS2STestingModule(s2sTesting);

export default s2sTesting;
