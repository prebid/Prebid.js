import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
import { deepAccess, generateUUID, logError, logWarn } from '../src/utils.js';
import type { AdUnitDefinition, AdUnitBid, AdUnitBidDefinition } from '../src/adUnits.ts';
import type { StartAuctionOptions } from '../src/prebid.ts';
import type { AllConsentData } from '../src/consentHandler.ts';
import type { RTDProviderConfig, RtdProviderSpec } from './rtdModule/spec';
import {
  BIDBOOST_RTD_NAME,
  ALL_BIDDERS,
  type BidboostModuleParams,
  type BidboostAdUnitDefinition,
  type BidboostModuleParamsInput,
  type BidboostAdditionalBid,
  type PredictorSnapshot,
  toFiniteNumber,
  getConnectionType,
  hasRequiredParams,
  normalizeBidboostParams,
  setPredictorSnapshotForAuction
} from '../src/bidboostShared.js';

declare module './rtdModule/spec' {
  interface ProviderConfig {
    bidboost: {
      params?: BidboostModuleParamsInput;
    }
  }
}

interface AuctionState {
  group: number | undefined;
  auctionCount: number;
}

type BidRequestData = Parameters<NonNullable<RtdProviderSpec<'bidboost'>['getBidRequestData']>>[0];

interface PredictorRequestBidder {
  c: string;
  u: 0 | 1;
}

interface PredictorRequestPlacement {
  c: string;
  b: PredictorRequestBidder[];
}

interface PredictorRequestPayload {
  c: string;
  s: string;
  g: number;
  f: 0 | 1;
  b: number;
  t: number;
  d: 0;
  p: PredictorRequestPlacement[];
}

interface PredictorResponseBidder {
  c: string;
}

interface PredictorResponsePlacement {
  b?: PredictorResponseBidder[];
}

interface PredictorResponsePayload {
  g?: number;
  b?: number;
  p: Record<string, PredictorResponsePlacement>;
}

interface IndexedAdUnit {
  definition: AdUnitDefinition | BidboostAdUnitDefinition;
  bids: AdUnitBidDefinition[];
  bidsByBidder: Record<string, AdUnitBidDefinition>;
}

interface PredictorRequestContext {
  request: PredictorRequestPayload;
  adUnitsByCode: Record<string, IndexedAdUnit>;
  bidderTimeout: number;
  placementByAdUnitCode: Record<string, string>;
}

let moduleParams: BidboostModuleParams | null = null;
const moduleState: AuctionState = {
  group: undefined,
  auctionCount: 0
};

function resolvePredictorTimeout(timeoutBudgetMs: number, bidderTimeoutMs: number): number {
  const timeoutBudget = toFiniteNumber(timeoutBudgetMs, null);
  if (timeoutBudget !== null && timeoutBudget > 0) {
    return timeoutBudget;
  }

  const bidderTimeout = toFiniteNumber(bidderTimeoutMs, null);
  if (bidderTimeout !== null && bidderTimeout > 0) {
    return bidderTimeout;
  }

  return 500;
}

function resolvePredictorBidderTimeout(
  predictorTimeoutMs: unknown,
  fallbackTimeoutMs: number
): number {
  const predictorTimeout = toFiniteNumber(predictorTimeoutMs, null);
  if (predictorTimeout !== null && predictorTimeout > 0) {
    return predictorTimeout;
  }
  return fallbackTimeoutMs;
}

function createPredictorRequestContext(
  params: BidboostModuleParams,
  request: StartAuctionOptions,
  auctionState: AuctionState
): PredictorRequestContext {
  const adUnits = getAuctionAdUnits(request);
  const adUnitsByCode = buildAdUnitsByCode(adUnits, params.additionalBidders);
  const bidderTimeout = resolveBidderTimeout(request);
  const userIdsByBidder = resolveUserIdAvailability(request, adUnits);
  const placementByAdUnitCode: Record<string, string> = {};

  const predictorRequest: PredictorRequestPayload = {
    c: params.client,
    s: params.site,
    g: auctionState.group ?? 0,
    f: auctionState.auctionCount === 0 ? 1 : 0,
    b: bidderTimeout,
    t: getConnectionType(),
    d: 0,
    p: []
  };

  adUnits.forEach((adUnit) => {
    const indexedAdUnit = adUnitsByCode[adUnit.code];
    if (!indexedAdUnit) {
      return;
    }

    const adUnitDefinition = indexedAdUnit.definition || adUnit;
    const placementCode = params.placementMapper(adUnitDefinition as BidboostAdUnitDefinition);
    placementByAdUnitCode[adUnit.code] = placementCode;
    const placement = getOrAddPlacement(predictorRequest, placementCode);

    const bids = indexedAdUnit.bids;
    bids.forEach((bid) => {
      const bidderCode = getBidderCode(bid);
      if (!bidderCode || params.ignoredBidders.has(bidderCode)) {
        return;
      }

      const mappedBidderCode = params.bidderMapper(bidderCode);
      const bidder = getOrAddBidder(placement, mappedBidderCode);
      bidder.u =
        userIdsByBidder[ALL_BIDDERS] || userIdsByBidder[bidderCode] || userIdsByBidder[mappedBidderCode] ? 1 : 0;
    });
  });

  return {
    request: predictorRequest,
    adUnitsByCode,
    bidderTimeout,
    placementByAdUnitCode
  };
}

function postPredictorRequest(
  request: PredictorRequestPayload,
  timeoutInMilliseconds: number,
  predictorUrl: string
): Promise<PredictorResponsePayload> {
  return new Promise((resolve, reject: (error: unknown) => void) => {
    const requestPredictor = ajaxBuilder(timeoutInMilliseconds);
    requestPredictor(
      `${predictorUrl}/predict`,
      {
        success: (responseText, response) => {
          if (response?.status !== 200) {
            reject(responseText || '<unknown>');
            return;
          }
          try {
            resolve(JSON.parse(responseText) as PredictorResponsePayload);
          } catch (error) {
            reject(error);
          }
        },
        error: (message, error) => {
          reject(error || new Error(message || 'Request failed'));
        }
      },
      JSON.stringify(request),
      {
        method: 'POST',
        contentType: 'text/plain',
        customHeaders: {
          Accept: 'application/json'
        },
        withCredentials: false
      },
    );
  });
}

function applyPredictorResponse(
  params: BidboostModuleParams,
  request: BidRequestData,
  adUnitsByCode: Record<string, IndexedAdUnit>,
  predictorResponse: PredictorResponsePayload
): void {
  const mutableRequest = request as StartAuctionOptions;
  const adUnits = getAuctionAdUnits(request);
  adUnits.forEach((adUnit) => {
    const indexedAdUnit = adUnitsByCode[adUnit.code];
    if (!indexedAdUnit || !Array.isArray(adUnit.bids) || adUnit.bids.length === 0) {
      return;
    }

    const placementCode = params.placementMapper(indexedAdUnit.definition as BidboostAdUnitDefinition);
    const predictions = predictorResponse.p?.[placementCode];
    if (!predictions || !Array.isArray(predictions.b) || predictions.b.length === 0) {
      return;
    }

    const nextBids = adUnit.bids.filter((bid) => {
      const bidderCode = getBidderCode(bid);
      return !bidderCode || params.ignoredBidders.has(bidderCode);
    });
    const includedBidderCodes = new Set(nextBids.map((bid) => getBidderCode(bid)).filter((bidderCode) => !!bidderCode));

    predictions.b.forEach((predictedBidder) => {
      const bidderCode = params.reverseBidderMapper(predictedBidder.c);
      if (params.ignoredBidders.has(bidderCode) || includedBidderCodes.has(bidderCode)) {
        return;
      }
      const bid = indexedAdUnit.bidsByBidder[bidderCode];
      if (bid) {
        includedBidderCodes.add(bidderCode);
        nextBids.push(bid);
      }
    });

    adUnit.bids = nextBids;
  });

  if (predictorResponse.b !== undefined) {
    mutableRequest.timeout = resolvePredictorBidderTimeout(predictorResponse.b, resolveBidderTimeout(mutableRequest));
  }
}

function createPredictorSnapshot(
  context: PredictorRequestContext,
  predictorResponse: PredictorResponsePayload | null,
  groupOverride: number
): PredictorSnapshot {
  return {
    v: 1,
    g: groupOverride,
    b: predictorResponse ? resolvePredictorBidderTimeout(predictorResponse.b, context.bidderTimeout) : context.bidderTimeout,
    t: context.request.t,
    fa: context.request.f,
    m: context.placementByAdUnitCode,
    r: predictorResponse || null
  };
}

function resolveGroupAfterPredictor(
  _context: PredictorRequestContext,
  predictorResponse: PredictorResponsePayload | null,
  previousGroup: number | undefined
): number {
  if (predictorResponse?.g !== undefined) {
    return predictorResponse.g;
  }
  if (previousGroup !== undefined) {
    return previousGroup;
  }
  return 0;
}

function resolveBidderTimeout(request: StartAuctionOptions): number {
  const timeout = toFiniteNumber(request?.timeout, null);
  if (timeout !== null && timeout > 0) {
    return timeout;
  }
  return 3000;
}

function getAuctionAdUnits(request: StartAuctionOptions): AdUnitDefinition[] {
  return Array.isArray(request?.adUnits) ? request.adUnits : [];
}

function buildAdUnitsByCode(
  adUnits: AdUnitDefinition[],
  additionalBidders: BidboostAdUnitDefinition[]
): Record<string, IndexedAdUnit> {
  const adUnitsByCode: Record<string, IndexedAdUnit> = {};
  addAdUnitsToIndex(adUnitsByCode, adUnits);
  addAdUnitsToIndex(adUnitsByCode, additionalBidders);
  return adUnitsByCode;
}

function addAdUnitsToIndex(
  adUnitsByCode: Record<string, IndexedAdUnit>,
  adUnits: (AdUnitDefinition | BidboostAdUnitDefinition)[]
): void {
  if (!Array.isArray(adUnits)) {
    return;
  }

  adUnits.forEach((adUnit) => {
    if (!adUnit?.code) {
      return;
    }

    const indexedAdUnit = adUnitsByCode[adUnit.code] || (adUnitsByCode[adUnit.code] = {
      definition: adUnit,
      bids: [],
      bidsByBidder: {}
    });

    const bids = Array.isArray(adUnit.bids) ? adUnit.bids : [];
    bids.forEach((bid) => {
      const bidderCode = getBidderCode(bid);
      if (!bidderCode || indexedAdUnit.bidsByBidder[bidderCode]) {
        return;
      }

      const typedBid = bid as AdUnitBidDefinition;
      indexedAdUnit.bidsByBidder[bidderCode] = typedBid;
      indexedAdUnit.bids.push(typedBid);
    });
  });
}

function resolveUserIdAvailability(request: StartAuctionOptions, adUnits: AdUnitDefinition[]): Record<string, boolean> {
  const availability: Record<string, boolean> = {};

  const hasGlobalIds =
    hasUserIdSignal(request) ||
    hasUserIdSignal(request?.ortb2Fragments?.global) ||
    hasUserIdSignal(deepAccess(request, 'ortb2Fragments.global'));
  if (hasGlobalIds) {
    availability[ALL_BIDDERS] = true;
  }

  const bidderOrtb2 = deepAccess(request, 'ortb2Fragments.bidder') || {};
  Object.keys(bidderOrtb2).forEach((bidder) => {
    if (hasUserIdSignal((bidderOrtb2 as Record<string, unknown>)[bidder])) {
      availability[bidder] = true;
    }
  });

  adUnits.forEach((adUnit) => {
    const bids = Array.isArray(adUnit?.bids) ? adUnit.bids : [];
    bids.forEach((bid) => {
      const bidderCode = getBidderCode(bid);
      if (bidderCode && hasUserIdSignal(bid)) {
        availability[bidderCode] = true;
      }
    });
  });

  return availability;
}

function hasUserIdSignal(input: unknown): boolean {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const userId = deepAccess(input, 'userId');
  if (userId && typeof userId === 'object' && Object.keys(userId).length > 0) {
    return true;
  }

  const eids =
    deepAccess(input, 'userIdAsEids') ||
    deepAccess(input, 'userIdAsEid') ||
    deepAccess(input, 'user.eids') ||
    deepAccess(input, 'ortb2.user.eids') ||
    deepAccess(input, 'ortb2.user.ext.eids') ||
    deepAccess(input, 'user.ext.eids');

  return Array.isArray(eids) ? eids.length > 0 : !!eids;
}

function getOrAddPlacement(request: PredictorRequestPayload, placementCode: string): PredictorRequestPlacement {
  for (const placement of request.p) {
    if (placement.c === placementCode) {
      return placement;
    }
  }

  const placement: PredictorRequestPlacement = { c: placementCode, b: [] };
  request.p.push(placement);
  return placement;
}

function getOrAddBidder(placement: PredictorRequestPlacement, bidderCode: string): PredictorRequestBidder {
  for (const bidder of placement.b) {
    if (bidder.c === bidderCode) {
      return bidder;
    }
  }

  const bidder: PredictorRequestBidder = { c: bidderCode, u: 0 };
  placement.b.push(bidder);
  return bidder;
}

function getBidderCode(bid: AdUnitBid | BidboostAdditionalBid | unknown): string | null {
  if (!bid || typeof bid !== 'object' || !('bidder' in bid)) {
    return null;
  }

  const bidder = (bid as { bidder?: unknown }).bidder;
  return typeof bidder === 'string' ? bidder : null;
}

export const bidboostSubmodule: RtdProviderSpec<'bidboost'> = {
  name: BIDBOOST_RTD_NAME,

  init(config: RTDProviderConfig<'bidboost'>, consent: AllConsentData) {
    // Consent checks are enforced by Prebid activity controls before this module runs.
    void consent;

    const params = normalizeBidboostParams(config?.params);
    if (!hasRequiredParams(params)) {
      logError('bidboostRtdProvider: missing required params "client" and/or "site"');
      return false;
    }

    moduleParams = params;
    moduleState.group = 0;
    moduleState.auctionCount = 0;
    return true;
  },

  getBidRequestData(request, done, _config, consent, timeoutBudgetMs) {
    // Consent checks are enforced by Prebid activity controls before this module runs.
    void consent;

    if (!moduleParams) {
      done();
      return;
    }

    request.auctionId ??= generateUUID();

    const activeParams = moduleParams;
    const auctionRequest = request as StartAuctionOptions;
    const context = createPredictorRequestContext(activeParams, auctionRequest, moduleState);
    const predictorTimeout = resolvePredictorTimeout(timeoutBudgetMs, context.bidderTimeout);
    postPredictorRequest(context.request, predictorTimeout, activeParams.predictorUrl)
      .then((predictorResponse) => {
        applyPredictorResponse(activeParams, auctionRequest, context.adUnitsByCode, predictorResponse);
        return predictorResponse;
      })
      .catch((error) => {
        logWarn('bidboostRtdProvider: predictor request failed', error);
        return null;
      })
      .then((predictorResponse) => {
        const resolvedGroup = resolveGroupAfterPredictor(context, predictorResponse, moduleState.group);
        moduleState.group = resolvedGroup;
        const snapshot = createPredictorSnapshot(context, predictorResponse, resolvedGroup);
        setPredictorSnapshotForAuction(request.auctionId!, snapshot);
        moduleState.auctionCount += 1;
      })
      .catch((error) => {
        logWarn('bidboostRtdProvider: failed to process auction', error);
      })
      .then(done, done);
  }
};

submodule('realTimeData', bidboostSubmodule as unknown as RtdProviderSpec<string>);
