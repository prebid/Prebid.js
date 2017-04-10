/** @module adaptermanger */

import { flatten, getBidderCodes, shuffle } from './utils';
import { mapSizes } from './sizeMapping';

var utils = require('./utils.js');
var CONSTANTS = require('./constants.json');
var events = require('./events');
import { BaseAdapter } from './adapters/baseAdapter';

var _bidderRegistry = {};
let _s2sEnabled = true;
exports.bidderRegistry = _bidderRegistry;

var _analyticsRegistry = {};
let _bidderSequence = null;

function getBids({bidderCode, requestId, bidderRequestId, adUnits}) {
  return adUnits.map(adUnit => {
    return adUnit.bids.filter(bid => bid.bidder === bidderCode)
      .map(bid => {
        let sizes = adUnit.sizes;
        if (adUnit.sizeMapping) {
          let sizeMapping = mapSizes(adUnit);
          if (sizeMapping === '') {
            return '';
          }
          sizes = sizeMapping;
        }
        return Object.assign({}, bid, {
          placementCode: adUnit.code,
          mediaType: adUnit.mediaType,
          transactionId : adUnit.transactionId,
          sizes: sizes,
          bidId: utils.getUniqueIdentifierStr(),
          bidderRequestId,
          requestId
        });
      }
      );
  }).reduce(flatten, []).filter(val => val !== '');
}

exports.callBids = ({adUnits, cbTimeout}) => {
  const requestId = utils.generateUUID();
  const auctionStart = Date.now();

  const auctionInit = {
    timestamp: auctionStart,
    requestId,
  };
  events.emit(CONSTANTS.EVENTS.AUCTION_INIT, auctionInit);

  let bidderCodes = getBidderCodes(adUnits);
  if (_bidderSequence === CONSTANTS.ORDER.RANDOM) {
    bidderCodes = shuffle(bidderCodes);
  }

  if(_s2sEnabled) {
    //these are called on the s2s adapter
    let adaptersServerSide = ['appnexus'];
    //don't call these client side
    bidderCodes = bidderCodes.filter((elm) => {
      return !adaptersServerSide.includes(elm);
    });
    let adUnitsCopy = utils.cloneJson(adUnits);
    adUnitsCopy = adUnitsCopy.filter((adUnit) => {
      return adUnit.bids.filter((bid) => {
        return adaptersServerSide.includes(bid.bidder);
      });
    });
    //filter out client side bids
    adUnitsCopy.forEach((adUnit) => {
      adUnit.sizes = transformHeightWidth(adUnit);
      adUnit.bids = adUnit.bids.filter((bid) => {
        return adaptersServerSide.includes(bid.bidder);
      });
    });

    let requestJson = {
      account_id : '1',
      tid : utils.generateUUID(),
      timeout_ms : '1000',
      prebid_version : '$prebid.version$',
      user_ids :  [
       {"bidder": "indexExchange", "id": "12345"},
       {"bidder": "appnexus", "id": "12345"}
      ],
      ad_units : adUnitsCopy
    };
    let s2sAdapter = _bidderRegistry['s2s'];
    s2sAdapter.callBids(requestJson);
  }

  bidderCodes.forEach(bidderCode => {
    const adapter = _bidderRegistry[bidderCode];
    if (adapter) {
      const bidderRequestId = utils.getUniqueIdentifierStr();
      const bidderRequest = {
        bidderCode,
        requestId,
        bidderRequestId,
        bids: getBids({bidderCode, requestId, bidderRequestId, adUnits}),
        start: new Date().getTime(),
        auctionStart: auctionStart,
        timeout: cbTimeout
      };
      if (bidderRequest.bids && bidderRequest.bids.length !== 0) {
        utils.logMessage(`CALLING BIDDER ======= ${bidderCode}`);
        $$PREBID_GLOBAL$$._bidsRequested.push(bidderRequest);
        events.emit(CONSTANTS.EVENTS.BID_REQUESTED, bidderRequest);
        adapter.callBids(bidderRequest);
      }
    } else {
      utils.logError(`Adapter trying to be called which does not exist: ${bidderCode} adaptermanager.callBids`);
    }
  });
};


/*
"sizes": [{
      "w": 300,
      "h": 250
    }
 */

function transformHeightWidth(adUnit) {
  let sizesObj = [];
  let sizes = utils.parseSizesInput(adUnit.sizes);
  sizes.forEach(size => {
    let heightWidth = size.split('x');
    let sizeObj = {
      'w' : parseInt(heightWidth[0]),
      'h' : parseInt(heightWidth[1])
    };
    sizesObj.push(sizeObj);
  });
  return sizesObj;
}

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

exports.registerAnalyticsAdapter = function ({adapter, code}) {
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

exports.setBidderSequence = function (order) {
  _bidderSequence = order;
};

/** INSERT ADAPTERS - DO NOT EDIT OR REMOVE */

/** END INSERT ADAPTERS */

/** INSERT ANALYTICS - DO NOT EDIT OR REMOVE */

/** END INSERT ANALYTICS */
