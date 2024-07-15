import {prefixLog} from '../utils.js';
import {ACTIVITY_PARAM_COMPONENT} from './params.js';

export function ruleRegistry(logger = prefixLog('Activity control:')) {
  const registry = {};

  function getRules(activity) {
    return registry[activity] = registry[activity] || [];
  }

  function runRule(activity, name, rule, params) {
    let res;
    try {
      res = rule(params);
    } catch (e) {
      logger.logError(`Exception in rule ${name} for '${activity}'`, e);
      res = {allow: false, reason: e};
    }
    return res && Object.assign({activity, name, component: params[ACTIVITY_PARAM_COMPONENT]}, res);
  }

  const dupes = {};
  const DEDUPE_INTERVAL = 1000;

  function logResult({activity, name, allow, reason, component}) {
    const msg = `${name} ${allow ? 'allowed' : 'denied'} '${activity}' for '${component}'${reason ? ':' : ''}`;
    const deduping = dupes.hasOwnProperty(msg);
    if (deduping) {
      clearTimeout(dupes[msg]);
    }
    dupes[msg] = setTimeout(() => delete dupes[msg], DEDUPE_INTERVAL);
    if (!deduping) {
      const parts = [msg];
      reason && parts.push(reason);
      (allow ? logger.logInfo : logger.logWarn).apply(logger, parts);
    }
  }

  return [
    /**
     * Register an activity control rule.
     *
     * @param {string} activity - Activity name, as defined in `activities.js`.
     * @param {string} ruleName - A name for this rule, used for logging.
     * @param {function(Object): {allow: boolean, reason?: string}} rule - Rule definition function. Takes in activity
     *        parameters as a single map; MAY return an object {allow, reason}, where allow is true/false,
     *        and reason is an optional message used for logging.
     *
     *        {allow: true} will allow this activity AS LONG AS no other rules with the same or higher priority return {allow: false};
     *        {allow: false} will deny this activity AS LONG AS no other rules with higher priority return {allow: true};
     *        Returning null/undefined has no effect - the decision is left to other rules.
     *        If no rule returns an allow value, the default is to allow the activity.
     *
     * @param {number} [priority=10] - Rule priority; lower number means higher priority.
     * @returns {function(): void} - A function that unregisters the rule when called.
     */
    function registerActivityControl(activity, ruleName, rule, priority = 10) {
      const rules = getRules(activity);
      const pos = rules.findIndex(([itemPriority]) => priority < itemPriority);
      const entry = [priority, ruleName, rule];
      rules.splice(pos < 0 ? rules.length : pos, 0, entry);
      return function () {
        const idx = rules.indexOf(entry);
        if (idx >= 0) rules.splice(idx, 1);
      }
    },
    /**
     * Test whether an activity is allowed.
     *
     * @param {string} activity activity name
     * @param {{}} params activity parameters; should be generated through the `activityParams` utility.
     * @return {boolean} true for allow, false for deny.
     */
    function isActivityAllowed(activity, params) {
      let lastPriority, foundAllow;
      for (const [priority, name, rule] of getRules(activity)) {
        if (lastPriority !== priority && foundAllow) break;
        lastPriority = priority;
        const ruleResult = runRule(activity, name, rule, params);
        if (ruleResult) {
          if (!ruleResult.allow) {
            logResult(ruleResult);
            return false;
          } else {
            foundAllow = ruleResult;
          }
        }
      }
      foundAllow && logResult(foundAllow);
      return true;
    }
  ];
}

export const [registerActivityControl, isActivityAllowed] = ruleRegistry();
