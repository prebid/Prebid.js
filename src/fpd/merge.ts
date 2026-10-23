import { deepAccess, deepClone, deepSetValue, mergeDeep } from '../utils.js';
import type { ORTBRequest } from '../types/ortb/request.d.ts';
import type { DeepPartial } from '../types/objects.d.ts';

/**
 * FPD paths whose value must be taken as a whole from bidder-specific FPD, instead of deep-merged with global FPD.
 *
 * `mergeDeep` concatenates arrays, which does not make sense for objects like a supply chain: a bidder-specific
 * schain is a different chain, not a set of extra nodes to append to the global one.
 */
export const BIDDER_REPLACED_PATHS = [
  'source.ext.schain',
];

/**
 * Merge global and bidder-specific FPD, as seen by that bidder.
 * Values in `BIDDER_REPLACED_PATHS` that are defined in `bidder` replace the global value; everything else is
 * deep-merged as with `mergeDeep`.
 */
export function mergeBidderOrtb2<T extends DeepPartial<ORTBRequest>>(global: T, bidder: DeepPartial<ORTBRequest> | undefined): T {
  const merged = mergeDeep({}, global, bidder);
  BIDDER_REPLACED_PATHS.forEach(path => {
    const value = deepAccess(bidder, path);
    if (value != null) {
      deepSetValue(merged, path, deepClone(value));
    }
  });
  return merged;
}
