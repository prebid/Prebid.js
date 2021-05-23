import { submodule } from '../src/hook.js';
import { getGlobal } from '../src/prebidGlobal.js'

/** @type {string} */
const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'ias';

/**
 * Module init
 * @param {Object} provider
 * @param {Object} userConsent
 * @return {boolean}
 */
export function init(config, userConsent) {
  return true;
}

/**
 * isBidValid
 * @param {Object} bid
 * @return {boolean}
 */
export function isBidValid(bid) {
  const { bidder } = bid;
  const { pubId, adUnitPath } = bid.params;
  return !!(pubId && adUnitPath && bidder && bidder == 'ias');
}

function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits;
  adUnits.forEach(function (unit) {
    unit.bids.forEach(function (bid, index, object) {
      if (!isBidValid(bid)) {
        object.splice(index, 1);
      }
    });
  });
}

/** @type {RtdSubmodule} */
export const iasSubModule = {
  name: SUBMODULE_NAME,
  init: init,
  getBidRequestData: getBidRequestData
};

function beforeInit() {
  submodule(MODULE_NAME, iasSubModule);
}

beforeInit();
