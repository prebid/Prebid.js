/**
 * This module measures, for each ad slot, its on-screen position and
 * viewability (visible ratio) on the client, and injects the result into
 * `adUnit.ortb2Imp.ext.data.adslot` so that it flows into every bidder's
 * bid request. The UNICORN bid adapter reads it back from `bidRequest.ortb2Imp`.
 *
 * This is the "measurement" half of the UNICORN attention-first signal.
 * The "send" half lives in modules/unicornBidAdapter.js.
 *
 * @module modules/unicornRtdProvider
 * @requires module:modules/realTimeData
 */
import { submodule } from '../src/hook.js';
import { deepAccess, deepSetValue, logInfo, logWarn } from '../src/utils.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';
import { getWinDimensions } from '../src/utils/winDimensions.js';
import { getGptSlotInfoForAdUnitCode } from '../libraries/gptUtils/gptUtils.js';

const MODULE_NAME = 'unicorn';
const ORTB2_NAMESPACE = 'adslot'; // -> ortb2Imp.ext.data.adslot (adapter re-maps to wire imp.ext.adslot)
const SIGNAL_VERSION = 1; // imp.ext.adslot schema version

const CLIENT_SUPPORTS_IO =
  window.IntersectionObserver &&
  window.IntersectionObserverEntry &&
  'intersectionRatio' in window.IntersectionObserverEntry.prototype;

// adUnitCode(=div id) -> { ratio, fixed, slotPosition }
const measurements = {};
let observer;

/**
 * RTD submodule init. Starts an IntersectionObserver to keep visibility
 * ratios fresh as the user scrolls. Returns false if unsupported.
 */
function init(config) {
  if (!CLIENT_SUPPORTS_IO) {
    logWarn('[UNICORN RTD] IntersectionObserver unsupported');
    return false;
  }
  observer = new IntersectionObserver(handleIntersection, {
    threshold: [0, 0.25, 0.5, 0.75, 1]
  });
  return true;
}

function handleIntersection(entries) {
  entries.forEach(entry => {
    const code = entry.target.id;
    if (!code) return;
    measurements[code] = measurements[code] || {};
    measurements[code].ratio = entry.intersectionRatio;
  });
}

/**
 * Resolve the slot div id for an adUnit, in priority order:
 *   1) explicit ortb2Imp.ext.data.divId override
 *   2) GPT slot mapping (getSlotElementId) — handles code !== div id
 *   3) the adUnit code itself (when div id === code)
 * Mirrors adagioRtdProvider's resolution.
 */
function resolveDivId(adUnit) {
  const override = deepAccess(adUnit, 'ortb2Imp.ext.data.divId');
  if (override) return override;
  const fromGpt = getGptSlotInfoForAdUnitCode(adUnit.code).divId;
  return fromGpt || adUnit.code;
}

/**
 * Synchronous initial measurement via getBoundingClientRect — this is what
 * makes the value usable on the *first* auction, before IntersectionObserver
 * has had a chance to fire its async callback.
 */
function measureNow(divId) {
  const el = document.getElementById(divId);
  if (!el) return null;
  const code = divId;

  // start observing for ongoing updates (idempotent enough for a PoC)
  try { observer && observer.observe(el); } catch (e) { /* noop */ }

  const rect = getBoundingClientRect(el);
  const dims = getWinDimensions();
  const { innerHeight: vh, innerWidth: vw } = dims;
  // scroll offset of the top document; used to turn viewport-relative rect
  // into document-relative (page-absolute) coordinates.
  const scrollX = dims.document.documentElement.scrollLeft || dims.document.body.scrollLeft || 0;
  const scrollY = dims.document.documentElement.scrollTop || dims.document.body.scrollTop || 0;

  // visible area ratio of the element against the viewport (sync, no Observer)
  const visW = Math.max(0, Math.min(rect.right, vw) - Math.max(rect.left, 0));
  const visH = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
  const area = rect.width * rect.height;
  const ratio = area > 0 ? (visW * visH) / area : 0;

  // "fixed/sticky" detection — attention-first wants non-fixed slots
  const cs = window.getComputedStyle(el);
  const fixed = cs.position === 'fixed' || cs.position === 'sticky';

  // OpenRTB ad position (imp.banner.pos), per AdCOM 1.0 Placement Positions:
  //   2 = Locked (fixed position), 1 = above the fold, 3 = below the fold.
  // Carried via the standard field; ext.adslot.fixed keeps the raw flag too.
  const pos = fixed ? 2 : (rect.top < vh ? 1 : 3);

  return {
    pos,
    // imp.ext.adslot payload (ver 1). x/y are document-relative CSS px.
    signal: {
      ver: SIGNAL_VERSION,
      ratio: measurements[code]?.ratio ?? Number(ratio.toFixed(2)),
      fixed,
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      x: Math.round(rect.left + scrollX),
      y: Math.round(rect.top + scrollY)
    }
  };
}

/**
 * Called by the RTD core during requestBids(), before the auction starts.
 * With `waitForIt: true` + `realTimeData.auctionDelay > 0`, the auction waits
 * until we call `callback()`. We measure on the next animation frame (after
 * the DOM is ready) so slot geometry is settled — the publisher just calls
 * `requestBids()` normally, no page-side delay wiring needed.
 */
function getBidRequestData(reqBidsConfigObj, callback) {
  const measureAndDone = () => {
    (reqBidsConfigObj.adUnits || []).forEach(adUnit => {
      const divId = resolveDivId(adUnit);
      const m = measureNow(divId);
      if (m) {
        deepSetValue(adUnit, `ortb2Imp.ext.data.${ORTB2_NAMESPACE}`, m.signal);
        // standard OpenRTB ad position lives in banner.pos, not in ext.adslot
        deepSetValue(adUnit, 'ortb2Imp.banner.pos', m.pos);
      } else {
        logWarn(`[UNICORN RTD] element not found for adUnit "${adUnit.code}" (divId="${divId}")`);
      }
    });
    logInfo('[UNICORN RTD] injected measurements', measurements);
    callback();
  };

  const afterLayout = () => {
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(measureAndDone);
    } else {
      measureAndDone();
    }
  };

  // Ensure slot elements exist before measuring. All waits stay within the
  // configured auctionDelay budget.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', afterLayout, { once: true });
  } else {
    afterLayout();
  }
}

/** @type {import('../modules/rtdModule/index.js').RtdSubmodule} */
export const unicornSubmodule = {
  name: MODULE_NAME,
  init,
  getBidRequestData
};

submodule('realTimeData', unicornSubmodule);
