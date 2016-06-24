/** @module adaptermanger */
var utils = require('./utils.js');

import { flatten, uniques } from './utils';

var bidfactory = require('./bidfactory.js');
var CONSTANTS = require('./constants.json');
var events = require('./events');
import { BaseAdapter } from './adapters/baseAdapter';

var _bidderRegistry = {};
exports.bidderRegistry = _bidderRegistry;

function makeBids({ bidderCode, bidderRequestId, adUnit }) {
  return adUnit.bids.filter(bidRequest => bidRequest.bidder === bidderCode)
    .map(bidRequest => Object.assign(bidfactory.createBid(1), bidRequest, {
      placementCode: adUnit.code,
      sizes: adUnit.sizes,
      bidderRequestId
    }));
}

function getAuctionBidderCodes(auction) {
  return auction.getAdUnits()
    .map(unit => unit.bids
      .map(bidder => bidder.bidder))
    .reduce(flatten)
    .filter(uniques);
}

function bidderHasAdapter(bidderCode) {
  return _bidderRegistry[bidderCode];
}

exports.callBids = auction => {
  auction.setBidderRequests(getAuctionBidderCodes(auction)
    .filter(bidderHasAdapter)
    .map(bidderCode => {
      const adapter = _bidderRegistry[bidderCode];
      const prebidAuctionId = auction.getId();
      const bidderRequestId = utils.getUniqueIdentifierStr();
      const adUnit = auction.getAdUnits().find(adUnit => adUnit.bids.find(bid => bid.bidder === bidderCode));
      const bidderRequest = {
        bidderCode,
        prebidAuctionId,
        bidderRequestId,
        bids: makeBids({ bidderCode, bidderRequestId, adUnit }),
        start: new Date().getTime()
      };
      utils.logMessage(`CALLING BIDDER ======= ${bidderCode}:`, bidderRequest);
      events.emit(CONSTANTS.EVENTS.BID_REQUESTED, bidderRequest);
      if (bidderRequest.bids && bidderRequest.bids.length) {
        adapter.callBids(bidderRequest, auction);
      }

      return bidderRequest;
    }));
};

exports.registerBidAdapter = function (bidAdaptor, bidderCode) {
  if (bidAdaptor && bidderCode) {

    if (typeof bidAdaptor.callBids === CONSTANTS.objectType_function) {
      _bidderRegistry[bidderCode] = bidAdaptor;

    } else {
      utils.logError('Bidder adaptor error for bidder code: ' + bidderCode + 'bidder must implement a callBids() function');
    }

  } else {
    utils.logError('bidAdaptor or bidderCode not specified');
  }
};

exports.aliasBidAdapter = function (bidderCode, alias) {
  var existingAlias = _bidderRegistry[alias];

  if (typeof existingAlias === CONSTANTS.objectType_undefined) {
    var bidAdaptor = _bidderRegistry[bidderCode];

    if (typeof bidAdaptor === CONSTANTS.objectType_undefined) {
      utils.logError('bidderCode "' + bidderCode + '" is not an existing bidder.', 'adaptermanager.aliasBidAdapter');
    } else {
      try {
        let newAdapter = null;
        if (bidAdaptor instanceof BaseAdapter) {
          //newAdapter = new bidAdaptor.constructor(alias);
          utils.logError(bidderCode + ' bidder does not currently support aliasing.', 'adaptermanager.aliasBidAdapter');
        } else {
          newAdapter = bidAdaptor.createNew();
          newAdapter.setBidderCode(alias);
          this.registerBidAdapter(newAdapter, alias);
        }
      } catch (e) {
        utils.logError(bidderCode + ' bidder does not currently support aliasing.', 'adaptermanager.aliasBidAdapter');
      }
    }
  } else {
    utils.logMessage('alias name "' + alias + '" has been already specified.');
  }
};

/** INSERT ADAPTERS - DO NOT EDIT OR REMOVE */

// here be adapters
/** END INSERT ADAPTERS */
