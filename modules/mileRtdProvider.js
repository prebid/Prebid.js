/**
 * Thin Mile RTD client.
 * Pulls pre-hashed targeting values from runtime global and applies slot targeting.
 */
import { submodule } from "../src/hook.js";
import { loadExternalScript } from "../src/adloader.js";
import { MODULE_TYPE_RTD } from "../src/activities/modules.js";
import { auctionManager } from "../src/auctionManager.js";
import { logError, logInfo } from "../src/utils.js";

const MODULE_NAME = "realTimeData";
const SUBMODULE_NAME = "mile";
const TARGETING_KEY = "mile_rtd";
const LOG_PREFIX = "[mileRtdProvider]";
const DEFAULT_ENGINE_GLOBAL = "mileRtdRuntime";

let moduleParams = {};
let engineLoadPromise = null;

function isFlooringEnforcedForAuction(auctionDetails = {}) {
  const bidderRequestBids = (auctionDetails?.bidderRequests || []).flatMap(
    (request) => request?.bids || [],
  );
  const bidsReceived = auctionDetails?.bidsReceived || [];
  const allBids = [...bidderRequestBids, ...bidsReceived];
  return allBids.some((bid) => {
    const floorData = bid?.floorData;
    if (!floorData) return false;

    const enforceJS = floorData?.enforcements?.enforceJS;
    if (typeof enforceJS === "boolean") {
      return enforceJS;
    }

    // Some floor data payloads only expose signal/skip flags.
    if (floorData?.skipped === false && floorData?.noFloorSignaled === false) {
      return true;
    }
    return false;
  });
}

function getRuntimeEngine() {
  const globalName = moduleParams?.runtimeGlobalName || DEFAULT_ENGINE_GLOBAL;
  return window?.[globalName];
}

export function loadRuntimeScript() {
  if (engineLoadPromise) return engineLoadPromise;
  const runtimeScriptUrl = moduleParams?.runtimeScriptUrl;
  if (!runtimeScriptUrl) return Promise.resolve(false);

  engineLoadPromise = new Promise((resolve) => {
    loadExternalScript(
      runtimeScriptUrl,
      MODULE_TYPE_RTD,
      SUBMODULE_NAME,
      () => {
        logInfo(LOG_PREFIX, "runtime script loaded", runtimeScriptUrl);
        resolve(true);
      },
    );
  }).catch((error) => {
    logError(LOG_PREFIX, "unable to load runtime script", error);
    engineLoadPromise = null;
    return false;
  });
  return engineLoadPromise;
}

export function getTargetingFromRuntime(auctionSnapshot, context = {}) {
  const runtimeEngine = getRuntimeEngine();
  if (
    !runtimeEngine ||
    typeof runtimeEngine.getMileTargetingByAdUnit !== "function"
  ) {
    logInfo(LOG_PREFIX, "runtime engine missing getMileTargetingByAdUnit()");
    return Promise.resolve(null);
  }
  try {
    return Promise.resolve(
      runtimeEngine.getMileTargetingByAdUnit(auctionSnapshot, context),
    );
  } catch (error) {
    logError(
      LOG_PREFIX,
      "runtime engine failed while computing targeting",
      error,
    );
    return Promise.resolve(null);
  }
}

export function setSlotTargeting(
  targetingByAdUnit,
  googletag = window.googletag,
) {
  if (!googletag?.cmd?.push || typeof googletag.pubads !== "function") {
    logInfo(LOG_PREFIX, "GPT is not available, skipping slot targeting");
    return false;
  }
  googletag.cmd.push(() => {
    const slots = googletag.pubads()?.getSlots?.() || [];
    slots.forEach((slot) => {
      if (typeof slot?.setTargeting !== "function") return;
      const slotElementId = slot.getSlotElementId?.();
      const adUnitPath = slot.getAdUnitPath?.();
      const targetingValue =
        targetingByAdUnit?.[slotElementId] ?? targetingByAdUnit?.[adUnitPath];
      if (targetingValue != null) {
        slot.setTargeting(TARGETING_KEY, targetingValue);
      }
    });
  });
  return true;
}

function buildAuctionDetailsFromAuction(auction) {
  return {
    adUnitCodes: auction?.getAdUnitCodes?.() || [],
    adUnits: auction?.getAdUnits?.() || [],
    bidderRequests: auction?.getBidRequests?.() || [],
    bidsReceived: auction?.getBidsReceived?.() || [],
  };
}

function extractAuctionSnapshot(auctionDetails = {}) {
  const extractSnapshot = window?.mileRtdRuntimeUtils?.extractAuctionSnapshot;
  if (typeof extractSnapshot === "function") {
    return extractSnapshot(auctionDetails);
  }
  return { adUnitCodes: auctionDetails?.adUnitCodes || [] };
}

function applyRuntimeTargeting(auctionSnapshot, context = {}) {
  return getTargetingFromRuntime(auctionSnapshot, context).then(
    (targetingByAdUnit) => {
      if (targetingByAdUnit && Object.keys(targetingByAdUnit).length > 0) {
        setSlotTargeting(targetingByAdUnit);
      }
    },
  );
}

export function onAuctionInitEvent(auctionDetails = {}) {
  let snapshotDetails = auctionDetails;
  if (!auctionDetails?.adUnitCodes?.length) {
    snapshotDetails = buildAuctionDetailsFromAuction(
      auctionManager.index.getAuction({
        auctionId: auctionManager.getLastAuctionId(),
      }),
    );
  }
  if (!snapshotDetails?.adUnitCodes?.length) return;
  if (!isFlooringEnforcedForAuction(snapshotDetails)) {
    logInfo(LOG_PREFIX, "skipping targeting; floor enforcement is disabled");
    return;
  }
  const auctionSnapshot = extractAuctionSnapshot(snapshotDetails);
  applyRuntimeTargeting(auctionSnapshot, { mode: "auctionInit" });
}

export function onBidResponseEvent(
  bidResponse,
  config,
  userConsent,
  auctionDetailsOverride,
) {
  const adUnitCode = bidResponse?.adUnitCode;
  if (!adUnitCode) return;
  const auctionDetails =
    auctionDetailsOverride ||
    buildAuctionDetailsFromAuction(
      auctionManager.index.getAuction(bidResponse || {}),
    );
  if (!isFlooringEnforcedForAuction(auctionDetails)) {
    logInfo(LOG_PREFIX, "skipping targeting; floor enforcement is disabled");
    return;
  }
  const auctionSnapshot = extractAuctionSnapshot(auctionDetails);
  if (!auctionSnapshot.adUnitCodes?.includes(adUnitCode)) {
    auctionSnapshot.adUnitCodes = [
      ...(auctionSnapshot.adUnitCodes || []),
      adUnitCode,
    ];
  }
  applyRuntimeTargeting(auctionSnapshot, { mode: "bidResponse", bidResponse });
}

export function init(moduleConfig) {
  moduleParams = moduleConfig?.params || {};
  if (moduleParams?.runtimeScriptUrl) {
    loadRuntimeScript();
  } else {
    logInfo(
      LOG_PREFIX,
      "runtimeScriptUrl not provided; runtime script will not load",
    );
  }
  return true;
}

export const mileRtdSubmodule = {
  name: SUBMODULE_NAME,
  init,
  onAuctionInitEvent,
  onBidResponseEvent,
};

export const __testing__ = {
  setModuleParams(params) {
    moduleParams = params || {};
    engineLoadPromise = null;
  },
};

submodule(MODULE_NAME, mileRtdSubmodule);
