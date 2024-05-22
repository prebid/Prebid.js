import {isActivityAllowed} from '../../src/activities/rules.js';
import {ACTIVITY_ENRICH_EIDS, ACTIVITY_ENRICH_UFPD} from '../../src/activities/activities.js';
import {
  appliesWhenActivityDenied,
  ortb2TransmitRules,
  ORTB_EIDS_PATHS,
  ORTB_UFPD_PATHS
} from '../../src/activities/redactor.js';
import {objectGuard, writeProtectRule} from './objectGuard.js';
import {mergeDeep} from '../../src/utils.js';

/**
 * @typedef {import('./objectGuard.js').ObjectGuard} ObjectGuard
 */

function ortb2EnrichRules(isAllowed = isActivityAllowed) {
  return [
    {
      name: ACTIVITY_ENRICH_EIDS,
      paths: ORTB_EIDS_PATHS,
      applies: appliesWhenActivityDenied(ACTIVITY_ENRICH_EIDS, isAllowed)
    },
    {
      name: ACTIVITY_ENRICH_UFPD,
      paths: ORTB_UFPD_PATHS,
      applies: appliesWhenActivityDenied(ACTIVITY_ENRICH_UFPD, isAllowed)
    }
  ].map(writeProtectRule)
}

export function ortb2GuardFactory(isAllowed = isActivityAllowed) {
  return objectGuard(ortb2TransmitRules(isAllowed).concat(ortb2EnrichRules(isAllowed)));
}

/**
 *
 *
 * @typedef {Function} ortb2Guard
 * @param {{}} ortb2 ORTB object to guard
 * @param {{}} params activity params to use for activity checks
 * @returns {ObjectGuard}
 */

/*
 * Get a guard for an ORTB object. Read access is restricted in the same way it'd be redacted (see activites/redactor.js);
 * and writes are checked against the enrich* activites.
 *
 * @type ortb2Guard
 */
export const ortb2Guard = ortb2GuardFactory();

export function ortb2FragmentsGuardFactory(guardOrtb2 = ortb2Guard) {
  return function guardOrtb2Fragments(fragments, params) {
    fragments.global = fragments.global || {};
    fragments.bidder = fragments.bidder || {};
    const bidders = new Set(Object.keys(fragments.bidder));
    const verifiers = [];

    function makeGuard(ortb2) {
      const guard = guardOrtb2(ortb2, params);
      verifiers.push(guard.verify);
      return guard.obj;
    }

    const obj = {
      global: makeGuard(fragments.global),
      bidder: Object.fromEntries(Object.entries(fragments.bidder).map(([bidder, ortb2]) => [bidder, makeGuard(ortb2)]))
    };

    return {
      obj,
      verify() {
        Object.entries(obj.bidder)
          .filter(([bidder]) => !bidders.has(bidder))
          .forEach(([bidder, ortb2]) => {
            const repl = {};
            const guard = guardOrtb2(repl, params);
            mergeDeep(guard.obj, ortb2);
            guard.verify();
            fragments.bidder[bidder] = repl;
          })
        verifiers.forEach(fn => fn());
      }
    }
  }
}

/**
 * Get a guard for an ortb2Fragments object.
 * @type {function(*, *): ObjectGuard}
 */
export const guardOrtb2Fragments = ortb2FragmentsGuardFactory();
