/**
 * This module adds abtshieldId to the User ID module.
 * The {@link module:modules/userId} module is required.
 * @module modules/abtshieldIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
import { logError, logInfo, logWarn, deepClone } from '../src/utils.js';
import { ajax } from '../src/ajax.js';

const MODULE_NAME = 'abtshieldId';
const VENDOR_ID = 825;
const SOURCE = 'abtshield.com';
const ENDPOINT = 'https://d1.abtshield.com/mcr';
const AJAX_TIMEOUT_MS = 3000;

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
  if (Array.isArray(parsed.t) && parsed.t.length) {
    out.segments = parsed.t.filter((s) => typeof s === 'string' && s.length);
    if (!out.segments.length) delete out.segments;
  }
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
    const params = (config && config.params) || {};
    const sid = typeof params.sid === 'string' ? params.sid.trim() : '';
    if (!sid) {
      logError(`${MODULE_NAME}: params.sid is required. Obtain a service ID at abtshield.com and set params: { sid: '<your-sid>' }.`);
      return { callback: (done) => done(undefined) };
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
          {
            method: 'GET',
            withCredentials: true,
            contentType: 'text/plain',
            timeout: AJAX_TIMEOUT_MS
          }
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
