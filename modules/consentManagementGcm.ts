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
   * matching the codes gtag takes in the `region` option of `gtag('consent', 'default', ...)`. A country is not
   * specific enough for defaults scoped to its subdivisions, which then apply as if the region was unknown.
   * It can also be a promise for it, if it is not known when Prebid is configured.
   * Without it, or until it is known, a signal is denied if any region-scoped default denies it, as the visitor
   * may be in any of those regions.
   */
  region?: string | PromiseLike<string>;
}

/**
 * Configuration for `consentManagement.gcm`. `timeout` is how long the first auction waits for Consent Mode:
 * for a `default` call when there is none, then for `update` calls to set every signal that the defaults deny
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
let gcmConfig: Pick<GCMConfig, 'defaultWhenAbsent'> & { region?: string, regionPending?: boolean } = {};

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
    // it stays in place after a reset if `push` was wrapped again since, and must not read for what is watched later
    if (watched?.wrapper === wrapper) {
      try {
        if (entries.map(readEntry).some(Boolean)) notifyCommandListeners();
      } catch (e) {
        logError('Error reading Google Consent Mode from dataLayer', e);
      }
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
  // as gtag does: upper case, but not trimmed
  return regions.filter(isStr).map(r => r.toUpperCase());
}

const REGION_CODE = /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/;

/**
 * A region in the form gtag takes it; null if it is not a country ('US') or subdivision ('US-CA') code.
 */
export function parseRegion(region: unknown): string | null {
  const code = typeof region === 'string' ? region.trim().toUpperCase() : '';
  return REGION_CODE.test(code) ? code : null;
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
   * True if updates set every Consent Mode signal that the defaults deny, so that no further update is expected.
   */
  covered: boolean;
  /**
   * The longest `wait_for_update` given with a `default`.
   */
  waitForUpdate: number | null;
  /**
   * True if there are region-scoped defaults that may or may not apply to the visitor, as their region is unknown
   * or not specific enough; only what they deny was applied.
   */
  regionAmbiguous: boolean;
};

/**
 * Fold consent commands, in order, into the current Consent Mode state.
 * - Defaults without a region apply to everyone; later ones win.
 * - With `region`, the visitor's region, region-scoped defaults apply only if they match it; the most specific
 *   match wins over less specific ones, and over defaults without a region.
 * - Region-scoped defaults that may or may not match (all of them without a valid `region`; those for subdivisions
 *   of `region`, if it is a country) only deny: a signal is denied if any of them denies it, and what they grant
 *   is left out. This is never more permissive than what gtag resolves.
 * - Updates then apply on top, in order.
 */
export function foldConsent(cmds: ConsentCommand[], { region }: { region?: string } = {}): FoldResult {
  const global: Record<string, GCMSignalValue> = {};
  const regional: Record<string, { value: GCMSignalValue, match: number }> = {};
  const deniedInPossibleRegion = new Set<string>();
  const updates: Record<string, GCMSignalValue> = {};
  const visitorRegion = parseRegion(region);
  let waitForUpdate = null;
  let updated = false;
  let regionAmbiguous = false;

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
    } else {
      if (visitorRegion == null || regions.some(r => r.startsWith(`${visitorRegion}-`))) {
        regionAmbiguous = regionAmbiguous || signals.length > 0;
        signals.forEach(([signal, value]) => { if (value === 'denied') deniedInPossibleRegion.add(signal); });
      }
      const match = visitorRegion == null ? 0 : regionMatch(regions, visitorRegion);
      if (match > 0) {
        signals.forEach(([signal, value]) => {
          if (match >= (regional[signal]?.match ?? 0)) regional[signal] = { value, match };
        });
      }
    }
  });

  const defaults: Record<string, GCMSignalValue> = { ...global };
  Object.entries(regional).forEach(([signal, { value }]) => { defaults[signal] = value; });
  deniedInPossibleRegion.forEach(signal => { defaults[signal] = 'denied'; });
  const covered = updated && GCM_SIGNALS.every(signal => defaults[signal] !== 'denied' || signal in updates);
  const state = Object.assign(defaults, updates);
  return {
    state: Object.keys(state).length > 0 ? state : null,
    covered,
    waitForUpdate,
    regionAmbiguous
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
  if (result.regionAmbiguous && !gcmConfig.regionPending && !regionWarningLogged) {
    regionWarningLogged = true;
    logWarn('consentManagement.gcm: the visitor\'s region is unknown, or is a country while Consent Mode defaults are scoped to its subdivisions, so a signal is denied if any region-scoped default that may apply denies it. Set consentManagement.gcm.region, to the subdivision (such as \'US-CA\') in the latter case, to apply only those that match.');
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
    let settleTimer = null;
    let finished = false;
    let stop = () => null;
    function cancel() {
      finished = true;
      stop();
      if (waitTimer != null) clearTimeout(waitTimer);
      if (settleTimer != null) clearTimeout(settleTimer);
    }
    function done() {
      if (finished) return;
      cancel();
      gcmDataHandler.setConsentData(currentConsent().state);
      resolve();
    }
    function check(settle = true) {
      if (finished) return;
      const { state, covered, waitForUpdate } = currentConsent();
      if (covered) {
        if (!settle) {
          done();
        } else if (settleTimer == null) {
          // commands pushed back to back are folded together
          settleTimer = setTimeout(done, 0);
        }
      } else if (commands.length > 0) {
        // wait for updates to cover what the defaults deny, no longer than `wait_for_update` (or `timeout`, whichever is shorter)
        setProvisionalConsent(state);
        if (waitForUpdate != null && waitTimer == null) {
          waitTimer = setTimeout(done, waitForUpdate);
        }
      }
    }
    stop = onCommand(() => check());
    // a superseded lookup is settled without setting consent data, which also stops its timeout from doing so
    cancelPendingLookup = () => {
      cancel();
      resolve();
    };
    watchDataLayer();
    // what the dataLayer already holds was read in one go
    check(false);
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

function hookRefresh(hooked: boolean) {
  if (hooked === refreshHooked) return;
  refreshHooked = hooked;
  if (hooked) {
    getHook('requestBids').before(refreshConsentHook, 50);
  } else {
    getHook('requestBids').getHooks({ hook: refreshConsentHook }).remove();
  }
}

/**
 * Picks up a `window.dataLayer` that the page replaced since the last auction. It runs before `executeCallbacks` (49),
 * which runs storage access queued before consent was known, and is registered after the module's own hook,
 * to run after it.
 */
export function refreshConsentHook(next, reqBidsConfigObj) {
  refreshConsent();
  next.call(this, reqBidsConfigObj);
}

export function setConsentConfig(cmConfig) {
  cancelPendingLookup();
  const cfg = cmConfig?.[CONSENT_GCM];
  const region = cfg?.region;
  const regionPending = typeof (region as PromiseLike<string>)?.then === 'function';
  const current = gcmConfig = {
    defaultWhenAbsent: cfg?.defaultWhenAbsent === 'denied' ? 'denied' : null,
    region: parseRegion(region) ?? undefined,
    regionPending,
  };
  if (regionPending) {
    const setRegion = (value?: unknown) => {
      // the configuration has changed since
      if (gcmConfig !== current) return;
      current.regionPending = false;
      current.region = parseRegion(value) ?? undefined;
      if (current.region == null) {
        logWarn('consentManagement.gcm.region did not resolve to a country or subdivision code, such as \'US\' or \'US-CA\'; ignoring it', value);
      }
      notifyCommandListeners();
    };
    Promise.resolve(region).then(setRegion, setRegion);
  }
  if (cfg?.defaultWhenAbsent != null && cfg.defaultWhenAbsent !== 'denied') {
    logWarn(`consentManagement.gcm.defaultWhenAbsent must be null or 'denied'; ignoring "${cfg.defaultWhenAbsent}"`);
  }
  if (region != null && !regionPending && current.region == null) {
    logWarn('consentManagement.gcm.region must be a country or subdivision code, such as \'US\' or \'US-CA\', or a promise for one; ignoring it', region);
  }
  consentConfig = parseConfig(cmConfig);
  hookRefresh(consentConfig.requestBidsHook != null);
  const loaded = consentConfig.loadConsentData?.()?.catch?.(() => null);
  // consent data from an earlier configuration follows the new one at once
  refreshConsent();
  return loaded;
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
  hookRefresh(false);
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
