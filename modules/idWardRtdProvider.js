/**
 * This module adds the ID Ward RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will populate real-time data from ID Ward
 * @module modules/idWardRtdProvider
 * @requires module:modules/realTimeData
 */
import { createRtdProvider } from './anonymisedRtdProvider.js';/* eslint prebid/validate-imports: "off" */

export const { getRealTimeData, rtdSubmodule: idWardRtdSubmodule, storage } = createRtdProvider('idWard');
