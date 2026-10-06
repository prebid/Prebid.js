/**
 * This module adds the Sevio ID to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/sevioIdSystem
 * @requires module:modules/userId
 */

import { logError, logInfo, logWarn } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { qualifiedAjaxBuilder } from '../src/ajax.js';
import { coppaDataHandler } from '../src/consentHandler.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

import type { AllConsentData } from '../src/consentHandler.ts';
import type { IdProviderSpec } from './userId/spec.ts';

const MODULE_NAME = 'sevioId' as const;
const GVLID = 1393;
export const ID_ENDPOINT = 'https://id.adx.ws/identity/resolve';
const EID_SOURCE = 'adx.ws';
const LOG_PREFIX = 'sevioId: ';
const RECOMMENDED_STORAGE_TYPES = ['cookie', 'html5'];
// A Sevio envelope: 66 base64url characters, no padding. The Identity service refuses a request
// carrying a malformed one, so a stored ID of any other shape is not sent.
const ENVELOPE_PATTERN = /^[A-Za-z0-9_-]{66}$/;
const EMAIL_HASH_PATTERN = /^[0-9a-f]{64}$/;

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
  if (typeof gdpr?.gdprApplies === 'boolean') {
    privacy.gdpr = Number(gdpr.gdprApplies);
  }
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

function buildIds(storedId, emailHash: string | undefined) {
  const ids: string[] = [];
  if (typeof storedId === 'string' && ENVELOPE_PATTERN.test(storedId)) {
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

function fetchId(callback: (id?: string) => void, params: SevioIdParams, consentData, storedId) {
  const ids = buildIds(storedId, params.emailHash);
  const body = {
    client_id: params.clientId,
    ...(ids.length ? { ids } : {}),
    privacy: buildPrivacy(consentData)
  };
  const callbacks = {
    success(response) {
      let id;
      try {
        id = JSON.parse(response)?.sevio_id;
      } catch (e) {
        logError(`${LOG_PREFIX}could not parse the ID response`, e);
        callback();
        return;
      }
      if (typeof id === 'string' && id !== '') {
        callback(id);
      } else if (id === null) {
        // The Identity service answers null when the privacy signals or its agent check refuse the call.
        logInfo(`${LOG_PREFIX}the Identity service provided no ID for this request`);
        callback();
      } else {
        logError(`${LOG_PREFIX}the ID response has no 'sevio_id'`, response);
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
    return typeof value === 'string' && value !== '' ? { sevioId: value } : undefined;
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
