import { config } from '../src/config.js';
import { cookiesAreEnabled, setCookie, logInfo, logWarn } from '../src/utils.js'

let cookieConfig = {}
let enabled = false
let active = false

/**
 * Configures the `cookies` namespace.
 * Adds a requestBid-hook, a bidWon listener, and a bidResponse listener if the module is enabled.
 *
 * @param {object} config - Configuration object.
 * @param {string} config.namespace - Namespace of cookies that will be set and send.
 * @param {string} config.prefix - Adds a prefix when storing data. Prefix is removed when data is send.
 * @param {array<string>} config.from - Limits the cookies to set. Possible values: `creative`, `winningBidResponse`, `bidResponse`
 * @param {array<string>} config.storages - Storage to use to store data. Can be: `cookies` or `localStorage`.
 * @param {string} config.expires - Sane-cookie-date. Only in cookies-store.
 * @param {string} config.sameSite - Set to `Lax` to send cookies to third parties. Only in cookies-store.
 */
export function setConfig (config) {
  if (!config) {
    active = false
    return
  } else if (!cookiesAreEnabled() && !localStorageIsEnabled()) {
    active = false
    logWarn('The current browser instance does not support the cookies module.')
    return
  } else {
    active = true
  }

  // default values
  if (typeof config !== 'object') config = {}
  config.namespace = config.namespace || 'prebid.'
  config.prefix = config.prefix || (config.namespace === '*' ? '' : 'prebid.')
  config.storages = Array.isArray(config.storages)
    ? config.storages
    : (config.storages ? [ config.storages ] : [ 'cookies', 'localStorage' ])
  config.from = Array.isArray(config.from)
    ? config.from
    : (config.from ? [ config.from ] : [ 'creative', 'winningBidResponse', 'bidResponse' ])

  // make the cookie config native to this module
  cookieConfig = config

  if (!enabled) {
    enabled = true
    $$PREBID_GLOBAL$$.onEvent('bidRequested', bidRequestedListener)
    $$PREBID_GLOBAL$$.onEvent('bidResponse', bidResponseListener)
    $$PREBID_GLOBAL$$.onEvent('bidWon', bidWonListener)
    logInfo('The cookies module is enabled.', cookieConfig)
  }
}

config.getConfig('cookies', config => setConfig(config.cookies))

/**
 * Adds the cookies property to the bidderRequest of buildRequests.
 *
 * @param {object} bidRequest - Bid request configuration.
 */
export function bidRequestedListener (bidRequest) {
  if (active) {
    const cookies = getDataObj(document)
    const data = Object.keys(cookies).reduce((data, key) => {
      if (!(key.startsWith(cookieConfig.namespace))) return data
      const value = cookies[key]
      if (cookieConfig.prefix && key.startsWith(cookieConfig.prefix)) {
        key = key.substr(cookieConfig.prefix.length)
      }
      data[key] = value
      return data
    }, {})

    // it is up to the adapter to merge the bidderRequest.cookies in buildRequests
    // into the bidderRequest (for example as options.customHeaders['Cookie'])
    bidRequest.cookies = data
  }
}

/**
 * Calls syncData for the `document` of a winning bid.
 *
 * Sets `cookies` from the bid response to the main frame.
 * It is up to the adapter to set the `cookies`-property of a bid or not.
 *
 * Example for interpretResponse:
 * bid.cookies = JSON.parse(serverResponse.headers.get('X-Set-Cookie-JSON'))
 *
 * @param {object} bid - bid response.
 */
export function bidResponseListener (bid) {
  if (!active || !bid.cookies || cookieConfig.from.indexOf('bidResponse') === -1) return
  syncData(bid.cookies, undefined, { addPrefix: true })
}

/**
 * Calls syncData for the `document` of a winning bid.
 *
 * @param {object} bid - Bid object.
 */
export function bidWonListener (bid, doc) {
  if (!active) return

  // set cookies from the bid response to the main frame
  if (bid.cookies && (
    cookieConfig.from.indexOf('bidResponse') !== -1 ||
    cookieConfig.from.indexOf('winningBidResponse') !== -1
  )) {
    syncData(bid.cookies, undefined, { addPrefix: true })
  }

  // Set cookies from the main frame in the creative frame.
  syncData(getDataObj(document), doc, { addPrefix: false, removePrefix: true })

  // Set cookies from the completed creative frame to the main frame.
  // Do not add prefixes - the purpose of cookies is not unique to this module.
  if (cookieConfig.from.indexOf('creative') !== -1) {
    if (doc.readyState === 'complete') {
      syncData(getDataObj(doc), undefined, { addPrefix: false })
    } else {
      if (doc.addEventListener) {
        doc.addEventListener('DOMContentLoaded', () => {
          syncData(getDataObj(doc), undefined, { addPrefix: false })
        }, false)
      } else if (attachEvent) {
        doc.attachEvent('onreadystatechange', () => {
          if (document.readyState !== 'complete') return
          syncData(getDataObj(doc), undefined, { addPrefix: false })
        })
      } else {
        setTimeout(() => {
          syncData(getDataObj(doc), undefined, { addPrefix: false })
        }, 200)
      }
    }
  }
}

/**
 * Checks if the localStorage is available.
 *
 * @params {Document} doc - Document to check for availability.
 *
 * @returns {boolean} - `true` if localStorage can be used
 */
function localStorageIsEnabled (doc) {
  try {
    const docWindow = (doc) ? (doc.parentWindow || doc.defaultView) : window
    docWindow.localStorage.setItem('prebid.test', 'prebid.test')
    docWindow.localStorage.removeItem('prebid.test')
    return true
  } catch (e) {
    return false
  }
}

/**
 * Sets the passed key-values as cookies or localStorage in a document.
 *
 * @param {object} data - Key-Value pairs of cookies that will be set in the document.
 * @param {Document} document - Document. Defaults to the current document.
 * @param {object} options - Additional configuration.
 * @param {boolean} options.addPrefix - Adds the prefix when setting data.
 */
function syncData (data, doc, options = {}) {
  Object.keys(data).forEach((key) => {
    let name = key
    if (options.addPrefix && cookieConfig.prefix && key.indexOf(cookieConfig.prefix) !== 0) {
      name = cookieConfig.prefix + key
    }

    if (cookieConfig.namespace === '*' || name.startsWith(cookieConfig.namespace)) {
      if (options.removePrefix && name.startsWith(cookieConfig.prefix)) {
        name = name.substr(cookieConfig.prefix.length)
      }

      cookieConfig.storages.find((storage) => {
        if (storage === 'cookies') {
          if (!cookiesAreEnabled()) return false
          setCookie(name, data[key], cookieConfig.expires, cookieConfig.sameSite, doc)
          return true
        } else if (storage === 'localStorage') {
          if (!localStorageIsEnabled(doc)) return false
          const docWindow = (doc) ? (doc.parentWindow || doc.defaultView) : window
          docWindow.localStorage.setItem(name, data[key])
          return true
        }
        return false
      })
    }
  })
}

/**
 * Retrieves all data (cookie and localStorage) from a given document into a key-value object.
 *
 * @param {Document} doc - Document object that will be parsed for cookies.
 *
 * @returns {object} - A key-value-object.
 */
function getDataObj (doc) {
  let cookies = {}
  try {
    cookies = doc.cookie
      .split('; ')
      .reduce((cookies, cookie) => {
        const match = cookie.match(/([^\=]*)=(.*)/)
        if (match) {
          const name = match[1]
          let value = match[2]
          try { value = decodeURIComponent(value) } catch (e) { /* set original */ }
          cookies[name] = value
        }
        return cookies
      }, {})
  } catch (e) { /* can not access cookies */ }

  let storage = {}
  try {
    const docWindow = (doc) ? (doc.parentWindow || doc.defaultView) : window
    storage = Object.keys(docWindow.localStorage).reduce((storage, key) => {
      storage[key] = docWindow.localStorage.getItem(key)
      return storage
    }, {})
  } catch (e) { /* can not access localStorage */ }

  return Object.assign(cookies, storage)
}
