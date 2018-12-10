'use strict'

const $$PREBID_GLOBAL$$ = {}
const util = {}

/**
 * @callback webserviceCallback
 * @param {Object} response - assumed to be a json object
 */

/**
 * @callback getId
 * @summary submodule interface for getId function
 * @param {Object} data
 * @param {webserviceCallback} callback - optional callback to execute on id retrieval
 */

/**
 * @callback decode
 * @summary submodule interface for decode function
 * @param {Object|string|number} idData
 * @returns {Object}
 */

/**
 * @typedef {Object} IdSubmodule
 * @property {string} configKey
 * @property {number} expires
 * @property {decode} decode
 * @property {getId} getId
 */

/**
 * PubCommonID Module
 * @type {IdSubmodule}
 */
const pubCommonId = {
  configKey: 'pubcid', expires: 2628000, decode: function(idData) {
    return {
      'ext.pubcommonid': idData
    }
  }, getId: function(data, callback) {
    if (data.params.url) {
      ajax(data.params.url, function(response) {
        callback(response)
      })
    } else {
      // log error, missing required param
    }
  }
}

/**
 * OpenId Module
 * @type {IdSubmodule}
 */
const openId = {
  configKey: 'openid', expires: 20000, decode: function(idData) {
    return {
      'ext.openid': idData
    }
  }, getId: function(url, syncDelay, callback) {
    callback('response data')
  }
}

/**
 * ID data for appending to bid requests from the requestBidHook
 * @type {Array.<Object>}
 */
const extendedBidRequestData = []

/**
 * Decorate ad units with universal id properties. This hook function is called before the
 * real pbjs.requestBids is invoked, and can modify its parameter
 * @param {PrebidConfig} config
 * @param next
 * @returns {*}
 */
function requestBidHook (config, next) {
  // Note: calling next() allows Prebid to continue processing an auction, if not called, the auction will be stalled.
  // pass id data to adapters if bidRequestData list is not empty
  if (extendedBidRequestData.length) {
    const data = extendedBidRequestData.reduce(function(aggregate, item) {
      Object.keys(item).forEach(function(propName) {
        aggregate[propName] = item[propName]
        return aggregate
      })
    }, {})

    // if data exists, append to bid objects, which will be incorporated into bid requests
    if (Object.keys(data).length) {
      const adUnits = config.adUnits || $$PREBID_GLOBAL$$.adUnits
      if (adUnits) {
        adUnits.forEach((adUnit) => {
          adUnit.bids.forEach((bid) => {
            Object.assign(bid, data)
          })
        })
      }
    }
  }
  return next.apply(this, arguments)
}

/**
 * Helper to check if local storage or cookies are enabled
 * Question: Should we add the local storage methods to utils?
 * @returns {boolean|*}
 */
function localStorageEnabled () {
  return typeof localStorage === 'object' || utils.cookiesAreEnabled()
}

/**
 * Helper to set key va
 * lue to from local storage or cookies as fallback
 * Question: Should we add the local storage methods to utils?
 * @param {Object|string|number} data
 * @param {string} name
 * @param {string} storageType - either 'cookie' or 'localStorage'
 * @param {number} expires
 * @returns {boolean}
 */
function saveLocalStorageValue (data, name, storageType, expires) {
  try {
    if (storageType === 'localStorage' && localStorage) {
      // since local storage does not have expiration built in, it will need to be emulated by adding a property
      // named expiration and when reading from local storage it will need to be compared against the current date.
      // if the current date is past the expiration, the local storage key should be deleted
      localStorage.setItem(name, data)
    } else {
      // we need to discuss if we want to automatically fallback to cookie if local storage is not available
      setCookie(name, data, expires)
    }
  } catch (e) {
    // log error saving to local storage
    return
  }
  return true
}

/**
 * @param name
 * @param type
 * @returns {*}
 */
function getLocalStorageValue (name, type) {
  try {
    if (type === 'localStorage' && localStorage) {
      return localStorage.getItem(name)
    } else {
      return getCookie(name)
    }
  } catch (e) {
    // log error
  }
}

/**
 * Helper to set key value in cookies
 * Question: Should we add the cookie methods to utils?
 * @param {string} name
 * @param {string|number} value
 * @param {number} expires
 */
function setCookie (name, value, expires) {
  const expTime = new Date()
  expTime.setTime(expTime.getTime() + expires * 1000 * 60)
  window.document.cookie = name + '=' + encodeURIComponent(value) + ';path=/;expires=' + expTime.toGMTString()
}

/**
 * Helper get value for key from cookies
 * Question: Should we add the cookie methods to utils?
 * @param {string} name
 * @returns {*}
 */
function getCookie (name) {
  const m = window.document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]*)\\s*(;|$)')
  return m ? decodeURIComponent(m[2]) : null
}

/**
 * Convert cookie/local storage ID data for bid adapters
 * @param {Object|string|number} idData
 * @param {IdSubmodule} submodule
 */
function addIdDataToBids (idData, submodule) {
  const bidRequestIdData = submodule.decode(idData)
  if (bidRequestIdData) {
    // add id data for appending to bidRequests
    extendedBidRequestData.push(bidRequestIdData)
  } else {
    // log no value decoded for id submodule
  }
}

/**
 * ID submodule getId complete handler
 * @param {Object|string|number} response
 * @param {Object} data - config data for sub-moduel
 * @param {IdSubmodule} submodule
 */
function getIdComplete (response, data, submodule) {
  if (response) {

    // get expires value from response first if possible, next use a config expires value if defined, lastly use the default
    const expires = response.expires || data.storage.expires || submodule.expires

    // save response id data to local storage
    const savedId = saveLocalStorageValue(response, data.storage.name, data.storage.type, expires)
    if (savedId) {
      const idData = getLocalStorageValue(data.storage.name)
      if (idData) {
        // decode is called and it's result added to the array to be added to bid requests
        addIdDataToBids(idData, submodule)

        // add hook if not added previously
        if (extendedBidRequestData.length === 0) {
          $$PREBID_GLOBAL$$.requestBids.addHook(requestBidHook)
        }
      } else {
        // log error, invalid id data returned after saving to local storage, skip this id submodule
      }
    } else {
      // log error saving to local storage, skip this id submodule
    }
  } else {
    // log error web request for id failed
  }
}

/**
 * init universal id module if config values are set correctly
 */
function initUniversalId () {
  // check if cookie/local storage is active
  if (!localStorageEnabled()) {
    // exit if no cookies or local storage
    return
  }

  // check if any universal id types are set in configuration (must opt-in to enable)
  if (!Array.isArray(config.get('usersync.universalIds'))) {
    // exit if no configurations are set
    return
  }

  [pubCommonId, openId].forEach(function(submodule) {
    // try to get config for id submodule
    const submoduleConfig = config.get('usersync.universalIds').find(universalIdConfig => universalIdConfig.name === submodule.configKey)
    if (!submoduleConfig) {
      // log error, config not found for submodule, skip this id submodule
      return
    }

    // get storage key from config if set
    const storageName = submoduleConfig.storage.name
    if (!storageName) {
      // log error, key skip this id submodule
      return
    }

    // get storage type from config if set
    const storageType = submoduleConfig.storage.type
    if (!storageType) {
      // log error, key skip this id submodule
      return
    }

    const url = submoduleConfig.params.url
    if (!url) {
      // possibly log if url not found in config (though maybe not since pubCommonId does not need this functionality)
    }

    const syncDelay = submoduleConfig.syncDelay || 0
    if (!syncDelay) {
      // log sync delay not found in config
    }
    const storedId = getLocalStorageValue(storageName, submoduleConfig.storage.type)
    // If ID from local storage/cookies is valid, make data available to bid requests
    if (storedId) {
      addIdDataToBids(storedId, submodule)
    } else {
      // Else, ID does not exist in local storage, call the submodule getId to get a value to save to local storage
      // Note: syncDelay implemented here by wrapping with a timer
      if (syncDelay) {
        setTimeout(function() {
          submodule.getId(data, function(response) {
            // call webserviceComplete passing storageName, submodule, expires, and the response from the callback
            getIdComplete(response, data, submodule)
          })
        }, syncDelay)
      } else {
        submodule.getId(data, function(response) {
          // call webserviceComplete passing config data, and the response from the callback
          getIdComplete(response, data, submodule)
        })
      }
    }
  })

  // add hook only if data is going to be passed at this point, else add hook in getId complete
  if (extendedBidRequestData.length) {
    $$PREBID_GLOBAL$$.requestBids.addHook(requestBidHook)
  }
}

// call init
initUniversalId()
