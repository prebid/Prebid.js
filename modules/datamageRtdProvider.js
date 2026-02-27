import { submodule } from '../src/hook.js';
import { logError, logWarn, logInfo, generateUUID } from '../src/utils.js';
import { ajaxBuilder } from '../src/ajax.js';

const MODULE_NAME = 'datamage';

let fetchPromise = null;
let lastTargeting = null;

function _resetForTest() {
  fetchPromise = null; // Clear the network promise cache
  lastTargeting = null; // Clear the data targeting cache
}

function asStringArray(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x));
  return [String(v)];
}

function ensureSiteContentData(globalOrtb2) {
  if (!globalOrtb2.site) globalOrtb2.site = {};
  if (!globalOrtb2.site.content) globalOrtb2.site.content = {};
  if (!Array.isArray(globalOrtb2.site.content.data)) globalOrtb2.site.content.data = [];
  return globalOrtb2.site.content.data;
}

function buildSegments(iabCatIds, iabCats) {
  const ids = asStringArray(iabCatIds);
  const names = Array.isArray(iabCats) ? iabCats.map((x) => String(x)) : [];
  return ids.map((id, idx) => {
    const seg = { id };
    if (names[idx]) seg.name = names[idx];
    return seg;
  });
}

function padBase64(b64) {
  const mod = b64.length % 4;
  return mod ? (b64 + '='.repeat(4 - mod)) : b64;
}

function stripPortFromUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    if (u.port) u.port = '';
    return u.toString();
  } catch (e) {
    return urlStr;
  }
}

function buildApiUrl(params) {
  const apiKey = params.api_key || '';
  const selector = params.selector || '';
  const rawPageUrl = (typeof window !== 'undefined' && window.location?.href) ? window.location.href : '';
  const pageUrl = stripPortFromUrl(rawPageUrl);

  let encodedUrl = '';
  try { encodedUrl = padBase64(btoa(pageUrl)); } catch (e) { }

  return `https://opsmage-api.io/context/v3/get?api_key=${encodeURIComponent(apiKey)}&content_id=${encodedUrl}&prebid=true&selector=${encodeURIComponent(selector)}`;
}

function fetchContextData(apiUrl, fetchTimeoutMs) {
  if (fetchPromise) return fetchPromise;

  const ajax = ajaxBuilder(fetchTimeoutMs);
  fetchPromise = new Promise((resolve, reject) => {
    ajax(apiUrl, {
      success: (responseText) => {
        try { resolve(JSON.parse(responseText)); } catch (err) { reject(err); }
      },
      error: (err) => reject(err)
    });
  });

  return fetchPromise;
}

/**
 * Helper to parse the API payload so we don't repeat mapping logic
 */
function mapApiPayload(cc) {
  const arrayKeys = ['brand_ids', 'sentiment_ids', 'location_ids', 'public_figure_ids', 'restricted_cat_ids', 'restricted_cats'];
  const scalarKeys = ['ops_mage_data_id', 'res_score', 'res_score_bucket'];

  const ext = {};
  const targetingArrays = {};
  lastTargeting = {};

  const iabCats = asStringArray(cc.iab_cats);
  const iabCatIds = asStringArray(cc.iab_cat_ids);
  targetingArrays.om_iab_cat_ids = iabCatIds;
  targetingArrays.om_iab_cats = iabCats;
  lastTargeting.om_iab_cat_ids = iabCatIds.join(',');
  lastTargeting.om_iab_cats = iabCats.join(',');

  arrayKeys.forEach((key) => {
    const vals = asStringArray(cc[key]);
    ext[key] = vals;
    targetingArrays[`om_${key}`] = vals;
    lastTargeting[`om_${key}`] = vals.join(',');
  });

  scalarKeys.forEach((key) => {
    if (cc[key] != null) {
      ext[key] = cc[key];
      targetingArrays[`om_${key}`] = [String(cc[key])];
      lastTargeting[`om_${key}`] = String(cc[key]);
    }
  });

  return { ext, targetingArrays, segment: buildSegments(iabCatIds, iabCats) };
}

// ==========================================
// 1. PUBLISHER TARGETING (Independent of Auction)
// ==========================================
// ==========================================
// 1. PUBLISHER TARGETING (Independent of Auction)
// ==========================================
function init(rtdConfig, userConsent) {
  logInfo('DATAMAGE: init() called. Fetching data for GAM...');

  const params = (rtdConfig && rtdConfig.params) || {};
  if (!params.api_key) logWarn('DataMage: Missing api_key');

  const apiUrl = buildApiUrl(params);
  const fetchTimeoutMs = Number(params.fetch_timeout_ms ?? 2500);

  // Start network request instantly
  fetchContextData(apiUrl, fetchTimeoutMs).then((resJson) => {
    if (!resJson?.content_classification) {
      lastTargeting = null; // Clear stale cache on empty payload
      return;
    }

    const { targetingArrays } = mapApiPayload(resJson.content_classification);

    window.googletag = window.googletag || { cmd: [] };
    window.googletag.cmd.push(() => {
      // --- MODERN GPT API IMPLEMENTATION ---
      const pageTargeting = {};

      // 1. Build a single object containing all valid targeting pairs
      Object.entries(targetingArrays).forEach(([key, value]) => {
        if (value && value.length) {
          pageTargeting[key] = value;
        }
      });

      // 2. Apply page-level targeting in a single configuration call
      if (Object.keys(pageTargeting).length > 0) {
        window.googletag.setConfig({ targeting: pageTargeting });
      }
    });
  }).catch(() => {
    lastTargeting = null; // Clear stale cache on error
  });

  return true;
}

// ==========================================
// 2. ADVERTISER TARGETING (Tied to Auction)
// ==========================================
function getBidRequestData(reqBidsConfigObj, callback, rtdConfig, userConsent) {
  logInfo('DATAMAGE: getBidRequestData() triggered. Attaching to ORTB2...');

  if (!reqBidsConfigObj?.ortb2Fragments?.global) {
    callback();
    return;
  }

  const params = (rtdConfig && rtdConfig.params) || {};
  const apiUrl = buildApiUrl(params);
  const fetchTimeoutMs = Number(params.fetch_timeout_ms ?? 2500);

  reqBidsConfigObj.auctionId = reqBidsConfigObj.auctionId || generateUUID();

  // This will instantly resolve from the cache created in init()
  fetchContextData(apiUrl, fetchTimeoutMs)
    .then((resJson) => {
      if (!resJson?.content_classification) {
        lastTargeting = null; // FIX: Clear stale cache on empty payload
        return;
      }

      const { ext, segment } = mapApiPayload(resJson.content_classification);

      const ortbContentDataObj = { name: 'data-mage.com', segment, ext };
      ensureSiteContentData(reqBidsConfigObj.ortb2Fragments.global).push(ortbContentDataObj);
    })
    .catch((error) => {
      lastTargeting = null; // FIX: Clear stale cache on error
      logError('DataMage: Fetch error', error);
    })
    .finally(() => callback()); // Release the auction!
}

function getTargetingData(adUnitCodes, rtdConfig, userConsent) {
  if (!lastTargeting) return {};

  const out = {};

  // Iterate over the array of string codes passed by Prebid
  (adUnitCodes || []).forEach((code) => {
    if (typeof code === 'string' && code) {
      out[code] = { ...lastTargeting };
    }
  });

  return out;
}

export const datamageRtdSubmodule = {
  name: MODULE_NAME,
  init,
  getBidRequestData,
  getTargetingData,
  _resetForTest
};

submodule('realTimeData', datamageRtdSubmodule);
