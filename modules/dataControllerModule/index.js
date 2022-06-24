/**
 * This module validates the configuration and filters data accordingly
 * @module modules/dataController
 */
import {config} from '../../src/config.js';
import {getHook, module} from '../../src/hook.js';
import {deepAccess, logInfo} from '../../src/utils.js';
import {processBidderRequests} from '../../src/adapters/bidderFactory.js';

const LOG_PRE_FIX = 'Data_Controller : ';
const ALL = '*';
const MODULE_NAME = 'dataController';
let dataControllerConfig;

const _logInfo = createLogInfo(LOG_PRE_FIX);

function createLogInfo(prefix) {
  return function (...strings) {
    logInfo(prefix + ' ', ...strings);
  }
}

function hasValidConfiguration() {
  dataControllerConfig = config.getConfig(MODULE_NAME);

  if (!dataControllerConfig) {
    _logInfo(`Data Controller is not configred`);
    processBidderRequests.getHooks({hook: filterBidData}).remove();
    return false;
  }

  if (dataControllerConfig.filterEIDwhenSDA && dataControllerConfig.filterSDAwhenEID) {
    _logInfo(`Data Controller can be configured with either filterEIDwhenSDA or filterSDAwhenEID`);
    processBidderRequests.getHooks({hook: filterBidData}).remove();
    return false;
  }
  return true;
}

/**
 * BidderRequests hook to intiate module and reset data object
 */
export function filterBidData(fn, specDetails, bids, bidderRequest, ...args) {
  if (hasValidConfiguration()) {
    if (dataControllerConfig.filterEIDwhenSDA) {
      filterEIDs(bids, bidderRequest.bidderCode);
    }

    if (dataControllerConfig.filterSDAwhenEID) {
      filterSDA(bids, bidderRequest.bidderCode);
    }
  }
  fn.call(this, specDetails, bids, bidderRequest, ...args);
}

function filterEIDs(bids, bidderCode) {
  let allBidderConfigs = config.getBidderConfig();
  let bidderConfig = allBidderConfigs[bidderCode];
  let resetEID = containsConfiguredSDA(bidderConfig);
  if (resetEID) {
    bids.forEach(bid => {
      bid.userIdAsEids = [];
    })
  }
}

function containsConfiguredEIDS(eidSources) {
  if (dataControllerConfig.filterSDAwhenEID.includes(ALL)) {
    return true;
  }
  let containsSource = false;
  dataControllerConfig.filterSDAwhenEID.forEach(source => {
    if (eidSources.has(source)) {
      containsSource = true;
    }
  });
  return containsSource;
}

function containsConfiguredSDA(bidderConfig) {
  if (dataControllerConfig.filterEIDwhenSDA.includes(ALL)) {
    return true;
  }
  let segementSet = getSegmentConfig(bidderConfig);

  let containsSegment = false;
  dataControllerConfig.filterEIDwhenSDA.forEach(segment => {
    if (segementSet.has(segment)) {
      containsSegment = true;
    }
  });
  return containsSegment;
}

function getSegmentConfig(bidderConfig) {
  let segementSet = new Set();
  let userData = deepAccess(bidderConfig, 'ortb2.user.data') || [];
  if (userData) {
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
        segementSet.add(segmentPrefix + segments[j].id);
      }
    }
  }
  return segementSet;
}

function getEIDsSource(requestObject) {
  let source = new Set();

  requestObject.forEach(eids => {
    if ('userIdAsEids' in eids) {
      eids.userIdAsEids.forEach((value) => {
        if ('source' in value) {
          source.add(value['source']);
        }
      });
    }
  });
  return source;
}

function filterSDA(bids, bidderCode) {
  let eidSources = getEIDsSource(bids);

  let resetSDA = containsConfiguredEIDS(eidSources);
  const allBidderConfigs = config.getBidderConfig();
  if (resetSDA) {
    let bidderConfig = allBidderConfigs[bidderCode];
    bidderConfig.ortb2.user.data = [];
    config.setBidderConfig(allBidderConfigs, false);
  }
}

export function initHook() {
  getHook('processBidderRequests').before(filterBidData);
}

initHook();
module(MODULE_NAME, initHook);
