import {prefixLog} from '../utils.js';

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
    return res && Object.assign({activity, name}, res);
  }

  function logResult({activity, name, allow, reason}) {
    let msg = `'${activity}' is ${allow ? 'allowed' : 'denied'} by ${name}`;
    if (reason) {
      msg = `${msg}: ${reason}`;
    }
    (allow ? logger.logInfo : logger.logWarn)(msg);
  }

  return [
    /**
     * Register an activity control rule.
     *
     * @param {string} activity activity name - set is defined in `activities.js`
     * @param {string} ruleName a name for this rule; used for logging.
     * @param {function({}): {allow: boolean, reason?: string}} rule definition function. Takes in activity
     *            parameters as a single object; MAY return an object {allow, reason}, where allow is true/false,
     *            and reason is an optional message used for logging.
     * @param {number} priority rule priority; lower number means higher priority
     */
    function registerActivityControl(activity, ruleName, rule, priority = 10) {
      const rules = getRules(activity);
      const pos = rules.findIndex(([itemPriority]) => priority < itemPriority);
      rules.splice(pos < 0 ? rules.length : pos, 0, [priority, ruleName, rule]);
    },
    /**
     * Test whether an activity is allowed.
     *
     * @param {string} activity activity name
     * @param {{}} params activity parameters; should be generated through `activityParams` below
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
