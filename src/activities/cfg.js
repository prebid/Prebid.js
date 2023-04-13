import {config} from '../config.js';

const CFG_NAME = 'allowActivities';
const RULE_NAME = `${CFG_NAME} config`;
const DEFAULT_PRIORITY = 1;

export function updateRulesFromConfig(registerRule) {
  const activeRuleHandles = new Map();
  const defaultRuleHandles = new Map();
  const rulesByActivity = new Map();

  function clearAllRules() {
    Array.from(activeRuleHandles.values())
      .flatMap(ruleset => Array.from(ruleset.values()))
      .forEach(fn => fn());
    activeRuleHandles.clear();
    Array.from(defaultRuleHandles.values()).forEach(fn => fn());
    defaultRuleHandles.clear();
  }

  function setupRule(activity, priority) {
    if (!activeRuleHandles.has(activity)) {
      activeRuleHandles.set(activity, new Map())
    }
    const handles = activeRuleHandles.get(activity);
    if (!handles.has(priority)) {
      handles.set(priority, registerRule(activity, RULE_NAME, function (params) {
        for (const rule of rulesByActivity.get(activity).get(priority)) {
          if (!rule.condition || rule.condition(params)) {
            return {allow: rule.allow, reason: rule}
          }
        }
      }, priority));
    }
  }

  function setupDefaultRule(activity) {
    if (!defaultRuleHandles.has(activity)) {
      defaultRuleHandles.set(activity, registerRule(activity, RULE_NAME, function () {
        return {allow: false, reason: 'activity default is false'}
      }, Number.POSITIVE_INFINITY))
    }
  }

  config.getConfig(CFG_NAME, (cfg) => {
    clearAllRules();
    Object.entries(cfg[CFG_NAME]).forEach(([activity, cfg]) => {
      if (cfg.default === false) {
        setupDefaultRule(activity);
      }
      const rules = new Map();
      rulesByActivity.set(activity, rules);

      (cfg.rules || []).forEach(rule => {
        const priority = rule.priority == null ? DEFAULT_PRIORITY : rule.priority;
        if (!rules.has(priority)) {
          rules.set(priority, [])
        }
        rules.get(priority).push(rule);
      });

      Array.from(rules.keys()).forEach(priority => setupRule(activity, priority));
    });
  })
}
