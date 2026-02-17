import { submodule } from '../src/hook.js';
import { logError, logWarn, generateUUID } from '../src/utils.js';

// eslint-disable-next-line no-console
console.log('%c DATAMAGE: Module file loaded successfully ', 'background: #222; color: #bada55');

const MODULE_NAME = 'datamage';

// Cache of latest targeting payload (string scalars + comma-joined lists for legacy use)
let lastTargeting = null;

// ✅ TEST-ONLY: allows spec to reset module-scoped state between tests
function _resetForTest() {
  lastTargeting = null;
}

/**
 * RTD init()
 * Signature: init(config, userConsent)
 */
function init(rtdConfig, userConsent) {
  // eslint-disable-next-line no-console
  console.log('DATAMAGE: init() called with config:', rtdConfig, 'consent:', userConsent);

  const params = (rtdConfig && rtdConfig.params) || {};
  if (!params.api_key) {
    logWarn('DataMage: Missing required param "api_key". Requests may fail.');
  }
  return true;
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

/**
 * Build ORTB segment list from iab_cat_ids (+ optional parallel iab_cats names).
 */
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

/**
 * Convert RTD values into GPT-compatible arrays:
 * - array -> array of strings
 * - comma-string -> split into array
 * - scalar -> [scalar]
 * - empty string/null -> []
 */
function toGptArray(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);

  const s = String(v);
  if (!s) return [];
  if (s.includes(',')) return s.split(',').map((x) => x.trim()).filter(Boolean);
  return [s];
}

/**
 * Publish GPT targeting for direct googletag.pubads().setTargeting() usage on the page.
 * This bypasses Prebid's targetingControls allowlist and works even when there are no bids.
 */
function publishForGpt(targetingObj) {
  if (typeof window === 'undefined' || !targetingObj) return;

  const gptMap = {};
  Object.keys(targetingObj).forEach((k) => {
    gptMap[k] = toGptArray(targetingObj[k]);
  });

  window.__DATAMAGE_GPT_TARGETING__ = gptMap;

  try {
    window.dispatchEvent(new CustomEvent('datamage:gptTargeting', { detail: gptMap }));
  } catch (e) {
    // ignore
  }
}

/**
 * RTD getBidRequestData()
 * Signature: (reqBidsConfigObj, callback, rtdConfig, userConsent)
 */
function getBidRequestData(reqBidsConfigObj, callback, rtdConfig, userConsent) {
  // eslint-disable-next-line no-console
  console.log('DATAMAGE: getBidRequestData() triggered. Starting fetch...');

  try {
    if (!reqBidsConfigObj || !reqBidsConfigObj.ortb2Fragments || !reqBidsConfigObj.ortb2Fragments.global) {
      logWarn('DataMage: Missing reqBidsConfigObj.ortb2Fragments.global; cannot inject ortb2 for this auction.');
      callback();
      return;
    }

    const params = (rtdConfig && rtdConfig.params) || {};
    const selector = params.selector || '';
    const apiKey = params.api_key || '';

    const auctionTimeoutMs = Number(params.auction_timeout_ms ?? 0);
    const fetchTimeoutMs = Number(params.fetch_timeout_ms ?? 2500);

    reqBidsConfigObj.auctionId = reqBidsConfigObj.auctionId || generateUUID();

    const rawPageUrl =
            (typeof window !== 'undefined' && window.location && window.location.href)
              ? window.location.href
              : '';

    const pageUrl = stripPortFromUrl(rawPageUrl);

    let encodedUrl = '';
    try {
      encodedUrl = padBase64(btoa(pageUrl));
    } catch (e) {
      logError('DataMage: URL encoding failed', e);
      callback();
      return;
    }

    const apiUrl =
            `https://opsmage-api.io/context/v3/get?api_key=${encodeURIComponent(apiKey)}` +
            `&content_id=${encodedUrl}` +
            `&prebid=true` +
            `&selector=${encodeURIComponent(selector)}`;

    let callbackFired = false;
    const fireCallbackOnce = () => {
      if (!callbackFired) {
        callbackFired = true;
        callback();
      }
    };

    const auctionTimer = setTimeout(fireCallbackOnce, auctionTimeoutMs);

    const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const fetchTimer = controller ? setTimeout(() => controller.abort(), fetchTimeoutMs) : null;

    fetch(apiUrl, controller ? { signal: controller.signal } : undefined)
      .then(async (response) => {
        if (!response.ok) {
          try { await response.text(); } catch (e) { /* ignore */ }
          logWarn(`DataMage: No processed content (HTTP ${response.status}). Skipping injection.`);
          return null;
        }
        return response.json();
      })
      .then((resJson) => {
        if (!resJson) return;

        // eslint-disable-next-line no-console
        console.log('DATAMAGE: API Response received', resJson);

        const cc = resJson.content_classification;
        if (!cc) {
          logWarn('DataMage: 2xx response but missing content_classification. Skipping injection.');
          return;
        }

        const iabCats = asStringArray(cc.iab_cats);
        const iabCatIds = asStringArray(cc.iab_cat_ids);

        const brandIds = asStringArray(cc.brand_ids);

        const sentimentIds = asStringArray(cc.sentiment_ids);

        const locationIds = asStringArray(cc.location_ids);

        const publicFigureIds = asStringArray(cc.public_figure_ids);

        const restrictedCats = asStringArray(cc.restricted_cats);
        const restrictedCatIds = asStringArray(cc.restricted_cat_ids);

        const opsMageDataId = cc.ops_mage_data_id == null ? '' : String(cc.ops_mage_data_id);
        const resScore = cc.res_score;
        const resScoreBucket = cc.res_score_bucket == null ? '' : String(cc.res_score_bucket);

        // ---- ORTB injection (for bidders) ----
        const ortbContentDataObj = {
          name: 'data-mage.com',
          segment: buildSegments(iabCatIds, iabCats),
          ext: {
            ops_mage_data_id: opsMageDataId,

            brand_ids: brandIds,

            sentiment_ids: sentimentIds,

            location_ids: locationIds,

            public_figure_ids: publicFigureIds,

            restricted_cat_ids: restrictedCatIds,
            restricted_cats: restrictedCats,

            res_score: resScore,
            res_score_bucket: resScoreBucket
          }
        };

        ensureSiteContentData(reqBidsConfigObj.ortb2Fragments.global).push(ortbContentDataObj);

        // ---- Targeting object (canonical, array-based) ----
        const targetingArrays = {
          om_iab_cat_ids: iabCatIds,
          om_iab_cats: iabCats,

          om_brand_ids: brandIds,

          om_sentiment_ids: sentimentIds,

          om_location_ids: locationIds,

          om_public_figure_ids: publicFigureIds,

          om_restricted_cat_ids: restrictedCatIds,

          om_ops_mage_data_id: opsMageDataId,
          om_res_score_bucket: resScoreBucket
        };

        if (resScore != null) {
          targetingArrays.om_res_score = String(resScore);
        }

        publishForGpt(targetingArrays);

        // ---- Legacy string-joined map for getTargetingData() ----
        const join = (arr) => (Array.isArray(arr) ? arr.join(',') : (arr == null ? '' : String(arr)));
        lastTargeting = {
          om_iab_cat_ids: join(iabCatIds),
          om_iab_cats: join(iabCats),

          om_brand_ids: join(brandIds),

          om_sentiment_ids: join(sentimentIds),

          om_location_ids: join(locationIds),

          om_public_figure_ids: join(publicFigureIds),

          om_restricted_cat_ids: join(restrictedCatIds),

          om_ops_mage_data_id: opsMageDataId,
          om_res_score_bucket: resScoreBucket
        };

        if (resScore != null) {
          lastTargeting.om_res_score = String(resScore);
        }
      })
      .catch((error) => {
        if (error && error.name === 'AbortError') {
          logWarn(`DataMage: fetch aborted after ${fetchTimeoutMs}ms (fetch_timeout_ms).`);
        } else {
          logError('DataMage: Fetch error', error);
        }
      })
      .finally(() => {
        if (fetchTimer) clearTimeout(fetchTimer);
        clearTimeout(auctionTimer);
        fireCallbackOnce();
      });
  } catch (e) {
    logError('DataMage: Unexpected error in getBidRequestData()', e);
    callback();
  }
}

/**
 * RTD getTargetingData()
 * Signature: (adUnitArray, rtdConfig, userConsent)
 */
function getTargetingData(adUnitArray, rtdConfig, userConsent) {
  if (!lastTargeting) return {};

  const out = {};
  (adUnitArray || []).forEach((au) => {
    const code = au && au.code;
    if (!code) return;
    out[code] = { ...lastTargeting };
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
