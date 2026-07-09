/**
 * This module sets default values and validates ortb2 first part data
 * @module modules/firstPartyData
 */
import { hasPubcidOptout } from '../../libraries/fpdUtils/pubcidOptout.js';
import { validateFpd } from '../../libraries/fpdUtils/validateFpd.js';
import { submodule } from '../../src/hook.js';
import { getCoreStorageManager } from '../../src/storageManager.js';

// TODO: do FPD modules need their own namespace?
const STORAGE = getCoreStorageManager('FPDValidation');

declare module '../../src/fpd/enrichment' {
  interface FirstPartyDataConfig {
    skipValidations?: boolean;
  }
}

function runValidations(data, optout) {
  return {
    global: validateFpd(data.global, '', '', optout),
    bidder: Object.fromEntries(Object.entries(data.bidder).map(([bidder, conf]) => [bidder, validateFpd(conf, '', '', optout)]))
  };
}

/**
 * Sets default values to ortb2 if exists and adds currency and ortb2 setConfig callbacks on init
 * @param {Object} fpdConf configuration object
 * @param {Object} data ortb2 data
 * @returns {Object} processed data
 */
export function processFpd(fpdConf, data) {
  const optout = hasPubcidOptout(STORAGE);

  return (!fpdConf.skipValidations) ? runValidations(data, optout) : data;
}

/** @type {{name: string, queue: number, processFpd: function}} */
export const validationSubmodule = {
  name: 'validation',
  queue: 1,
  processFpd
};

submodule('firstPartyData', validationSubmodule);
