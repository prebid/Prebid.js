import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { mergeDeep, safeJSONParse, timestamp } from '../src/utils.js';
import { ajax } from '../src/ajax.js';

export const SUBMODULE_NAME = 'tapad_rtd';
export const TAPAD_RTD_DATA_KEY = 'tapad_rtd_data';
export const TAPAD_RTD_EXPIRATION_KEY = 'tapad_rtd_expiration';
export const TAPAD_RTD_STALE_KEY = 'tapad_rtd_stale';
const TAPAD_RTD_URL = 'https://rtid.tapad.com'
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
    const dataEnvelope = storage.getDataFromLocalStorage(TAPAD_RTD_DATA_KEY, null);
    const stale = storage.getDataFromLocalStorage(TAPAD_RTD_STALE_KEY, null);
    const expired = storage.getDataFromLocalStorage(TAPAD_RTD_EXPIRATION_KEY, null);
    const now = timestamp()
    if (dataEnvelope == null || now > new Date(expired).getTime()) {
      // request data envelope and don't manipulate bids
      tapadRtdObj.requestDataEnvelope(config, userConsent)
      done();
      return false;
    }
    if (now > new Date(stale).getTime()) {
      // request data envelope and manipulate bids
      tapadRtdObj.requestDataEnvelope(config, userConsent);
      done();
    }
    tapadRtdObj.alterBids(reqBidsConfigObj, config);
    done()
    return true;
  },

  alterBids(reqBidsConfigObj, config) {
    const dataEnvelope = safeJSONParse(storage.getDataFromLocalStorage(TAPAD_RTD_DATA_KEY, null));
    if (dataEnvelope == null) {
      return;
    }
    config.bidders.forEach((bidderCode) => {
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
        storage.setDataInLocalStorage(TAPAD_RTD_DATA_KEY, JSON.stringify(responseJson.data), null);
        storage.setDataInLocalStorage(TAPAD_RTD_STALE_KEY, responseJson.staleAt, null);
        storage.setDataInLocalStorage(TAPAD_RTD_EXPIRATION_KEY, responseJson.expiresAt, null);
      }
    }
    const queryString = tapadRtdObj.extractConsentQueryString(userConsent)
    const fullUrl = queryString == null ? `${TAPAD_RTD_URL}/acc/${config.accountId}/ids` : `${TAPAD_RTD_URL}/acc/${config.accountId}/ids${queryString}`
    ajax(fullUrl, storeDataEnvelopeResponse, null, { withCredentials: true, contentType: 'application/json' })
  },
  extractConsentQueryString(userConsent) {
    const queryObj = {};
    if (userConsent == null) {
      return undefined;
    }
    if (userConsent.gdpr != null) {
      const { gdprApplies, consentString } = userConsent.gdpr;
      mergeDeep(queryObj, {gdpr: gdprApplies, gdpr_consent: consentString})
    }
    if (userConsent.uspConsent != null) {
      mergeDeep(queryObj, {us_privacy: userConsent.uspConsent})
    }
    if (Object.keys(queryObj).length > 0) {
      return Object.entries(queryObj).reduce((queryString, [key, val], i) => {
        return `${queryString}${i === 0 ? '' : '&'}${key}=${val}`
      }, '?')
    }
    return undefined;
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
    return !isNaN(config.accountId);
  }
}

/** @type {RtdSubmodule} */
export const tapadRtdSubmodule = {
  name: SUBMODULE_NAME,
  getBidRequestData: tapadRtdObj.getBidRequestData,
  init: tapadRtdObj.init
}

submodule('realTimeData', tapadRtdSubmodule);
