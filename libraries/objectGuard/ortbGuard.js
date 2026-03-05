import {isActivityAllowed} from '../../src/activities/rules.js';
import {ACTIVITY_ENRICH_EIDS, ACTIVITY_ENRICH_UFPD} from '../../src/activities/activities.js';
import {
  appliesWhenActivityDenied,
  ortb2TransmitRules,
  ORTB_EIDS_PATHS,
  ORTB_UFPD_PATHS
} from '../../src/activities/redactor.js';
import {objectGuard, writeProtectRule} from './objectGuard.js';
import {logError} from '../../src/utils.js';

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

/*
 * Get a guard for an ORTB object. Read access is restricted in the same way it'd be redacted (see activites/redactor.js);
 * and writes are checked against the enrich* activites.
 *
 */
export const ortb2Guard = ortb2GuardFactory();

export function ortb2FragmentsGuardFactory(guardOrtb2 = ortb2Guard) {
  return function guardOrtb2Fragments(fragments, params) {
    fragments.global = fragments.global || {};
    fragments.bidder = fragments.bidder || {};
    const guard = {
      global: guardOrtb2(fragments.global, params),
      bidder: new Proxy(fragments.bidder, {
        get(target, prop, receiver) {
          let bidderData = Reflect.get(target, prop, receiver);
          if (bidderData != null) {
            bidderData = guardOrtb2(bidderData, params)
          }
          return bidderData;
        },
        set(target, prop, newValue, receiver) {
          if (newValue == null || typeof newValue !== 'object') {
            logError(`ortb2Fragments.bidder[bidderCode] must be an object`);
          }
          let bidderData = Reflect.get(target, prop, receiver);
          if (bidderData == null) {
            bidderData = target[prop] = {};
          }
          bidderData = guardOrtb2(bidderData, params);
          Object.entries(newValue).forEach(([prop, value]) => {
            bidderData[prop] = value;
          })
          return true;
        }
      })
    };

    return Object.defineProperties(
      {},
      Object.fromEntries(
        // disallow overwriting of the top level `global` / `bidder`
        Object.entries(guard).map(([prop, obj]) => [prop, {get: () => obj}])
      )
    )
  }
}

/**
 * Get a guard for an ortb2Fragments object.
 */
export const guardOrtb2Fragments = ortb2FragmentsGuardFactory();
