/**
 * This module adds the Sevio ID to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/sevioIdSystem
 * @requires module:modules/userId
 */

import { logError, logInfo, logWarn, politeTriggerPixel } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { qualifiedAjaxBuilder } from '../src/ajax.js';
import { coppaDataHandler } from '../src/consentHandler.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { isActivityAllowed } from '../src/activities/rules.js';
import { activityParams } from '../src/activities/activityParams.js';
import { ACTIVITY_SYNC_USER } from '../src/activities/activities.js';
import { ACTIVITY_PARAM_SYNC_TYPE, ACTIVITY_PARAM_SYNC_URL } from '../src/activities/params.js';

import type { AllConsentData } from '../src/consentHandler.ts';
import type { IdProviderSpec } from './userId/spec.ts';

const MODULE_NAME = 'sevioId' as const;
const GVLID = 1393;
export const ID_ENDPOINT = 'https://id.adx.ws/identity/resolve';
const EID_SOURCE = 'adx.ws';
const LOG_PREFIX = 'sevioId: ';
const RECOMMENDED_STORAGE_TYPES = ['cookie', 'html5'];
// A Sevio envelope: 66 base64url characters, no padding. Only an envelope is a valid ID: anything else
// is neither stored from a response, nor provided to bidders, nor sent back to the Identity service.
const ENVELOPE_PATTERN = /^[A-Za-z0-9_-]{66}$/;
const EMAIL_HASH_PATTERN = /^[0-9a-f]{64}$/;
// Stored in place of the ID when the Identity service refuses a request. The userId core ignores an
// empty callback, which would leave a previously stored ID in place; `decode` maps this to no ID.
const REVOKED = { revoked: true };

export type SevioIdParams = {
  /**
   * The client ID Sevio assigned to the integration.
   */
  clientId: string;
  /**
   * SHA-256 hash of the user's email address, as 64 hex characters.
   */
  emailHash?: string;
};

declare module './userId/spec' {
  interface UserId {
    sevioId: string;
  }
  interface ProvidersToId {
    sevioId: 'sevioId';
  }
  interface ProviderParams {
    sevioId: SevioIdParams;
  }
}

function isRecommendedStorageType(type: string) {
  const types = type.split('&').map(t => t.trim());
  return types.length === RECOMMENDED_STORAGE_TYPES.length &&
    types.every((t, i) => t === RECOMMENDED_STORAGE_TYPES[i]);
}

function buildPrivacy(consentData: Partial<AllConsentData> | undefined) {
  const privacy: Record<string, unknown> = {};
  const { gdpr, usp, gpp } = consentData ?? {};
  // Without a gdprApplies from Prebid (no TCF consent management), GDPR is treated as not applying.
  privacy.gdpr = typeof gdpr?.gdprApplies === 'boolean' ? Number(gdpr.gdprApplies) : 0;
  if (typeof gdpr?.consentString === 'string') {
    privacy.gdpr_consent = gdpr.consentString;
  }
  if (typeof usp === 'string') {
    privacy.us_privacy = usp;
  }
  if (gpp?.gppString) {
    privacy.gpp = gpp.gppString;
    // -1 is the GPP CMP's "no applicable section", not a section id.
    const sids = (gpp.applicableSections ?? []).filter(sid => Number.isInteger(sid) && sid > 0);
    if (sids.length) {
      privacy.gpp_sid = sids;
    }
  }
  return privacy;
}

function isEnvelope(value): value is string {
  return typeof value === 'string' && ENVELOPE_PATTERN.test(value);
}

function buildIds(storedId, emailHash: string | undefined) {
  const ids: string[] = [];
  if (isEnvelope(storedId)) {
    ids.push(`sevio:${storedId}`);
  }
  if (emailHash != null) {
    const hash = typeof emailHash === 'string' ? emailHash.trim().toLowerCase() : '';
    if (EMAIL_HASH_PATTERN.test(hash)) {
      ids.push(`email_sha256:${hash}`);
    } else {
      logWarn(`${LOG_PREFIX}'params.emailHash' is not a SHA-256 hex digest and is not sent`);
    }
  }
  return ids;
}

/**
 * Fires the partner sync URLs from a resolve response. Each one must pass Prebid's `syncUser` check,
 * so TCF, `userSync.syncEnabled` and activity controls apply; `userSync.filterSettings` only covers bidders.
 */
function fireSyncs(syncs) {
  if (!Array.isArray(syncs)) return;
  syncs.forEach(sync => {
    const url = sync?.url;
    if (typeof url !== 'string' || !url.startsWith('https://')) {
      logWarn(`${LOG_PREFIX}skipping a sync without an https url`, sync);
      return;
    }
    if (isActivityAllowed(ACTIVITY_SYNC_USER, activityParams(MODULE_TYPE_UID, MODULE_NAME, {
      [ACTIVITY_PARAM_SYNC_TYPE]: 'image',
      [ACTIVITY_PARAM_SYNC_URL]: url
    }))) {
      politeTriggerPixel(url);
    }
  });
}

function fetchId(callback: (id?: string | typeof REVOKED) => void, params: SevioIdParams, consentData, storedId) {
  const ids = buildIds(storedId, params.emailHash);
  const body = {
    client_id: params.clientId,
    ...(ids.length ? { ids } : {}),
    privacy: buildPrivacy(consentData)
  };
  const callbacks = {
    success(response) {
      let parsed;
      try {
        parsed = JSON.parse(response);
      } catch (e) {
        logError(`${LOG_PREFIX}could not parse the ID response`, e);
        callback();
        return;
      }
      const id = parsed?.sevio_id;
      if (isEnvelope(id)) {
        callback(id);
        fireSyncs(parsed.syncs);
      } else if (id === null) {
        // The Identity service answers null when the privacy signals or its agent check refuse the call.
        logInfo(`${LOG_PREFIX}the Identity service provided no ID for this request; revoking any stored ID`);
        callback(REVOKED);
      } else {
        logError(`${LOG_PREFIX}the ID response has no valid 'sevio_id'`, response);
        callback();
      }
    },
    error(error) {
      logError(`${LOG_PREFIX}the ID request failed`, error);
      callback();
    }
  };
  qualifiedAjaxBuilder(MODULE_TYPE_UID, MODULE_NAME)(ID_ENDPOINT, callbacks, JSON.stringify(body), {
    method: 'POST',
    contentType: 'application/json',
    withCredentials: true
  });
}

export const sevioIdSubmodule: IdProviderSpec<typeof MODULE_NAME> = {
  name: MODULE_NAME,
  gvlid: GVLID,
  decode(value) {
    if (coppaDataHandler.getCoppa()) {
      logInfo(`${LOG_PREFIX}IDs are not provided for COPPA requests`);
      return undefined;
    }
    return isEnvelope(value) ? { sevioId: value } : undefined;
  },
  getId(config, consentData, storedId) {
    if (consentData?.coppa) {
      logInfo(`${LOG_PREFIX}IDs are not provided for COPPA requests`);
      return;
    }
    const params = config?.params;
    if (typeof params?.clientId !== 'string' || params.clientId.trim() === '') {
      logError(`${LOG_PREFIX}'params.clientId' is required`);
      return;
    }
    if (!config?.storage) {
      logError(`${LOG_PREFIX}'storage' must be configured; use type 'cookie&html5'`);
      return;
    }
    if (!isRecommendedStorageType(String(config.storage.type))) {
      logWarn(`${LOG_PREFIX}storage type '${config.storage.type}' is not recommended; use 'cookie&html5'`);
    }
    return { callback: (cb) => fetchId(cb, params, consentData, storedId) };
  },
  eids: {
    sevioId: (values) => ({
      source: EID_SOURCE,
      uids: values.map(id => ({ id, atype: 1 }))
    })
  }
};

submodule('userId', sevioIdSubmodule);
