/**
 * This module enforces Google Consent Mode v2 signals (read by `consentManagementGcm`) through activity controls:
 * a signal that is 'denied' denies the activities it maps to.
 */
import { config } from '../src/config.js';
import { gcmDataHandler } from '../src/consentHandler.js';
import { isArray, isPlainObject, isStr, logWarn } from '../src/utils.js';
import { registerActivityControl } from '../src/activities/rules.js';
import { ACTIVITY_PARAM_COMPONENT_TYPE, type ActivityParams } from '../src/activities/params.js';
import {
  ACTIVITY_ACCESS_DEVICE,
  ACTIVITY_ENRICH_EIDS,
  ACTIVITY_REPORT_ANALYTICS,
  ACTIVITY_TRANSMIT_EIDS,
  ACTIVITY_TRANSMIT_PRECISE_GEO,
  ACTIVITY_TRANSMIT_UFPD,
  type Activity
} from '../src/activities/activities.js';
import { MODULE_TYPE_ANALYTICS, MODULE_TYPE_BIDDER, MODULE_TYPE_UID, type ModuleType } from '../src/activities/modules.js';

const RULE_NAME = 'GCM';

/**
 * An activity that a Consent Mode signal denies when it is 'denied': either an activity name, which denies it to every
 * component, or an object that limits it to some types of component.
 */
export type GCMActivityRule = Activity | {
  activity: Activity;
  /**
   * The types of component the activity is denied to, e.g. ['bidder', 'userId']. All of them, if not given.
   */
  componentTypes?: ModuleType[];
};

/**
 * Map from Consent Mode signal to the activities it denies.
 */
export type GCMRules = { [signal: string]: GCMActivityRule[] };

export const DEFAULT_RULES: GCMRules = {
  ad_storage: [{ activity: ACTIVITY_ACCESS_DEVICE, componentTypes: [MODULE_TYPE_BIDDER, MODULE_TYPE_UID] }],
  analytics_storage: [ACTIVITY_REPORT_ANALYTICS, { activity: ACTIVITY_ACCESS_DEVICE, componentTypes: [MODULE_TYPE_ANALYTICS] }],
  ad_user_data: [ACTIVITY_TRANSMIT_EIDS, ACTIVITY_TRANSMIT_UFPD, ACTIVITY_TRANSMIT_PRECISE_GEO],
  ad_personalization: [ACTIVITY_TRANSMIT_UFPD, ACTIVITY_ENRICH_EIDS],
};

/**
 * These options live under the GCM consent module's configuration, so they only mean anything to a
 * publisher who has included that module: the augmentation is meant to apply only then.
 * @augmentationOptional
 */
declare module './consentManagementGcm' {
  interface GCMConfig {
    /**
     * Activities each Consent Mode signal denies when 'denied', replacing the default for that signal.
     * Signals not listed keep their default; an empty list makes a signal deny nothing.
     */
    rules?: GCMRules;
  }
}

type SignalRule = { signal: string; componentTypes: ModuleType[] | null };

/**
 * Resolve the configured rules (merged with the defaults) into a map from activity to the signals that deny it.
 */
export function getRules(rules: unknown = {}): Partial<Record<Activity, SignalRule[]>> {
  const merged: GCMRules = { ...DEFAULT_RULES };
  if (isPlainObject(rules)) {
    Object.entries(rules as Record<string, unknown>).forEach(([signal, list]) => {
      if (isArray(list)) {
        merged[signal] = list as GCMActivityRule[];
      } else {
        logWarn(`consentManagement.gcm.rules.${signal} must be a list of activities; using the default`, list);
      }
    });
  } else if (rules != null) {
    logWarn('consentManagement.gcm.rules must be an object; using the defaults', rules);
  }
  const byActivity: Partial<Record<Activity, SignalRule[]>> = {};
  Object.entries(merged).forEach(([signal, list]) => {
    list.forEach(rule => {
      const { activity, componentTypes } = isStr(rule) ? { activity: rule, componentTypes: null } : (rule ?? {} as any);
      if (!isStr(activity)) {
        logWarn(`consentManagement.gcm.rules.${signal}: invalid rule, ignoring it`, rule);
        return;
      }
      (byActivity[activity] = byActivity[activity] ?? []).push({ signal, componentTypes: isArray(componentTypes) ? componentTypes : null });
    });
  });
  return byActivity;
}

/**
 * While the Consent Mode state is not known yet, every signal is taken as denied.
 */
function isPending() {
  return gcmDataHandler.enabled && !gcmDataHandler.ready;
}

export function gcmRule(signalRules: SignalRule[], getConsent = () => gcmDataHandler.getConsentData(), pending = isPending) {
  return function (params: ActivityParams) {
    const consent = getConsent();
    const unknown = consent == null && pending();
    if (consent == null && !unknown) return;
    const componentType = params[ACTIVITY_PARAM_COMPONENT_TYPE];
    const denied = signalRules
      .filter(({ signal, componentTypes }) => (unknown || consent[signal] === 'denied') && (componentTypes == null || componentTypes.includes(componentType)))
      .map(({ signal }) => signal);
    if (denied.length > 0) {
      return { allow: false, reason: unknown ? 'Consent Mode state is not available yet' : `Consent Mode ${denied.join(', ')} denied` };
    }
  };
}

let unregister: (() => void)[] = [];

export function setupRules(rules?: unknown) {
  unregister.forEach(fn => fn());
  unregister = Object.entries(getRules(rules)).map(([activity, signalRules]) =>
    registerActivityControl(activity as Activity, RULE_NAME, gcmRule(signalRules))
  );
}

export function reset() {
  unregister.forEach(fn => fn());
  unregister = [];
}

config.getConfig('consentManagement', (cfg) => {
  const gcm = cfg?.consentManagement?.gcm;
  if (gcm != null) {
    setupRules(gcm.rules);
  } else {
    reset();
  }
});
