import { config } from '../config.js';
import { deepAccess, deepClone, deepSetValue, mergeDeep } from '../utils.js';
import type { ORTBRequest } from '../types/ortb/request.d.ts';
import type { DeepPartial } from '../types/objects.d.ts';

/**
 * FPD paths whose value is taken as a whole from bidder-specific FPD, instead of deep-merged with global FPD,
 * when `firstPartyData.replaceGlobalSchain` is set.
 *
 * `mergeDeep` concatenates arrays, so by default a bidder-specific schain's nodes are appended to the global
 * schain's nodes. Publishers that set up a separate chain for each bidder can opt in to replacing it instead.
 */
export const BIDDER_REPLACED_PATHS = [
  'source.ext.schain',
];

/**
 * Merge global and bidder-specific FPD, as seen by that bidder.
 * Everything is deep-merged as with `mergeDeep`, except that with `replaceSchain` (by default,
 * the `firstPartyData.replaceGlobalSchain` setting) values in `BIDDER_REPLACED_PATHS` that are defined in `bidder`
 * replace the global value.
 */
export function mergeBidderOrtb2<T extends DeepPartial<ORTBRequest>>(
  global: T,
  bidder: DeepPartial<ORTBRequest> | undefined,
  { replaceSchain = config.getConfig('firstPartyData.replaceGlobalSchain') === true }: { replaceSchain?: boolean } = {}
): T {
  const merged = mergeDeep({}, global, bidder);
  if (replaceSchain) {
    BIDDER_REPLACED_PATHS.forEach(path => {
      const value = deepAccess(bidder, path);
      if (value != null) {
        deepSetValue(merged, path, deepClone(value));
      }
    });
  }
  return merged;
}
