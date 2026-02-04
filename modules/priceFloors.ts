import {
  debugTurnedOn,
  deepAccess,
  deepClone,
  deepSetValue,
  getParameterByName,
  isNumber,
  logError,
  logInfo,
  logWarn,
  mergeDeep,
  parseGPTSingleSizeArray,
  parseUrl,
  pick,
  deepEqual,
  generateUUID
} from '../src/utils.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {config} from '../src/config.js';
import {ajaxBuilder} from '../src/ajax.js';
import * as events from '../src/events.js';
import { EVENTS, REJECTION_REASON } from '../src/constants.js';
import {getHook} from '../src/hook.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {bidderSettings} from '../src/bidderSettings.js';
import {auctionManager} from '../src/auctionManager.js';
import {IMP, PBS, registerOrtbProcessor, REQUEST} from '../src/pbjsORTB.js';
import {timedAuctionHook, timedBidResponseHook} from '../src/utils/perfMetrics.js';
import {adjustCpm} from '../src/utils/cpm.js';
import {getGptSlotInfoForAdUnitCode} from '../libraries/gptUtils/gptUtils.js';
import {convertCurrency} from '../libraries/currencyUtils/currency.js';
import { timeoutQueue } from '../libraries/timeoutQueue/timeoutQueue.js';
import {ALL_MEDIATYPES, BANNER, type MediaType} from '../src/mediaTypes.js';
import type {Currency, Size, BidderCode} from "../src/types/common.d.ts";
import type {BidRequest} from '../src/adapterManager.ts';
import type {Bid} from "../src/bidfactory.ts";

export const FLOOR_SKIPPED_REASON = {
  NOT_FOUND: 'not_found',
  RANDOM: 'random'
};

/**
 * @summary This Module is intended to provide users with the ability to dynamically set and enforce price floors on a per auction basis.
 */
const MODULE_NAME = 'Price Floors';

/**
 * @summary Instantiate Ajax so we control the timeout
 */
const ajax = ajaxBuilder(10000);

// eslint-disable-next-line symbol-description
const SYN_FIELD = Symbol();

/**
 * @summary Allowed fields for rules to have
 */
export const allowedFields = [SYN_FIELD, 'gptSlot', 'adUnitCode', 'size', 'domain', 'mediaType'] as const;
type DefaultField = { [K in (typeof allowedFields)[number]]: K extends string ? K : never}[(typeof allowedFields)[number]];

/**
 * @summary Global set to track valid userId tier fields
 */
const validUserIdTierFields = new Set<string>();

/**
 * @summary Checks if a field is a valid user ID tier field (userId.tierName)
 * A field is only considered valid if it appears in the validUserIdTierFields set,
 * which is populated during config validation based on explicitly configured userIds.
 * Fields will be rejected if they're not in the configured set, even if they follow the userId.tierName format.
 */
function isUserIdTierField(field: string): boolean {
  if (typeof field !== 'string') return false;

  // Simply check if the field exists in our configured userId tier fields set
  return validUserIdTierFields.has(field);
}

/**
 * @summary This is a flag to indicate if a AJAX call is processing for a floors request
 */
let fetching = false;

/**
 * @summary so we only register for our hooks once
 */
let addedFloorsHook = false;

/**
 * @summary The config to be used. Can be updated via: setConfig or a real time fetch
 */
let _floorsConfig: any = {};

/**
 * @summary If a auction is to be delayed by an ongoing fetch we hold it here until it can be resumed
 */
const _delayedAuctions = timeoutQueue();

/**
 * @summary Each auction can have differing floors data depending on execution time or per adunit setup
 * So we will be saving each auction offset by it's auctionId in order to make sure data is not changed
 * Once the auction commences
 */
export let _floorDataForAuction = {};

/**
 * @summary Simple function to round up to a certain decimal degree
 */
function roundUp(number, precision) {
  return Math.ceil((parseFloat(number) * Math.pow(10, precision) as any).toFixed(1)) / Math.pow(10, precision);
}

const getHostname = (() => {
  let domain;
  return function() {
    if (domain == null) {
      domain = parseUrl(getRefererInfo().topmostLocation, {noDecodeWholeURL: true}).hostname;
    }
    return domain;
  }
})();

/**
 * @summary Check if a bidRequest contains any user IDs from the specified tiers
 * Returns an object with keys like 'userId.tierName' with boolean values (0/1)
 */
export function resolveTierUserIds(tiers, bidRequest) {
  if (!tiers || !bidRequest?.userIdAsEid?.length) {
    return {};
  }

  // Get all available EID sources from the bidRequest (single pass)
  const availableSources = bidRequest.userIdAsEid.reduce((acc: Set<string>, eid: { source?: string }) => {
    if (eid?.source) {
      acc.add(eid.source);
    }
    return acc;
  }, new Set());

  // For each tier, check if any of its sources are available
  return Object.entries(tiers).reduce((result, [tierName, sources]) => {
    const hasAnyIdFromTier = Array.isArray(sources) &&
      sources.some(source => availableSources.has(source));

    result[`userId.${tierName}`] = hasAnyIdFromTier ? 1 : 0;
    return result;
  }, {});
}

function getGptSlotFromAdUnit(adUnitId, {index = auctionManager.index} = {}) {
  const adUnit = index.getAdUnit({adUnitId});
  const isGam = deepAccess(adUnit, 'ortb2Imp.ext.data.adserver.name') === 'gam';
  return isGam && adUnit.ortb2Imp.ext.data.adserver.adslot;
}

function getAdUnitCode(request, response, {index = auctionManager.index} = {}) {
  return request?.adUnitCode || index.getAdUnit(response).code;
}

/**
 * @summary floor field types with their matching functions to resolve the actual matched value
 */
export const fieldMatchingFunctions = {
  [SYN_FIELD]: () => '*',
  'size': (bidRequest, bidResponse) => parseGPTSingleSizeArray(bidResponse.size) || '*',
  'mediaType': (bidRequest, bidResponse) => bidResponse.mediaType || 'banner',
  'gptSlot': (bidRequest, bidResponse) => getGptSlotFromAdUnit((bidRequest || bidResponse).adUnitId) || getGptSlotInfoForAdUnitCode(getAdUnitCode(bidRequest, bidResponse)).gptSlot,
  'domain': getHostname,
  'adUnitCode': (bidRequest, bidResponse) => getAdUnitCode(bidRequest, bidResponse)
} as const;

/**
 * @summary Based on the fields array in floors data, it enumerates all possible matches based on exact match coupled with
 * a "*" catch-all match
 * Returns array of Tuple [exact match, catch all] for each field in rules file
 */
function enumeratePossibleFieldValues(floorFields, bidObject, responseObject) {
  if (!floorFields.length) return [];

  // Get userId tier values if needed
  let userIdTierValues = {};
  const userIdFields = floorFields.filter(isUserIdTierField);
  if (userIdFields.length > 0 && _floorsConfig.userIds) {
    userIdTierValues = resolveTierUserIds(_floorsConfig.userIds, bidObject);
  }

  // generate combination of all exact matches and catch all for each field type
  return floorFields.reduce((accum, field) => {
    let exactMatch: string;
    // Handle userId tier fields
    if (isUserIdTierField(field)) {
      exactMatch = String(userIdTierValues[field] ?? '*');
    } else {
      // Standard fields use the field matching functions
      exactMatch = fieldMatchingFunctions[field](bidObject, responseObject) || '*';
    }

    // storing exact matches as lowerCase since we want to compare case insensitively
    accum.push(exactMatch === '*' ? ['*'] : [exactMatch.toLowerCase(), '*']);
    return accum;
  }, []);
}

/**
 * @summary get's the first matching floor based on context provided.
 * Generates all possible rule matches and picks the first matching one.
 */
export function getFirstMatchingFloor(floorData, bidObject, responseObject = {}) {
  const fieldValues = enumeratePossibleFieldValues(deepAccess(floorData, 'schema.fields') || [], bidObject, responseObject);
  if (!fieldValues.length) {
    return {matchingFloor: undefined}
  }

  // look to see if a request for this context was made already
  const matchingInput = fieldValues.map(field => field[0]).join('-');
  // if we already have gotten the matching rule from this matching input then use it! No need to look again
  const previousMatch = deepAccess(floorData, `matchingInputs.${matchingInput}`);
  if (previousMatch) {
    return {...previousMatch};
  }
  const allPossibleMatches = generatePossibleEnumerations(fieldValues, deepAccess(floorData, 'schema.delimiter') || '|');
  const matchingRule = ((allPossibleMatches) || []).find(hashValue => floorData.values.hasOwnProperty(hashValue));

  const matchingData: any = {
    floorMin: floorData.floorMin || 0,
    floorRuleValue: floorData.values[matchingRule],
    matchingData: allPossibleMatches[0], // the first possible match is an "exact" so contains all data relevant for anlaytics adapters
    matchingRule: matchingRule === floorData.meta?.defaultRule ? undefined : matchingRule
  };
  // use adUnit floorMin as priority!
  const floorMin = deepAccess(bidObject, 'ortb2Imp.ext.prebid.floors.floorMin');
  if (typeof floorMin === 'number') {
    matchingData.floorMin = floorMin;
  }
  matchingData.matchingFloor = Math.max(matchingData.floorMin, matchingData.floorRuleValue);
  // save for later lookup if needed
  deepSetValue(floorData, `matchingInputs.${matchingInput}`, {...matchingData});
  return matchingData;
}

/**
 * @summary Generates all possible rule hash's based on input array of array's
 * The generated list is of all possible key matches based on fields input
 * The list is sorted by least amount of * in rule to most with left most fields taking precedence
 */
function generatePossibleEnumerations(arrayOfFields, delimiter) {
  return arrayOfFields.reduce((accum, currentVal) => {
    const ret = [];
    accum.forEach(obj => {
      currentVal.forEach(obj1 => {
        ret.push(obj + delimiter + obj1)
      });
    });
    return ret;
  }).sort((left, right) => left.split('*').length - right.split('*').length);
}

/**
 * @summary If a the input bidder has a registered cpmadjustment it returns the input CPM after being adjusted
 */
export function getBiddersCpmAdjustment(inputCpm, bid, bidRequest) {
  return parseFloat(adjustCpm(inputCpm, {...bid, cpm: inputCpm}, bidRequest));
}

/**
 * @summary This function takes the original floor and the adjusted floor in order to determine the bidders actual floor
 * With js rounding errors with decimal division we utilize similar method as shown in cpmBucketManager.js
 */
export function calculateAdjustedFloor(oldFloor, newFloor) {
  const pow = Math.pow(10, 10);
  return ((oldFloor * pow) / (newFloor * pow) * (oldFloor * pow)) / pow;
}

/**
 * @summary gets the prebid set sizes depending on the input mediaType
 */
const getMediaTypesSizes = {
  banner: (bid) => deepAccess(bid, 'mediaTypes.banner.sizes') || [],
  video: (bid) => deepAccess(bid, 'mediaTypes.video.playerSize') || [],
  native: (bid) => deepAccess(bid, 'mediaTypes.native.image.sizes') ? [deepAccess(bid, 'mediaTypes.native.image.sizes')] : []
}

/**
 * @summary for getFloor only, before selecting a rule, if a bidAdapter asks for * in their getFloor params
 * Then we may be able to get a better rule than the * ones depending on context of the adUnit
 */
function updateRequestParamsFromContext(bidRequest, requestParams) {
  // if adapter asks for *'s then we can do some logic to infer if we can get a more specific rule based on context of bid
  const mediaTypesOnBid = Object.keys(bidRequest.mediaTypes || {});
  // if there is only one mediaType then we can just use it
  if (requestParams.mediaType === '*' && mediaTypesOnBid.length === 1) {
    requestParams.mediaType = mediaTypesOnBid[0];
  }
  // if they asked for * size, but for the given mediaType there is only one size, we can just use it
  if (requestParams.size === '*' && mediaTypesOnBid.indexOf(requestParams.mediaType) !== -1 && getMediaTypesSizes[requestParams.mediaType] && getMediaTypesSizes[requestParams.mediaType](bidRequest).length === 1) {
    requestParams.size = getMediaTypesSizes[requestParams.mediaType](bidRequest)[0];
  }
  return requestParams;
}

type GetFloorParams = {
  currency?: Currency | '*';
  mediaType?: MediaType | '*';
  size?: Size | '*';
}

declare module '../src/adapterManager' {
  interface BaseBidRequest {
    getFloor: typeof getFloor;
  }
}

declare module '../src/bidderSettings' {
  interface BidderSettings<B extends BidderCode> {
    /**
     * Inverse of bidCpmAdjustment
     */
    inverseBidAdjustment?: (floor: number, bidRequest: BidRequest<B>, params: {[K in keyof GetFloorParams]?: Exclude<GetFloorParams[K], '*'>}) => number;
  }
}

/**
 * @summary This is the function which will return a single floor based on the input requests
 * and matching it to a rule for the current auction
 */
export function getFloor(requestParams: GetFloorParams = {currency: 'USD', mediaType: '*', size: '*'}) {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const bidRequest = this;
  const floorData = _floorDataForAuction[bidRequest.auctionId];
  if (!floorData || floorData.skipped) return {};

  requestParams = updateRequestParamsFromContext(bidRequest, requestParams);
  const floorInfo = getFirstMatchingFloor(floorData.data, {...bidRequest}, {mediaType: requestParams.mediaType, size: requestParams.size});
  let currency = requestParams.currency || floorData.data.currency;

  // if bidder asked for a currency which is not what floors are set in convert
  if (floorInfo.matchingFloor && currency !== floorData.data.currency) {
    try {
      floorInfo.matchingFloor = getGlobal().convertCurrency(floorInfo.matchingFloor, floorData.data.currency, currency);
    } catch (err) {
      logWarn(`${MODULE_NAME}: Unable to get currency conversion for getFloor for bidder ${bidRequest.bidder}. You must have currency module enabled with defaultRates in your currency config`);
      // since we were unable to convert to the bidders requested currency, we send back just the actual floors currency to them
      currency = floorData.data.currency;
    }
  }

  // if cpmAdjustment flag is true and we have a valid floor then run the adjustment on it
  if (floorData.enforcement.bidAdjustment && floorInfo.matchingFloor) {
    // pub provided inverse function takes precedence, otherwise do old adjustment stuff
    const inverseFunction = bidderSettings.get(bidRequest.bidder, 'inverseBidAdjustment');
    if (inverseFunction) {
      const definedParams = Object.fromEntries(
        Object.entries(requestParams).filter(([key, val]) => val !== '*' && ['mediaType', 'size'].includes(key))
      );
      floorInfo.matchingFloor = inverseFunction(floorInfo.matchingFloor, bidRequest, definedParams);
    } else {
      const cpmAdjustment = getBiddersCpmAdjustment(floorInfo.matchingFloor, null, bidRequest);
      floorInfo.matchingFloor = cpmAdjustment ? calculateAdjustedFloor(floorInfo.matchingFloor, cpmAdjustment) : floorInfo.matchingFloor;
    }
  }

  if (floorInfo.floorRuleValue === null) {
    return null;
  }

  if (floorInfo.matchingFloor) {
    return {
      floor: roundUp(floorInfo.matchingFloor, 4),
      currency};
  }
  return {};
}

/**
 * @summary Takes a floorsData object and converts it into a hash map with appropriate keys
 */
export function getFloorsDataForAuction(floorData, adUnitCode?) {
  const auctionFloorData = deepClone(floorData);
  auctionFloorData.schema.delimiter = floorData.schema.delimiter || '|';
  auctionFloorData.values = normalizeRulesForAuction(auctionFloorData, adUnitCode);
  // default the currency to USD if not passed in
  auctionFloorData.currency = auctionFloorData.currency || 'USD';
  return auctionFloorData;
}

/**
 * @summary if adUnitCode needs to be added to the offset then it will add it else just return the values
 */
function normalizeRulesForAuction(floorData, adUnitCode) {
  const fields = floorData.schema.fields;
  const delimiter = floorData.schema.delimiter

  // if we are building the floor data form an ad unit, we need to append adUnit code as to not cause collisions
  const prependAdUnitCode = adUnitCode && fields.indexOf('adUnitCode') === -1 && fields.unshift('adUnitCode');
  return Object.keys(floorData.values).reduce((rulesHash, oldKey) => {
    const newKey = prependAdUnitCode ? `${adUnitCode}${delimiter}${oldKey}` : oldKey
    // we store the rule keys as lower case for case insensitive compare
    rulesHash[newKey.toLowerCase()] = floorData.values[oldKey];
    return rulesHash;
  }, {});
}

/**
 * @summary This function will take the adUnits and generate a floor data object to be used during the auction
 * Only called if no set config or fetch level data has returned
 */
export function getFloorDataFromAdUnits(adUnits) {
  const schemaAu = adUnits.find(au => au.floors?.schema != null);
  return adUnits.reduce((accum, adUnit) => {
    if (adUnit.floors?.schema != null && !deepEqual(adUnit.floors.schema, schemaAu?.floors?.schema)) {
      logError(`${MODULE_NAME}: adUnit '${adUnit.code}' declares a different schema from one previously declared by adUnit '${schemaAu.code}'. Floor config for '${adUnit.code}' will be ignored.`)
      return accum;
    }
    const floors = Object.assign({}, schemaAu?.floors, {values: undefined}, adUnit.floors)
    if (isFloorsDataValid(floors)) {
      // if values already exist we want to not overwrite them
      if (!accum.values) {
        accum = getFloorsDataForAuction(floors, adUnit.code);
        accum.location = 'adUnit';
      } else {
        const newRules = getFloorsDataForAuction(floors, adUnit.code).values;
        // copy over the new rules into our values object
        Object.assign(accum.values, newRules);
      }
    } else if (adUnit.floors != null) {
      logWarn(`adUnit '${adUnit.code}' provides an invalid \`floor\` definition, it will be ignored for floor calculations`, adUnit);
    }
    return accum;
  }, {});
}

function getNoFloorSignalBidersArray(floorData) {
  const { data, enforcement } = floorData
  // The data.noFloorSignalBidders higher priority then the enforcment
  if (data?.noFloorSignalBidders?.length > 0) {
    return data.noFloorSignalBidders
  } else if (enforcement?.noFloorSignalBidders?.length > 0) {
    return enforcement.noFloorSignalBidders
  }
  return []
}

/**
 * @summary This function takes the adUnits for the auction and update them accordingly as well as returns the rules hashmap for the auction
 */
export function updateAdUnitsForAuction(adUnits, floorData, auctionId) {
  const noFloorSignalBiddersArray = getNoFloorSignalBidersArray(floorData)

  adUnits.forEach((adUnit) => {
    // adUnit.bids can be undefined
    adUnit.bids?.forEach(bid => {
      // check if the bidder is in the no signal list
      const isNoFloorSignaled = noFloorSignalBiddersArray.some(bidderName => bidderName === bid.bidder)
      if (floorData.skipped || isNoFloorSignaled) {
        isNoFloorSignaled && logInfo(`noFloorSignal to ${bid.bidder}`)
        delete bid.getFloor;
      } else {
        bid.getFloor = getFloor;
      }
      // information for bid and analytics adapters
      bid.auctionId = auctionId;
      bid.floorData = {
        noFloorSignaled: isNoFloorSignaled,
        skipped: floorData.skipped,
        skipRate: deepAccess(floorData, 'data.skipRate') ?? floorData.skipRate,
        skippedReason: floorData.skippedReason,
        floorMin: floorData.floorMin,
        modelVersion: deepAccess(floorData, 'data.modelVersion'),
        modelWeight: deepAccess(floorData, 'data.modelWeight'),
        modelTimestamp: deepAccess(floorData, 'data.modelTimestamp'),
        location: deepAccess(floorData, 'data.location', 'noData'),
        floorProvider: floorData.floorProvider,
        fetchStatus: _floorsConfig.fetchStatus
      };
    });
  });
}

export function pickRandomModel(modelGroups, weightSum) {
  // we loop through the models subtracting the current model weight from our random number
  // once we are at or below zero, we return the associated model
  let random = Math.floor(Math.random() * weightSum + 1)
  for (let i = 0; i < modelGroups.length; i++) {
    random -= modelGroups[i].modelWeight;
    if (random <= 0) {
      return modelGroups[i];
    }
  }
};

/**
 * @summary Updates the adUnits accordingly and returns the necessary floorsData for the current auction
 */
export function createFloorsDataForAuction(adUnits, auctionId) {
  const resolvedFloorsData = deepClone(_floorsConfig);
  // if using schema 2 pick a model here:
  if (deepAccess(resolvedFloorsData, 'data.floorsSchemaVersion') === 2) {
    // merge the models specific stuff into the top level data settings (now it looks like floorsSchemaVersion 1!)
    const { modelGroups, ...rest } = resolvedFloorsData.data;
    resolvedFloorsData.data = Object.assign(rest, pickRandomModel(modelGroups, rest.modelWeightSum));
  }

  // if we do not have a floors data set, we will try to use data set on adUnits
  const useAdUnitData = Object.keys(deepAccess(resolvedFloorsData, 'data.values') || {}).length === 0;
  if (useAdUnitData) {
    resolvedFloorsData.data = getFloorDataFromAdUnits(adUnits);
  } else {
    resolvedFloorsData.data = getFloorsDataForAuction(resolvedFloorsData.data);
  }
  // if we still do not have a valid floor data then floors is not on for this auction, so skip
  if (Object.keys(deepAccess(resolvedFloorsData, 'data.values') || {}).length === 0) {
    resolvedFloorsData.skipped = true;
    resolvedFloorsData.skippedReason = FLOOR_SKIPPED_REASON.NOT_FOUND
  } else {
    // determine the skip rate now
    const auctionSkipRate = getParameterByName('pbjs_skipRate') || (deepAccess(resolvedFloorsData, 'data.skipRate') ?? resolvedFloorsData.skipRate);
    const isSkipped = Math.random() * 100 < parseFloat(auctionSkipRate);
    resolvedFloorsData.skipped = isSkipped;
    if (isSkipped) resolvedFloorsData.skippedReason = FLOOR_SKIPPED_REASON.RANDOM
  }
  // copy FloorMin to floorData.data
  if (resolvedFloorsData.hasOwnProperty('floorMin')) resolvedFloorsData.data.floorMin = resolvedFloorsData.floorMin;
  // add floorData to bids
  updateAdUnitsForAuction(adUnits, resolvedFloorsData, auctionId);
  return resolvedFloorsData;
}

/**
 * @summary This is the function which will be called to exit our module and continue the auction.
 */
export function continueAuction(hookConfig) {
  if (!hookConfig.hasExited) {
    // We need to know the auctionId at this time. So we will use the passed in one or generate and set it ourselves
    hookConfig.reqBidsConfigObj.auctionId = hookConfig.reqBidsConfigObj.auctionId || generateUUID();
    // now we do what we need to with adUnits and save the data object to be used for getFloor and enforcement calls
    _floorDataForAuction[hookConfig.reqBidsConfigObj.auctionId] = createFloorsDataForAuction(hookConfig.reqBidsConfigObj.adUnits || getGlobal().adUnits, hookConfig.reqBidsConfigObj.auctionId);
    hookConfig.nextFn.apply(hookConfig.context, [hookConfig.reqBidsConfigObj]);
    hookConfig.hasExited = true;
  }
}

function validateSchemaFields(fields) {
  if (Array.isArray(fields) && fields.length > 0) {
    if (fields.every(field => allowedFields.includes(field) || isUserIdTierField(field))) {
      return true;
    } else {
      logError(`${MODULE_NAME}: Fields received do not match allowed fields`);
    }
  }
  return false;
}

function isValidRule(key, floor, numFields, delimiter) {
  if (typeof key !== 'string' || key.split(delimiter).length !== numFields) {
    return false;
  }
  return typeof floor === 'number' || floor === null;
}

function validateRules(floorsData, numFields, delimiter) {
  if (typeof floorsData.values !== 'object') {
    return false;
  }
  // if an invalid rule exists we remove it
  floorsData.values = Object.keys(floorsData.values).reduce((filteredRules, key) => {
    if (isValidRule(key, floorsData.values[key], numFields, delimiter)) {
      filteredRules[key] = floorsData.values[key];
    }
    return filteredRules
  }, {});
  // rules is only valid if at least one rule remains
  return Object.keys(floorsData.values).length > 0;
}

export function normalizeDefault(model) {
  if (isNumber(model.default)) {
    let defaultRule = '*';
    const numFields = (model.schema?.fields || []).length;
    if (!numFields) {
      deepSetValue(model, 'schema.fields', [SYN_FIELD]);
    } else {
      defaultRule = Array(numFields).fill('*').join(model.schema?.delimiter || '|');
    }
    model.values = model.values || {};
    if (model.values[defaultRule] == null) {
      model.values[defaultRule] = model.default;
      model.meta = {defaultRule};
    }
  }
  return model;
}

function modelIsValid(model) {
  model = normalizeDefault(model);
  // schema.fields has only allowed attributes
  if (!validateSchemaFields(deepAccess(model, 'schema.fields'))) {
    return false;
  }
  return validateRules(model, model.schema.fields.length, model.schema.delimiter || '|')
}

/**
 * @summary Mapping of floor schema version to it's corresponding validation
 */
const floorsSchemaValidation = {
  1: data => modelIsValid(data),
  2: data => {
    // model groups should be an array with at least one element
    if (!Array.isArray(data.modelGroups) || data.modelGroups.length === 0) {
      return false;
    }
    // every model should have valid schema, as well as an accompanying modelWeight
    data.modelWeightSum = 0;
    return data.modelGroups.every(model => {
      if (typeof model.modelWeight === 'number' && modelIsValid(model)) {
        data.modelWeightSum += model.modelWeight;
        return true;
      }
      return false;
    });
  }
};

/**
 * @summary Fields array should have at least one entry and all should match allowed fields
 * Each rule in the values array should have a 'key' and 'floor' param
 * And each 'key' should have the correct number of 'fields' after splitting
 * on the delim. If rule does not match remove it. return if still at least 1 rule
 */
export function isFloorsDataValid(floorsData) {
  if (typeof floorsData !== 'object') {
    return false;
  }
  floorsData.floorsSchemaVersion = floorsData.floorsSchemaVersion || 1;
  if (typeof floorsSchemaValidation[floorsData.floorsSchemaVersion] !== 'function') {
    logError(`${MODULE_NAME}: Unknown floorsSchemaVersion: `, floorsData.floorsSchemaVersion);
    return false;
  }
  return floorsSchemaValidation[floorsData.floorsSchemaVersion](floorsData);
}

/**
 * @summary This function updates the global Floors Data field based on the new one passed in if it is valid
 */
export function parseFloorData(floorsData, location) {
  if (floorsData && typeof floorsData === 'object' && isFloorsDataValid(floorsData)) {
    logInfo(`${MODULE_NAME}: A ${location} set the auction floor data set to `, floorsData);
    return {
      ...floorsData,
      location
    };
  }
  logError(`${MODULE_NAME}: The floors data did not contain correct values`, floorsData);
}

/**
 *
 * @param {Object} reqBidsConfigObj required; This is the same param that's used in pbjs.requestBids.
 * @param {function} fn required; The next function in the chain, used by hook.ts
 */
export const requestBidsHook = timedAuctionHook('priceFloors', function requestBidsHook(fn, reqBidsConfigObj) {
  // preserves all module related variables for the current auction instance (used primiarily for concurrent auctions)
  const hookConfig = {
    reqBidsConfigObj,
    context: this,
    nextFn: fn,
    hasExited: false,
    timer: null
  };

  // If auction delay > 0 AND we are fetching -> Then wait until it finishes
  if (_floorsConfig.auctionDelay > 0 && fetching) {
    _delayedAuctions.submit(_floorsConfig.auctionDelay, () => continueAuction(hookConfig), () => {
      logWarn(`${MODULE_NAME}: Fetch attempt did not return in time for auction`);
      _floorsConfig.fetchStatus = 'timeout';
      continueAuction(hookConfig);
    });
  } else {
    continueAuction(hookConfig);
  }
});

/**
 * This function handles the ajax response which comes from the user set URL to fetch floors data from
 * @param {object} fetchResponse The floors data response which came back from the url configured in config.floors
 */
export function handleFetchResponse(fetchResponse) {
  fetching = false;
  _floorsConfig.fetchStatus = 'success';
  let floorResponse;
  try {
    floorResponse = JSON.parse(fetchResponse);
  } catch (ex) {
    floorResponse = fetchResponse;
  }
  // Update the global floors object according to the fetched data
  const fetchData = parseFloorData(floorResponse, 'fetch');
  if (fetchData) {
    // set .data to it
    _floorsConfig.data = fetchData;
    // set skipRate override if necessary
    _floorsConfig.skipRate = isNumber(fetchData.skipRate) ? fetchData.skipRate : _floorsConfig.skipRate;
    _floorsConfig.floorProvider = fetchData.floorProvider || _floorsConfig.floorProvider;
  }

  // if any auctions are waiting for fetch to finish, we need to continue them!
  _delayedAuctions.resume();
}

function handleFetchError(status) {
  fetching = false;
  _floorsConfig.fetchStatus = 'error';
  logError(`${MODULE_NAME}: Fetch errored with: `, status);

  // if any auctions are waiting for fetch to finish, we need to continue them!
  _delayedAuctions.resume();
}

/**
 * This function handles sending and receiving the AJAX call for a floors fetch
 * @param {object} floorEndpoint the floors endpoint coming from setConfig
 */
export function generateAndHandleFetch(floorEndpoint) {
  // if a fetch url is defined and one is not already occurring, fire it!
  if (floorEndpoint.url && !fetching) {
    // default to GET and we only support GET for now
    const requestMethod = floorEndpoint.method || 'GET';
    if (requestMethod !== 'GET') {
      logError(`${MODULE_NAME}: 'GET' is the only request method supported at this time!`);
    } else {
      ajax(floorEndpoint.url, { success: handleFetchResponse, error: handleFetchError }, null, { method: 'GET' });
      fetching = true;
    }
  } else if (fetching) {
    logWarn(`${MODULE_NAME}: A fetch is already occurring. Skipping.`);
  }
}

/**
 * @summary Updates our allowedFields and fieldMatchingFunctions with the publisher defined new ones
 */
function addFieldOverrides(overrides) {
  Object.keys(overrides).forEach((override: any) => {
    // we only add it if it is not already in the allowed fields and if the passed in value is a function
    if (allowedFields.indexOf(override) === -1 && typeof overrides[override] === 'function') {
      (allowedFields as any).push(override);
      fieldMatchingFunctions[override] = overrides[override];
    }
  });
}

type FloorsDef = {
  /**
   * Optional atribute used to signal to the Floor Provider’s Analytics adapter their floors are being applied.
   * They can opt to log only floors that are applied when they are the provider. If floorProvider is supplied in
   * both the top level of the floors object and within the data object, the data object’s configuration shall prevail.
   */
  floorProvider?: string;
  /**
   * Currency of floor data. Floor Module will convert currency where necessary.
   */
  currency?: Currency;
  /**
   * Used by floor providers to train on model version performance.
   * The expectation is a floor provider’s analytics adapter will pass the model verson back for algorithm training.
   */
  modelVersion?: string;
  schema: {
    /**
     * Character separating the floor keys. Default is "|".
     */
    delimiter?: string;
    fields: (DefaultField | string)[]
  };
  /**
   * Floor used if no matching rules are found.
   */
  default?: number;
  /**
   * Map from delimited field of attribute values to a floor value.
   */
  values: {
    [rule: string]: number;
  }
}

type BaseFloorData = {
  /**
   * Epoch timestamp associated with modelVersion.
   * Can be used to track model creation of floor file for post auction analysis.
   */
  modelTimestamp?: string;
  /**
   * skipRate is a number between 0 and 100 to determine when to skip all floor logic, where 0 is always use floor data and 100 is always skip floor data.
   */
  skipRate?: number;
}

export type Schema1FloorData = FloorsDef & BaseFloorData & {
  floorsSchemaVersion?: 1;
}

export type Schema2FloorData = BaseFloorData & {
  floorsSchemaVersion: 2;
  modelGroups: (FloorsDef & {
    /**
     * Used by the module to determine when to apply the specific model.
     */
    modelWeight: number;
    /**
     * This is an array of bidders for which to avoid sending floors.
     * This is useful for bidders where the publisher has established different floor rules in their systems.
     */
    noFloorSignalBidders?: BidderCode[];
  })[]
}

declare module '../src/adUnits' {
  interface AdUnitDefinition {
    floors?: Partial<Schema1FloorData>;
  }
}

export type FloorsConfig = Pick<Schema1FloorData, 'skipRate' | 'floorProvider'> & {
  enabled?: boolean;
  /**
   * The mimimum CPM floor used by the Price Floors Module.
   * The Price Floors Module will take the greater of floorMin and the matched rule CPM when evaluating getFloor() and enforcing floors.
   */
  floorMin?: number;
  /**
   * Configuration for user ID tiers. Each tier is an array of EID sources
   * that will be matched against available EIDs in the bid request.
   */
  userIds?: {
    [tierName: string]: string[];
  };
  enforcement?: Pick<Schema2FloorData['modelGroups'][0], 'noFloorSignalBidders'> & {
    /**
     * If set to true (the default), the Price Floors Module will provide floors to bid adapters for bid request
     * matched rules and suppress any bids not exceeding a matching floor.
     * If set to false, the Price Floors Module will still provide floors for bid adapters, there will be no floor enforcement.
     */
    enforceJS?: boolean;
    /**
     * If set to true (the default), the Price Floors Module will signal to Prebid Server to pass floors to it’s bid
     * adapters and enforce floors.
     * If set to false, the pbjs should still pass matched bid request floor data to PBS, however no enforcement will take place.
     */
    enforcePBS?: boolean;
    /**
     * Enforce floors for deal bid requests. Default is false.
     */
    floorDeals?: boolean;
    /**
     * If true (the default), the Price Floors Module will use the bidAdjustment function to adjust the floor
     * per bidder.
     * If false (or no bidAdjustment function is provided), floors will not be adjusted.
     * Note: Setting this parameter to false may have unexpected results, such as signaling a gross floor when
     * expecting net or vice versa.
     */
    bidAdjustment?: boolean;
  }
  /**
   * Map from custom field name to a function generating that field's value for either a bid or a bid request.
   */
  additionalSchemaFields?: {
    [field: string]: (bidRequest?: BidRequest<BidderCode>, bid?: Bid) => string
  }
  /**
   * How long (in milliseconds) auctions should be delayed to wait for dynamic floor data.
   */
  auctionDelay?: number;
  endpoint?: {
    /**
     * URL of endpoint to retrieve dynamic floor data.
     */
    url: string;
  };
  data?: Schema1FloorData | Schema2FloorData;
}

declare module '../src/config' {
  interface Config {
    floors?: FloorsConfig;
  }
}

/**
 * @summary This is the function which controls what happens during a pbjs.setConfig({...floors: {}}) is called
 */
export function handleSetFloorsConfig(config) {
  _floorsConfig = pick(config, [
    'floorMin',
    'enabled', enabled => enabled !== false, // defaults to true
    'auctionDelay', auctionDelay => auctionDelay || 0,
    'floorProvider', floorProvider => deepAccess(config, 'data.floorProvider', floorProvider),
    'endpoint', endpoint => endpoint || {},
    'skipRate', () => !isNaN(deepAccess(config, 'data.skipRate')) ? config.data.skipRate : config.skipRate || 0,
    'userIds', validateUserIdsConfig,
    'enforcement', enforcement => pick(enforcement || {}, [
      'enforceJS', enforceJS => enforceJS !== false, // defaults to true
      'enforcePBS', enforcePBS => enforcePBS === true, // defaults to false
      'floorDeals', floorDeals => floorDeals === true, // defaults to false
      'bidAdjustment', bidAdjustment => bidAdjustment !== false, // defaults to true,
      'noFloorSignalBidders', noFloorSignalBidders => noFloorSignalBidders || []
    ]),
    'additionalSchemaFields', additionalSchemaFields => typeof additionalSchemaFields === 'object' && Object.keys(additionalSchemaFields).length > 0 ? addFieldOverrides(additionalSchemaFields) : undefined,
    'data', data => (data && parseFloorData(data, 'setConfig')) || undefined
  ]);

  // if enabled then do some stuff
  if (_floorsConfig.enabled) {
    // handle the floors fetch
    generateAndHandleFetch(_floorsConfig.endpoint);

    if (!addedFloorsHook) {
      // register hooks / listening events
      // when auction finishes remove it's associated floor data after 3 seconds so we stil have it for latent responses
      events.on(EVENTS.AUCTION_END, (args) => {
        setTimeout(() => delete _floorDataForAuction[args.auctionId], 3000);
      });

      // we want our hooks to run after the currency hooks
      getHook('requestBids').before(requestBidsHook, 50);
      // if user has debug on then we want to allow the debugging module to run before this, assuming they are testing priceFloors
      // debugging is currently set at 5 priority
      getHook('addBidResponse').before(addBidResponseHook, debugTurnedOn() ? 4 : 50);
      addedFloorsHook = true;
    }
  } else {
    logInfo(`${MODULE_NAME}: Turning off module`);

    _floorsConfig = {};
    _floorDataForAuction = {};

    getHook('addBidResponse').getHooks({hook: addBidResponseHook}).remove();
    getHook('requestBids').getHooks({hook: requestBidsHook}).remove();

    addedFloorsHook = false;
  }
}

export type BidFloorData = {
  floorValue: number;
  floorRule: string;
  floorRuleValue: number;
  floorCurrency: Currency;
  cpmAfterAdjustments: number;
  enforcements: FloorsConfig['enforcement'];
  matchedFields: { [fieldName: string ]: string }
}

declare module '../src/bidfactory' {
  interface BaseBid {
    floorData?: BidFloorData
  }
}

/**
 * @summary Analytics adapters especially need context of what the floors module is doing in order
 * to best create informed models. This function attaches necessary information to the bidResponse object for processing
 */
function addFloorDataToBid(floorData, floorInfo, bid: Partial<Bid>, adjustedCpm) {
  bid.floorData = {
    floorValue: floorInfo.matchingFloor,
    floorRule: floorInfo.matchingRule,
    floorRuleValue: floorInfo.floorRuleValue,
    floorCurrency: floorData.data.currency,
    cpmAfterAdjustments: adjustedCpm,
    enforcements: {...floorData.enforcement},
    matchedFields: {}
  };
  floorData.data.schema.fields.forEach((field, index) => {
    const matchedValue = floorInfo.matchingData.split(floorData.data.schema.delimiter)[index];
    bid.floorData.matchedFields[field] = matchedValue;
  });
}

/**
 * @summary takes the enforcement flags and the bid itself and determines if it should be floored
 */
function shouldFloorBid(floorData, floorInfo, bid) {
  const enforceJS = deepAccess(floorData, 'enforcement.enforceJS') !== false;
  const shouldFloorDeal = deepAccess(floorData, 'enforcement.floorDeals') === true || !bid.dealId;
  const bidBelowFloor = bid.floorData.cpmAfterAdjustments < floorInfo.matchingFloor;
  return enforceJS && (bidBelowFloor && shouldFloorDeal);
}

/**
 * @summary The main driving force of floors. On bidResponse we hook in and intercept bidResponses.
 * And if the rule we find determines a bid should be floored we will do so.
 */
export const addBidResponseHook = timedBidResponseHook('priceFloors', function addBidResponseHook(fn, adUnitCode, bid, reject) {
  const floorData = _floorDataForAuction[bid.auctionId];
  // if no floor data then bail
  if (!floorData || !bid || floorData.skipped) {
    return fn.call(this, adUnitCode, bid, reject);
  }

  const matchingBidRequest = auctionManager.index.getBidRequest(bid);

  // get the matching rule
  const floorInfo = getFirstMatchingFloor(floorData.data, matchingBidRequest, {...bid, size: [bid.width, bid.height]});

  if (!floorInfo.matchingFloor) {
    if (floorInfo.matchingFloor !== 0) logWarn(`${MODULE_NAME}: unable to determine a matching price floor for bidResponse`, bid);
    return fn.call(this, adUnitCode, bid, reject);
  }

  // determine the base cpm to use based on if the currency matches the floor currency
  let adjustedCpm;
  const floorCurrency = floorData.data.currency.toUpperCase();
  const bidResponseCurrency = bid.currency || 'USD'; // if an adapter does not set a bid currency and currency module not on it may come in as undefined
  if (floorCurrency === bidResponseCurrency.toUpperCase()) {
    adjustedCpm = bid.cpm;
  } else if (bid.originalCurrency && floorCurrency === bid.originalCurrency.toUpperCase()) {
    adjustedCpm = bid.originalCpm;
  } else {
    try {
      adjustedCpm = getGlobal().convertCurrency(bid.cpm, bidResponseCurrency.toUpperCase(), floorCurrency);
    } catch (err) {
      logError(`${MODULE_NAME}: Unable do get currency conversion for bidResponse to Floor Currency. Do you have Currency module enabled? ${bid}`);
      return fn.call(this, adUnitCode, bid, reject);
    }
  }

  // ok we got the bid response cpm in our desired currency. Now we need to run the bidders CPMAdjustment function if it exists
  adjustedCpm = getBiddersCpmAdjustment(adjustedCpm, bid, matchingBidRequest);

  // add necessary data information for analytics adapters / floor providers would possibly need
  addFloorDataToBid(floorData, floorInfo, bid, adjustedCpm);

  // now do the compare!
  if (shouldFloorBid(floorData, floorInfo, bid)) {
    // bid fails floor -> throw it out
    reject(REJECTION_REASON.FLOOR_NOT_MET);
    logWarn(`${MODULE_NAME}: ${bid.bidderCode}'s Bid Response for ${adUnitCode} was rejected due to floor not met (adjusted cpm: ${bid?.floorData?.cpmAfterAdjustments}, floor: ${floorInfo?.matchingFloor})`, bid);
    return;
  }
  return fn.call(this, adUnitCode, bid, reject);
});

config.getConfig('floors', config => handleSetFloorsConfig(config.floors));

function tryGetFloor(bidRequest, {currency = config.getConfig('currency.adServerCurrency') || 'USD', mediaType = '*', size = '*'}: GetFloorParams, fn) {
  if (typeof bidRequest.getFloor === 'function') {
    let floor;
    try {
      floor = bidRequest.getFloor({
        currency,
        mediaType,
        size
      }) || {};
    } catch (e) {
      logWarn('Cannot compute floor for bid', bidRequest);
      return;
    }
    floor.floor = parseFloat(floor.floor);
    if (floor.currency != null && floor.floor && !isNaN(floor.floor)) {
      fn(floor.floor, floor.currency);
    }
  }
}

/**
 * Sets bidfloor and bidfloorcur for ORTB imp objects
 */
export function setOrtbImpBidFloor(imp, bidRequest, context) {
  tryGetFloor(bidRequest, {
    currency: context.currency,
    mediaType: context.mediaType || '*',
    size: '*'
  }, (bidfloor, bidfloorcur) => {
    Object.assign(imp, {
      bidfloor,
      bidfloorcur
    });
  })
}

/**
 * Set per-mediatype and per-format bidfloor
 */
export function setGranularBidfloors(imp, bidRequest, context) {
  function setIfDifferent(bidfloor, bidfloorcur) {
    if (bidfloor !== imp.bidfloor || bidfloorcur !== imp.bidfloorcur) {
      deepSetValue(this, 'ext.bidfloor', bidfloor);
      deepSetValue(this, 'ext.bidfloorcur', bidfloorcur);
    }
  }

  Object.values(ALL_MEDIATYPES)
    .filter(mediaType => imp[mediaType] != null)
    .forEach(mediaType => {
      tryGetFloor(bidRequest, {
        currency: imp.bidfloorcur || context?.currency,
        mediaType
      }, setIfDifferent.bind(imp[mediaType]))
    });
  (imp[BANNER]?.format || [])
    .filter(({w, h}) => w != null && h != null)
    .forEach(format => {
      tryGetFloor(bidRequest, {
        currency: imp.bidfloorcur || context?.currency,
        mediaType: BANNER,
        size: [format.w, format.h]
      }, setIfDifferent.bind(format))
    })
}

export function setImpExtPrebidFloors(imp, bidRequest, context) {
  // logic below relates to https://github.com/prebid/Prebid.js/issues/8749 and does the following:
  // 1. check client-side floors (ref bidfloor/bidfloorcur & ortb2Imp floorMin/floorMinCur (if present))
  // 2. set pbs req wide floorMinCur to the first floor currency found when iterating over imp's
  //    (if currency conversion logic present, convert all imp floor values to this currency)
  // 3. compare/store ref to lowest floorMin value as each imp is iterated over
  // 4. set req wide floorMin and floorMinCur values for pbs after iterations are done

  if (imp.bidfloor != null) {
    let {floorMinCur, floorMin} = context.reqContext.floorMin || {};

    if (floorMinCur == null) { floorMinCur = imp.bidfloorcur }
    const ortb2ImpFloorCur = imp.ext?.prebid?.floors?.floorMinCur || imp.ext?.prebid?.floorMinCur || floorMinCur;
    const ortb2ImpFloorMin = imp.ext?.prebid?.floors?.floorMin || imp.ext?.prebid?.floorMin;
    const convertedFloorMinValue = convertCurrency(imp.bidfloor, imp.bidfloorcur, floorMinCur);
    const convertedOrtb2ImpFloorMinValue = ortb2ImpFloorMin && ortb2ImpFloorCur ? convertCurrency(ortb2ImpFloorMin, ortb2ImpFloorCur, floorMinCur) : false;

    const lowestImpFloorMin = convertedOrtb2ImpFloorMinValue && convertedOrtb2ImpFloorMinValue < convertedFloorMinValue
      ? convertedOrtb2ImpFloorMinValue
      : convertedFloorMinValue;

    deepSetValue(imp, 'ext.prebid.floors.floorMin', lowestImpFloorMin);
    if (floorMin == null || floorMin > lowestImpFloorMin) { floorMin = lowestImpFloorMin }
    context.reqContext.floorMin = {floorMin, floorMinCur};
  }
}

/**
 * PBS specific extension: set ext.prebid.floors.enabled = false if floors are processed client-side
 */
export function setOrtbExtPrebidFloors(ortbRequest, bidderRequest, context) {
  if (addedFloorsHook) {
    deepSetValue(ortbRequest, 'ext.prebid.floors.enabled', ortbRequest.ext?.prebid?.floors?.enabled || false);
  }
  if (context?.floorMin) {
    mergeDeep(ortbRequest, {ext: {prebid: {floors: context.floorMin}}})
  }
}

registerOrtbProcessor({type: IMP, name: 'bidfloor', fn: setOrtbImpBidFloor});
// granular floors should be set after both "normal" bidfloors and mediaypes
registerOrtbProcessor({type: IMP, name: 'extBidfloor', fn: setGranularBidfloors, priority: -10})
registerOrtbProcessor({type: IMP, name: 'extPrebidFloors', fn: setImpExtPrebidFloors, dialects: [PBS], priority: -1});
registerOrtbProcessor({type: REQUEST, name: 'extPrebidFloors', fn: setOrtbExtPrebidFloors, dialects: [PBS]});

/**
 * Validate userIds config: must be an object with array values
 * Also populates the validUserIdTierFields set with field names in the format "userId.tierName"
 */
function validateUserIdsConfig(userIds: Record<string, unknown>): Record<string, unknown> {
  if (!userIds || typeof userIds !== 'object') return {};

  // Clear the previous set of valid tier fields
  validUserIdTierFields.clear();

  // Check if userIds is an object with array values
  const invalidKey = Object.entries(userIds).some(([tierName, value]) => {
    if (!Array.isArray(value)) {
      return true;
    }
    // Add the tier field to the validUserIdTierFields set
    validUserIdTierFields.add(`userId.${tierName}`);
    return false;
  });

  if (invalidKey) {
    validUserIdTierFields.clear();
    return {};
  }

  return userIds;
}
