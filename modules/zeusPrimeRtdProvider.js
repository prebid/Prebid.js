/**
 * This module adds Zeus Insights For Publishers (ZIP) provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 *
 * This module will request the article topics for the current page and add them as page keyvalues
 * for the ad requests.
 *
 * @module modules/zeusInsightsForPublishersRtdProvider
 * @requires module:modules/realTimeData
 */

import { logInfo, logError, logWarn, logMessage } from '../src/utils.js'
import { submodule } from '../src/hook.js'
import { ajaxBuilder } from '../src/ajax.js'

class Logger {
  get showDebug() {
    if (this._showDebug === true || this._showDebug === false) {
      return this._showDebug
    }

    return window.zeusPrime?.debug || false
  }
  set showDebug(shouldShow) {
    this._showDebug = shouldShow
  }

  get error() {
    return logError.bind(this, 'zeusPrimeRtdProvider: ')
  }
  get warn() {
    return logWarn.bind(this, 'zeusPrimeRtdProvider: ')
  }
  get info() {
    return logInfo.bind(this, 'zeusPrimeRtdProvider: ')
  }
  get debug() {
    if (this.showDebug) {
      return logMessage.bind(this, 'zeusPrimeRtdProvider: ')
    }

    return () => {}
  }
}

var logger = new Logger()

function loadCommandQueue() {
  window.zeusPrime = window.zeusPrime || { cmd: [] }
  const queue = [...window.zeusPrime.cmd]

  window.zeusPrime.cmd = []
  window.zeusPrime.cmd.push = (callback) => {
    callback(window.zeusPrime)
  }

  queue.forEach((callback) => callback(window.zeusPrime))
}

function markStatusComplete(key) {
  const status = window?.zeusPrime?.status
  if (status) {
    status[key] = true
  }
}

function createStatus() {
  if (window.zeusPrime && !window.zeusPrime.status) {
    Object.defineProperty(window.zeusPrime, 'status', {
      enumerable: false,
      value: {
        initComplete: false,
        primeKeyValueSet: false,
        insightsReqSent: false,
        insightsReqReceived: false,
        insightsKeyValueSet: false,
        scriptComplete: false,
      },
    })
  }
}

function loadPrimeQueryParams() {
  try {
    const params = new URLSearchParams(window.location.search)
    params.forEach((paramValue, paramKey) => {
      if (!paramKey.startsWith('zeus_prime_')) {
        return
      }

      let key = paramKey.replace('zeus_prime_', '')
      let value = paramValue.toLowerCase()

      if (value === 'true' || value === '1') {
        value = true
      } else if (value === 'false' || value === '0') {
        value = false
      }

      window.zeusPrime[key] = value
    })
  } catch (_) {}
}

const DEFAULT_API = 'https://insights.zeustechnology.com'

function init(gamId = null, options = {}) {
  window.zeusPrime = window.zeusPrime || { cmd: [] }

  window.zeusPrime.gamId = gamId || options.gamId || window.zeusPrime.gamId || undefined
  window.zeusPrime.api = DEFAULT_API
  window.zeusPrime.hostname = options.hostname || window.location?.hostname || ''
  window.zeusPrime.pathname = options.pathname || window.location?.pathname || ''
  window.zeusPrime.pageUrl = `${window.zeusPrime.hostname}${window.zeusPrime.pathname}`
  window.zeusPrime.pageHash = options.pageHash || null
  window.zeusPrime.debug = window.zeusPrime.debug || options.debug === true || false
  window.zeusPrime.disabled = window.zeusPrime.disabled || options.disabled === true || false

  loadPrimeQueryParams()

  logger.showDebug = window.zeusPrime.debug

  createStatus()
  markStatusComplete('initComplete')
}

function setTargeting() {
  const { gamId, hostname } = window.zeusPrime

  if (typeof gamId !== 'string') {
    throw new Error(`window.zeusPrime.gamId must be a string. Received: ${String(gamId)}`)
  }

  addKeyValueToGoogletag(`zeus_${gamId}`, hostname)
  logger.debug(`Setting zeus_${gamId}=${hostname}`)
  markStatusComplete('primeKeyValueSet')
}

function setPrimeAsDisabled() {
  addKeyValueToGoogletag('zeus_prime', 'false')
  logger.debug('Disabling prime; Setting key-value zeus_prime to false')
}

function addKeyValueToGoogletag(key, value) {
  window.googletag = window.googletag || { cmd: [] }
  window.googletag.cmd.push(function () {
    window.googletag.pubads().setTargeting(key, value)
  })
}

function isInsightsPage(pathname = '') {
  const NOT_SECTIONS = [
    {
      test: /\/search/,
      type: 'search',
    },
    {
      test: /\/author/,
      type: 'author',
    },
    {
      test: /\/event/,
      type: 'event',
    },
    {
      test: /\/homepage/,
      type: 'front',
    },
    {
      test: /^\/?$/,
      type: 'front',
    },
  ]

  const typeObj = NOT_SECTIONS.find((pg) => pathname.match(pg.test))
  return typeObj === undefined
}

async function getUrlHash(canonical) {
  try {
    const buf = await window.crypto.subtle.digest(
      'SHA-1',
      new TextEncoder('utf-8').encode(canonical)
    )
    const hashed = Array.prototype.map
      .call(new Uint8Array(buf), (x) => `00${x.toString(16)}`.slice(-2))
      .join('')

    return hashed
  } catch (e) {
    logger.error('Failed to load hash', e.message)
    logger.debug('Exception', e)
    return ''
  }
}

async function sendPrebidRequest(url) {
  return new Promise((resolve, reject) => {
    const ajax = ajaxBuilder()
    ajax(url, {
      success: (responseText, response) => {
        resolve({
          ...response,
          status: response.status,
          json: () => JSON.parse(responseText),
        })
      },

      error: (responseText, response) => {
        if (!response.status) {
          reject(response)
        }

        let json = responseText
        if (responseText) {
          try {
            json = JSON.parse(responseText)
          } catch (_) {
            json = null
          }
        }

        resolve({
          status: response.status,
          json: () => json || null,
          responseValue: json,
        })
      },
    })
  })
}

async function requestTopics() {
  const { api, hostname, pageUrl } = window.zeusPrime

  if (!window.zeusPrime.pageHash) {
    window.zeusPrime.pageHash = await getUrlHash(pageUrl)
  }

  const pageHash = window.zeusPrime.pageHash
  const zeusInsightsUrl = `${api}/${hostname}/${pageHash}?article_location=${pageUrl}`

  logger.debug('Requesting topics', zeusInsightsUrl)
  try {
    markStatusComplete('insightsReqSent')
    const response = await sendPrebidRequest(zeusInsightsUrl)
    if (response.status === 200) {
      logger.debug('topics found')
      markStatusComplete('insightsReqReceived')
      return await response.json()
    } else if (
      response.status === 204 ||
      response.status < 200 ||
      (response.status >= 300 && response.status <= 399)
    ) {
      logger.debug('no topics found')
      markStatusComplete('insightsReqReceived')
      return null
    } else {
      logger.error(`Topics request returned error: ${response.status}`)
      markStatusComplete('insightsReqReceived')
      return null
    }
  } catch (e) {
    logger.error('failed to request topics', e)
    return null
  }
}

function setTopicsTargeting(topics = []) {
  if (topics.length === 0) {
    return
  }

  window.googletag = window.googletag || { cmd: [] }
  window.googletag.cmd.push(function () {
    window.googletag.pubads().setTargeting('zeus_insights', topics)
  })

  markStatusComplete('insightsKeyValueSet')
}

async function startTopicsRequest() {
  if (isInsightsPage(window.zeusPrime.pathname)) {
    const response = await requestTopics()
    if (response) {
      setTopicsTargeting(response?.topics)
    }
  } else {
    logger.debug('This page is not eligible for topics, request will be skipped')
  }
}

async function run(gamId, options = {}) {
  logger.showDebug = options.debug || false

  try {
    init(gamId, options)
    loadCommandQueue()

    if (window.zeusPrime.disabled) {
      setPrimeAsDisabled()
    } else {
      setTargeting()
      await startTopicsRequest()
    }
  } catch (e) {
    logger.error('Failed to run.', e.message || e)
  } finally {
    markStatusComplete('scriptComplete')
  }
}

/**
 * @preserve
 * Initializes the ZeusPrime RTD Submodule. The config provides the GamID for this
 * site that is used to configure Prime.
 * @param {object} config The Prebid configuration for this module.
 * @param {object} config.params The parameters for this module.
 * @param {string} config.params.gamId The Gam ID (or Network Code) in GAM for this site.
 */
function initModule(config) {
  const { params } = config || {}
  const { gamId, ...rest } = params || {}
  run(gamId, rest)
}

/**
 * @preserve
 * @type {RtdSubmodule}
 */
const zeusPrimeSubmodule = {
  /**
   * @preserve
   * The name of the plugin.
   * @type {string}
   */
  name: 'zeusPrime',

  /**
   * @preserve
   * ZeusPrime use
   */
  init: initModule,
}

/**
 * @preserve
 * Register the Sub Module.
 */
function registerSubModule() {
  submodule('realTimeData', zeusPrimeSubmodule)
}

registerSubModule()

export { zeusPrimeSubmodule }
