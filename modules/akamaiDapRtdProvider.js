/**
 * This module adds the Akamai DAP RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch real-time data from DAP
 * @module modules/akamaiDapRtdProvider
 * @requires module:modules/realTimeData
 */

import {
  createRtdProvider
} from './symitriDapRtdProvider.js'/* eslint prebid/validate-imports: "off" */

export const {
  addRealTimeData,
  getRealTimeData,
  generateRealTimeData,
  rtdSubmodule: akamaiDapRtdSubmodule,
  storage,
  dapUtils,
  DAP_TOKEN,
  DAP_MEMBERSHIP,
  DAP_ENCRYPTED_MEMBERSHIP,
  DAP_SS_ID,
  DAP_DEFAULT_TOKEN_TTL,
  DAP_MAX_RETRY_TOKENIZE,
  DAP_CLIENT_ENTROPY
} = createRtdProvider('dap', 'akamaidap', 'Akamai');
