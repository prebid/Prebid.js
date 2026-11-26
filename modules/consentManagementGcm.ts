/**
 * This module adds Google Consent Mode v2 support to Prebid.js. It reads the Consent Mode state that the page (or its CMP)
 * sets through `gtag('consent', 'default' | 'update', {...})`, from the documented `dataLayer` protocol, and makes it
 * available as `gcm` consent data and as `regs.ext.gcm` in bid requests.
 */
import { deepSetValue, isNumber, isPlainObject, isStr, logError, logInfo, logWarn } from '../src/utils.js';
import { config } from '../src/config.js';
import { CONSENT_GCM, gcmDataHandler } from '../src/consentHandler.js';
import { enrichFPD } from '../src/fpd/enrichment.js';
import { getHook } from '../src/hook.js';
import { PbPromise } from '../src/utils/promise.js';
import { type BaseCMConfig, configParser, type StaticCMConfig } from '../libraries/consentManagement/cmUtils.js';
import type { GCMConsentData, GCMSignalValue } from '../src/types/consent/gcm.d.ts';

export type { GCMConsentData, GCMSignalValue } from '../src/types/consent/gcm.d.ts';

export const GCM_SIGNALS = ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization'] as const;
const DATALAYER_API = 'dataLayer';
const DEFAULT_TIMEOUT = 500;
const TAG_POLL_INTERVAL = 50;

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
  /**
   * Whether to also read what Google's tag (gtag.js or Google Tag Manager) keeps in `window.google_tag_data`: the
   * Consent Mode state that did not go through the dataLayer (such as what Tag Manager consent templates set), and
   * the visitor's region, used when `region` is not given. It is not a documented interface, so anything unexpected
   * in it is ignored. Defaults to true.
   */
  googleTagData?: boolean;
}

/**
 * Configuration for `consentManagement.gcm`. `timeout` is how long the first auction waits for Consent Mode:
 * for a `default` call when there is none, then for `update` calls to set every signal that the defaults deny
 * (no longer than the page's `wait_for_update`, if it sets one). There is no wait for updates when the defaults
 * deny no signal and set no `wait_for_update`. Defaults to 500 (ms).
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
let gcmConfig: Pick<GCMConfig, 'defaultWhenAbsent' | 'googleTagData'> & { region?: string, regionPending?: boolean } = {};

let commands: ConsentCommand[] = [];
let seen = new WeakSet<object>();
let watched: { dataLayer: unknown[]; push: unknown[]['push']; wrapper: unknown[]['push'] } | null = null;
let commandListeners: (() => void)[] = [];
let regionWarningLogged = false;
let tagRegionLogged = false;

type PendingLookup = {
  cancel(): void;
  resolve(): void;
  setProvisional(consent: GCMConsentData | null): void;
  adopt(lookup: PendingLookup): void;
};
let pendingLookup: PendingLookup | null = null;

/**
 * Stop the lookup that is still waiting, if any. It is left unsettled, for auctions that wait for it:
 * either resolve it, or have the lookup that replaces it adopt it.
 */
function supersedeLookup(): PendingLookup | null {
  const lookup = pendingLookup;
  pendingLookup = null;
  lookup?.cancel();
  return lookup;
}

function toCommand(entry: any): ConsentCommand | null {
  // gtag only takes the `arguments` objects that `gtag()` pushes, not arrays
  if (Object.prototype.toString.call(entry) === '[object Arguments]' && entry[0] === 'consent' &&
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
        if (entries.map(readEntry).some(Boolean)) {
          notifyCommandListeners();
          // Google's tag may only process the command after this, when `push` was wrapped by it later
          if (hasGoogleTag(win)) setTimeout(notifyCommandListeners, 0);
        }
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

function hasGoogleTag(win: any): boolean {
  try {
    return win.google_tag_data != null;
  } catch (e) {
    return false;
  }
}

function onCommand(listener: () => void): () => void {
  commandListeners.push(listener);
  return () => {
    const i = commandListeners.indexOf(listener);
    if (i >= 0) commandListeners.splice(i, 1);
  };
}

/**
 * The signals in the parameters of a consent command. As in gtag, any value but 'granted' denies a Consent Mode v2
 * signal; other parameters are signals only if they are 'granted' or 'denied'.
 */
function signalsOf(params: Record<string, unknown>): [string, GCMSignalValue][] {
  return Object.entries(params).flatMap(([name, value]): [string, GCMSignalValue][] => {
    if (value === 'granted' || value === 'denied') return [[name, value]];
    return value !== undefined && (GCM_SIGNALS as readonly string[]).includes(name) ? [[name, 'denied']] : [];
  });
}

/**
 * The regions a default is scoped to, as gtag reads its `region`: each made a string, in upper case and not
 * trimmed, with '' for everywhere. None if it has no `region`; null if its `region` is an empty list, in which
 * case gtag ignores the default.
 */
function regionsOf(params: Record<string, unknown>): string[] | null {
  const region = params.region;
  if (region == null) return [];
  const regions = (Array.isArray(region) ? region : [region]).flatMap(r => {
    try {
      return [String(r).toUpperCase()];
    } catch (e) {
      return [];
    }
  });
  return regions.length > 0 ? regions : null;
}

const REGION_CODE = /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/;

/**
 * A region in the form gtag takes it; null if it is not a country ('US') or subdivision ('US-CA') code.
 */
export function parseRegion(region: unknown): string | null {
  const code = typeof region === 'string' ? region.trim().toUpperCase() : '';
  return REGION_CODE.test(code) ? code : null;
}

export type GoogleTagData = {
  /**
   * The visitor's region as Google's tag resolved it; null if unknown.
   */
  region: string | null;
  /**
   * The defaults it resolved for the visitor's region, and the updates it has seen, by signal.
   */
  defaults: Record<string, GCMSignalValue>;
  updates: Record<string, GCMSignalValue>;
};

function tagRegion(tagData: any): string | null {
  const cache = tagData.xcd?.ip_geo_data_cache;
  if (typeof cache?.get !== 'function') return null;
  const geo = JSON.parse(cache.get());
  const country = geo?.['0'];
  const subdivision = geo?.['1'];
  if (!isStr(country) || !/^[A-Z]{2}$/.test(country)) return null;
  if (subdivision === '') return country;
  return isStr(subdivision) && REGION_CODE.test(subdivision) && subdivision.startsWith(`${country}-`) ? subdivision : null;
}

/**
 * What Google's tag (gtag.js or Google Tag Manager) knows, read from `window.google_tag_data`. That is not a
 * documented interface: if anything in it is not as expected, nothing is taken from it.
 */
export function readGoogleTagData(win: any = window): GoogleTagData | null {
  try {
    const ics = win.google_tag_data?.ics;
    if (ics == null || typeof ics.entries !== 'object' || ics.entries == null || typeof ics.usedDefault !== 'boolean') return null;
    const data: GoogleTagData = { region: null, defaults: {}, updates: {} };
    for (const [signal, entry] of Object.entries<any>(ics.entries)) {
      for (const [layer, values] of [['default', data.defaults], ['update', data.updates]] as const) {
        const granted = entry?.[layer];
        if (typeof granted === 'boolean') {
          values[signal] = granted ? 'granted' : 'denied';
        } else if (granted != null) {
          return null;
        }
      }
    }
    // the region is only taken once the tag has resolved defaults with it
    if (ics.usedDefault) data.region = tagRegion(win.google_tag_data);
    return data;
  } catch (e) {
    return null;
  }
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
   * True if no further update is expected: updates set every Consent Mode signal that the defaults deny; or the
   * defaults deny none, and those in the dataLayer, with no other in Google's tag, do not ask to wait for an update.
   */
  covered: boolean;
  /**
   * True if any Consent Mode was found, be it in the commands or in what Google's tag knows.
   */
  found: boolean;
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
 * - What Google's tag knows (`tag`) can only deny, or set what the commands do not: its view may be behind the
 *   commands, but it also has the state that never went through the dataLayer.
 */
export function foldConsent(cmds: ConsentCommand[], { region, tag }: { region?: string, tag?: Pick<GoogleTagData, 'defaults' | 'updates'> } = {}): FoldResult {
  const global: Record<string, GCMSignalValue> = {};
  const regional: Record<string, { value: GCMSignalValue, match: number }> = {};
  const deniedInPossibleRegion = new Set<string>();
  const updates: Record<string, GCMSignalValue> = {};
  const visitorRegion = parseRegion(region);
  let waitForUpdate = null;
  let updated = false;
  const defaultSignals = new Set<string>();
  let regionAmbiguous = false;

  cmds.forEach(({ command, params }) => {
    const signals = signalsOf(params);
    if (command === 'update') {
      updated = true;
      signals.forEach(([signal, value]) => { updates[signal] = value; });
      return;
    }
    const allRegions = regionsOf(params);
    if (allRegions == null) return;
    signals.forEach(([signal]) => defaultSignals.add(signal));
    const wait = params.wait_for_update;
    if (isNumber(wait) && (wait as number) >= 0) {
      waitForUpdate = Math.max(waitForUpdate ?? 0, wait as number);
    }
    const regions = allRegions.filter(r => r !== '');
    if (regions.length < allRegions.length || allRegions.length === 0) {
      signals.forEach(([signal, value]) => { global[signal] = value; });
    }
    if (regions.length > 0) {
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
  const fromTag = (values: Record<string, GCMSignalValue>, tagValues: Record<string, GCMSignalValue> = {}) => {
    Object.entries(tagValues).forEach(([signal, value]) => {
      if (value === 'denied' || values[signal] == null) values[signal] = value;
    });
  };
  fromTag(defaults, tag?.defaults);
  fromTag(updates, tag?.updates);
  updated = updated || Object.keys(updates).length > 0;
  // defaults that Google's tag has, but not the dataLayer, may have come with a `wait_for_update` that is not known
  const noWait = defaultSignals.size > 0 && waitForUpdate == null && Object.keys(tag?.defaults ?? {}).every(signal => defaultSignals.has(signal));
  const covered = (updated || noWait) && GCM_SIGNALS.every(signal => defaults[signal] !== 'denied' || signal in updates);
  const state = Object.assign(defaults, updates);
  return {
    state: Object.keys(state).length > 0 ? state : null,
    covered,
    found: cmds.length > 0 || Object.keys(state).length > 0,
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
 * The current Consent Mode state, from the dataLayer commands read so far and what Google's tag knows,
 * with `defaultWhenAbsent` applied.
 */
export function currentConsent(): FoldResult {
  const tag = gcmConfig.googleTagData === false ? null : readGoogleTagData();
  if (gcmConfig.region == null && tag?.region != null && !tagRegionLogged) {
    tagRegionLogged = true;
    logInfo(`consentManagement.gcm: using the visitor's region from Google's tag (${tag.region}), as consentManagement.gcm.region is not set`);
  }
  const result = foldConsent(commands, { region: gcmConfig.region ?? tag?.region, tag });
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
  supersedeLookup()?.resolve();
  return new PbPromise<void>((resolveLookup) => {
    let waitTimer = null;
    let settleTimer = null;
    let tagTimer = null;
    let finished = false;
    let provisional: { consent: GCMConsentData | null } | null = null;
    let stop = () => null;
    // lookups that this one replaced, with auctions that may still wait for them
    const adopted: PendingLookup[] = [];
    const lookup: PendingLookup = {
      cancel() {
        finished = true;
        stop();
        if (waitTimer != null) clearTimeout(waitTimer);
        if (settleTimer != null) clearTimeout(settleTimer);
        if (tagTimer != null) clearInterval(tagTimer);
        if (pendingLookup === lookup) pendingLookup = null;
      },
      resolve() {
        adopted.forEach(other => other.resolve());
        resolveLookup();
      },
      // on timeout, the provisional consent is what the auctions waiting for this lookup run with
      setProvisional(consent) {
        provisional = { consent };
        setProvisionalConsent(consent);
        adopted.forEach(other => other.setProvisional(consent));
      },
      adopt(other) {
        adopted.push(other);
        if (provisional != null) other.setProvisional(provisional.consent);
      }
    };
    function done() {
      if (finished) return;
      lookup.cancel();
      gcmDataHandler.setConsentData(currentConsent().state);
      lookup.resolve();
    }
    function check(settle = true) {
      if (finished) return;
      const { state, covered, found, waitForUpdate } = currentConsent();
      if (covered) {
        if (!settle) {
          done();
        } else if (settleTimer == null) {
          // commands pushed back to back are folded together
          settleTimer = setTimeout(done, 0);
        }
      } else if (found) {
        // wait for updates to cover what the defaults deny, no longer than `wait_for_update` (or `timeout`, whichever is shorter)
        lookup.setProvisional(state);
        if (waitForUpdate != null && waitTimer == null) {
          waitTimer = setTimeout(done, waitForUpdate);
        }
      }
    }
    stop = onCommand(() => check());
    pendingLookup = lookup;
    watchDataLayer();
    // what the dataLayer already holds was read in one go
    check(false);
    if (!finished && gcmConfig.googleTagData !== false) {
      // Google's tag gives no notice of what it learns
      let known = JSON.stringify(readGoogleTagData());
      tagTimer = setInterval(() => {
        // later changes are picked up with the next command or auction
        if (finished || gcmDataHandler.ready) return clearInterval(tagTimer);
        const now = JSON.stringify(readGoogleTagData());
        if (now !== known) {
          known = now;
          check();
        }
      }, TAG_POLL_INTERVAL);
    }
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
  const superseded = supersedeLookup();
  const cfg = cmConfig?.[CONSENT_GCM];
  const region = cfg?.region;
  const regionPending = typeof (region as PromiseLike<string>)?.then === 'function';
  const current = gcmConfig = {
    defaultWhenAbsent: cfg?.defaultWhenAbsent === 'denied' ? 'denied' : null,
    googleTagData: cfg?.googleTagData !== false,
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
  if (cfg != null && typeof cfg === 'object' && cfg.enabled !== false && !gcmDataHandler.enabled) {
    // reading the consent promise before the module is configured leaves the handler ready, with no data
    gcmDataHandler.reset();
  }
  consentConfig = parseConfig(cmConfig);
  hookRefresh(consentConfig.requestBidsHook != null);
  const loaded = consentConfig.loadConsentData?.()?.catch?.(() => null);
  if (superseded != null) {
    // auctions that wait for the earlier lookup wait for the new one instead, no longer than they would have
    if (pendingLookup != null) {
      pendingLookup.adopt(superseded);
    } else {
      superseded.resolve();
    }
  }
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
  supersedeLookup()?.resolve();
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
  tagRegionLogged = false;
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
