/**
 * This module measures, for each ad slot, its on-screen position/geometry and
 * viewability on the client, and injects the result into
 * `adUnit.ortb2Imp.ext.data.adslot` so that it flows into every bidder's bid
 * request. The UNICORN bid adapter reads it back from `bidRequest.ortb2Imp`.
 *
 * Geometry (x/y/w/h/fixed) and the OpenRTB position come from the slot's
 * bounding box; the visibility ratio is delegated to Prebid's shared
 * `percentInView` helper.
 *
 * This is the "measurement" half of the UNICORN attention-first signal.
 * The "send" half lives in modules/unicornBidAdapter.js.
 *
 * @module modules/unicornRtdProvider
 * @requires module:modules/realTimeData
 */
import { submodule } from '../src/hook.js';
import { deepAccess, deepSetValue, logInfo, logWarn } from '../src/utils.js';
import { getWinDimensions } from '../src/utils/winDimensions.js';
import { getGptSlotInfoForAdUnitCode } from '../libraries/gptUtils/gptUtils.js';
import { percentInView } from '../libraries/percentInView/percentInView.js';

const MODULE_NAME = 'unicorn';
const ORTB2_NAMESPACE = 'adslot'; // -> ortb2Imp.ext.data.adslot (adapter re-maps to wire imp.ext.adslot)
const SIGNAL_VERSION = 1; // imp.ext.adslot schema version

/**
 * RTD submodule init. Measurement only needs a DOM, so the submodule is
 * always enabled.
 */
function init() {
  return true;
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
 * Measure a slot's geometry, fixed/sticky state, OpenRTB position and
 * viewability ratio. Returns null when the element cannot be found.
 */
function measureNow(divId) {
  const el = document.getElementById(divId);
  if (!el) return null;

  // Read current geometry directly. The shared getBoundingClientRect helper
  // caches per-auction and could return a prior-auction rectangle here.
  // eslint-disable-next-line no-restricted-properties
  const rect = el.getBoundingClientRect();
  const dims = getWinDimensions();
  const { innerHeight: vh } = dims;
  // scroll offset of the top document; used to turn the viewport-relative rect
  // into document-relative (page-absolute) coordinates.
  const scrollX = dims.document.documentElement.scrollLeft || dims.document.body.scrollLeft || 0;
  const scrollY = dims.document.documentElement.scrollTop || dims.document.body.scrollTop || 0;

  // Visibility ratio (0..1). percentInView is Prebid's shared viewability
  // helper and returns a 0..100 percentage.
  const ratio = Number((percentInView(el) / 100).toFixed(2));

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
      ratio,
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
    logInfo('[UNICORN RTD] injected adslot signals');
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
