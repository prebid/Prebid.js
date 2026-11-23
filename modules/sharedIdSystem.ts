/**
 * This module adds SharedId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/sharedIdSystem
 * @requires module:modules/userId
 */

import { parseUrl, buildUrl, triggerPixel, logInfo, logWarn, hasDeviceAccess, generateUUID } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { VENDORLESS_GVLID } from '../src/consentHandler.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { domainOverrideToRootDomain } from '../libraries/domainOverrideToRootDomain/index.js';
import { getUserSyncParams } from '../libraries/userSyncUtils/userSyncUtils.js';

import type { AllConsentData } from '../src/consentHandler.ts';
import type { IdHandle, IdProviderSpec, ProviderResponse } from "./userId/spec.ts";

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: 'sharedId' });
const COOKIE = 'cookie';
const LOCAL_STORAGE = 'html5';
const OPTOUT_NAME = '_pubcid_optout';
const PUB_COMMON_ID = 'PublisherCommonId';

export type SharedIdSystemModuleName = 'sharedId' | 'pubCommonId';

export type SharedIdParams = {
  /**
   * If true, then an id is created automatically if it’s missing.
   * Default is true. If your server has a component that generates the id instead, then this should be set to false
   */
  create?: boolean;
  /**
   * If true, the the expiration time is automatically extended whenever the script is executed even if the id exists already.
   * Default is false: the id expires from the time it was initially created.
   */
  extend?: boolean;
  /**
   * For publisher server support only. Where to call out to for a server cookie.
   * Once the pixel loads, the ID follows what the endpoint left in storage: an ID it set is adopted, and one it
   * deleted is dropped for the rest of the page view. Use cookie storage only: the endpoint can't delete localStorage.
   */
  pixelUrl?: string;
  /**
   * If true, the `pixelUrl` request also carries the page's consent data, so the endpoint can decide on storage with
   * it: `gdpr` (1 or 0, when GDPR applicability is known), `gdpr_consent`, `us_privacy`, `gpp` and `gpp_sid`
   * (comma-separated section IDs), each only when available. Default is false.
   */
  pixelConsent?: boolean;
  /**
   * If true, the `pixelUrl` request also carries `cookie_domain`: the domain Prebid.js writes the ID cookie on (the
   * topmost domain the browser accepts a cookie for, e.g. `example.com` on `www.example.com`), so a first-party
   * endpoint can set its cookie with the same `Domain`. A server can't run the browser's public-suffix check
   * itself; it should only accept a value equal to the request host or a parent domain of it. Default is false.
   */
  pixelCookieDomain?: boolean;
  /**
   * The value to use for `inserter` in EIDs.
   */
  inserter?: string;
};

declare module './userId/spec' {
  interface UserId {
    pubcid: string;
  }
  interface ProvidersToId {
    sharedId: 'pubcid';
    pubCommonId: 'pubcid';
  }

  interface ProviderParams {
    sharedId: SharedIdParams;
    pubCommonId: SharedIdParams;
  }

}

/**
 * Read a value either from cookie or local storage
 * @param {string} name Name of the item
 * @param {string} type storage type override
 * @returns {string|null} a string if item exists
 */
function readValue(name, type) {
  if (type === COOKIE) {
    return storage.getCookie(name);
  } else if (type === LOCAL_STORAGE) {
    if (storage.hasLocalStorage()) {
      const expValue = storage.getDataFromLocalStorage(`${name}_exp`);
      if (!expValue) {
        return storage.getDataFromLocalStorage(name);
      } else if ((new Date(expValue)).getTime() - Date.now() > 0) {
        return storage.getDataFromLocalStorage(name);
      }
    }
  }
}

// How long to wait before reading storage a second time, when the first read after the pixel shows no change yet.
const PIXEL_RECHECK_MS = 50;

/**
 * Fire the pixel, then make the ID follow what the endpoint left in storage.
 * @param pubcid the ID this page view already holds
 */
function pixelSyncCallback(pubcid, config, handle: IdHandle, getPixelParams?: () => Record<string, string>): ProviderResponse['callback'] {
  return function (setId) {
    queuePixelCallback(config.params.pixelUrl, pubcid, () => {
      if (!config.storage) {
        // nothing reads what the endpoint sets: keep the ID this page view holds
        setId();
        return;
      }
      // In some WebKit builds the response's Set-Cookie is not yet visible in document.cookie at the load event
      // (see #16158): read on the next task, and once more a little later if nothing seems to have changed.
      // What the endpoint left is never written again from script: that would make its cookie a script-set one.
      const read = (recheck) => {
        const storedId = handle.get();
        if (recheck && (!storedId || storedId === pubcid)) {
          setTimeout(() => read(false), PIXEL_RECHECK_MS);
        } else if (storedId) {
          handle.touch();
          setId(storedId);
        } else if (pubcid) {
          // the endpoint deleted the cookie, for example for Global Privacy Control or denied consent
          handle.remove();
          setId();
        } else {
          setId();
        }
      };
      setTimeout(() => read(true), 0);
    }, getPixelParams?.())();
  };
}

function getIdCallback(pubcid, config, handle: IdHandle, getPixelParams?: () => Record<string, string>): ProviderResponse['callback'] {
  return config.params?.pixelUrl ? pixelSyncCallback(pubcid, config, handle, getPixelParams) : (setId) => setId(pubcid);
}

let warnedPixelStorage = false;

function checkPixelStorage(config, pixelUrl) {
  if (!pixelUrl || warnedPixelStorage) return;
  const types = config?.storage?.type?.trim().split(/\s*&\s*/) ?? [];
  if (types.some(type => type !== COOKIE)) {
    warnedPixelStorage = true;
    logWarn(`sharedId: pixelUrl is set with storage type '${config.storage.type}'. The pixel endpoint can't delete ` +
      `localStorage, so if it deletes the ID cookie (for example for an opt-out), the ID kept in localStorage is still ` +
      `used. Use storage type 'cookie' with pixelUrl.`);
  }
}

export function resetPixelStorageWarning() {
  warnedPixelStorage = false;
}

/**
 * The extra `pixelUrl` query params: the page's consent data when `pixelConsent` is set, and the
 * cookie domain when `pixelCookieDomain` is set. Empty values are left out.
 */
function pixelParams(
  { pixelConsent, pixelCookieDomain }: SharedIdParams = {},
  consentData: Partial<AllConsentData> | undefined
): Record<string, string> {
  const params: Record<string, string> = {};
  if (pixelConsent) {
    Object.entries(getUserSyncParams(consentData?.gdpr, consentData?.usp, consentData?.gpp))
      .filter(([, value]) => value != null && value !== '')
      .forEach(([key, value]) => {
        params[key] = String(value);
      });
  }
  if (pixelCookieDomain) {
    // the domain the User ID module writes the ID cookie on. Only probed when asked for: the probe writes test cookies
    const domain = sharedIdSystemSubmodule.domainOverride();
    if (domain) params.cookie_domain = domain;
  }
  return params;
}

function queuePixelCallback(pixelUrl, id = '', callback?, params: Record<string, string> = {}) {
  if (!pixelUrl) {
    return;
  }

  // Use pubcid as a cache buster
  const urlInfo = parseUrl(pixelUrl);
  urlInfo.search.id = encodeURIComponent('pubcid:' + id);
  Object.assign(urlInfo.search, params);
  const targetUrl = buildUrl(urlInfo);

  return function () {
    triggerPixel(targetUrl, callback);
  };
}

function hasOptedOut() {
  return !!((storage.cookiesAreEnabled() && readValue(OPTOUT_NAME, COOKIE)) ||
    (storage.hasLocalStorage() && readValue(OPTOUT_NAME, LOCAL_STORAGE)));
}

export const sharedIdSystemSubmodule: IdProviderSpec<'sharedId'> = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'sharedId',
  aliasName: 'pubCommonId',
  gvlid: VENDORLESS_GVLID as any,
  disclosureURL: 'local://prebid/sharedId-optout.json',

  /**
   * decode the stored id value for passing to bid requests
   */
  decode(value, config) {
    if (hasOptedOut()) {
      logInfo('PubCommonId decode: Has opted-out');
      return undefined;
    }
    logInfo(' Decoded value PubCommonId ' + value);
    const idObj = { 'pubcid': value as string };
    return idObj;
  },
  getId: function (config = {} as any, consentData, storedId, handle) {
    if (hasOptedOut()) {
      logInfo('PubCommonId: Has opted-out');
      return;
    }
    if (consentData?.coppa) {
      logInfo('PubCommonId: IDs not provided for coppa requests, exiting PubCommonId');
      return;
    }
    const { params: { create = true, pixelUrl } = {} } = config;
    checkPixelStorage(config, pixelUrl);
    let newId = storedId;
    if (!newId) {
      try {
        if (typeof window[PUB_COMMON_ID] === 'object') {
          // If the page includes its own pubcid module, then save a copy of id.
          newId = window[PUB_COMMON_ID].getId();
        }
      } catch (e) {
      }

      if (!newId) newId = (create && hasDeviceAccess()) ? generateUUID() : undefined;
    }

    if (pixelUrl && storedId && config.storage) {
      // the endpoint may have set the stored ID: don't have it written again from script
      handle.manage();
    }
    return { id: newId, callback: getIdCallback(newId, config, handle, () => pixelParams(config.params, consentData)) };
  },
  /**
   * performs action to extend an id.  There are generally two ways to extend the expiration time
   * of stored id: using pixelUrl or return the id and let main user id module write it again with
   * the new expiration time.
   *
   * PixelUrl, if defined, should point back to a first party domain endpoint.  On the server
   * side, there is either a plugin, or customized logic to read and write back the pubcid cookie.
   * The extendId function itself should return only the callback, and not the id itself to avoid
   * having the script-side overwriting server-side.  This applies to both pubcid and sharedid.
   *
   * On the other hand, if there is no pixelUrl, then the extendId should return storedId so that
   * its expiration time is updated.
   */
  extendId: function(config = {} as any, consentData, storedId, handle) {
    if (hasOptedOut()) {
      logInfo('PubCommonId: Has opted-out');
      return { id: undefined };
    }
    if (consentData?.coppa) {
      logInfo('PubCommonId: IDs not provided for coppa requests, exiting PubCommonId');
      return;
    }
    const { params: { extend = false, pixelUrl } = {} } = config;

    if (extend) {
      if (pixelUrl) {
        checkPixelStorage(config, pixelUrl);
        return { callback: pixelSyncCallback(storedId, config, handle, () => pixelParams(config.params, consentData)) };
      } else {
        return { id: storedId };
      }
    }
  },
  domainOverride: domainOverrideToRootDomain(storage, 'sharedId'),
  eids: {
    'pubcid'(values, config) {
      const eid: any = {
        source: 'pubcid.org',
        uids: values.map(id => ({ id, atype: 1 }))
      };
      if (config?.params?.inserter != null) {
        eid.inserter = config.params.inserter;
      }
      return eid;
    },
  }
};

submodule('userId', sharedIdSystemSubmodule);
