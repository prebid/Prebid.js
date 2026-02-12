import {MODULE_TYPE_UID} from '../src/activities/modules.js'
import {submodule} from '../src/hook.js'
import {getStorageManager} from '../src/storageManager.js'
import {deepAccess, prefixLog, safeJSONParse} from '../src/utils.js'
import {hasPurposeConsent} from '../libraries/permutiveUtils/index.js'
import {VENDORLESS_GVLID} from "../src/consentHandler.js";
/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'permutiveIdentityManagerId'
const PERMUTIVE_ID_DATA_STORAGE_KEY = 'permutive-prebid-id'

const ID5_DOMAIN = 'id5-sync.com'
const LIVERAMP_DOMAIN = 'liveramp.com'
const UID_DOMAIN = 'uidapi.com'
const GOOGLE_DOMAIN = 'google.com'

const PRIMARY_IDS = ['id5id', 'idl_env', 'uid2', 'pairId']

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME})

const logger = prefixLog('[PermutiveID]')

const readFromSdkLocalStorage = () => {
  const data = safeJSONParse(storage.getDataFromLocalStorage(PERMUTIVE_ID_DATA_STORAGE_KEY))
  const id = {}
  if (data && typeof data === 'object' && 'providers' in data && typeof data.providers === 'object') {
    const now = Date.now()
    for (const [idName, value] of Object.entries(data.providers)) {
      if (PRIMARY_IDS.includes(idName) && value.userId) {
        if (!value.expiryTime || value.expiryTime > now) {
          id[idName] = value.userId
        }
      }
    }
  }
  return id
}

/**
 * Catch and log errors
 * @param {function} fn - Function to safely evaluate
 */
function makeSafe (fn) {
  try {
    return fn()
  } catch (e) {
    logger.logError(e)
  }
}

const waitAndRetrieveFromSdk = (timeoutMs) =>
  new Promise(
    resolve => {
      const fallback = setTimeout(() => {
        logger.logInfo('timeout expired waiting for SDK - attempting read from local storage again')
        resolve(readFromSdkLocalStorage())
      }, timeoutMs)
      return window?.permutive?.ready(() => makeSafe(() => {
        logger.logInfo('Permutive SDK is ready')
        const onReady = makeSafe(() => window.permutive.addons.identity_manager.prebid.onReady)
        if (typeof onReady === 'function') {
          onReady((ids) => {
            logger.logInfo('Permutive SDK has provided ids')
            resolve(ids)
            clearTimeout(fallback)
          })
        } else {
          logger.logError('Permutive SDK initialised but identity manager prebid api not present')
        }
      }))
    }
  )

/** @type {Submodule} */
export const permutiveIdentityManagerIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  gvlid: VENDORLESS_GVLID,

  disclosureURL: "https://assets.permutive.app/tcf/tcf.json",

  /**
   * decode the stored id value for passing to bid requests
   * @function decode
   * @param {(Object|string)} value
   * @param {SubmoduleConfig|undefined} config
   * @returns {(Object|undefined)}
   */
  decode(value, config) {
    const storedPairId = value['pairId']
    let pairId
    try {
      if (storedPairId !== undefined) {
        const decoded = safeJSONParse(atob(storedPairId))
        if (Array.isArray(decoded)) {
          pairId = decoded
        }
      }
    } catch (e) {
      logger.logInfo('Error parsing pairId')
    }
    return pairId === undefined ? value : {...value, pairId}
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function getId
   * @param {SubmoduleConfig} submoduleConfig
   * @param {ConsentData} consentData
   * @param {(Object|undefined)} cacheIdObj
   * @returns {IdResponse|undefined}
   */
  getId(submoduleConfig, consentData, cacheIdObj) {
    const enforceVendorConsent = deepAccess(submoduleConfig, 'params.enforceVendorConsent')
    if (!hasPurposeConsent(consentData, [1], enforceVendorConsent)) {
      logger.logInfo('GDPR purpose 1 consent not satisfied for Permutive Identity Manager')
      return
    }

    const id = readFromSdkLocalStorage()
    if (Object.entries(id).length > 0) {
      logger.logInfo('found id in sdk storage')
      return { id }
    } else if ('params' in submoduleConfig && submoduleConfig.params.ajaxTimeout) {
      logger.logInfo('failed to find id in sdk storage - waiting for sdk')
      // Is ajaxTimeout an appropriate timeout to use here?
      return { callback: (done) => waitAndRetrieveFromSdk(submoduleConfig.params.ajaxTimeout).then(done) }
    } else {
      logger.logInfo('failed to find id in sdk storage and no wait time specified')
    }
  },

  primaryIds: PRIMARY_IDS,

  eids: {
    'id5id': {
      getValue: function (data) {
        return data.uid
      },
      source: ID5_DOMAIN,
      atype: 1,
      getUidExt: function (data) {
        if (data.ext) {
          return data.ext
        }
      }
    },
    'idl_env': {
      source: LIVERAMP_DOMAIN,
      atype: 3,
    },
    'uid2': {
      source: UID_DOMAIN,
      atype: 3,
      getValue: function(data) {
        return data.id
      },
      getUidExt: function(data) {
        if (data.ext) {
          return data.ext
        }
      }
    },
    'pairId': {
      source: GOOGLE_DOMAIN,
      atype: 571187
    }
  }
}

submodule('userId', permutiveIdentityManagerIdSubmodule)
