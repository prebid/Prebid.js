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

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 * @typedef {import('../modules/rtdModule/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/rtdModule/index.js').UserConsentData} UserConsentData
 */

export const SUBMODULE_NAME = 'experian_rtid';
export const EXPERIAN_RTID_DATA_KEY = 'experian_rtid_data';
export const EXPERIAN_RTID_EXPIRATION_KEY = 'experian_rtid_expiration';
export const EXPERIAN_RTID_STALE_KEY = 'experian_rtid_stale';
export const EXPERIAN_RTID_NO_TRACK_KEY = 'experian_rtid_no_track';
const EXPERIAN_RTID_URL = 'https://rtid.tapad.com'
const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: SUBMODULE_NAME });

export const experianRtdObj = {
  /**
   * @summary modify bid request data
   * @param {Object} reqBidsConfigObj
   * @param {function} done
   * @param {SubmoduleConfig} config
   * @param {UserConsentData} userConsent
   */
  getBidRequestData(reqBidsConfigObj, done, config, userConsent) {
    const dataEnvelope = storage.getDataFromLocalStorage(EXPERIAN_RTID_DATA_KEY, null);
    const stale = storage.getDataFromLocalStorage(EXPERIAN_RTID_STALE_KEY, null);
    const expired = storage.getDataFromLocalStorage(EXPERIAN_RTID_EXPIRATION_KEY, null);
    const noTrack = storage.getDataFromLocalStorage(EXPERIAN_RTID_NO_TRACK_KEY, null);
    const now = timestamp()
    if (now > new Date(expired).getTime() || (noTrack == null && dataEnvelope == null)) {
      // request data envelope and don't manipulate bids
      experianRtdObj.requestDataEnvelope(config, userConsent)
      done();
      return false;
    }
    if (now > new Date(stale).getTime()) {
      // request data envelope and manipulate bids
      experianRtdObj.requestDataEnvelope(config, userConsent);
    }
    if (noTrack != null) {
      done();
      return false;
    }
    experianRtdObj.alterBids(reqBidsConfigObj, config);
    done()
    return true;
  },

  alterBids(reqBidsConfigObj, config) {
    const dataEnvelope = safeJSONParse(storage.getDataFromLocalStorage(EXPERIAN_RTID_DATA_KEY, null));
    if (dataEnvelope == null) {
      return;
    }
    deepAccess(config, 'params.bidders').forEach((bidderCode) => {
      const bidderData = dataEnvelope.find(({ bidder }) => bidder === bidderCode)
      if (bidderData != null) {
        mergeDeep(reqBidsConfigObj.ortb2Fragments.bidder, { [bidderCode]: { experianRtidKey: bidderData.data.key, experianRtidData: bidderData.data.data } })
      }
    })
  },
  requestDataEnvelope(config, userConsent) {
    function storeDataEnvelopeResponse(response) {
      const responseJson = safeJSONParse(response);
      if (responseJson != null) {
        storage.setDataInLocalStorage(EXPERIAN_RTID_STALE_KEY, responseJson.staleAt, null);
        storage.setDataInLocalStorage(EXPERIAN_RTID_EXPIRATION_KEY, responseJson.expiresAt, null);
        if (responseJson.status === 'no_track') {
          storage.setDataInLocalStorage(EXPERIAN_RTID_NO_TRACK_KEY, 'no_track', null);
          storage.removeDataFromLocalStorage(EXPERIAN_RTID_DATA_KEY, null);
        } else {
          storage.setDataInLocalStorage(EXPERIAN_RTID_DATA_KEY, JSON.stringify(responseJson.data), null);
          storage.removeDataFromLocalStorage(EXPERIAN_RTID_NO_TRACK_KEY, null);
        }
      }
    }
    const queryString = experianRtdObj.extractConsentQueryString(config, userConsent)
    const fullUrl = queryString == null ? `${EXPERIAN_RTID_URL}/acc/${deepAccess(config, 'params.accountId')}/ids` : `${EXPERIAN_RTID_URL}/acc/${deepAccess(config, 'params.accountId')}/ids${queryString}`
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
export const experianRtdSubmodule = {
  name: SUBMODULE_NAME,
  getBidRequestData: experianRtdObj.getBidRequestData,
  init: experianRtdObj.init
}

submodule('realTimeData', experianRtdSubmodule);
