import {deepAccess} from '../utils.js';
import {isActivityAllowed} from './rules.js';
import {ACTIVITY_TRANSMIT_EIDS, ACTIVITY_TRANSMIT_PRECISE_GEO, ACTIVITY_TRANSMIT_UFPD} from './activities.js';

export const ORTB_UFPD_PATHS = ['user.data', 'user.ext.data'];
export const ORTB_EIDS_PATHS = ['user.eids'];
export const ORTB_GEO_PATHS = ['user.geo.lat', 'user.geo.lon', 'device.geo.lat', 'device.geo.lon'];

/**
 * Factory for transformation functions that apply the given rules to an object.
 *
 * @typedef {Object} TransformationRule
 * @property {function(*): boolean} applies a predicate that should return true if this rule applies
 * (and the transformation defined herein should be applied). The arguments are those passed to the transformation function.
 * @property {name} a name for the rule; used to debounce calls to `applies`:
 *    if a rule with the same name was already found to apply (or not), this one will (or won't) as well.
 * @property {Array[string]} paths dot-separated list of paths that this rule applies to. If the input object
 *  contains any of these paths, `applies` will  be invoked; and if it returns true, properties at these paths
 *  will be replaced by running through `get`.
 * @property {function(*): *} get? a transformation function. Takes a single value, and returns a replacement - which will
 *  be run against all the values in `paths`, if `applies` returns true. By default, this returns undefined, and removes
 *  any values under `paths`.
 *
 * @param {Array[TransformationRule]} rules
 * @return {function(*): *}
 */
export function objectTransformer(rules) {
  rules.forEach(rule => {
    rule.paths = rule.paths.map((path) => {
      path = path.split('.');
      const tail = path.pop();
      return [path.length > 0 ? path.join('.') : null, tail];
    });
    rule.get = rule.get || function () {}
  });
  return function transformer(session, obj, ...args) {
    rules.forEach(({name, get, paths, applies}) => {
      if (session.hasOwnProperty(name) && !session[name]) {
        return;
      }
      for (const [head, tail] of paths) {
        const parent = head == null ? obj : deepAccess(obj, head);
        if (parent) {
          const val = parent[tail];
          if (isData(val)) {
            if (!session.hasOwnProperty(name)) {
              session[name] = applies(...args);
              if (!session[name]) break;
            }
            const repl = get(val);
            if (repl === undefined) {
              delete parent[tail];
            } else {
              parent[tail] = repl;
            }
          }
        }
      }
    })
    return obj;
  }
}

export function isData(val) {
  return val != null && (typeof val !== 'object' || Object.keys(val).length > 0)
}

function appliesWhenActivityDenied(activity, isAllowed = isActivityAllowed) {
  return function applies(params) {
    return !isAllowed(activity, params);
  };
}

function bidRequestTransmitRules(isAllowed = isActivityAllowed) {
  return [
    {
      name: ACTIVITY_TRANSMIT_EIDS,
      paths: ['userId', 'userIdAsEids'],
      applies: appliesWhenActivityDenied(ACTIVITY_TRANSMIT_EIDS, isAllowed),
    }
  ]
}

export function ortb2TransmitRules(isAllowed = isActivityAllowed) {
  return [
    {
      name: ACTIVITY_TRANSMIT_UFPD,
      paths: ORTB_UFPD_PATHS,
      applies: appliesWhenActivityDenied(ACTIVITY_TRANSMIT_UFPD, isAllowed),
    },
    {
      name: ACTIVITY_TRANSMIT_EIDS,
      paths: ORTB_EIDS_PATHS,
      applies: appliesWhenActivityDenied(ACTIVITY_TRANSMIT_EIDS, isAllowed),
    },
    {
      name: ACTIVITY_TRANSMIT_PRECISE_GEO,
      paths: ORTB_GEO_PATHS,
      applies: appliesWhenActivityDenied(ACTIVITY_TRANSMIT_PRECISE_GEO, isAllowed),
      get(val) {
        return Math.round((val + Number.EPSILON) * 100) / 100;
      }
    }
  ];
}

export function redactorFactory(isAllowed = isActivityAllowed) {
  const redactOrtb2 = objectTransformer(ortb2TransmitRules(isAllowed));
  const redactBidRequest = objectTransformer(bidRequestTransmitRules(isAllowed));
  return function redactor(params) {
    const session = {};
    return {
      ortb2(obj) { return redactOrtb2(session, obj, params) },
      bidRequest(obj) { return redactBidRequest(session, obj, params) }
    }
  }
}

export const redactor = redactorFactory();
