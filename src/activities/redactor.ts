import {deepAccess} from '../utils.js';
import {config} from '../config.js';
import {isActivityAllowed, registerActivityControl} from './rules.js';
import {
  ACTIVITY_TRANSMIT_EIDS,
  ACTIVITY_TRANSMIT_PRECISE_GEO,
  ACTIVITY_TRANSMIT_TID,
  ACTIVITY_TRANSMIT_UFPD
} from './activities.js';
import { scrubIPv4, scrubIPv6 } from '../utils/ipUtils.js';

export const ORTB_UFPD_PATHS = [
  'data',
  'ext.data',
  'yob',
  'gender',
  'keywords',
  'kwarray',
  'id',
  'buyeruid',
  'customdata'
].map(f => `user.${f}`).concat('device.ext.cdep');
export const ORTB_EIDS_PATHS = ['user.eids', 'user.ext.eids'];
export const ORTB_GEO_PATHS = ['user.geo.lat', 'user.geo.lon', 'device.geo.lat', 'device.geo.lon'];
export const ORTB_IPV4_PATHS = ['device.ip']
export const ORTB_IPV6_PATHS = ['device.ipv6']

/**
 * @typedef TransformationRuleDef
 * @property {name}
 * @property {Array[string]} paths dot-separated list of paths that this rule applies to.
 * @property {function(*): boolean} applies a predicate that should return true if this rule applies
 * (and the transformation defined herein should be applied). The arguments are those passed to the transformation function.
 * @property {name} a name for the rule; used to debounce calls to `applies` (and avoid excessive logging):
 * if a rule with the same name was already found to apply (or not), this one will (or won't) as well.
 */

/**
 * @typedef RedactRuleDef A rule that removes, or replaces, values from an object (modifications are done in-place).
 * @augments TransformationRuleDef
 * @property {function(*): *} get? substitution functions for values that should be redacted;
 *  takes in the original (unredacted) value as an input, and returns a substitute to use in the redacted
 *  version. If it returns undefined, or this option is omitted, protected paths will be removed
 *  from the redacted object.
 */

/**
 * @param {RedactRuleDef} ruleDef
 * @return {TransformationRule}
 */
export function redactRule(ruleDef) {
  return Object.assign({
    get() {},
    run(root, path, object, property, applies) {
      const val = object && object[property];
      if (isData(val) && applies()) {
        const repl = this.get(val);
        if (repl === undefined) {
          delete object[property];
        } else {
          object[property] = repl;
        }
      }
    }
  }, ruleDef)
}

/**
 * @typedef TransformationRule
 * @augments TransformationRuleDef
 * @property {function} run rule logic - see `redactRule` for an example.
 */

/**
 * @typedef {Function} TransformationFunction
 * @param object object to transform
 * @param ...args arguments to pass down to rule's `apply` methods.
 */

/**
 * Return a transformation function that will apply the given rules to an object.
 *
 * @param {Array[TransformationRule]} rules
 * @return {TransformationFunction}
 */
export function objectTransformer(rules) {
  rules.forEach(rule => {
    rule.paths = rule.paths.map((path) => {
      const parts = path.split('.');
      const tail = parts.pop();
      return [parts.length > 0 ? parts.join('.') : null, tail]
    })
  })
  return function applyTransform(session, obj, ...args) {
    const result = [];
    const applies = sessionedApplies(session, ...args);
    rules.forEach(rule => {
      if (session[rule.name] === false) return;
      for (const [head, tail] of rule.paths) {
        const parent = head == null ? obj : deepAccess(obj, head);
        result.push(rule.run(obj, head, parent, tail, applies.bind(null, rule)));
        if (session[rule.name] === false) return;
      }
    })
    return result.filter(el => el != null);
  }
}

export function sessionedApplies(session, ...args) {
  return function applies(rule) {
    if (!session.hasOwnProperty(rule.name)) {
      session[rule.name] = !!rule.applies(...args);
    }
    return session[rule.name];
  }
}

export function isData(val) {
  return val != null && (typeof val !== 'object' || Object.keys(val).length > 0)
}

export function appliesWhenActivityDenied(activity, isAllowed = isActivityAllowed) {
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
    },
    {
      name: ACTIVITY_TRANSMIT_TID,
      paths: ['ortb2Imp.ext.tid', 'ortb2Imp.ext.tidSource'],
      applies: appliesWhenActivityDenied(ACTIVITY_TRANSMIT_TID, isAllowed)
    }
  ].map(redactRule)
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
    },
    {
      name: ACTIVITY_TRANSMIT_PRECISE_GEO,
      paths: ORTB_IPV4_PATHS,
      applies: appliesWhenActivityDenied(ACTIVITY_TRANSMIT_PRECISE_GEO, isAllowed),
      get(val) {
        return scrubIPv4(val);
      }
    },
    {
      name: ACTIVITY_TRANSMIT_PRECISE_GEO,
      paths: ORTB_IPV6_PATHS,
      applies: appliesWhenActivityDenied(ACTIVITY_TRANSMIT_PRECISE_GEO, isAllowed),
      get(val) {
        return scrubIPv6(val);
      }
    },
    {
      name: ACTIVITY_TRANSMIT_TID,
      paths: ['source.tid', 'source.ext.tidSource'],
      applies: appliesWhenActivityDenied(ACTIVITY_TRANSMIT_TID, isAllowed),
    }
  ].map(redactRule);
}

export function redactorFactory(isAllowed = isActivityAllowed) {
  const redactOrtb2 = objectTransformer(ortb2TransmitRules(isAllowed));
  const redactBidRequest = objectTransformer(bidRequestTransmitRules(isAllowed));
  return function redactor(params) {
    const session = {};
    return {
      ortb2(obj) { redactOrtb2(session, obj, params); return obj },
      bidRequest(obj) { redactBidRequest(session, obj, params); return obj }
    }
  }
}

/**
 * Returns an object that can redact other privacy-sensitive objects according
 * to activity rules.
 *
 * @param {{}} params activity parameters to use for activity checks
 * @return {{ortb2: function({}): {}, bidRequest: function({}): {}}} methods
 *  that can redact disallowed data from ORTB2 and/or bid request objects.
 */
export const redactor = redactorFactory();

declare module '../config' {
  interface Config {
    /**
     * Prebid generates unique IDs for both auctions and ad units within auctions; these can be used by DSPs
     * to correlate requests from different sources, which is useful for many applications but also a potential
     * privacy concern. Since version 8 they are disabled by default, and can be re-enabled with this flag.
     */
    enableTIDs?: boolean;
    /**
     * When enabled alongside enableTIDs, bidders receive a consistent source.tid for an auction rather than
     * bidder-specific values.
     */
    consistentTIDs?: boolean;
  }
}
// by default, TIDs are off since version 8
registerActivityControl(ACTIVITY_TRANSMIT_TID, 'enableTIDs config', () => {
  if (!config.getConfig('enableTIDs')) {
    return {allow: false, reason: 'TIDs are disabled'}
  }
});
