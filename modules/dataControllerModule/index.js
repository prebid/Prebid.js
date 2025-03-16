/**
 * This module validates the configuration and filters data accordingly
 * @module modules/dataController
 */
import {config} from '../../src/config.js';
import {getHook, module} from '../../src/hook.js';
import {deepAccess, deepSetValue, prefixLog} from '../../src/utils.js';
import {startAuction} from '../../src/prebid.js';
import {timedAuctionHook} from '../../src/utils/perfMetrics.js';

const LOG_PRE_FIX = 'Data_Controller : ';
const ALL = '*';
const MODULE_NAME = 'dataController';
const GLOBAL = {};
let _dataControllerConfig;

const _logger = prefixLog(LOG_PRE_FIX);

/**
 * BidderRequests hook to intiate module and reset data object
 */
export const filterBidData = timedAuctionHook('dataController', function filterBidData(fn, req) {
  if (_dataControllerConfig.filterEIDwhenSDA) {
    filterEIDs(req.adUnits, req.ortb2Fragments);
  }

  if (_dataControllerConfig.filterSDAwhenEID) {
    filterSDA(req.adUnits, req.ortb2Fragments);
  }
  fn.call(this, req);
  return req;
});

function containsConfiguredEIDS(eidSourcesMap, bidderCode) {
  if (_dataControllerConfig.filterSDAwhenEID.includes(ALL)) {
    return true;
  }
  let bidderEIDs = eidSourcesMap.get(bidderCode);
  if (bidderEIDs == undefined) {
    return false;
  }
  let containsEIDs = false;
  _dataControllerConfig.filterSDAwhenEID.some(source => {
    if (bidderEIDs.has(source)) {
      containsEIDs = true;
    }
  });
  return containsEIDs;
}

function containsConfiguredSDA(segementMap, bidderCode) {
  if (_dataControllerConfig.filterEIDwhenSDA.includes(ALL)) {
    return true;
  }
  return hasValue(segementMap.get(bidderCode)) || hasValue(segementMap.get(GLOBAL))
}

function hasValue(bidderSegement) {
  let containsSDA = false;
  if (bidderSegement == undefined) {
    return false;
  }
  _dataControllerConfig.filterEIDwhenSDA.some(segment => {
    if (bidderSegement.has(segment)) {
      containsSDA = true;
    }
  });
  return containsSDA;
}

function getSegmentConfig(ortb2Fragments) {
  let bidderSDAMap = new Map();
  let globalObject = deepAccess(ortb2Fragments, 'global') || {};

  collectSegments(bidderSDAMap, GLOBAL, globalObject);
  if (ortb2Fragments.bidder) {
    for (const [key, value] of Object.entries(ortb2Fragments.bidder)) {
      collectSegments(bidderSDAMap, key, value);
    }
  }
  return bidderSDAMap;
}

function collectSegments(bidderSDAMap, key, data) {
  let segmentSet = constructSegment(deepAccess(data, 'user.data') || []);
  if (segmentSet && segmentSet.size > 0) bidderSDAMap.set(key, segmentSet);
}

function constructSegment(userData) {
  let segmentSet;
  if (userData) {
    segmentSet = new Set();
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
  }

  return segmentSet;
}

function getEIDsSource(adUnits) {
  let bidderEIDSMap = new Map();
  adUnits.forEach(adUnit => {
    (adUnit.bids || []).forEach(bid => {
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
  let resetGlobal = false;
  for (const [key, value] of Object.entries(ortb2Fragments.bidder)) {
    let resetSDA = containsConfiguredEIDS(bidderEIDSMap, key);
    if (resetSDA) {
      deepSetValue(value, 'user.data', []);
      resetGlobal = true;
    }
  }
  if (resetGlobal) {
    deepSetValue(ortb2Fragments, 'global.user.data', [])
  }
}

function filterEIDs(adUnits, ortb2Fragments) {
  let segementMap = getSegmentConfig(ortb2Fragments);
  let globalEidUpdate = false;
  adUnits.forEach(adUnit => {
    adUnit.bids.forEach(bid => {
      let resetEID = containsConfiguredSDA(segementMap, bid.bidder);
      if (resetEID) {
        globalEidUpdate = true;
        bid.userIdAsEids = [];
        bid.userId = {};
        if (ortb2Fragments.bidder) {
          let bidderFragment = ortb2Fragments.bidder[bid.bidder];
          let userExt = deepAccess(bidderFragment, 'user.ext.eids') || [];
          if (userExt) {
            deepSetValue(bidderFragment, 'user.ext.eids', [])
          }
        }
      }
    });
  });

  if (globalEidUpdate) {
    deepSetValue(ortb2Fragments, 'global.user.ext.eids', [])
  }
  return adUnits;
}

export function init() {
  const confListener = config.getConfig(MODULE_NAME, dataControllerConfig => {
    const dataController = dataControllerConfig && dataControllerConfig.dataController;
    if (!dataController) {
      _logger.logInfo(`Data Controller is not configured`);
      startAuction.getHooks({hook: filterBidData}).remove();
      return;
    }

    if (dataController.filterEIDwhenSDA && dataController.filterSDAwhenEID) {
      _logger.logInfo(`Data Controller can be configured with either filterEIDwhenSDA or filterSDAwhenEID`);
      startAuction.getHooks({hook: filterBidData}).remove();
      return;
    }
    confListener(); // unsubscribe config listener
    _dataControllerConfig = dataController;

    getHook('startAuction').before(filterBidData);
  });
}

init();
module(MODULE_NAME, init);
