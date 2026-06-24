/**
 * This module adds clean.io provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will wrap bid responses markup in clean.io agent script for protection
 * @module modules/cleanioRtdProvider
 * @requires module:modules/realTimeData
 */

import { createRtdSubmodule } from './humansecurityMalvDefenseRtdProvider.js'; /* eslint prebid/validate-imports: "off" */

const internals = createRtdSubmodule('clean.io');

/**
 * Exporting encapsulated to this module functions
 * for testing purposes
 */
export const __CLEANIO_TEST__ = internals;

internals.beforeInit();
