"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerActivityControl = exports.isActivityAllowed = void 0;
exports.ruleRegistry = ruleRegistry;
var _utils = require("../utils.js");
var _params = require("./params.js");
function ruleRegistry() {
  let logger = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : (0, _utils.prefixLog)('Activity control:');
  const registry = {};
  function getRules(activity) {
    return registry[activity] = registry[activity] || [];
  }
  function runRule(activity, name, rule, params) {
    let res;
    try {
      res = rule(params);
    } catch (e) {
      logger.logError("Exception in rule ".concat(name, " for '").concat(activity, "'"), e);
      res = {
        allow: false,
        reason: e
      };
    }
    return res && Object.assign({
      activity,
      name,
      component: params[_params.ACTIVITY_PARAM_COMPONENT]
    }, res);
  }
  const dupes = {};
  const DEDUPE_INTERVAL = 1000;
  function logResult(_ref) {
    let {
      activity,
      name,
      allow,
      reason,
      component
    } = _ref;
    const msg = "".concat(name, " ").concat(allow ? 'allowed' : 'denied', " '").concat(activity, "' for '").concat(component, "'").concat(reason ? ':' : '');
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
   * @param {string} activity activity name - set is defined in `activities.js`
   * @param {string} ruleName a name for this rule; used for logging.
   * @param {function({}): {allow: boolean, reason?: string}} rule definition function. Takes in activity
   *        parameters as a single map; MAY return an object {allow, reason}, where allow is true/false,
   *        and reason is an optional message used for logging.
   *
   *        {allow: true} will allow this activity AS LONG AS no other rules with same or higher priority return {allow: false};
   *        {allow: false} will deny this activity AS LONG AS no other rules with higher priority return {allow: true};
   *        returning null/undefined has no effect - the decision is left to other rules.
   *        If no rule returns an allow value, the default is to allow the activity.
   *
   * @param {number} priority rule priority; lower number means higher priority
   * @returns {function(void): void} a function that unregisters the rule when called.
   */
  function registerActivityControl(activity, ruleName, rule) {
    let priority = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 10;
    const rules = getRules(activity);
    const pos = rules.findIndex(_ref2 => {
      let [itemPriority] = _ref2;
      return priority < itemPriority;
    });
    const entry = [priority, ruleName, rule];
    rules.splice(pos < 0 ? rules.length : pos, 0, entry);
    return function () {
      const idx = rules.indexOf(entry);
      if (idx >= 0) rules.splice(idx, 1);
    };
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
  }];
}
const [registerActivityControl, isActivityAllowed] = ruleRegistry();
exports.isActivityAllowed = isActivityAllowed;
exports.registerActivityControl = registerActivityControl;