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

const MODULE_NAME = 'shapingRules';

const GLOBAL_RANDOM_STORE = new Map<string, number>();

export const dep = {
  getGlobalRandom: getGlobalRandom
};

function getGlobalRandom(auctionId: string) {
  if (!auctionId) {
    return Math.random();
  }
  if (!GLOBAL_RANDOM_STORE.has(auctionId)) {
    GLOBAL_RANDOM_STORE.set(auctionId, Math.random());
  }
  return GLOBAL_RANDOM_STORE.get(auctionId);
}

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

const schemaEvaluators = {
  percent: (args, context) => () => {
    const auctionId = context.bid?.auctionId;
    return dep.getGlobalRandom(auctionId) * 100 < args[0]
  },
  adUnitCode: (args, context) => () => context.adUnit.code,
  adUnitCodeIn: (args, context) => () => args[0].includes(context.adUnit.code),
  deviceCountry: (args, context) => () => context.ortb2?.device?.geo?.country,
  deviceCountryIn: (args, context) => () => args[0].includes(context.ortb2?.device?.geo?.country),
  channel: (args, context) => () => {
    const channel = context.ortb2?.ext?.prebid?.channel;
    if (channel === 'pbjs') return 'web';
    return channel || '';
  },
  eidAvailable: (args, context) => () => {
    const eids = context.ortb2?.user?.eids || [];
    return eids.length > 0;
  },
  userFpdAvailable: (args, context) => () => {
    const fpd = context.ortb2?.user?.data || {};
    const extFpd = context.ortb2?.user?.ext?.data || {};
    const mergedFpd = { ...fpd, ...extFpd };
    return Object.keys(mergedFpd).length > 0;
  },
  fpdAvailable: (args, context) => () => {
    const extData = context.ortb2?.user?.ext?.data || {};
    const usrData = context.ortb2?.user?.data || {};
    const siteExtData = context.ortb2?.site?.ext?.data || {};
    const siteContentData = context.ortb2?.site?.content?.data || {};
    const appExtData = context.ortb2?.app?.ext?.data || {};
    const appContentData = context.ortb2?.app?.content?.data || {};
    const mergedFpd = { ...extData, ...usrData, ...siteExtData, ...siteContentData, ...appExtData, ...appContentData };
    return Object.keys(mergedFpd).length > 0;
  },
  gppSidIn: (args, context) => () => {
    const gppSids = context.ortb2?.regs?.gpp_sid || [];
    return args[0].some((sid) => gppSids.includes(sid));
  },
  tcfInScope: (args, context) => () => context.ortb2?.regs?.ext?.gdpr === 1,
  domain: (args, context) => () => {
    const domain = context.ortb2?.site?.domain || context.ortb2?.app?.domain || '';
    return domain;
  },
  domainIn: (args, context) => () => {
    const domain = context.ortb2?.site?.domain || context.ortb2?.app?.domain || '';
    return args[0].includes(domain);
  },
  bundle: (args, context) => () => {
    const bundle = context.ortb2?.app?.bundle || '';
    return bundle;
  },
  bundleIn: (args, context) => () => {
    const bundle = context.ortb2?.app?.bundle || '';
    return args[0].includes(bundle);
  },
  mediaTypeIn: (args, context) => () => {
    const mediaTypes = Object.keys(context.adUnit?.mediaTypes) || [];
    return args[0].some((type) => mediaTypes.includes(type));
  },
  deviceTypeIn: (args, context) => () => {
    const deviceType = context.ortb2?.device?.devicetype;
    return args[0].includes(deviceType);
  },
  bidPrice: (args, context) => () => {
    const [operator, currency, value] = args || [];
    const {cpm: bidPrice, currency: bidCurrency} = context.bid || {};
    if (bidCurrency !== currency) {
      return false;
    }
    if (operator === 'gt') {
      return bidPrice > value;
    } else if (operator === 'gte') {
      return bidPrice >= value;
    } else if (operator === 'lt') {
      return bidPrice < value;
    } else if (operator === 'lte') {
      return bidPrice <= value;
    }
    return false;
  }
};

export function evaluateSchema(func, args, context) {
  const evaluator = schemaEvaluators[func];
  if (evaluator) {
    return evaluator(args, context);
  }
  return () => null;
}

function evaluateFunction(func, args, schema, conditions, stage, analyticsKey) {
  switch (func) {
    case 'excludeBidders':
    case 'includeBidders':
      return () => {
        const activity = {
          'processed-auction-request': ACTIVITY_FETCH_BIDS,
          'processed-auction': ACTIVITY_ADD_BID_RESPONSE
        }[stage];
        args.forEach(({bidders, analyticsValue, seatnonbid}) => {
          const unregister = registerActivityControl(activity, MODULE_NAME, (params) => {
            if (params[ACTIVITY_PARAM_COMPONENT_TYPE] !== MODULE_TYPE_BIDDER) return { allow: true };
            let conditionMet = true;
            for (const [index, schemaEntry] of schema.entries()) {
              const schemaFunction = evaluateSchema(schemaEntry.function, schemaEntry.args || [], params);
              if (!evaluateCondition(conditions[index], schemaFunction)) {
                conditionMet = false;
                break;
              }
            }

            if (!conditionMet) {
              return { allow: true };
            }

            const bidderIncluded = bidders.includes(params[ACTIVITY_PARAM_COMPONENT_NAME]);
            const allow = func === 'excludeBidders' ? !bidderIncluded : bidderIncluded;

            if (analyticsKey && analyticsValue) {
              setLabels({ [analyticsKey]: analyticsValue });
            }
            if (!allow) {
              return { allow, reason: `Bidder ${params.bid?.bidder} excluded by rules module` };
            }
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
      return func() === condition;
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

config.getConfig(MODULE_NAME, config => init(config[MODULE_NAME]));
