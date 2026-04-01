/**
 * Thin Mile RTD client.
 * Pulls pre-hashed targeting values from runtime global and applies slot targeting.
 */
import { submodule } from '../src/hook.js';
import { loadExternalScript } from '../src/adloader.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { auctionManager } from '../src/auctionManager.js';
import { logError, logInfo } from '../src/utils.js';
import type { Bid } from '../src/bidfactory.ts';
import type { AllConsentData } from '../src/consentHandler.ts';
import type { RTDProviderConfig, RtdProviderSpec } from './rtdModule/spec.ts';

type ModuleParams = {
  runtimeScriptUrl?: string;
  runtimeGlobalName?: string;
};

declare module './rtdModule/spec' {
  interface ProviderConfig {
    mile: {
      params?: ModuleParams;
    };
  }
}

type TargetingValue = string | number | boolean | Array<string | number | boolean>;
type TargetingByAdUnit = Record<string, TargetingValue>;
type RuntimeContext = {
  mode: 'auctionInit' | 'bidResponse';
  bidResponse?: Bid;
};

type AuctionSnapshot = {
  adUnitCodes: string[];
  [key: string]: unknown;
};

type AuctionDetails = AuctionSnapshot & {
  adUnits: unknown[];
  bidderRequests: unknown[];
  bidsReceived: unknown[];
};

type AuctionLike = {
  getAdUnitCodes?: () => string[];
  getAdUnits?: () => unknown[];
  getBidRequests?: () => unknown[];
  getBidsReceived?: () => unknown[];
};

type MileRuntimeEngine = {
  getMileTargetingByAdUnit: (
    auctionSnapshot: AuctionSnapshot,
    context: RuntimeContext
  ) => TargetingByAdUnit | null | Promise<TargetingByAdUnit | null>;
};

type ExtractAuctionSnapshot = (auctionDetails: AuctionDetails) => AuctionSnapshot;

type MileRuntimeUtils = {
  extractAuctionSnapshot?: ExtractAuctionSnapshot;
};
type MileRtdProviderSpec = RtdProviderSpec<'mile'> & {
  onAuctionInitEvent?: (auctionDetails: Partial<AuctionDetails>) => void;
  onBidResponseEvent?: (
    bidResponse: Partial<Bid>,
    config: RTDProviderConfig<'mile'>,
    userConsent: AllConsentData
  ) => void;
};
type GoogletagSlot = {
  getSlotElementId?: () => string;
  getAdUnitPath?: () => string;
  setTargeting?: (key: string, value: TargetingValue) => void;
};

type Googletag = {
  cmd?: { push?: (fn: () => void) => void };
  pubads?: () => { getSlots?: () => GoogletagSlot[] };
};

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'mile';
const TARGETING_KEY = 'mile_rtd';
const LOG_PREFIX = '[mileRtdProvider]';
const DEFAULT_ENGINE_GLOBAL = 'mileRtdRuntime';

let moduleParams: ModuleParams = {};
let engineLoadPromise: Promise<boolean> | null = null;

function isRuntimeEngine(value: unknown): value is MileRuntimeEngine {
  return !!value && typeof (value as MileRuntimeEngine).getMileTargetingByAdUnit === 'function';
}

function getRuntimeEngine(): MileRuntimeEngine | null {
  const globalName = moduleParams.runtimeGlobalName || DEFAULT_ENGINE_GLOBAL;
  const runtimeEngine = (window as unknown as Record<string, unknown>)?.[globalName];
  return isRuntimeEngine(runtimeEngine) ? runtimeEngine : null;
}

export function loadRuntimeScript(): Promise<boolean> {
  if (engineLoadPromise) return engineLoadPromise;
  const runtimeScriptUrl = moduleParams.runtimeScriptUrl;
  if (!runtimeScriptUrl) return Promise.resolve(false);

  engineLoadPromise = new Promise<boolean>((resolve) => {
    loadExternalScript(runtimeScriptUrl, MODULE_TYPE_RTD, SUBMODULE_NAME, () => {
      logInfo(LOG_PREFIX, 'runtime script loaded', runtimeScriptUrl);
      resolve(true);
    }, undefined, undefined);
  }).catch((error: unknown) => {
    logError(LOG_PREFIX, 'unable to load runtime script', error);
    engineLoadPromise = null;
    return false;
  });
  return engineLoadPromise;
}

export function getTargetingFromRuntime(
  auctionSnapshot: AuctionSnapshot,
  context: RuntimeContext = { mode: 'auctionInit' }
): Promise<TargetingByAdUnit | null> {
  const runtimeEngine = getRuntimeEngine();
  if (!runtimeEngine) {
    logInfo(LOG_PREFIX, 'runtime engine missing getMileTargetingByAdUnit()');
    return Promise.resolve(null);
  }
  try {
    return Promise.resolve(runtimeEngine.getMileTargetingByAdUnit(auctionSnapshot, context));
  } catch (error: unknown) {
    logError(LOG_PREFIX, 'runtime engine failed while computing targeting', error);
    return Promise.resolve(null);
  }
}

export function setSlotTargeting(
  targetingByAdUnit: TargetingByAdUnit,
  googletag: Googletag | undefined = window.googletag as Googletag | undefined
): boolean {
  if (!googletag?.cmd?.push || typeof googletag.pubads !== 'function') {
    logInfo(LOG_PREFIX, 'GPT is not available, skipping slot targeting');
    return false;
  }
  googletag.cmd.push(() => {
    const slots = googletag.pubads?.()?.getSlots?.() || [];
    slots.forEach((slot) => {
      if (typeof slot?.setTargeting !== 'function') return;
      const slotElementId = slot.getSlotElementId?.();
      const adUnitPath = slot.getAdUnitPath?.();
      const targetingValue = (slotElementId && targetingByAdUnit[slotElementId]) ?? (adUnitPath && targetingByAdUnit[adUnitPath]);
      if (targetingValue != null) slot.setTargeting(TARGETING_KEY, targetingValue);
    });
  });
  return true;
}

function buildAuctionDetailsFromAuction(auction: AuctionLike | undefined): AuctionDetails {
  return {
    adUnitCodes: auction?.getAdUnitCodes?.() || [],
    adUnits: auction?.getAdUnits?.() || [],
    bidderRequests: auction?.getBidRequests?.() || [],
    bidsReceived: auction?.getBidsReceived?.() || [],
  };
}

function extractAuctionSnapshot(auctionDetails: AuctionDetails): AuctionSnapshot {
  const extractSnapshot = ((window as unknown as { mileRtdRuntimeUtils?: MileRuntimeUtils }).mileRtdRuntimeUtils)?.extractAuctionSnapshot;
  if (typeof extractSnapshot === 'function') {
    return extractSnapshot(auctionDetails);
  }
  return { adUnitCodes: auctionDetails.adUnitCodes || [] };
}

function applyRuntimeTargeting(auctionSnapshot: AuctionSnapshot, context: RuntimeContext): Promise<void> {
  return getTargetingFromRuntime(auctionSnapshot, context).then((targetingByAdUnit) => {
    if (targetingByAdUnit && Object.keys(targetingByAdUnit).length > 0) {
      setSlotTargeting(targetingByAdUnit);
    }
  });
}

export function onAuctionInitEvent(auctionDetails: Partial<AuctionDetails> = {}): void {
  const snapshotDetails = auctionDetails.adUnitCodes?.length
    ? (auctionDetails as AuctionDetails)
    : buildAuctionDetailsFromAuction(
      auctionManager.index.getAuction({ auctionId: auctionManager.getLastAuctionId() }) as AuctionLike
    );
  if (!snapshotDetails.adUnitCodes?.length) return;
  const auctionSnapshot = extractAuctionSnapshot(snapshotDetails);
  applyRuntimeTargeting(auctionSnapshot, { mode: 'auctionInit' });
}

export function onBidResponseEvent(
  bidResponse: Partial<Bid>,
  _config: RTDProviderConfig<'mile'>,
  _userConsent: AllConsentData,
  auctionDetailsOverride?: Partial<AuctionDetails>
): void {
  const adUnitCode = bidResponse?.adUnitCode;
  if (!adUnitCode) return;
  const auctionDetails = auctionDetailsOverride || buildAuctionDetailsFromAuction(auctionManager.index.getAuction(bidResponse) as AuctionLike);
  const auctionSnapshot = extractAuctionSnapshot(auctionDetails as AuctionDetails);
  if (!auctionSnapshot.adUnitCodes?.includes(adUnitCode)) {
    auctionSnapshot.adUnitCodes = [...(auctionSnapshot.adUnitCodes || []), adUnitCode];
  }
  applyRuntimeTargeting(auctionSnapshot, { mode: 'bidResponse', bidResponse: bidResponse as Bid });
}

export function init(moduleConfig: RTDProviderConfig<'mile'>): boolean {
  moduleParams = moduleConfig?.params || {};
  if (moduleParams.runtimeScriptUrl) {
    loadRuntimeScript();
  } else {
    logInfo(LOG_PREFIX, 'runtimeScriptUrl not provided; runtime script will not load');
  }
  return true;
}

export const mileRtdSubmodule: MileRtdProviderSpec = {
  name: SUBMODULE_NAME,
  init,
  onAuctionInitEvent,
  onBidResponseEvent: (bidResponse, config, userConsent) => onBidResponseEvent(bidResponse, config, userConsent),
};

export const __testing__ = {
  setModuleParams(params?: ModuleParams): void {
    moduleParams = params || {};
    engineLoadPromise = null;
  },
};

submodule(MODULE_NAME, mileRtdSubmodule);
