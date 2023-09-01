import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import {
  deepAccess,
  isArray,
  isPlainObject,
  isStr,
  mergeDeep,
  safeJSONParse,
  timestamp
} from '../src/utils.js';
import { ajax } from '../src/ajax.js';

export const SUBMODULE_NAME = 'tapad_rtid';
export const TAPAD_RTID_DATA_KEY = 'tapad_rtid_data';
export const TAPAD_RTID_EXPIRATION_KEY = 'tapad_rtid_expiration';
export const TAPAD_RTID_STALE_KEY = 'tapad_rtid_stale';
export const TAPAD_RTID_NO_TRACK_KEY = 'tapad_rtid_no_track';
const TAPAD_RTID_URL = 'https://rtid.tapad.com'
const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: SUBMODULE_NAME });

export const tapadRtdObj = {
  /**
   * @summary modify bid request data
   * @param {Object} reqBidsConfigObj
   * @param {function} done
   * @param {SubmoduleConfig} config
   * @param {UserConsentData} userConsent
   */
  getBidRequestData(reqBidsConfigObj, done, config, userConsent) {
    const dataEnvelope = storage.getDataFromLocalStorage(TAPAD_RTID_DATA_KEY, null);
    const stale = storage.getDataFromLocalStorage(TAPAD_RTID_STALE_KEY, null);
    const expired = storage.getDataFromLocalStorage(TAPAD_RTID_EXPIRATION_KEY, null);
    const noTrack = storage.getDataFromLocalStorage(TAPAD_RTID_NO_TRACK_KEY, null);
    const now = timestamp()
    if (now > new Date(expired).getTime() || (noTrack == null && dataEnvelope == null)) {
      // request data envelope and don't manipulate bids
      tapadRtdObj.requestDataEnvelope(config, userConsent)
      done();
      return false;
    }
    if (now > new Date(stale).getTime()) {
      // request data envelope and manipulate bids
      tapadRtdObj.requestDataEnvelope(config, userConsent);
    }
    if (noTrack != null) {
      done();
      return false;
    }
    tapadRtdObj.alterBids(reqBidsConfigObj, config);
    done()
    return true;
  },

  alterBids(reqBidsConfigObj, config) {
    const dataEnvelope = safeJSONParse(storage.getDataFromLocalStorage(TAPAD_RTID_DATA_KEY, null));
    if (dataEnvelope == null) {
      return;
    }
    deepAccess(config, 'params.bidders').forEach((bidderCode) => {
      const bidderData = dataEnvelope.find(({ bidder }) => bidder === bidderCode)
      if (bidderData != null) {
        mergeDeep(reqBidsConfigObj.ortb2Fragments.bidder, {[bidderCode]: bidderData.data})
      }
    })
  },
  requestDataEnvelope(config, userConsent) {
    function storeDataEnvelopeResponse(response) {
      const responseJson = safeJSONParse(response);
      if (responseJson != null) {
        storage.setDataInLocalStorage(TAPAD_RTID_STALE_KEY, responseJson.staleAt, null);
        storage.setDataInLocalStorage(TAPAD_RTID_EXPIRATION_KEY, responseJson.expiresAt, null);
        if (responseJson.status === 'no_track') {
          storage.setDataInLocalStorage(TAPAD_RTID_NO_TRACK_KEY, 'no_track', null);
          storage.removeDataFromLocalStorage(TAPAD_RTID_DATA_KEY, null);
        } else {
          storage.setDataInLocalStorage(TAPAD_RTID_DATA_KEY, JSON.stringify(responseJson.data), null);
          storage.removeDataFromLocalStorage(TAPAD_RTID_NO_TRACK_KEY, null);
        }
      }
    }
    const queryString = tapadRtdObj.extractConsentQueryString(config, userConsent)
    const fullUrl = queryString == null ? `${TAPAD_RTID_URL}/acc/${deepAccess(config, 'params.accountId')}/ids` : `${TAPAD_RTID_URL}/acc/${deepAccess(config, 'params.accountId')}/ids${queryString}`
    ajax(fullUrl, storeDataEnvelopeResponse, null, { withCredentials: true, contentType: 'application/json' })
  },
  extractConsentQueryString(config, userConsent) {
    const queryObj = {};

    if (userConsent != null) {
      if (userConsent.gdpr != null) {
        const { gdprApplies, consentString } = userConsent.gdpr;
        mergeDeep(queryObj, {gdpr: gdprApplies, gdpr_consent: consentString})
      }
      if (userConsent.uspConsent != null) {
        mergeDeep(queryObj, {us_privacy: userConsent.uspConsent})
      }
    }
    const consentQueryString = Object.entries(queryObj).map(([key, val]) => `${key}=${val}`).join('&');

    let idsString = '';
    if (deepAccess(config, 'params.ids') != null && isPlainObject(deepAccess(config, 'params.ids'))) {
      idsString = Object.entries(deepAccess(config, 'params.ids')).map(([idType, val]) => {
        if (isArray(val)) {
          return val.map((singleVal) => `id.${idType}=${singleVal}`).join('&')
        } else {
          return `id.${idType}=${val}`
        }
      }).join('&')
    }

    const combinedString = [consentQueryString, idsString].filter((string) => string !== '').join('&');
    return combinedString !== '' ? `?${combinedString}` : undefined;
  },
  /**
   * @function
   * @summary init sub module
   * @name RtdSubmodule#init
   * @param {SubmoduleConfig} config
   * @param {UserConsentData} userConsent
   * @return {boolean} false to remove sub module
   */
  init(config, userConsent) {
    return isStr(deepAccess(config, 'params.accountId'));
  }
}

/** @type {RtdSubmodule} */
export const tapadRtdSubmodule = {
  name: SUBMODULE_NAME,
  getBidRequestData: tapadRtdObj.getBidRequestData,
  init: tapadRtdObj.init
}

submodule('realTimeData', tapadRtdSubmodule);
