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
  const bidderEIDs = eidSourcesMap.get(bidderCode);
  if (bidderEIDs === undefined) {
    return false;
  }
  return _dataControllerConfig.filterSDAwhenEID.some((source) => bidderEIDs.has(source));
}

function containsConfiguredSDA(segmentMap, bidderCode) {
  if (_dataControllerConfig.filterEIDwhenSDA.includes(ALL)) {
    return true;
  }
  return hasValue(segmentMap.get(bidderCode)) || hasValue(segmentMap.get(GLOBAL))
}

function hasValue(bidderSegment) {
  return bidderSegment === undefined
    ? false
    : _dataControllerConfig.filterEIDwhenSDA.some((segment) => bidderSegment.has(segment));
}

function getSegmentConfig(ortb2Fragments) {
  const bidderSDAMap = new Map();
  const globalObject = deepAccess(ortb2Fragments, 'global') || {};

  collectSegments(bidderSDAMap, GLOBAL, globalObject);
  if (ortb2Fragments.bidder) {
    for (const [key, value] of Object.entries(ortb2Fragments.bidder)) {
      collectSegments(bidderSDAMap, key, value);
    }
  }
  return bidderSDAMap;
}

function collectSegments(bidderSDAMap, key, data) {
  const segmentSet = constructSegment(deepAccess(data, 'user.data') || []);
  if (segmentSet && segmentSet.size > 0) bidderSDAMap.set(key, segmentSet);
}

function constructSegment(userData) {
  let segmentSet;
  if (userData) {
    segmentSet = new Set();
    for (let i = 0; i < userData.length; i++) {
      const segments = userData[i].segment;
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
  const bidderEIDSMap = new Map();
  adUnits.forEach(adUnit => {
    (adUnit.bids || []).forEach(bid => {
      const userEIDs = deepAccess(bid, 'userIdAsEids') || [];

      if (userEIDs) {
        const sourceSet = new Set();
        for (let i = 0; i < userEIDs.length; i++) {
          const source = userEIDs[i].source;
          sourceSet.add(source);
        }
        bidderEIDSMap.set(bid.bidder, sourceSet);
      }
    });
  });

  return bidderEIDSMap;
}

function filterSDA(adUnits, ortb2Fragments) {
  const bidderEIDSMap = getEIDsSource(adUnits);
  let resetGlobal = false;
  for (const [key, value] of Object.entries(ortb2Fragments.bidder)) {
    const resetSDA = containsConfiguredEIDS(bidderEIDSMap, key);
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
  const segementMap = getSegmentConfig(ortb2Fragments);
  let globalEidUpdate = false;
  adUnits.forEach(adUnit => {
    adUnit.bids.forEach(bid => {
      const resetEID = containsConfiguredSDA(segementMap, bid.bidder);
      if (resetEID) {
        globalEidUpdate = true;
        bid.userIdAsEids = [];
        bid.userId = {};
        if (ortb2Fragments.bidder) {
          const bidderFragment = ortb2Fragments.bidder[bid.bidder];
          const userExt = deepAccess(bidderFragment, 'user.ext.eids') || [];
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
