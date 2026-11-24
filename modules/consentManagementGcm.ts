/**
 * This module adds Google Consent Mode v2 support to Prebid.js. It reads the Consent Mode state that the page (or its CMP)
 * sets through `gtag('consent', 'default' | 'update', {...})`, from the documented `dataLayer` protocol, and makes it
 * available as `gcm` consent data and as `regs.ext.gcm` in bid requests.
 */
import { deepSetValue, isNumber, isPlainObject, isStr, logError, logWarn } from '../src/utils.js';
import { config } from '../src/config.js';
import { CONSENT_GCM, gcmDataHandler } from '../src/consentHandler.js';
import { enrichFPD } from '../src/fpd/enrichment.js';
import { getHook } from '../src/hook.js';
import { PbPromise } from '../src/utils/promise.js';
import { type BaseCMConfig, configParser, type StaticCMConfig } from '../libraries/consentManagement/cmUtils.js';
import type { GCMConsentData, GCMSignalValue } from '../src/types/consent/gcm.d.ts';

export type { GCMConsentData, GCMSignalValue } from '../src/types/consent/gcm.d.ts';

export const GCM_SIGNALS = ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization'] as const;
const SIGNAL_VALUES: readonly unknown[] = ['granted', 'denied'] satisfies GCMSignalValue[];
const DATALAYER_API = 'dataLayer';
const DEFAULT_TIMEOUT = 500;

export interface GCMConfig {
  /**
   * What to do when the page sets no Consent Mode at all:
   * `null` (the default) means no GCM signal, leaving other frameworks to govern;
   * 'denied' means treating every Consent Mode signal as denied.
   */
  defaultWhenAbsent?: null | 'denied';
  /**
   * The visitor's region, as an ISO 3166-1 alpha-2 country code (e.g. 'US') or ISO 3166-2 subdivision code (e.g. 'US-CA'),
   * matching the codes gtag takes in the `region` option of `gtag('consent', 'default', ...)`.
   * Without it, region-scoped defaults all apply, as the visitor may be in any of them: a signal is denied if any
   * default denies it.
   */
  region?: string;
}

/**
 * Configuration for `consentManagement.gcm`. `timeout` is how long the first auction waits for Consent Mode:
 * for a `default` call when there is none, then for an `update` when there's only a `default`
 * (no longer than the page's `wait_for_update`, if it sets one). Defaults to 500 (ms).
 */
export type GCMCMConfig = GCMConfig & Omit<BaseCMConfig, 'waitForCmp' | 'actionTimeout'> & ({
  cmpApi?: typeof DATALAYER_API;
  consentData?: undefined;
} | StaticCMConfig<GCMConsentData>);

declare module '../src/consentHandler' {
  interface ConsentManagementConfig {
    [CONSENT_GCM]?: GCMCMConfig;
  }
}

type ConsentCommand = {
  command: 'default' | 'update';
  params: Record<string, unknown>;
};

export let consentConfig = {} as any;
let gcmConfig: GCMConfig = {};

let commands: ConsentCommand[] = [];
let seen = new WeakSet<object>();
let watched: { dataLayer: unknown[]; push: unknown[]['push']; wrapper: unknown[]['push'] } | null = null;
let commandListeners: (() => void)[] = [];
let regionWarningLogged = false;
let cancelPendingLookup = () => {};

function toCommand(entry: any): ConsentCommand | null {
  if (entry != null && typeof entry === 'object' && entry[0] === 'consent' &&
    (entry[1] === 'default' || entry[1] === 'update') && isPlainObject(entry[2])) {
    return { command: entry[1], params: entry[2] };
  }
  return null;
}

function readEntry(entry: unknown): boolean {
  if (entry == null || typeof entry !== 'object' || seen.has(entry)) return false;
  seen.add(entry);
  const command = toCommand(entry);
  if (command != null) {
    commands.push(command);
    return true;
  }
  return false;
}

function notifyCommandListeners() {
  commandListeners.slice().forEach(listener => {
    try {
      listener();
    } catch (e) {
      logError('Error processing Consent Mode update', e);
    }
  });
}

/**
 * Start (or keep) reading consent commands from `window.dataLayer`: the entries already there, and later ones
 * through a wrapper around its `push`. If the page has replaced `window.dataLayer`, the new one is read and wrapped;
 * entries already read (from either) are not read twice.
 */
export function watchDataLayer(win: any = window) {
  if (watched != null && watched.dataLayer === win.dataLayer) return;
  // the same idiom gtag and GTM use, so that they adopt this array if they load later
  const dataLayer = win.dataLayer = win.dataLayer || [];
  if (!Array.isArray(dataLayer)) {
    logWarn('window.dataLayer is not an array; cannot read Google Consent Mode');
    return;
  }
  const changed = dataLayer.map(readEntry).some(Boolean);
  const push = dataLayer.push;
  // wrapped rather than replaced, and the original called first, the way GTM does; GTM wraps whatever `push` it finds,
  // so either can be first
  const wrapper = function (this: unknown, ...entries: unknown[]) {
    const result = push.apply(this, entries);
    try {
      if (entries.map(readEntry).some(Boolean)) notifyCommandListeners();
    } catch (e) {
      logError('Error reading Google Consent Mode from dataLayer', e);
    }
    return result;
  };
  dataLayer.push = wrapper;
  watched = { dataLayer, push, wrapper };
  if (changed) notifyCommandListeners();
}

function onCommand(listener: () => void): () => void {
  commandListeners.push(listener);
  return () => {
    const i = commandListeners.indexOf(listener);
    if (i >= 0) commandListeners.splice(i, 1);
  };
}

function signalsOf(params: Record<string, unknown>): [string, GCMSignalValue][] {
  return Object.entries(params).filter(([_, value]) => SIGNAL_VALUES.includes(value)) as [string, GCMSignalValue][];
}

function regionsOf(params: Record<string, unknown>): string[] {
  const region = params.region;
  const regions = Array.isArray(region) ? region : region == null ? [] : [region];
  return regions.filter(isStr).map(r => r.trim().toUpperCase());
}

function mostRestrictive(a: GCMSignalValue | undefined, b: GCMSignalValue): GCMSignalValue {
  return a === 'denied' || b === 'denied' ? 'denied' : 'granted';
}

/**
 * How specifically a region-scoped default matches the visitor's region: 2 for a subdivision ('US-CA'), 1 for its
 * country ('US'), 0 for no match. As in gtag, a more specific match wins.
 */
function regionMatch(regions: string[], visitorRegion: string): number {
  if (regions.includes(visitorRegion)) return visitorRegion.includes('-') ? 2 : 1;
  const country = visitorRegion.split('-')[0];
  return country !== visitorRegion && regions.includes(country) ? 1 : 0;
}

export type FoldResult = {
  /**
   * The folded state; null if the commands set no signal.
   */
  state: GCMConsentData | null;
  /**
   * True if there was at least one `update`.
   */
  updated: boolean;
  /**
   * The longest `wait_for_update` given with a `default`.
   */
  waitForUpdate: number | null;
  /**
   * True if region-scoped defaults were all applied, for lack of a visitor region.
   */
  regionUnknown: boolean;
};

/**
 * Fold consent commands, in order, into the current Consent Mode state.
 * - Defaults without a region apply to everyone; later ones win.
 * - With `region`, the visitor's region, region-scoped defaults apply only if they match it; the most specific
 *   match wins over less specific ones, and over defaults without a region.
 * - Without `region`, region-scoped defaults all apply, together with those without a region: a signal is denied
 *   if any of them denies it, which is never more permissive than what gtag resolves for the visitor.
 * - Updates then apply on top, in order.
 */
export function foldConsent(cmds: ConsentCommand[], { region }: { region?: string } = {}): FoldResult {
  const global: Record<string, GCMSignalValue> = {};
  const regional: Record<string, { value: GCMSignalValue, match: number }> = {};
  const restrictive: Record<string, GCMSignalValue> = {};
  const updates: Record<string, GCMSignalValue> = {};
  const visitorRegion = isStr(region) && region.trim() !== '' ? region.trim().toUpperCase() : null;
  let waitForUpdate = null;
  let updated = false;
  let regionUnknown = false;

  cmds.forEach(({ command, params }) => {
    const signals = signalsOf(params);
    if (command === 'update') {
      updated = true;
      signals.forEach(([signal, value]) => { updates[signal] = value; });
      return;
    }
    const wait = params.wait_for_update;
    if (isNumber(wait) && (wait as number) >= 0) {
      waitForUpdate = Math.max(waitForUpdate ?? 0, wait as number);
    }
    const regions = regionsOf(params);
    if (regions.length === 0) {
      signals.forEach(([signal, value]) => { global[signal] = value; });
    } else if (visitorRegion == null) {
      regionUnknown = regionUnknown || signals.length > 0;
      signals.forEach(([signal, value]) => { restrictive[signal] = mostRestrictive(restrictive[signal], value); });
    } else {
      const match = regionMatch(regions, visitorRegion);
      if (match > 0) {
        signals.forEach(([signal, value]) => {
          if (match >= (regional[signal]?.match ?? 0)) regional[signal] = { value, match };
        });
      }
    }
  });

  const defaults: Record<string, GCMSignalValue> = { ...global };
  Object.entries(restrictive).forEach(([signal, value]) => { defaults[signal] = mostRestrictive(defaults[signal], value); });
  Object.entries(regional).forEach(([signal, { value }]) => { defaults[signal] = value; });
  const state = Object.assign(defaults, updates);
  return {
    state: Object.keys(state).length > 0 ? state : null,
    updated,
    waitForUpdate,
    regionUnknown
  };
}

function allDenied(): GCMConsentData {
  return Object.fromEntries(GCM_SIGNALS.map(signal => [signal, 'denied']));
}

function nullConsent(): GCMConsentData | null {
  return gcmConfig.defaultWhenAbsent === 'denied' ? allDenied() : null;
}

/**
 * The current Consent Mode state, from the dataLayer commands read so far, with `defaultWhenAbsent` applied.
 */
export function currentConsent(): FoldResult {
  const result = foldConsent(commands, { region: gcmConfig.region });
  if (result.regionUnknown && !regionWarningLogged) {
    regionWarningLogged = true;
    logWarn('consentManagement.gcm: the visitor\'s region is unknown, so every region-scoped Consent Mode default applies: a signal is denied if any default denies it. Set consentManagement.gcm.region to apply only those that match.');
  }
  if (result.state == null) result.state = nullConsent();
  return result;
}

function isReadingDataLayer() {
  return consentConfig.cmpHandler === DATALAYER_API;
}

/**
 * Refresh the consent data from the dataLayer, once the first lookup has settled it.
 */
function refreshConsent() {
  if (isReadingDataLayer() && gcmDataHandler.enabled && gcmDataHandler.ready) {
    watchDataLayer();
    gcmDataHandler.setConsentData(currentConsent().state);
  }
}

function lookupDataLayer(setProvisionalConsent: (consent: GCMConsentData | null) => void) {
  cancelPendingLookup();
  return new PbPromise<void>((resolve) => {
    let waitTimer = null;
    let finished = false;
    let stop = () => null;
    function cancel() {
      finished = true;
      stop();
      if (waitTimer != null) clearTimeout(waitTimer);
    }
    function done() {
      if (finished) return;
      cancel();
      gcmDataHandler.setConsentData(currentConsent().state);
      resolve();
    }
    function check() {
      if (finished) return;
      const { state, updated, waitForUpdate } = currentConsent();
      if (updated) {
        done();
      } else if (commands.length > 0) {
        // a default is there; wait for an update, no longer than `wait_for_update` (or `timeout`, whichever is shorter)
        setProvisionalConsent(state);
        if (waitForUpdate != null && waitTimer == null) {
          waitTimer = setTimeout(done, waitForUpdate);
        }
      }
    }
    stop = onCommand(check);
    // a lookup still waiting when the configuration changes must not overwrite what the new one sets
    cancelPendingLookup = cancel;
    watchDataLayer();
    check();
  });
}

function parseConsentData(data: unknown): GCMConsentData | null {
  if (!isPlainObject(data)) return null;
  const state = Object.fromEntries(signalsOf(data as Record<string, unknown>));
  return Object.keys(state).length > 0 ? state : null;
}

const parseConfig = configParser({
  namespace: CONSENT_GCM,
  displayName: 'GCM',
  consentDataHandler: gcmDataHandler,
  parseConsentData,
  getNullConsent: nullConsent,
  cmpHandlers: {
    [DATALAYER_API]: { lookup: lookupDataLayer }
  },
  DEFAULT_CMP: DATALAYER_API,
  DEFAULT_CONSENT_TIMEOUT: DEFAULT_TIMEOUT,
  cmpEventCleanup: () => resetConsentData(),
});

let refreshHooked = false;

/**
 * Picks up a `window.dataLayer` that the page replaced since the last auction. It runs after the module's own
 * hook (priority 50) and before `executeCallbacks` (49), which runs storage access queued before consent was known.
 */
export function refreshConsentHook(next, reqBidsConfigObj) {
  refreshConsent();
  next.call(this, reqBidsConfigObj);
}

export function setConsentConfig(cmConfig) {
  cancelPendingLookup();
  const cfg = cmConfig?.[CONSENT_GCM];
  gcmConfig = {
    defaultWhenAbsent: cfg?.defaultWhenAbsent === 'denied' ? 'denied' : null,
    region: isStr(cfg?.region) ? cfg.region : undefined,
  };
  if (cfg?.defaultWhenAbsent != null && cfg.defaultWhenAbsent !== 'denied') {
    logWarn(`consentManagement.gcm.defaultWhenAbsent must be null or 'denied'; ignoring "${cfg.defaultWhenAbsent}"`);
  }
  if (cfg?.region != null && !isStr(cfg.region)) {
    logWarn('consentManagement.gcm.region must be a string, such as \'US\' or \'US-CA\'; ignoring it', cfg.region);
  }
  consentConfig = parseConfig(cmConfig);
  if (consentConfig.requestBidsHook != null && !refreshHooked) {
    refreshHooked = true;
    getHook('requestBids').before(refreshConsentHook, 49.5);
  }
  return consentConfig.loadConsentData?.()?.catch?.(() => null);
}
config.getConfig('consentManagement', config => setConsentConfig(config.consentManagement));

onCommand(refreshConsent);

/**
 * Reset the module's state, mainly for tests: the consent data, configuration, and what was read from the dataLayer,
 * restoring the dataLayer's `push` if it's still the module's wrapper.
 */
export function resetConsentData() {
  cancelPendingLookup();
  consentConfig = {};
  gcmConfig = {};
  gcmDataHandler.reset();
  if (watched != null && watched.dataLayer.push === watched.wrapper) {
    watched.dataLayer.push = watched.push;
  }
  watched = null;
  commands = [];
  seen = new WeakSet();
  regionWarningLogged = false;
  commandListeners = [refreshConsent];
  if (refreshHooked) {
    getHook('requestBids').getHooks({ hook: refreshConsentHook }).remove();
    refreshHooked = false;
  }
}

export function enrichFPDHook(next, fpd) {
  return next(fpd.then(ortb2 => {
    const consent = gcmDataHandler.getConsentData();
    if (consent != null) {
      deepSetValue(ortb2, 'regs.ext.gcm', { ...consent });
    }
    return ortb2;
  }));
}

enrichFPD.before(enrichFPDHook);
