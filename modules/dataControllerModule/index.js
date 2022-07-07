/**
 * This module validates the configuration and filters data accordingly
 * @module modules/dataController
 */
import {config} from '../../src/config.js';
import {getHook, module} from '../../src/hook.js';
import {deepAccess, prefixLog} from '../../src/utils.js';
import {startAuction} from '../../src/prebid.js';

const LOG_PRE_FIX = 'Data_Controller : ';
const ALL = '*';
const MODULE_NAME = 'dataController';
let _dataControllerConfig;

const _logger = prefixLog(LOG_PRE_FIX);

/**
 * BidderRequests hook to intiate module and reset data object
 */
export function filterBidData(fn, req) {
  if (_dataControllerConfig.filterEIDwhenSDA) {
    filterEIDs(req.adUnits, req.ortb2Fragments);
  }

  if (_dataControllerConfig.filterSDAwhenEID) {
    filterSDA(req.adUnits, req.ortb2Fragments);
  }
  fn.call(this, req);
  return req;
}

function containsConfiguredEIDS(eidSourcesMap, bidderCode) {
  if (_dataControllerConfig.filterSDAwhenEID.includes(ALL)) {
    return true;
  }
  let bidderEIDs = eidSourcesMap.get(bidderCode);
  if (bidderEIDs == undefined) {
    return false;
  }
  let containsEIDs = false;
  _dataControllerConfig.filterSDAwhenEID.forEach(source => {
    if (bidderEIDs.has(source)) {
      containsEIDs = true;
    }
  });
  return containsEIDs;
}

export function containsConfiguredSDA(segementMap, bidderCode) {
  if (_dataControllerConfig.filterEIDwhenSDA.includes(ALL)) {
    return true;
  }

  let bidderSegement = segementMap.get(bidderCode);
  if (bidderSegement == undefined) {
    return false;
  }

  let containsSDA = false;
  _dataControllerConfig.filterEIDwhenSDA.forEach(segment => {
    if (bidderSegement.has(segment)) {
      containsSDA = true;
    }
  });
  return containsSDA;
}

export function getSegmentConfig(ortb2Fragments) {
  let bidderSDAMap = new Map();

  for (const [key, value] of Object.entries(ortb2Fragments.bidder)) {
    let userData = deepAccess(value, 'user.data') || [];

    if (userData) {
      let segmentSet = new Set();
      for (let i = 0; i < userData.length; i++) {
        let segments = userData[i].segment;
        let segmentPrefix = '';
        if (userData[i].name) {
          segmentPrefix = userData[i].name + ':';
        }

        if (userData[i].ext && userData[i].ext.segtax) {
          segmentPrefix += userData[i].ext.segtax + ':';
        }
        for (let j = 0; j < segments.length; j++) {
          segmentSet.add(segmentPrefix + segments[j].id);
        }
      }
      bidderSDAMap.set(key, segmentSet);
    }
  }
  return bidderSDAMap;
}

function getEIDsSource(adUnits) {
  let bidderEIDSMap = new Map();
  adUnits.forEach(adUnit => {
    adUnit.bids.forEach(bid => {
      let userEIDs = deepAccess(bid, 'userIdAsEids') || [];

      if (userEIDs) {
        let sourceSet = new Set();
        for (let i = 0; i < userEIDs.length; i++) {
          let source = userEIDs[i].source;
          sourceSet.add(source);
        }
        bidderEIDSMap.set(bid.bidder, sourceSet);
      }
    });
  });

  return bidderEIDSMap;
}

function filterSDA(adUnits, ortb2Fragments) {
  let bidderEIDSMap = getEIDsSource(adUnits);
  for (const [key, value] of Object.entries(ortb2Fragments.bidder)) {
    let resetSDA = containsConfiguredEIDS(bidderEIDSMap, key);
    if (resetSDA) {
      value.user.data = []
    }
  }
}

function filterEIDs(adUnits, ortb2Fragments) {
  let segementMap = getSegmentConfig(ortb2Fragments);

  adUnits.forEach(adUnit => {
    adUnit.bids.forEach(bid => {
      let resetEID = containsConfiguredSDA(segementMap, bid.bidder);
      if (resetEID) {
        bid.userIdAsEids = [];
      }
    });
  });

  return adUnits;
}

export function init() {
  const confListener = config.getConfig(MODULE_NAME, dataControllerConfig => {
    if (!dataControllerConfig || !dataControllerConfig.dataController) {
      _logger.logInfo(`Data Controller is not configured`);
      startAuction.getHooks({hook: filterBidData}).remove();
      return;
    }

    if (dataControllerConfig.dataController.filterEIDwhenSDA && dataControllerConfig.dataController.filterSDAwhenEID) {
      _logger.logInfo(`Data Controller can be configured with either filterEIDwhenSDA or filterSDAwhenEID`);
      startAuction.getHooks({hook: filterBidData}).remove();
      return;
    }
    confListener(); // unsubscribe config listener
    _dataControllerConfig = dataControllerConfig.dataController;

    getHook('startAuction').before(filterBidData);
  });
}

init();
module(MODULE_NAME, init);
