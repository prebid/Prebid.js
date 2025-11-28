import { setLabels } from "../../libraries/analyticsAdapter/AnalyticsAdapter.ts";
import { timeoutQueue } from "../../libraries/timeoutQueue/timeoutQueue.ts";
import { ACTIVITY_ADD_BID_RESPONSE, ACTIVITY_FETCH_BIDS } from "../../src/activities/activities.js";
import { MODULE_TYPE_BIDDER } from "../../src/activities/modules.ts";
import { ACTIVITY_PARAM_COMPONENT_NAME, ACTIVITY_PARAM_COMPONENT_TYPE } from "../../src/activities/params.js";
import { registerActivityControl } from "../../src/activities/rules.js";
import { ajax } from "../../src/ajax.ts";
import { config } from "../../src/config.ts";
import { getHook } from "../../src/hook.ts";
import { logError, logInfo, logWarn } from "../../src/utils.ts";
import { timedAuctionHook } from "../../src/utils/perfMetrics.ts";

const MODULE_NAME = 'shapingRulesModule';

let unregisterFunctions: Array<() => void> = [];

let rulesConfig: ModuleConfig = {
  endpoint: {
    method: 'GET',
    url: ''
  },
  auctionDelay: 0
};

let fetching = false;

let rulesLoaded = false;

const delayedAuctions = timeoutQueue();

interface ModuleConfig {
  endpoint?: {
    url: string;
    method: string;
  };
  auctionDelay?: number;
}

interface ModelGroupSchema {
  function: string;
  args: any[];
}

interface ModelGroup {
  weight: number;
  selected: boolean;
  analyticsKey: string;
  version: string;
  schema: ModelGroupSchema[];
  rules: [{
    condition: string[];
    results: [
      { args: any[]; function: string }
    ];
  }];
  default?: Array<{
    function: string;
    args: any;
  }>;
}
interface RuleSet {
  name: string;
  stage: string;
  version: string;
  modelGroups: ModelGroup[];
}

interface RulesConfig {
  version: string;
  ruleSets: RuleSet[];
  timestamp: string;
  enabled: boolean;
}

export function evaluateConfig(config: RulesConfig) {
  if (!config || !config.ruleSets) {
    logWarn(`${MODULE_NAME}: Invalid structure for rules engine`);
    return;
  }

  if (!config.enabled) {
    logInfo(`${MODULE_NAME}: Rules engine is disabled in the configuration.`);
    return;
  }

  const stageRules = config.ruleSets;

  assignModelGroups(stageRules || []);

  for (const ruleSet of stageRules) {
    const modelGroup = ruleSet.modelGroups?.find(group => group.selected);
    if (!modelGroup) continue;
    evaluateRules(modelGroup.rules || [], modelGroup.schema || [], ruleSet.stage, modelGroup.analyticsKey, modelGroup.default);
  }
}

export function assignModelGroups(rulesets: RuleSet[]) {
  for (const ruleset of rulesets) {
    const { modelGroups } = ruleset;
    if (!modelGroups?.length) continue;

    const weightSum = modelGroups.reduce(
      (sum, group) => sum + (group.weight ?? 100),
      0
    );

    let randomValue = Math.random() * weightSum;

    for (const group of modelGroups) {
      // 100 is default weight if not specified
      const groupWeight = group.weight ?? 100;
      if (randomValue < groupWeight) {
        group.selected = true;
        break;
      }
      randomValue -= groupWeight;
    }

    if (!modelGroups.some(g => g.selected)) {
      modelGroups[modelGroups.length - 1].selected = true;
    }
  }
}

function evaluateRules(rules, schema, stage, analyticsKey, defaultRules?) {
  if (defaultRules) {
    for (const result of defaultRules) {
      const registerResult = evaluateFunction(result.function, result.args || [], [], [], stage, analyticsKey);
      if (!registerResult) {
        logError(`${MODULE_NAME}: Unknown result function ${result.function}`);
        continue;
      }
      registerResult();
    }
  }
  for (const rule of rules) {
    for (const result of rule.results) {
      const registerResult = evaluateFunction(result.function, result.args || [], schema, rule.conditions, stage, analyticsKey);
      if (!registerResult) {
        logError(`${MODULE_NAME}: Unknown result function ${result.function}`);
        continue;
      }
      registerResult();
    }
  }
}

export function evaluateSchema(func, args, context) {
  switch (func) {
    case 'percent':
      return () => Math.random() * 100 < args[0];
    case 'adUnitCode':
      return () => context.adUnit.code === args[0];
    case 'adUnitCodeIn':
      return () => args.includes(context.adUnit.code);
    case 'deviceCountry':
      return () => context.ortb2?.device?.geo?.country === args[0];
    case 'deviceCountryIn':
      return () => args.includes(context.ortb2?.device?.geo?.country);
    case 'channel':
      return () => {
        const channel = context.ortb2?.ext?.prebid?.channel;
        if (channel === 'pbjs') return 'web';
        return channel || '';
      }
    case 'eidAvailable':
      return () => {
        const eids = context.ortb2?.user?.eids || [];
        return eids.length > 0;
      }
    case 'userFpdAvailable':
      return () => {
        const fpd = context.ortb2?.user?.data || {};
        const extFpd = context.ortb2?.user?.ext?.data || {};
        const mergedFpd = { ...fpd, ...extFpd };
        return Object.keys(mergedFpd).length > 0;
      }
    case 'fpdAvailable':
      return () => {
        const extData = context.ortb2?.user?.ext?.data || {};
        const usrData = context.ortb2?.user?.data || {};
        const siteExtData = context.ortb2?.site?.ext?.data || {};
        const siteContentData = context.ortb2?.site?.content?.data || {};
        const appExtData = context.ortb2?.app?.ext?.data || {};
        const appContentData = context.ortb2?.app?.content?.data || {};
        const mergedFpd = { ...extData, ...usrData, ...siteExtData, ...siteContentData, ...appExtData, ...appContentData };
        return Object.keys(mergedFpd).length > 0;
      }
    case 'gppSidIn':
      return () => {
        const gppSids = context.regs?.gpp_sid || [];
        return args.some((sid) => gppSids.includes(sid));
      }
    case 'tcfInScope':
      return () => context.regs?.ext?.gdpr === 1;
    case 'domainIn':
      return () => {
        const domain = context.ortb2?.site?.domain || context.ortb2?.app?.domain || '';
        return args.includes(domain);
      }
    case 'bundleIn':
      return () => {
        const bundle = context.ortb2?.app?.bundle || '';
        return args.includes(bundle);
      }
    case 'mediaTypeIn':
      return () => {
        const mediaTypes = Object.keys(context.adUnit?.mediaTypes) || [];
        return args.some((type) => mediaTypes.includes(type));
      }
    case 'deviceTypeIn':
      return () => {
        const deviceType = context.ortb2?.device?.devicetype;
        return args.includes(deviceType);
      }
    case 'bidPrice':
      return () => {
        const bidPrice = context.bid?.price || 0;
        return bidPrice >= args[0];
      }
    default:
      return () => null;
  }
}

function evaluateFunction(func, args, schema, conditions, stage, analyticsKey) {
  switch (func) {
    case 'excludeBidders':
      return () => {
        let activity;
        switch (stage) {
          case 'processed-auction-request':
            activity = ACTIVITY_FETCH_BIDS;
            break;
          case 'processed-auction':
          default:
            activity = ACTIVITY_ADD_BID_RESPONSE;
            break;
        }
        args.forEach(({bidders, analyticsValue, seatnonbid}) => {
          const unregister = registerActivityControl(activity, MODULE_NAME, (params) => {
            let conditionMet = true;
            for (const [index, schemaEntry] of schema.entries()) {
              const func = evaluateSchema(schemaEntry.function, schemaEntry.args || [], params);
              if (evaluateCondition(conditions[index], func)) {
                conditionMet = false;
                break;
              }
            }
            if (params[ACTIVITY_PARAM_COMPONENT_TYPE] !== MODULE_TYPE_BIDDER) return { allow: true };
            const finalCondition = conditionMet && !bidders.includes(params[ACTIVITY_PARAM_COMPONENT_NAME]);
            if (finalCondition === false && analyticsKey && analyticsValue) {
              setLabels({ [analyticsKey]: analyticsValue });
            }
            return { allow: finalCondition, reason: `Bidder ${params.bidder} excluded by rules module` };
          });
          unregisterFunctions.push(unregister);
        });
      }
    case 'logAtag':
      return () => {
        // @todo: is that enough?
        setLabels({ [analyticsKey]: args.analyticsValue });
      }
    default:
      return () => null;
  }
}

function evaluateCondition(condition, func) {
  switch (condition) {
    case '*':
      return true
    case 'true':
      return func() === true;
    case 'false':
      return func() === false;
    default:
      return false;
  }
}

export function fetchRules(endpoint = rulesConfig.endpoint) {
  if (fetching) {
    logWarn(`${MODULE_NAME}: A fetch is already occurring. Skipping.`);
    return;
  }

  if (!endpoint?.url || endpoint?.method !== 'GET') return;

  fetching = true;
  ajax(endpoint.url, {
    success: (response: any) => {
      fetching = false;
      rulesLoaded = true;
      delayedAuctions.resume();
      logInfo(`${MODULE_NAME}: Rules configuration fetched successfully.`);
      evaluateConfig(JSON.parse(response));
    },
    error: () => {
      fetching = false;
    }
  }, null, { method: 'GET' });
}

export const requestBidsHook = timedAuctionHook('rules', function requestBidsHook(fn, reqBidsConfigObj) {
  const { auctionDelay = 0 } = rulesConfig;
  const continueAuction = ((that) => () => fn.call(that, reqBidsConfigObj))(this);

  if (!rulesLoaded && auctionDelay > 0) {
    delayedAuctions.submit(auctionDelay, continueAuction, () => {
      logWarn(`${MODULE_NAME}: Fetch attempt did not return in time for auction ${reqBidsConfigObj.auctionId}`)
      continueAuction();
    });
  } else {
    continueAuction();
  }
});

function init(rules: ModuleConfig) {
  rulesConfig = rules;
  fetchRules();
  getHook('requestBids').before(requestBidsHook, 50);
}

export function reset() {
  unregisterFunctions.forEach(unregister => {
    if (unregister && typeof unregister === 'function') {
      unregister();
    }
  });
  unregisterFunctions = [];
  try {
    getHook('requestBids').getHooks({hook: requestBidsHook}).remove();
  } catch (e) {
  }
  setLabels({});
}

config.getConfig('rules', config => init(config.rules));
