/**
 * This module adds the Anonymised RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will populate real-time data from Anonymised
 * @module modules/anonymisedRtdProvider
 * @requires module:modules/realTimeData
 */
import { getStorageManager } from '../src/storageManager.js';
import { submodule } from '../src/hook.js';
import { isPlainObject, isArray, isStr, isNumber, mergeDeep, logMessage, logWarn, logError } from '../src/utils.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { loadExternalScript } from '../src/adloader.js';
/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */
export function createRtdProvider(moduleName) {
  const MODULE_NAME = 'realTimeData';
  const SUBMODULE_NAME = moduleName;
  const GVLID = 1116;
  const MARKETING_TAG_URL = 'https://static.anonymised.io/light/loader.js';

  /**
   * localStorage key holding the SignalLift blob written by the Anonymised Marketing Tag. It carries
   * several unrelated fields (the CUID, a hashed email); only `iabAudience` is ever read here.
   */
  const SIGNAL_LIFT_STORAGE_KEY = 'anon-sl';

  /**
   * localStorage key holding the SignalLift A/B group, written by the Marketing Tag whenever it
   * writes the sessionStorage copy below. Persisted because the audience data in `anon-sl` is
   * itself in localStorage and so survives across sessions, while a sessionStorage-only group is
   * unknown on the first auction of a new tab - which would have let a returning holdout user's
   * stale audience data through unfiltered (ANON-8367).
   */
  const SIGNAL_LIFT_GROUP_KEY = 'anon-sl-group';

  /**
   * sessionStorage fallback for Marketing Tag versions older than ANON-8367 that only wrote the
   * session-scoped copy of the group.
   */
  const SIGNAL_LIFT_GROUP_SESSION_KEY = 'anon-sl-group-session';
  const HOLDOUT_GROUP = 'h';

  /**
   * IAB Audience Taxonomy 1.1, per the AdCOM segtax registry. Fixed by the taxonomy the Marketing
   * Tag populates, so it is not configurable.
   */
  const IAB_AUDIENCE_SEGTAX = 4;

  const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: SUBMODULE_NAME });
  /**
   * Add real-time data & merge segments.
   * @param ortb2 object to merge into
   * @param {Object} rtd
   */
  function addRealTimeData(ortb2, rtd) {
    if (isPlainObject(rtd.ortb2)) {
      logMessage(`${SUBMODULE_NAME}RtdProvider: merging original: `, ortb2);
      logMessage(`${SUBMODULE_NAME}RtdProvider: merging in: `, rtd.ortb2);
      mergeDeep(ortb2, rtd.ortb2);
    }
  }
  /**
   * Try parsing stringified array of segment IDs.
   * @param {String} data
   */
  function tryParse(data) {
    try {
      return JSON.parse(data);
    } catch (err) {
      logError(`${SUBMODULE_NAME}RtdProvider: failed to parse json:`, data);
      return null;
    }
  }
  /**
   * True when this session was assigned to the SignalLift holdout arm.
   *
   * SignalLift withholds every signal from a percentage of sessions so the revenue lift of the
   * feature can be measured. The Marketing Tag already applies this to the signals it sets on Google
   * Ad Manager; emitting the same audience into the bidstream would put a holdout session back into
   * the treated population through another channel and make the measurement meaningless.
   *
   * The persisted localStorage copy is checked first since it is available on the first auction of
   * a new tab; the sessionStorage copy is a fallback for Marketing Tag versions that predate it.
   *
   * An absent value in both means treatment, not holdout: the keys are only written once the
   * Marketing Tag has run, and the far more common reason for both to be missing is that the tag
   * has not reached that point on this page yet.
   * @returns {boolean}
   */
  function isSignalLiftHoldout() {
    const group = storage.getDataFromLocalStorage(SIGNAL_LIFT_GROUP_KEY) ??
      storage.getDataFromSessionStorage(SIGNAL_LIFT_GROUP_SESSION_KEY);
    return group === HOLDOUT_GROUP;
  }

  /**
   * Build the Seller-Defined Audiences segment from the SignalLift data the Marketing Tag stores.
   *
   * The `ppsEnabled` check is not redundant with the presence of `iabAudience`. The Marketing Tag
   * carries `iabAudience` forward from the previous page view without re-checking whether the feature
   * is still on, so a publisher who turns PPS off keeps a stale audience array in storage
   * indefinitely, with `settings.ppsEnabled` set to false alongside it. The flag is what says the
   * signal is still live; the array only says one was computed at some point.
   *
   * @returns {Object|undefined} an ORTB user.data entry, or undefined when there is nothing to send
   */
  function getPpsSegment() {
    const raw = storage.getDataFromLocalStorage(SIGNAL_LIFT_STORAGE_KEY);
    if (!raw) {
      return undefined;
    }

    // Parsed here rather than through tryParse, which logs the value it failed on. This blob can
    // hold the CUID and a hashed email, and logError emits an AUCTION_DEBUG event whatever the
    // debug setting, so a malformed value would carry those identifiers to any subscriber. The
    // thrown error is not logged either: V8 quotes the first ten characters of the input in a
    // SyntaxError message when the text is malformed from the start. Only the error's class name,
    // which cannot contain stored data, is reported.
    let signalLift;
    try {
      signalLift = JSON.parse(raw);
    } catch (err) {
      logError(`${SUBMODULE_NAME}RtdProvider: could not parse the stored SignalLift value (${err?.name})`);
      return undefined;
    }

    if (!isPlainObject(signalLift)) {
      return undefined;
    }

    if (signalLift.settings?.ppsEnabled !== true) {
      logMessage(`${SUBMODULE_NAME}RtdProvider: PPS is not enabled for this publisher; no SDA segment`);
      return undefined;
    }

    // Deliberately narrow: `anon-sl` also holds the CUID and a hashed email, and neither belongs in
    // user.data. Only the taxonomy IDs are read, and each one is coerced to the string ORTB expects.
    const iabAudience = signalLift.iabAudience;
    if (!isArray(iabAudience)) {
      return undefined;
    }

    const segment = iabAudience
      .filter(id => (isStr(id) && id.trim()) || isNumber(id))
      .map(id => ({ id: String(id) }));

    if (!segment.length) {
      return undefined;
    }

    if (isSignalLiftHoldout()) {
      logMessage(`${SUBMODULE_NAME}RtdProvider: session is in the SignalLift holdout group; no SDA segment`);
      return undefined;
    }

    return {
      name: 'anonymised.io',
      ext: { segtax: IAB_AUDIENCE_SEGTAX },
      segment
    };
  }

  /**
   * Load the Anonymised Marketing Tag script
   * @param {Object} config
   */
  function tryLoadMarketingTag(config) {
    const clientId = config?.params?.tagConfig?.clientId;
    if (typeof clientId !== 'string' || !clientId.trim()) {
      logWarn(`${SUBMODULE_NAME}RtdProvider: clientId missing or invalid; Marketing Tag not loaded.`);
      return;
    }
    logMessage(`${SUBMODULE_NAME}RtdProvider: Loading Marketing Tag`);
    let tagBaseUrl = MARKETING_TAG_URL;
    if (config.params?.tagUrl) {
      logWarn(`${SUBMODULE_NAME}RtdProvider: params.tagUrl is deprecated and will be removed in a future release.`);
      tagBaseUrl = config.params.tagUrl;
    }
    // Check if the script is already loaded (match on host/path only to handle http://, https://, and protocol-relative URLs)
    if (document.querySelector(`script[src*="${tagBaseUrl.replace(/^https?:\/\//, '')}"]`)) {
      logMessage(`${SUBMODULE_NAME}RtdProvider: Marketing Tag already loaded`);
      return;
    }
    const tagConfig = config.params?.tagConfig ? { ...config.params.tagConfig, idw_client_id: config.params.tagConfig.clientId } : {};
    delete tagConfig.clientId;

    const tagUrl = `${tagBaseUrl}?ref=prebid&d=${window.location.hostname}`;

    loadExternalScript(tagUrl, MODULE_TYPE_RTD, SUBMODULE_NAME, () => {
      logMessage(`${SUBMODULE_NAME}RtdProvider: Marketing Tag loaded successfully`);
    }, document, tagConfig);
  }

  /**
   * Read the proprietary Anonymised cohort IDs the Marketing Tag stores.
   * @param {Object} config this submodule's publisher configuration
   * @returns {Array|undefined} the cohort IDs, or undefined when there are none to send
   */
  function getCohortSegments(config) {
    const cohortStorageKey = config.params.cohortStorageKey;

    if (cohortStorageKey !== 'cohort_ids') {
      logError(`${SUBMODULE_NAME}RtdProvider: 'cohortStorageKey' should be 'cohort_ids'`);
      return undefined;
    }

    const jsonData = storage.getDataFromLocalStorage(cohortStorageKey);
    if (!jsonData) {
      return undefined;
    }

    // Deliberately a bare truthiness check, matching the behaviour this module has always had:
    // an empty array still produces a segment (with an empty `segment` list), and a stored value
    // that is not an array still throws on `.map` in the caller. Both are long-standing quirks;
    // changing either here would alter what publishers already receive.
    return tryParse(jsonData) || undefined;
  }

  /**
   * Real-time data retrieval from Anonymised
   * @param {Object} reqBidsConfigObj
   * @param {function} onDone
   * @param {Object} config
   * @param {Object} userConsent
   */
  function getRealTimeData(reqBidsConfigObj, onDone, config, userConsent) {
    try {
      if (!config || !isPlainObject(config.params)) {
        return;
      }

      // Two independent segments share one user.data array: the proprietary Anonymised cohort, and
      // the IAB Audience Taxonomy 1.1 audience from SignalLift. Neither is a precondition for the
      // other - a publisher may have cohorts without PPS, PPS without cohorts, or both.
      const userData = [];
      const cohortSegments = getCohortSegments(config);

      if (cohortSegments) {
        userData.push({
          name: 'anonymised.io',
          ext: {
            segtax: config.params.segtax
          },
          segment: cohortSegments.map(x => ({ id: x }))
        });
      }

      const ppsSegment = getPpsSegment();
      if (ppsSegment) {
        userData.push(ppsSegment);
      }

      if (!userData.length) {
        return;
      }

      logMessage(`${SUBMODULE_NAME}RtdProvider: user.data: `, userData);
      const user = { data: userData };

      // Unchanged: the keywords side effect carries the cohort IDs only, and only for appnexus. The
      // SDA segment has no keywords equivalent - appnexus reads segtax 4 from user.data directly.
      if (cohortSegments && config.params.bidders?.includes('appnexus')) {
        user.keywords = cohortSegments.map(x => `perid=${x}`).join(',');
      }

      addRealTimeData(reqBidsConfigObj.ortb2Fragments?.global, { ortb2: { user } });
    } finally {
      // The RTD module holds the auction open until every `waitForIt` submodule calls back, so this
      // has to run on every path, including the ones that contribute nothing.
      onDone();
    }
  }

  /**
   * Module init
   * @param {Object} config
   * @param {Object} userConsent
   * @return {boolean}
   */
  function init(config, userConsent) {
    tryLoadMarketingTag(config);
    return true;
  }
  /** @type {RtdSubmodule} */
  const rtdSubmodule = {
    name: SUBMODULE_NAME,
    gvlid: GVLID,
    getBidRequestData: getRealTimeData,
    init: init
  };

  submodule(MODULE_NAME, rtdSubmodule);

  return {
    getRealTimeData,
    rtdSubmodule,
    storage
  };
}

export const { getRealTimeData, rtdSubmodule: anonymisedRtdSubmodule, storage } = createRtdProvider('anonymised');
