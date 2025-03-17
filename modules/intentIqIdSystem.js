/**
 * This module adds IntentIqId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/intentIqIdSystem
 * @requires module:modules/userId
 */

import {logError, isPlainObject} from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js'
import AES from 'crypto-js/aes.js';
import Utf8 from 'crypto-js/enc-utf8.js';
import {detectBrowser} from '../libraries/intentIqUtils/detectBrowserUtils.js';
import {appendVrrefAndFui} from '../libraries/intentIqUtils/getRefferer.js';
import { getCmpData } from '../libraries/intentIqUtils/getCmpData.js';
import {readData, storeData, defineStorageType, removeDataByKey} from '../libraries/intentIqUtils/storageUtils.js';
import {
  FIRST_PARTY_KEY,
  WITH_IIQ, WITHOUT_IIQ,
  NOT_YET_DEFINED,
  BLACK_LIST,
  CLIENT_HINTS_KEY,
  EMPTY,
  GVLID,
  VERSION,
} from '../libraries/intentIqConstants/intentIqConstants.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'intentIqId';

const encoderCH = {
  brands: 0,
  mobile: 1,
  platform: 2,
  architecture: 3,
  bitness: 4,
  model: 5,
  platformVersion: 6,
  wow64: 7,
  fullVersionList: 8
};
const INVALID_ID = 'INVALID_ID';
const ENDPOINT = 'https://api.intentiq.com';
const GDPR_ENDPOINT = 'https://api-gdpr.intentiq.com';
export let firstPartyData;

/**
 * Generate standard UUID string
 * @return {string}
 */
function generateGUID() {
  let d = new Date().getTime();
  const guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return guid;
}

/**
 * Encrypts plaintext.
 * @param {string} plainText The plaintext to encrypt.
 * @returns {string} The encrypted text as a base64 string.
 */
export function encryptData(plainText) {
  return AES.encrypt(plainText, MODULE_NAME).toString();
}

/**
 * Decrypts ciphertext.
 * @param {string} encryptedText The encrypted text as a base64 string.
 * @returns {string} The decrypted plaintext.
 */
export function decryptData(encryptedText) {
  const bytes = AES.decrypt(encryptedText, MODULE_NAME);
  return bytes.toString(Utf8);
}

/**
 * Parse json if possible, else return null
 * @param data
 */
function tryParse(data) {
  try {
    return JSON.parse(data);
  } catch (err) {
    logError(err);
    return null;
  }
}

/**
 * Configures and updates A/B testing group in Google Ad Manager (GAM).
 *
 * @param {object} gamObjectReference - Reference to the GAM object, expected to have a `cmd` queue and `pubads()` API.
 * @param {string} gamParameterName - The name of the GAM targeting parameter where the group value will be stored.
 * @param {string} userGroup - The A/B testing group assigned to the user (e.g., 'A', 'B', or a custom value).
 */
export function setGamReporting(gamObjectReference, gamParameterName, userGroup) {
  if (isPlainObject(gamObjectReference) && gamObjectReference.cmd) {
    gamObjectReference.cmd.push(() => {
      gamObjectReference
        .pubads()
        .setTargeting(gamParameterName, userGroup || NOT_YET_DEFINED);
    });
  }
}

/**
 * Processes raw client hints data into a structured format.
 * @param {object} clientHints - Raw client hints data
 * @return {string} A JSON string of processed client hints or an empty string if no hints
 */
export function handleClientHints(clientHints) {
  const chParams = {};
  for (const key in clientHints) {
    if (clientHints.hasOwnProperty(key) && clientHints[key] !== '') {
      if (['brands', 'fullVersionList'].includes(key)) {
        let handledParam = '';
        clientHints[key].forEach((element, index) => {
          const isNotLast = index < clientHints[key].length - 1;
          handledParam += `"${element.brand}";v="${element.version}"${isNotLast ? ', ' : ''}`;
        });
        chParams[encoderCH[key]] = handledParam;
      } else if (typeof clientHints[key] === 'boolean') {
        chParams[encoderCH[key]] = `?${clientHints[key] ? 1 : 0}`;
      } else {
        chParams[encoderCH[key]] = `"${clientHints[key]}"`;
      }
    }
  }
  return Object.keys(chParams).length ? JSON.stringify(chParams) : '';
}

export function isCMPStringTheSame(fpData, cmpData) {
  const firstPartyDataCPString = `${fpData.gdprString}${fpData.gppString}${fpData.uspString}`;
  const cmpDataString = `${cmpData.gdprString}${cmpData.gppString}${cmpData.uspString}`;
  return firstPartyDataCPString === cmpDataString;
}

/** @type {Submodule} */
export const intentIqIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  gvlid: GVLID,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {{string}} value
   * @returns {{intentIqId: {string}}|undefined}
   */
  decode(value) {
    return value && value != '' && INVALID_ID != value ? {'intentIqId': value} : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    const configParams = (config?.params) || {};
    let decryptedData, callbackTimeoutID;
    let callbackFired = false;
    let runtimeEids = { eids: [] };

    let gamObjectReference = isPlainObject(configParams.gamObjectReference) ? configParams.gamObjectReference : undefined;
    let gamParameterName = configParams.gamParameterName ? configParams.gamParameterName : 'intent_iq_group';

    const allowedStorage = defineStorageType(config.enabledStorageTypes);

    let rrttStrtTime = 0;
    let partnerData = {};
    let shouldCallServer = false;
    const FIRST_PARTY_DATA_KEY = `${FIRST_PARTY_KEY}_${configParams.partner}`;
    const cmpData = getCmpData();
    const gdprDetected = cmpData.gdprString;
    firstPartyData = tryParse(readData(FIRST_PARTY_KEY, allowedStorage));
    const isGroupB = firstPartyData?.group === WITHOUT_IIQ;
    setGamReporting(gamObjectReference, gamParameterName, firstPartyData?.group)

    const firePartnerCallback = () => {
      if (configParams.callback && !callbackFired) {
        callbackFired = true;
        if (callbackTimeoutID) clearTimeout(callbackTimeoutID);
        if (isGroupB) runtimeEids = { eids: [] };
        configParams.callback(runtimeEids, firstPartyData?.group || NOT_YET_DEFINED);
      }
    }

    callbackTimeoutID = setTimeout(() => {
      firePartnerCallback();
    }, configParams.timeoutInMillis || 500
    );

    if (typeof configParams.partner !== 'number') {
      logError('User ID - intentIqId submodule requires a valid partner to be defined');
      firePartnerCallback()
      return;
    }

    const currentBrowserLowerCase = detectBrowser();
    const browserBlackList = typeof configParams.browserBlackList === 'string' ? configParams.browserBlackList.toLowerCase() : '';

    // Check if current browser is in blacklist
    if (browserBlackList?.includes(currentBrowserLowerCase)) {
      logError('User ID - intentIqId submodule: browser is in blacklist!');
      if (configParams.callback) configParams.callback('', BLACK_LIST);
      return;
    }

    if (!firstPartyData?.pcid) {
      const firstPartyId = generateGUID();
      firstPartyData = {
        pcid: firstPartyId,
        pcidDate: Date.now(),
        group: NOT_YET_DEFINED,
        cttl: 0,
        uspString: EMPTY,
        gppString: EMPTY,
        gdprString: EMPTY,
        date: Date.now()
      };
      storeData(FIRST_PARTY_KEY, JSON.stringify(firstPartyData), allowedStorage, firstPartyData);
    } else if (!firstPartyData.pcidDate) {
      firstPartyData.pcidDate = Date.now();
      storeData(FIRST_PARTY_KEY, JSON.stringify(firstPartyData), allowedStorage, firstPartyData);
    }

    if (gdprDetected && !('isOptedOut' in firstPartyData)) {
      firstPartyData.isOptedOut = true;
    }

    // Read client hints from storage
    let clientHints = readData(CLIENT_HINTS_KEY, allowedStorage);

    // Get client hints and save to storage
    if (navigator?.userAgentData?.getHighEntropyValues) {
      navigator.userAgentData
        .getHighEntropyValues([
          'brands',
          'mobile',
          'bitness',
          'wow64',
          'architecture',
          'model',
          'platform',
          'platformVersion',
          'fullVersionList'
        ])
        .then(ch => {
          clientHints = handleClientHints(ch);
          storeData(CLIENT_HINTS_KEY, clientHints, allowedStorage, firstPartyData)
        });
    }

    const savedData = tryParse(readData(FIRST_PARTY_DATA_KEY, allowedStorage))
    if (savedData) {
      partnerData = savedData;

      if (partnerData.wsrvcll) {
        partnerData.wsrvcll = false;
        storeData(FIRST_PARTY_DATA_KEY, JSON.stringify(partnerData), allowedStorage, firstPartyData);
      }
    }

    if (partnerData.data) {
      if (partnerData.data.length) { // encrypted data
        decryptedData = tryParse(decryptData(partnerData.data));
        runtimeEids = decryptedData;
      }
    }

    if (!firstPartyData.cttl || Date.now() - firstPartyData.date > firstPartyData.cttl || !isCMPStringTheSame(firstPartyData, cmpData)) {
      firstPartyData.uspString = cmpData.uspString;
      firstPartyData.gppString = cmpData.gppString;
      firstPartyData.gdprString = cmpData.gdprString;
      firstPartyData.date = Date.now();
      shouldCallServer = true;
      storeData(FIRST_PARTY_KEY, JSON.stringify(firstPartyData), allowedStorage, firstPartyData);
      storeData(FIRST_PARTY_DATA_KEY, JSON.stringify(partnerData), allowedStorage, firstPartyData);
    } else if (firstPartyData.isOptedOut) {
      partnerData.data = runtimeEids = { eids: [] };
      firePartnerCallback()
    }

    if (firstPartyData.group === WITHOUT_IIQ || (firstPartyData.group !== WITHOUT_IIQ && runtimeEids?.eids?.length)) {
      firePartnerCallback()
    }

    if (!shouldCallServer) {
      if (isGroupB) runtimeEids = { eids: [] };
      firePartnerCallback();
      return { id: runtimeEids.eids };
    }

    // use protocol relative urls for http or https
    let url = `${gdprDetected ? GDPR_ENDPOINT : ENDPOINT}/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=${configParams.partner}&pt=17&dpn=1`;
    url += configParams.pcid ? '&pcid=' + encodeURIComponent(configParams.pcid) : '';
    url += configParams.pai ? '&pai=' + encodeURIComponent(configParams.pai) : '';
    url += firstPartyData.pcid ? '&iiqidtype=2&iiqpcid=' + encodeURIComponent(firstPartyData.pcid) : '';
    url += firstPartyData.pid ? '&pid=' + encodeURIComponent(firstPartyData.pid) : '';
    url += (partnerData.cttl) ? '&cttl=' + encodeURIComponent(partnerData.cttl) : '';
    url += (partnerData.rrtt) ? '&rrtt=' + encodeURIComponent(partnerData.rrtt) : '';
    url += firstPartyData.pcidDate ? '&iiqpciddate=' + encodeURIComponent(firstPartyData.pcidDate) : '';
    url += cmpData.uspString ? '&us_privacy=' + encodeURIComponent(cmpData.uspString) : '';
    url += cmpData.gppString ? '&gpp=' + encodeURIComponent(cmpData.gppString) : '';
    url += cmpData.gdprApplies
      ? '&gdpr_consent=' + encodeURIComponent(cmpData.gdprString) + '&gdpr=1'
      : '&gdpr=0';
    url += clientHints ? '&uh=' + encodeURIComponent(clientHints) : '';
    url += VERSION ? '&jsver=' + VERSION : '';
    url += firstPartyData?.group ? '&testGroup=' + encodeURIComponent(firstPartyData.group) : '';

    // Add vrref and fui to the URL
    url = appendVrrefAndFui(url, configParams.domainName);

    const storeFirstPartyData = () => {
      partnerData.eidl = runtimeEids?.eids?.length || -1
      storeData(FIRST_PARTY_KEY, JSON.stringify(firstPartyData), allowedStorage, firstPartyData);
      storeData(FIRST_PARTY_DATA_KEY, JSON.stringify(partnerData), allowedStorage, firstPartyData);
    }

    const resp = function (callback) {
      const callbacks = {
        success: response => {
          let respJson = tryParse(response);
          // If response is a valid json and should save is true
          if (respJson) {
            partnerData.date = Date.now();
            firstPartyData.date = Date.now();
            const defineEmptyDataAndFireCallback = () => {
              respJson.data = partnerData.data = runtimeEids = { eids: [] };
              storeFirstPartyData()
              firePartnerCallback()
              callback(runtimeEids)
            }
            if (callbackTimeoutID) clearTimeout(callbackTimeoutID)
            if ('cttl' in respJson) {
              firstPartyData.cttl = respJson.cttl;
            } else firstPartyData.cttl = 86400000;

            if ('tc' in respJson) {
              partnerData.terminationCause = respJson.tc;
              if (respJson.tc == 41) {
                firstPartyData.group = WITHOUT_IIQ;
                storeData(FIRST_PARTY_KEY, JSON.stringify(firstPartyData), allowedStorage, firstPartyData);
                defineEmptyDataAndFireCallback();
                if (gamObjectReference) setGamReporting(gamObjectReference, gamParameterName, firstPartyData.group);
                return
              } else {
                firstPartyData.group = WITH_IIQ;
                if (gamObjectReference) setGamReporting(gamObjectReference, gamParameterName, firstPartyData.group);
              }
            }
            if ('isOptedOut' in respJson) {
              if (respJson.isOptedOut !== firstPartyData.isOptedOut) {
                firstPartyData.isOptedOut = respJson.isOptedOut;
              }
              if (respJson.isOptedOut === true) {
                respJson.data = partnerData.data = runtimeEids = { eids: [] };

                const keysToRemove = [
                  FIRST_PARTY_DATA_KEY,
                  CLIENT_HINTS_KEY
                ];

                keysToRemove.forEach(key => removeDataByKey(key, allowedStorage));

                storeData(FIRST_PARTY_KEY, JSON.stringify(firstPartyData), allowedStorage, firstPartyData);
                firePartnerCallback();
                callback(runtimeEids);
                return
              }
            }
            if ('pid' in respJson) {
              firstPartyData.pid = respJson.pid;
            }
            if ('ls' in respJson) {
              if (respJson.ls === false) {
                defineEmptyDataAndFireCallback()
                return
              }
              // If data is empty, means we should save as INVALID_ID
              if (respJson.data == '') {
                respJson.data = INVALID_ID;
              } else {
                // If data is a single string, assume it is an id with source intentiq.com
                if (respJson.data && typeof respJson.data === 'string') {
                  respJson.data = {eids: [respJson.data]}
                }
              }
              partnerData.data = respJson.data;
            }

            if ('ct' in respJson) {
              partnerData.ct = respJson.ct;
            }

            if ('sid' in respJson) {
              partnerData.siteId = respJson.sid;
            }

            if (rrttStrtTime && rrttStrtTime > 0) {
              partnerData.rrtt = Date.now() - rrttStrtTime;
            }

            if (respJson.data?.eids) {
              runtimeEids = respJson.data
              callback(respJson.data.eids);
              firePartnerCallback()
              const encryptedData = encryptData(JSON.stringify(respJson.data))
              partnerData.data = encryptedData;
            } else {
              callback(runtimeEids);
              firePartnerCallback()
            }
            storeFirstPartyData();
          } else {
            callback(runtimeEids);
            firePartnerCallback()
          }
        },
        error: error => {
          logError(MODULE_NAME + ': ID fetch encountered an error', error);
          callback(runtimeEids);
        }
      };
      rrttStrtTime = Date.now();

      partnerData.wsrvcll = true;
      storeData(FIRST_PARTY_DATA_KEY, JSON.stringify(partnerData), allowedStorage, firstPartyData);
      ajax(url, callbacks, undefined, {method: 'GET', withCredentials: true});
    };
    const respObj = {callback: resp};

    if (runtimeEids?.eids?.length) respObj.id = runtimeEids.eids;
    return respObj
  },
  eids: {
    'intentIqId': {
      source: 'intentiq.com',
      atype: 1,
      getSource: function (data) {
        return data.source;
      },
      getValue: function (data) {
        if (data?.uids?.length) {
          return data.uids[0].id
        }
        return null
      },
      getUidExt: function (data) {
        if (data?.uids?.length) {
          return data.uids[0].ext;
        }
        return null
      }
    },
  }
};

submodule('userId', intentIqIdSubmodule);
