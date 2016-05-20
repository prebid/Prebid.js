/** @module adaptermanger */

import { flatten, getBidderCodes } from './utils';

var utils = require('./utils.js');
var CONSTANTS = require('./constants.json');
var events = require('./events');
import { BaseAdapter } from './adapters/baseAdapter';

var _bidderRegistry = {};
exports.bidderRegistry = _bidderRegistry;

function getBids({ bidderCode, requestId, bidderRequestId }) {
  return pbjs.adUnits.map(adUnit => {
    return adUnit.bids.filter(bid => bid.bidder === bidderCode)
      .map(bid => Object.assign(bid, {
        placementCode: adUnit.code,
        sizes: adUnit.sizes,
        bidId: utils.getUniqueIdentifierStr(),
        bidderRequestId,
        requestId
      }));
  }).reduce(flatten, []);
}

exports.callBids = () => {
  const requestId = utils.getUniqueIdentifierStr();

  getBidderCodes().forEach(bidderCode => {
    const adapter = _bidderRegistry[bidderCode];
    if (adapter) {
      const bidderRequestId = utils.getUniqueIdentifierStr();
      const bidderRequest = {
        bidderCode,
        requestId,
        bidderRequestId,
        bids: getBids({ bidderCode, requestId, bidderRequestId }),
        start: new Date().getTime()
      };
      utils.logMessage(`CALLING BIDDER ======= ${bidderCode}`);
      pbjs._bidsRequested.push(bidderRequest);
      events.emit(CONSTANTS.EVENTS.BID_REQUESTED, bidderRequest);
      if (bidderRequest.bids && bidderRequest.bids.length) {
        adapter.callBids(bidderRequest);
      }
    } else {
      utils.logError(`Adapter trying to be called which does not exist: ${bidderCode} adaptermanager.callBids`);
    }
  });
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
