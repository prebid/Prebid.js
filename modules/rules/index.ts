import { setLabels } from "../../libraries/analyticsAdapter/AnalyticsAdapter.ts";
import { timeoutQueue } from "../../libraries/timeoutQueue/timeoutQueue.ts";
import { ACTIVITY_ADD_BID_RESPONSE, ACTIVITY_FETCH_BIDS } from "../../src/activities/activities.js";
import { MODULE_TYPE_BIDDER } from "../../src/activities/modules.ts";
import { ACTIVITY_PARAM_COMPONENT_NAME, ACTIVITY_PARAM_COMPONENT_TYPE } from "../../src/activities/params.js";
import { registerActivityControl } from "../../src/activities/rules.js";
import { ajax } from "../../src/ajax.ts";
import { AuctionIndex } from "../../src/auctionIndex.js";
import { auctionManager } from "../../src/auctionManager.js";
import { config } from "../../src/config.ts";
import { getHook } from "../../src/hook.ts";
import { generateUUID, logInfo, logWarn } from "../../src/utils.ts";
import { timedAuctionHook } from "../../src/utils/perfMetrics.ts";

/**
 * Configuration interface for the shaping rules module.
 */
interface ShapingRulesConfig {
  /**
   * Endpoint configuration for fetching rules from a remote server.
   * If not provided, rules must be provided statically via the `rules` property.
   */
  endpoint?: {
    /** URL endpoint to fetch rules configuration from */
    url: string;
    /** HTTP method to use for fetching rules (currently only 'GET' is supported) */
    method: string;
  };
  /**
   * Static rules configuration object.
   * If provided, rules will be used directly without fetching from endpoint.
   * Takes precedence over endpoint configuration.
   */
  rules?: RulesConfig;
  /**
   * Delay in milliseconds to wait for rules to be fetched before starting the auction.
   * If rules are not loaded within this delay, the auction will proceed anyway.
   * Default: 0 (no delay)
   */
  auctionDelay?: number;
  /**
   * Custom schema evaluator functions to extend the default set of evaluators.
   * Keys are function names, values are evaluator functions that take args and context,
   * and return a function that evaluates to a value when called.
   */
  extraSchemaEvaluators?: {
    [key: string]: (args: any[], context: any) => () => any;
  };
}

/**
 * Schema function definition used to compute values.
 */
interface ModelGroupSchema {
  /** Function name inside the schema */
  function: string;
  /** Arguments for the schema function */
  args: any[];
}

/**
 * Model group configuration for A/B testing with different rule configurations.
 * Only one object within the group is chosen based on weight.
 */
interface ModelGroup {
  /** Determines selection probability; only one object within the group is chosen */
  weight: number;
  /** Indicates whether this model group is selected (set automatically based on weight) */
  selected: boolean;
  /** Optional key used to produce aTags, identifying experiments or optimization targets */
  analyticsKey: string;
  /** Version identifier for analytics */
  version: string;
  /**
   * Optional array of functions used to compute values.
   * Without it, only the default rule is applied.
   */
  schema: ModelGroupSchema[];
  /**
   * Optional rule array; if absent, only the default rule is used.
   * Each rule has conditions that must be met and results that are triggered.
   */
  rules: [{
    /** Conditions that must be met for the rule to apply */
    condition: string[];
    /** Resulting actions triggered when conditions are met */
    results: [
      {
        /** Function defining the result action */
        function: string;
        /** Arguments for the result function */
        args: any[];
      }
    ];
  }];
  /**
   * Default results object used if errors occur or when no schema or rules are defined.
   * Exists outside the rules array for structural clarity.
   */
  default?: Array<{
    /** Function defining the default result action */
    function: string;
    /** Arguments for the default result function */
    args: any;
  }>;
}

/**
 * Independent set of rules that can be applied to a specific stage of the auction.
 */
interface RuleSet {
  /** Human-readable name of the ruleset */
  name: string;
  /**
   * Indicates which module stage the ruleset applies to.
   * Can be either `processed-auction-request` or `processed-auction`
   */
  stage: string;
  /** Version identifier for the ruleset */
  version: string;
  /**
   * Optional timestamp of the last update (ISO 8601 format: `YYYY-MM-DDThh:mm:ss[.sss][Z or ±hh:mm]`)
   */
  timestamp?: string;
  /**
   * One or more model groups for A/B testing with different rule configurations.
   * Allows A/B testing with different rule configurations.
   */
  modelGroups: ModelGroup[];
}

/**
 * Main configuration object for the shaping rules module.
 */
interface RulesConfig {
  /** Version identifier for the rules configuration */
  version: string;
  /** One or more independent sets of rules */
  ruleSets: RuleSet[];
  /** Optional timestamp of the last update (ISO 8601 format: `YYYY-MM-DDThh:mm:ss[.sss][Z or ±hh:mm]`) */
  timestamp: string;
  /** Enables or disables the module. Default: `true` */
  enabled: boolean;
}

declare module '../../src/config' {
  interface Config {
    shapingRules?: ShapingRulesConfig;
  }
}

const MODULE_NAME = 'shapingRules';

const globalRandomStore = new WeakMap<{ auctionId: string }, number>();

let auctionConfigStore = new Map<string, any>();

export const dep = {
  getGlobalRandom: getGlobalRandom
};

function getGlobalRandom(auctionId: string, auctionIndex: AuctionIndex = auctionManager.index) {
  if (!auctionId) {
    return Math.random();
  }
  const auction = auctionIndex.getAuction({auctionId});
  if (!globalRandomStore.has(auction)) {
    globalRandomStore.set(auction, Math.random());
  }
  return globalRandomStore.get(auction);
}

const unregisterFunctions: Array<() => void> = []

let moduleConfig: ShapingRulesConfig = {
  endpoint: {
    method: 'GET',
    url: ''
  },
  auctionDelay: 0,
  extraSchemaEvaluators: {}
};

let fetching = false;

let rulesLoaded = false;

const delayedAuctions = timeoutQueue();

let rulesConfig: RulesConfig = null;

export function evaluateConfig(config: RulesConfig, auctionId: string) {
  if (!config || !config.ruleSets) {
    logWarn(`${MODULE_NAME}: Invalid structure for rules engine`);
    return;
  }

  if (!config.enabled) {
    logInfo(`${MODULE_NAME}: Rules engine is disabled in the configuration.`);
    return;
  }

  const stageRules = config.ruleSets;

  const modelGroupsWithStage = getAssignedModelGroups(stageRules || []);

  for (const { modelGroups, stage } of modelGroupsWithStage) {
    const modelGroup = modelGroups.find(group => group.selected);
    if (!modelGroup) continue;
    evaluateRules(modelGroup.rules || [], modelGroup.schema || [], stage, modelGroup.analyticsKey, auctionId, modelGroup.default);
  }
}

export function getAssignedModelGroups(rulesets: RuleSet[]): Array<{ modelGroups: ModelGroup[], stage: string }> {
  return rulesets.flatMap(ruleset => {
    const { modelGroups, stage } = ruleset;
    if (!modelGroups?.length) {
      return [];
    }

    // Calculate cumulative weights for proper weighted random selection
    let cumulativeWeight = 0;
    const groupsWithCumulativeWeights = modelGroups.map(group => {
      const groupWeight = group.weight ?? 100;
      cumulativeWeight += groupWeight;
      return {
        group,
        cumulativeWeight
      };
    });

    const weightSum = cumulativeWeight;
    // Generate random value in range [0, weightSum)
    // This ensures each group gets probability proportional to its weight
    const randomValue = Math.random() * weightSum;

    // Find first group where cumulative weight >= randomValue
    let selectedIndex = groupsWithCumulativeWeights.findIndex(({ cumulativeWeight }) => randomValue < cumulativeWeight);

    // Fallback: if no group was selected (shouldn't happen, but safety check)
    if (selectedIndex === -1) {
      selectedIndex = modelGroups.length - 1;
    }

    // Create new model groups array with selected flag
    const newModelGroups = modelGroups.map((group, index) => ({
      ...group,
      selected: index === selectedIndex
    }));

    return {
      modelGroups: newModelGroups,
      stage
    };
  });
}

function evaluateRules(rules, schema, stage, analyticsKey, auctionId: string, defaultResults?) {
  const modelGroupConfig = auctionConfigStore.get(auctionId) || [];
  modelGroupConfig.push({
    rules,
    schema,
    stage,
    analyticsKey,
    defaultResults,
  });
  auctionConfigStore.set(auctionId, modelGroupConfig);
}

const schemaEvaluators = {
  percent: (args, context) => () => {
    const auctionId = context.auctiondId || context.bid?.auctionId;
    return dep.getGlobalRandom(auctionId) * 100 < args[0]
  },
  adUnitCode: (args, context) => () => context.adUnit.code,
  adUnitCodeIn: (args, context) => () => args[0].includes(context.adUnit.code),
  deviceCountry: (args, context) => () => context.ortb2?.device?.geo?.country,
  deviceCountryIn: (args, context) => () => args[0].includes(context.ortb2?.device?.geo?.country),
  channel: (args, context) => () => 'web',
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
  const extraEvaluators = moduleConfig.extraSchemaEvaluators || {};
  const evaluators = { ...schemaEvaluators, ...extraEvaluators };
  const evaluator = evaluators[func];
  if (evaluator) {
    return evaluator(args, context);
  }
  return () => null;
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

export function fetchRules(endpoint = moduleConfig.endpoint) {
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
      rulesConfig = JSON.parse(response);
      delayedAuctions.resume();
      logInfo(`${MODULE_NAME}: Rules configuration fetched successfully.`);
    },
    error: () => {
      fetching = false;
    }
  }, null, { method: 'GET' });
}

export function registerActivities() {
  const stages = {
    [ACTIVITY_FETCH_BIDS]: 'processed-auction-request',
    [ACTIVITY_ADD_BID_RESPONSE]: 'processed-auction',
  };

  [ACTIVITY_FETCH_BIDS, ACTIVITY_ADD_BID_RESPONSE].forEach(activity => {
    unregisterFunctions.push(
      registerActivityControl(activity, MODULE_NAME, (params) => {
        const auctionId = params.auctionId || params.bid?.auctionId;
        if (params[ACTIVITY_PARAM_COMPONENT_TYPE] !== MODULE_TYPE_BIDDER) return;
        if (!auctionId) return;

        const checkConditions = ({schema, conditions, stage}) => {
          for (const [index, schemaEntry] of schema.entries()) {
            const schemaFunction = evaluateSchema(schemaEntry.function, schemaEntry.args || [], params);
            if (evaluateCondition(conditions[index], schemaFunction)) {
              return true;
            }
          }
          return false;
        }

        const results = [];
        let modelGroups = auctionConfigStore.get(auctionId) || [];
        modelGroups = modelGroups.filter(modelGroup => modelGroup.stage === stages[activity]);

        // evaluate applicable results for each model group
        for (const modelGroup of modelGroups) {
          // find first rule that matches conditions
          const selectedRule = modelGroup.rules.find(rule => checkConditions({...rule, schema: modelGroup.schema}));
          if (selectedRule) {
            results.push(...selectedRule.results);
          } else if (Array.isArray(modelGroup.defaultResults)) {
            const defaults = modelGroup.defaultResults.map(result => ({...result, analyticsKey: modelGroup.analyticsKey}));
            results.push(...defaults);
          }
        }

        // set analytics labels for logAtag results
        results
          .filter(result => result.function === 'logAtag')
          .forEach((result) => {
            setLabels({ [auctionId + '-' + result.analyticsKey]: result.args.analyticsValue });
          });

        // verify current bidder against applicable rules
        const allow = results
          .filter(result => ['excludeBidders', 'includeBidders'].includes(result.function))
          .every((result) => {
            return result.args.every(({bidders}) => {
              const bidderIncluded = bidders.includes(params[ACTIVITY_PARAM_COMPONENT_NAME]);
              return result.function === 'excludeBidders' ? !bidderIncluded : bidderIncluded;
            });
          });

        if (!allow) {
          return { allow, reason: `Bidder ${params.bid?.bidder} excluded by rules module` };
        }
      })
    );
  });
}

export const startAuctionHook = timedAuctionHook('rules', function startAuctionHook(fn, req) {
  req.auctionId = req.auctionId || generateUUID();
  evaluateConfig(rulesConfig, req.auctionId);
  fn.call(this, req);
});

export const requestBidsHook = timedAuctionHook('rules', function requestBidsHook(fn, reqBidsConfigObj) {
  const { auctionDelay = 0 } = moduleConfig;
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

function init(config: ShapingRulesConfig) {
  moduleConfig = config;
  registerActivities();
  auctionManager.onExpiry(auction => {
    auctionConfigStore.delete(auction.getAuctionId());
  });
  // use static config if provided
  if (config.rules) {
    rulesConfig = config.rules;
  } else {
    fetchRules();
  }
  getHook('requestBids').before(requestBidsHook, 50);
  getHook('startAuction').before(startAuctionHook, 50);
}

export function reset() {
  try {
    getHook('requestBids').getHooks({hook: requestBidsHook}).remove();
    getHook('startAuction').getHooks({hook: startAuctionHook}).remove();
    unregisterFunctions.forEach(unregister => unregister());
    unregisterFunctions.length = 0;
    auctionConfigStore.clear();
  } catch (e) {
  }
  setLabels({});
}

config.getConfig(MODULE_NAME, config => init(config[MODULE_NAME]));
