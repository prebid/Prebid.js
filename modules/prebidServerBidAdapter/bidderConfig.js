import {mergeDeep, deepEqual, deepAccess, deepSetValue, deepClone} from '../../src/utils.js';
import {ORTB_EIDS_PATHS} from '../../src/activities/redactor.js';

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

/**
 * Extract all EIDs from FPD.
 *
 * Returns {eids, conflicts}, where:
 *
 *  - `eids` contains an object of the form `{eid, bidders}` for each unique EID object found anywhere in FPD;
 *      `bidders` is a list of all the bidders that refer to that specific EID object, or false if that EID object is defined globally.
 *   - `conflicts` is a set containing all EID sources that appear in multiple, otherwise different, EID objects.
 */
export function extractEids({global, bidder}) {
  const entries = [];
  const bySource = {};
  const conflicts = new Set()

  function getEntry(eid) {
    let entry = entries.find((candidate) => deepEqual(candidate.eid, eid));
    if (entry == null) {
      entry = {eid, bidders: new Set()}
      entries.push(entry);
    }
    if (bySource[eid.source] == null) {
      bySource[eid.source] = entry.eid;
    } else if (entry.eid === eid) {
      // if this is the first time we see this eid, but not the first time we see its source, we have a conflict
      conflicts.add(eid.source);
    }
    return entry;
  }

  ORTB_EIDS_PATHS.forEach(path => {
    (deepAccess(global, path) || []).forEach(eid => {
      getEntry(eid).bidders = false;
    });
  })
  Object.entries(bidder).forEach(([bidderCode, bidderConfig]) => {
    ORTB_EIDS_PATHS.forEach(path => {
      (deepAccess(bidderConfig, path) || []).forEach(eid => {
        const entry = getEntry(eid);
        if (entry.bidders !== false) {
          entry.bidders.add(bidderCode);
        }
      })
    })
  })
  return {eids: entries.map(({eid, bidders}) => ({eid, bidders: bidders && Array.from(bidders)})), conflicts};
}

/**
 * Consolidate extracted EIDs to take advantage of PBS's eidpermissions feature:
 * https://docs.prebid.org/prebid-server/endpoints/openrtb2/pbs-endpoint-auction.html#eid-permissions
 *
 * If different bidders have different EID configurations, in most cases we can avoid repeating it in each bidder's
 * specific config. As long as there are no conflicts (different EID objects that refer to the same source constitute a conflict),
 * the EID can be set as global, and eidpermissions can restrict its access only to specific bidders.
 *
 * Returns {global, bidder, permissions}, where:
 *  - `global` is a list of global EID objects (some of which may be restricted through `permissions`
 *  - `bidder` is a map from bidder code to EID objects that are specific to that bidder, and cannot be restricted through `permissions`
 *  - `permissions` is a list of EID permissions as expected by PBS.
 */
export function consolidateEids({eids, conflicts = new Set()}) {
  const globalEntries = [];
  const bidderEntries = [];
  const byBidder = {};
  eids.forEach(eid => {
    (eid.bidders === false ? globalEntries : bidderEntries).push(eid);
  });
  bidderEntries.forEach(({eid, bidders}) => {
    if (!conflicts.has(eid.source)) {
      globalEntries.push({eid, bidders})
    } else {
      bidders.forEach(bidderCode => {
        (byBidder[bidderCode] = byBidder[bidderCode] || []).push(eid)
      })
    }
  });
  return {
    global: globalEntries.map(({eid}) => eid),
    permissions: globalEntries.filter(({bidders}) => bidders !== false).map(({eid, bidders}) => ({
      source: eid.source,
      bidders
    })),
    bidder: byBidder
  }
}

function replaceEids({global, bidder}, requestedBidders) {
  const consolidated = consolidateEids(extractEids({global, bidder}));
  global = deepClone(global);
  bidder = deepClone(bidder);
  function removeEids(target) {
    delete target?.user?.eids;
    delete target?.user?.ext?.eids;
  }
  removeEids(global);
  Object.values(bidder).forEach(removeEids);
  if (consolidated.global.length) {
    deepSetValue(global, 'user.ext.eids', consolidated.global);
  }
  if (requestedBidders?.length) {
    consolidated.permissions.forEach((permission) => permission.bidders = permission.bidders.filter(bidder => requestedBidders.includes(bidder)));
  }
  if (consolidated.permissions.length) {
    deepSetValue(global, 'ext.prebid.data.eidpermissions', consolidated.permissions);
  }
  Object.entries(consolidated.bidder).forEach(([bidderCode, bidderEids]) => {
    if (bidderEids.length) {
      deepSetValue(bidder[bidderCode], 'user.ext.eids', bidderEids);
    }
  })
  return {global, bidder}
}

export function premergeFpd(ortb2Fragments, requestedBidders) {
  if (ortb2Fragments == null || Object.keys(ortb2Fragments.bidder || {}).length === 0) {
    return ortb2Fragments;
  } else {
    ortb2Fragments = replaceEids(ortb2Fragments, requestedBidders);
    return {
      ...ortb2Fragments,
      bidder: getPBSBidderConfig(ortb2Fragments)
    };
  }
}
