/**
 * This module adds abtshieldId to the User ID module.
 * The {@link module:modules/userId} module is required.
 * @module modules/abtshieldIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
import { logError, logInfo, logWarn, deepClone } from '../src/utils.js';
import { ajaxBuilder, processRequestOptions } from '../src/ajax.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

const MODULE_NAME = 'abtshieldId';
const VENDOR_ID = 825;
const SOURCE = 'abtshield.com';
const ENDPOINT = 'https://d1.abtshield.com/mcr';
const AJAX_TIMEOUT_MS = 3000;
const MIN_REFRESH_SECONDS = 86400;
const SIVT_SEGMENT = 'sivt';
const ajax = ajaxBuilder(AJAX_TIMEOUT_MS, undefined, MODULE_TYPE_UID, MODULE_NAME);
const AJAX_OPTIONS = {
  method: 'GET',
  withCredentials: true,
  contentType: 'text/plain'
};

function buildEndpoint(sid) {
  return `${ENDPOINT}?sid=${encodeURIComponent(sid)}`;
}

export function parseMcrResponse(body) {
  if (!body) return null;
  let parsed;
  try {
    parsed = typeof body === 'string' ? JSON.parse(body) : body;
  } catch (e) {
    logError(`${MODULE_NAME}: failed to parse MCR response`, e);
    return null;
  }
  const id = parsed.iuid || parsed.uuid;
  if (!id || typeof id !== 'string' || !id.length) {
    return null;
  }
  const out = { uuid: id };
  const segments = [];
  if (Array.isArray(parsed.t) && parsed.t.length) {
    segments.push(...parsed.t.filter((s) => typeof s === 'string' && s.length));
  }
  if (parsed.b === 1 && !segments.includes(SIVT_SEGMENT)) {
    segments.push(SIVT_SEGMENT);
  }
  if (segments.length) out.segments = segments;
  return out;
}

/** @type {import('../modules/userId/index.js').Submodule} */
export const abtshieldIdSubmodule = {
  name: MODULE_NAME,
  gvlid: VENDOR_ID,

  decode(value) {
    if (!value || typeof value.uuid !== 'string' || !value.uuid.length) return undefined;
    return { [MODULE_NAME]: deepClone(value) };
  },

  getId(config) {
    if (!config || !config.storage || !config.storage.type || !config.storage.name) {
      logError(`${MODULE_NAME}: storage config is required. Set storage: { type: 'html5', name: 'abtshield_id', expires: 1 }.`);
      return undefined;
    }
    if (typeof config.storage.expires !== 'number' || config.storage.expires < 1) {
      logError(`${MODULE_NAME}: storage.expires must be a number >= 1 (days).`);
      return undefined;
    }
    if (typeof config.storage.refreshInSeconds === 'number' && config.storage.refreshInSeconds < MIN_REFRESH_SECONDS) {
      logError(`${MODULE_NAME}: storage.refreshInSeconds must be >= ${MIN_REFRESH_SECONDS} seconds.`);
      return undefined;
    }
    const params = (config && config.params) || {};
    const sid = typeof params.sid === 'string' ? params.sid.trim() : '';
    if (!sid) {
      logError(`${MODULE_NAME}: params.sid is required. Obtain a service ID at abtshield.com and set params: { sid: '<your-sid>' }.`);
      return undefined;
    }
    const url = buildEndpoint(sid);

    return {
      callback: (done) => {
        ajax(
          url,
          {
            success: (responseBody) => {
              const value = parseMcrResponse(responseBody);
              if (!value) {
                logWarn(`${MODULE_NAME}: MCR response did not contain a usable uuid`);
                done(undefined);
                return;
              }
              logInfo(`${MODULE_NAME}: resolved uuid${value.segments ? ` with ${value.segments.length} segment(s)` : ''}`);
              done(value);
            },
            error: (statusText, xhr) => {
              logError(`${MODULE_NAME}: MCR request failed`, statusText, xhr && xhr.status);
              done(undefined);
            }
          },
          undefined,
          processRequestOptions({ ...AJAX_OPTIONS }, MODULE_TYPE_UID, MODULE_NAME)
        );
      }
    };
  },

  eids: {
    [MODULE_NAME]: {
      source: SOURCE,
      atype: 1,
      getValue(data) {
        return data && data.uuid;
      },
      getUidExt(data) {
        if (data && Array.isArray(data.segments) && data.segments.length) {
          return { segments: data.segments };
        }
        return undefined;
      }
    }
  }
};

submodule('userId', abtshieldIdSubmodule);
