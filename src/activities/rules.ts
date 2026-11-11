import { prefixLog } from '../utils.js';
import { ACTIVITY_PARAM_COMPONENT, type ActivityParams } from './params.js';
import type { Activity } from './activities.ts';

export type RuleResult = {
  allow: boolean;
  reason?: unknown;
};

/**
 * Activity control rule. MAY return {allow, reason}; returning null/undefined leaves the decision to other rules.
 */
export type ActivityRule = (params: ActivityParams) => RuleResult | null | undefined | void;

type RuleEntry = [priority: number, name: string, rule: ActivityRule];

export function ruleRegistry(logger = prefixLog('Activity control:')) {
  const registry: { [A in Activity]?: RuleEntry[] } = {};

  function getRules(activity: Activity) {
    registry[activity] = registry[activity] || [];
    return registry[activity];
  }

  function runRule(activity: Activity, name: string, rule: ActivityRule, params: ActivityParams) {
    let res: RuleResult | null | undefined | void;
    try {
      res = rule(params);
    } catch (e) {
      logger.logError(`Exception in rule ${name} for '${activity}'`, e);
      res = { allow: false, reason: e };
    }
    return res && Object.assign({ activity, name, component: params[ACTIVITY_PARAM_COMPONENT] }, res);
  }

  const dupes = {};
  const DEDUPE_INTERVAL = 1000;

  // eslint-disable-next-line no-restricted-syntax
  function logResult({ activity, name, allow, reason, component }: RuleResult & { activity: Activity; name: string; component: string }) {
    const msg = `${name} ${allow ? 'allowed' : 'denied'} '${activity}' for '${component}'${reason ? ':' : ''}`;
    const deduping = dupes.hasOwnProperty(msg);
    if (deduping) {
      clearTimeout(dupes[msg]);
    }
    dupes[msg] = setTimeout(() => delete dupes[msg], DEDUPE_INTERVAL);
    if (!deduping) {
      const parts: unknown[] = [msg];
      reason && parts.push(reason);
      (allow ? logger.logInfo : logger.logWarn).apply(logger, parts);
    }
  }

  return [
    /**
     * Register an activity control rule.
     *
     * @param activity - Activity name, as defined in `activities.ts`.
     * @param ruleName - A name for this rule, used for logging.
     * @param rule - Rule definition function. Takes in activity
     *        parameters as a single map; MAY return an object {allow, reason}, where allow is true/false,
     *        and reason is an optional message used for logging.
     *
     *        {allow: true} will allow this activity AS LONG AS no other rules with the same or higher priority return {allow: false};
     *        {allow: false} will deny this activity AS LONG AS no other rules with higher priority return {allow: true};
     *        Returning null/undefined has no effect - the decision is left to other rules.
     *        If no rule returns an allow value, the default is to allow the activity.
     *
     * @param priority - Rule priority; lower number means higher priority.
     * @returns A function that unregisters the rule when called.
     */
    function registerActivityControl(activity: Activity, ruleName: string, rule: ActivityRule, priority = 10): () => void {
      const rules = getRules(activity);
      const pos = rules.findIndex(([itemPriority]) => priority < itemPriority);
      const entry: RuleEntry = [priority, ruleName, rule];
      rules.splice(pos < 0 ? rules.length : pos, 0, entry);
      return function () {
        const idx = rules.indexOf(entry);
        if (idx >= 0) rules.splice(idx, 1);
      };
    },
    /**
     * Test whether an activity is allowed.
     *
     * @param activity activity name
     * @param params activity parameters; should be generated through the `activityParams` utility.
     * @return true for allow, false for deny.
     */
    function isActivityAllowed(activity: Activity, params: ActivityParams): boolean {
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
  ] as const;
}

export const [registerActivityControl, isActivityAllowed] = ruleRegistry();
