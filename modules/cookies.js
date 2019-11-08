import { config } from '../src/config.js';
import { cookiesAreEnabled, setCookie, logInfo, logMessage } from '../src/utils.js'

let cookieConfig = {}
let addedCookiesHook = false
let active = false

/**
 * Configures the `cookies` namespace.
 * Adds a requestBid-hook and a bidWon listener if the module is enabled.
 *
 * @param {object} config - Configuration object.
 * @param {array<string>} config.from - Limits the cookies to set. Possible values: `bidResponse`, `creative`
 * @param {string} config.namespace - Namespace of cookies that will be set and send.
 * @param {object} config.data - Key-Value pairs to send in the bid request as cookies.
 * @param {string} config.expires - Sane-cookie-date.
 * @param {string} config.sameSite - Set to `Lax` to send cookies to third parties.
 */
export function setConfig (config) {
  if (!cookiesAreEnabled() || !config) {
    active = false
    return
  } else {
    active = true
  }

  // default values
  if (typeof config !== 'object') config = {}
  config.namespace = config.namespace || 'prebid.'
  config.data = config.data || getCookieObj(document, config.namespace)
  config.from = Array.isArray(config.from)
    ? config.from
    : (config.from ? [ config.from ] : [ 'bidResponse', 'creative' ])

  // make the cookie config native to this module
  cookieConfig = config

  if (!addedCookiesHook) {
    logInfo('The cookies module is enabled.')
    addedCookiesHook = true
    $$PREBID_GLOBAL$$.requestBids.before(requestBidsHook, 20)
    $$PREBID_GLOBAL$$.onEvent('bidWon', bidWonListener)
  }
}

config.getConfig('cookies', config => setConfig(config.cookies))

/**
 * Adds the `cookies`-parameter to the bidRequest.
 *
 * @param {function} fn - Previous function.
 * @param {object} bidRequestConfig - Bid request configuration.
 */
export function requestBidsHook (fn, bidRequestConfig) {
  if (active) {
    const cookies = cookieConfig.data
    const cookieString = Object.keys(cookies).map((key) => key + '=' + cookies[key]).join(';')
    bidRequestConfig.options = bidRequestConfig.options || {}
    bidRequestConfig.options.customHeaders = bidRequestConfig.options.customHeaders || {}
    bidRequestConfig.options.customHeaders.Cookie = cookieString
  }
  return fn.apply(this, [bidRequestConfig])
}

/**
 * Calls syncCookies for the `document` of a winning bid.
 *
 * @param {object} bid - Bid object.
 */
export function bidWonListener (bid, doc) {
  if (!active) return

  /*
   * Set cookies from the bid response to the main frame.
   * it is up to the adapter to set the `cookies`-property or not.
   *
   * Example for interpretResponse:
   * bid.cookies = JSON.parse(serverResponse.headers.get('X-Set-Cookie-JSON'))
   */
  if (cookieConfig.from.indexOf('bidResponse') !== -1 && bid.cookies) {
    syncCookies(bid.cookies)
  }

  // Set cookies from the main frame in the creative frame.
  syncCookies(cookieConfig.data, doc)

  // Set cookies from the completed creative frame to the main frame.
  if (cookieConfig.from.indexOf('creative') !== -1) {
    if (doc.readyState === 'complete') {
      syncCookies(getCookieObj(doc))
    } else {
      if (doc.addEventListener) {
        doc.addEventListener('DOMContentLoaded', () => {
          syncCookies(getCookieObj(doc))
        }, false)
      } else if (attachEvent) {
        doc.attachEvent('onreadystatechange', () => {
          if (document.readyState !== 'complete') return
          syncCookies(getCookieObj(doc))
        })
      } else {
        setTimeout(() => { syncCookies(getCookieObj(doc)) }, 200)
      }
    }
  }
}

/**
 * Sets the passed key-values as cookies in a document.
 *
 * @param {object} data - Key-Value pairs of cookies that will be set in the document.
 * @param {Document} document - Document. Defaults to the current document.
 */
function syncCookies (data, doc) {
  Object.keys(data).forEach((name) => {
    if (cookieConfig.namespace === '*' || name.startsWith(cookieConfig.namespace)) 
    setCookie(name, data[name], cookieConfig.expires, cookieConfig.sameSite, doc)
    logMessage('Synchronizing cookies. Set "' + name + '" to "' + data[name] + '"')
  })
}

/**
 * Converts all cookies set in a given document into a key-value object.
 *
 * @param {Document} doc - Document object that will be parsed for cookies.
 *
 * @returns {object} - A key-value-object.
 */
function getCookieObj (doc) {
  return doc.cookie
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
}
