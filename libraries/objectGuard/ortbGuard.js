import { isActivityAllowed } from '../../src/activities/rules.js';
import { ACTIVITY_ENRICH_EIDS, ACTIVITY_ENRICH_UFPD } from '../../src/activities/activities.js';
import {
  appliesWhenActivityDenied,
  ortb2TransmitRules,
  ORTB_EIDS_PATHS,
  ORTB_UFPD_PATHS
} from '../../src/activities/redactor.js';
import { objectGuard, targetOf, writeProtectRule } from './objectGuard.js';
import { logError } from '../../src/utils.js';

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

const isObject = (value) => value != null && typeof value === 'object' && !Array.isArray(value);

/**
 * `Object.assign` through a guard, so that each property is subject to its rules.
 */
function assign(guard, value) {
  Object.entries(value).forEach(([key, val]) => {
    // the guard has no safe way to define a `__proto__` key; assigning it would replace the prototype
    if (key !== '__proto__') guard[key] = val;
  });
}

export function ortb2FragmentsGuardFactory(guardOrtb2 = ortb2Guard) {
  return function guardOrtb2Fragments(fragments, params) {
    fragments.global = fragments.global || {};
    fragments.bidder = fragments.bidder || {};
    // one guard per object, so that nested guards handed out by it are recognized (and unwrapped) when written back
    const guards = new WeakMap();
    function guardBidder(data) {
      if (!guards.has(data)) guards.set(data, guardOrtb2(data, params));
      return guards.get(data);
    }
    // inherited properties (`hasOwnProperty`, `constructor`, ...) are not bidders
    function entry(target, prop) {
      const bidderData = Object.hasOwn(target, prop) ? target[prop] : undefined;
      return bidderData != null && typeof bidderData === 'object' ? bidderData : undefined;
    }
    // bidders that have been read but not written to; they are attached to `fragments.bidder` on first write,
    // so that reads (including `toJSON`, `then`, etc.) do not create entries
    const pending = new Map();
    function pendingBidder(target, prop) {
      if (!pending.has(prop)) {
        const data = {};
        const guard = guardBidder(data);
        // another submodule may create the bidder while this view is held; from then on, the view is of that
        const current = () => {
          const bidderData = entry(target, prop);
          return bidderData ? guardBidder(bidderData) : guard;
        };
        const attach = () => {
          if (!entry(target, prop)) target[prop] = data;
          pending.delete(prop);
        };
        const view = new Proxy(guard, {
          get: (t, p) => Reflect.get(current(), p),
          has: (t, p) => Reflect.has(current(), p),
          ownKeys: () => Reflect.ownKeys(current()),
          getOwnPropertyDescriptor: (t, p) => Reflect.getOwnPropertyDescriptor(current(), p),
          set(t, p, v) {
            attach();
            return Reflect.set(current(), p, v);
          },
          defineProperty(t, p, desc) {
            attach();
            return Reflect.defineProperty(current(), p, desc);
          },
          deleteProperty: (t, p) => Reflect.deleteProperty(current(), p),
        });
        pending.set(prop, { data, view });
      }
      return pending.get(prop).view;
    }
    const guard = {
      global: guardOrtb2(fragments.global, params),
      bidder: new Proxy(fragments.bidder, {
        get(target, prop, receiver) {
          const bidderData = Reflect.get(target, prop, receiver);
          if (bidderData == null) return typeof prop === 'string' ? pendingBidder(target, prop) : bidderData;
          return entry(target, prop) ? guardBidder(bidderData) : bidderData;
        },
        set(target, prop, newValue, receiver) {
          if (prop === '__proto__') {
            throw new TypeError('ortb2Fragments.bidder.__proto__ cannot be set');
          }
          if (!isObject(newValue)) {
            logError(`ortb2Fragments.bidder[bidderCode] must be an object`);
            return true;
          }
          let bidderData = entry(target, prop) ?? pending.get(prop)?.data;
          if (bidderData != null && targetOf(newValue) === bidderData) {
            return true;
          }
          bidderData = bidderData ?? {};
          if (!entry(target, prop)) target[prop] = bidderData;
          pending.delete(prop);
          assign(guardBidder(bidderData), newValue);
          return true;
        },
        deleteProperty(target, prop) {
          const bidderData = entry(target, prop);
          if (!bidderData) return Reflect.deleteProperty(target, prop);
          // only the contents go, through the guard; the entry stays, so that views of it stay valid
          const guarded = guardBidder(bidderData);
          Object.keys(bidderData).forEach(key => {
            delete guarded[key];
          });
          return true;
        }
      })
    };

    return Object.defineProperties(
      {},
      Object.fromEntries(
        // `global` / `bidder` cannot be swapped out; assigning them assigns their properties
        Object.entries(guard).map(([prop, obj]) => [
          prop,
          {
            get: () => obj,
            set(rval) {
              if (!isObject(rval)) {
                logError(`ortb2Fragments.${prop} must be an object`);
              } else if (rval !== obj) {
                assign(obj, rval);
              }
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
