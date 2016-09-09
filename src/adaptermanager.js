/** @module adaptermanger */

import { flatten, getBidderCodes } from './utils';

var utils = require('./utils.js');
var CONSTANTS = require('./constants.json');
var events = require('./events');
import { BaseAdapter } from './adapters/baseAdapter';

var _bidderRegistry = {};
exports.bidderRegistry = _bidderRegistry;

var _analyticsRegistry = {};

function getBids({ bidderCode, requestId, bidderRequestId, adUnits }) {
  return adUnits.map(adUnit => {
    return adUnit.bids.filter(bid => bid.bidder === bidderCode)
      .map(bid => Object.assign(bid, {
        placementCode: adUnit.code,
        mediaType: adUnit.mediaType,
        sizes: adUnit.sizes,
        bidId: utils.getUniqueIdentifierStr(),
        bidderRequestId,
        requestId
      }));
  }).reduce(flatten, []);
}

exports.callBids = ({ adUnits, cbTimeout }) => {
  const requestId = utils.generateUUID();

  const auctionInit = {
    timestamp: Date.now(),
    requestId,
  };
  events.emit(CONSTANTS.EVENTS.AUCTION_INIT, auctionInit);

  getBidderCodes(adUnits).forEach(bidderCode => {
    const adapter = _bidderRegistry[bidderCode];
    if (adapter) {
      const bidderRequestId = utils.getUniqueIdentifierStr();
      const bidderRequest = {
        bidderCode,
        requestId,
        bidderRequestId,
        bids: getBids({ bidderCode, requestId, bidderRequestId, adUnits }),
        start: new Date().getTime(),
        timeout: cbTimeout
      };
      utils.logMessage(`CALLING BIDDER ======= ${bidderCode}`);
      $$PREBID_GLOBAL$$._bidsRequested.push(bidderRequest);
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

exports.registerAnalyticsAdapter = function ({ adapter, code }) {
  if (adapter && code) {

    if (typeof adapter.enableAnalytics === CONSTANTS.objectType_function) {
      adapter.code = code;
      _analyticsRegistry[code] = adapter;
    } else {
      utils.logError(`Prebid Error: Analytics adaptor error for analytics "${code}"
        analytics adapter must implement an enableAnalytics() function`);
    }
  } else {
    utils.logError('Prebid Error: analyticsAdapter or analyticsCode not specified');
  }
};

exports.enableAnalytics = function (config) {
  if (!utils.isArray(config)) {
    config = [config];
  }

  utils._each(config, adapterConfig => {
    var adapter = _analyticsRegistry[adapterConfig.provider];
    if (adapter) {
      adapter.enableAnalytics(adapterConfig);
    } else {
      utils.logError(`Prebid Error: no analytics adapter found in registry for
        ${adapterConfig.provider}.`);
    }
  });
};

/** INSERT ADAPTERS - DO NOT EDIT OR REMOVE */

/** END INSERT ADAPTERS */

/** INSERT ANALYTICS - DO NOT EDIT OR REMOVE */

/** END INSERT ANALYTICS */
