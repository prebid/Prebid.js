/**
 * This module handles the relocation of schain object from source.schain to source.ext.schain
 */
import {deepAccess, deepSetValue} from '../../../src/utils.js';

/**
 * Moves schain from source.schain to source.ext.schain
 * @param {Object} ortbRequest - The OpenRTB request object
 * @param {Object} bidderRequest - The bidder request object (not used)
 * @param {Object} context - The context object (not used)
 */
export function moveSchainToExt(ortbRequest, bidderRequest, context) {
  // Check if source.schain exists in the ortbRequest
  const schain = deepAccess(ortbRequest, 'source.schain');
  if (schain) {
    // Move schain to ext.schain (deepSetValue will create parent objects if needed)
    deepSetValue(ortbRequest, 'source.ext.schain', schain);
    // Remove original schain
    delete ortbRequest.source.schain;
  }
}
