import { isActivityAllowed } from '../../src/activities/rules.js';
import { ACTIVITY_ENRICH_EIDS, ACTIVITY_ENRICH_UFPD } from '../../src/activities/activities.js';
import {
  appliesWhenActivityDenied,
  ortb2TransmitRules,
  ORTB_EIDS_PATHS,
  ORTB_UFPD_PATHS
} from '../../src/activities/redactor.js';
import { objectGuard, writeProtectRule } from './objectGuard.js';
import { logError, mergeDeep } from '../../src/utils.js';

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
  ].map(writeProtectRule);
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
    // one guard per object, so that nested guards handed out by it are recognized (and unwrapped) when written back
    const guards = new WeakMap();
    const views = new WeakMap();
    function guardBidder(data) {
      if (!guards.has(data)) {
        const guard = guardOrtb2(data, params);
        guards.set(data, guard);
        views.set(guard, data);
      }
      return guards.get(data);
    }
    // bidders that have been read but not written to; they are attached to `fragments.bidder` on first write,
    // so that reads (including `toJSON`, `then`, etc.) do not create entries
    const pending = new Map();
    function pendingBidder(target, prop) {
      if (!pending.has(prop)) {
        const data = {};
        const guard = guardBidder(data);
        const attach = () => {
          if (target[prop] == null) target[prop] = data;
          pending.delete(prop);
        };
        const view = new Proxy(guard, {
          set(t, p, v) {
            attach();
            return Reflect.set(guard, p, v);
          },
          defineProperty(t, p, desc) {
            attach();
            return Reflect.defineProperty(guard, p, desc);
          }
        });
        views.set(view, data);
        pending.set(prop, { data, view });
      }
      return pending.get(prop).view;
    }
    const guard = {
      global: guardOrtb2(fragments.global, params),
      bidder: new Proxy(fragments.bidder, {
        get(target, prop, receiver) {
          const bidderData = Reflect.get(target, prop, receiver);
          if (bidderData == null) {
            return typeof prop === 'string' ? pendingBidder(target, prop) : bidderData;
          }
          return typeof bidderData === 'object' ? guardBidder(bidderData) : bidderData;
        },
        set(target, prop, newValue, receiver) {
          if (newValue == null || typeof newValue !== 'object') {
            logError(`ortb2Fragments.bidder[bidderCode] must be an object`);
          }
          let bidderData = Reflect.get(target, prop, receiver) ?? pending.get(prop)?.data;
          if (bidderData != null && views.get(newValue) === bidderData) {
            return true;
          }
          bidderData = bidderData ?? {};
          if (target[prop] == null) target[prop] = bidderData;
          pending.delete(prop);
          const guarded = guardBidder(bidderData);
          Object.entries(newValue).forEach(([prop, value]) => {
            guarded[prop] = value;
          });
          return true;
        }
      })
    };

    return Object.defineProperties(
      {},
      Object.fromEntries(
        // disallow overwriting of the top level `global` / `bidder`
        Object.entries(guard).map(([prop, obj]) => [
          prop,
          {
            get: () => obj,
            set(rval) {
              rval !== obj && mergeDeep(obj, rval);
            }
          }
        ])
      )
    );
  };
}

/**
 * Get a guard for an ortb2Fragments object.
 */
export const guardOrtb2Fragments = ortb2FragmentsGuardFactory();
