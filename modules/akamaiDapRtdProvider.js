/**
 * This module adds the Akamai DAP RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch real-time data from DAP
 * @module modules/akamaiDapRtdProvider
 * @requires module:modules/realTimeData
 */

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const MODULE_NAME = 'realTimeData';

import {submodule} from '../src/hook.js';
import { 
  addRealTimeData, 
  getRealTimeData, 
  generateRealTimeData, 
  storage,
  dapUtils,
  symitriDapRtdSubmodule,
  DAP_TOKEN,
  DAP_MEMBERSHIP,
  DAP_ENCRYPTED_MEMBERSHIP,
  DAP_SS_ID,
  DAP_DEFAULT_TOKEN_TTL,
  DAP_MAX_RETRY_TOKENIZE,
  DAP_CLIENT_ENTROPY
} from './symitriDapRtdProvider'/* eslint prebid/validate-imports: "off" */

/**
 * Module init
 * @param {Object} provider
 * @param {Object} userConsent
 * @return {boolean}
 */
function init(provider, userConsent) {
  if (dapUtils.checkConsent(userConsent) === false) {
    return false;
  }
  return true;
}

submodule(MODULE_NAME, symitriDapRtdSubmodule);