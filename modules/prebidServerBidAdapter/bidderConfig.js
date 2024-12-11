import {mergeDeep, deepEqual} from '../../src/utils.js';

/**
 * Perform a partial pre-merge of bidder config for PBS.
 *
 * Prebid.js and Prebid Server use different strategies for merging global and bidder-specific config; JS attemps to
 * merge arrays (concatenating them, with some deduping, cfr. mergeDeep), while PBS only merges objects -
 * a bidder-specific array will replace a global array.
 *
 * This returns bidder config (from `bidder`) where arrays are replaced with what you get from merging them with `global`,
 * so that the result of merging in PBS is the same as in JS.
 */
export function getPBSBidderConfig({global, bidder}) {
  return Object.fromEntries(
    Object.entries(bidder).map(([bidderCode, bidderConfig]) => {
      return [bidderCode, replaceArrays(bidderConfig, mergeDeep({}, global, bidderConfig))]
    })
  )
}

function replaceArrays(config, mergedConfig) {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => {
      const mergedValue = mergedConfig[key];
      if (Array.isArray(value)) {
        if (!deepEqual(value, mergedValue) && Array.isArray(mergedValue)) {
          value = mergedValue;
        }
      } else if (value != null && typeof value === 'object') {
        value = replaceArrays(value, mergedValue);
      }
      return [key, value];
    })
  )
}

export function premergeFpd(ortb2Fragments) {
  if (ortb2Fragments == null || ortb2Fragments.bidder == null) {
    return ortb2Fragments;
  } else {
    return {
      ...ortb2Fragments,
      bidder: getPBSBidderConfig(ortb2Fragments)
    }
  }
}
