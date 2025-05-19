/**
 * This module handles the relocation of schain object from source.schain to source.ext.schain
 */
import {deepAccess, deepSetValue} from '../../../src/utils.js';
import {REQUEST} from '../../../src/pbjsORTB.js';

/**
 * Processor to move schain from source.schain to source.ext.schain
 * This ensures that the schain object is validated first and then moved to the ext object
 */
export const schainProcessor = {
  [REQUEST]: {
    moveSchainToExt: {
      // Run this after validation but before the request is sent
      priority: -50,
      fn(ortbRequest, bidderRequest, context) {
        // Check if source.schain exists in the ortbRequest
        const schain = deepAccess(ortbRequest, 'source.schain');
        if (schain) {
          // Create ext object if it doesn't exist
          if (!deepAccess(ortbRequest, 'source.ext')) {
            deepSetValue(ortbRequest, 'source.ext', {});
          }
          // Move schain to ext.schain
          deepSetValue(ortbRequest, 'source.ext.schain', schain);
          // Remove original schain
          delete ortbRequest.source.schain;
        }
      }
    }
  }
};
