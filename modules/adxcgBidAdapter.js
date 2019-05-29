import { config } from '../src/config'
import * as utils from '../src/utils'
import * as url from '../src/url'
import { registerBidder } from '../src/adapters/bidderFactory'
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes'
import includes from 'core-js/library/fn/array/includes'

/**
 * Adapter for requesting bids from adxcg.net
 * updated to latest prebid repo on 2017.10.20
 * updated for gdpr compliance on 2018.05.22 -requires gdpr compliance module
 * updated to pass aditional auction and impression level parameters. added pass for video targeting parameters
 * updated to fix native support for image width/height and icon 2019.03.17
 * updated support for userid - pubcid,ttid 2019.05.28
 */

const BIDDER_CODE = 'adxcg'
const SUPPORTED_AD_TYPES = [BANNER, VIDEO, NATIVE]
const SOURCE = 'pbjs10'
const VIDEO_TARGETING = ['id', 'mimes', 'minduration', 'maxduration', 'startdelay', 'skippable', 'playback_method', 'frameworks']
const USER_PARAMS_AUCTION = ['forcedDspIds', 'forcedCampaignIds', 'forcedCreativeIds', 'gender', 'dnt', 'language']
const USER_PARAMS_BID = ['lineparam1', 'lineparam2', 'lineparam3']
const BIDADAPTERVERSION = 'r20180703PB10'

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    if (!bid || !bid.params) {
      utils.logWarn(BIDDER_CODE + ': Missing bid parameters')
      return false
    }

    if (!utils.isStr(bid.params.adzoneid)) {
      utils.logWarn(BIDDER_CODE + ': adzoneid must be specified as a string')
      return false
    }

    if (isVideoRequest(bid)) {
      if (!bid.params.video.mimes) {
        // Give a warning but let it pass
        utils.logWarn(BIDDER_CODE + ': mimes should be specified for videos')
      } else if (!utils.isArray(bid.params.video.mimes) || !bid.params.video.mimes.every(s => utils.isStr(s))) {
        utils.logWarn(BIDDER_CODE + ': mimes must be an array of strings')
        return false
      }

      const context = utils.deepAccess(bid, 'mediaTypes.video.context')
      if (context !== 'instream') {
        utils.logWarn(BIDDER_CODE + ': video context must be valid - instream')
        return false
      }
    }

    return true
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * an array of validBidRequests
   * Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    utils.logMessage(`buildRequests: ${JSON.stringify(validBidRequests)}`)

    let location = utils.getTopWindowLocation()
    let secure = location.protocol === 'https:'
    let dt = new Date()
    let ratio = window.devicePixelRatio || 1
    let iobavailable = window && window.IntersectionObserver && window.IntersectionObserverEntry && window.IntersectionObserverEntry.prototype && 'intersectionRatio' in window.IntersectionObserverEntry.prototype

    let bt = config.getConfig('bidderTimeout')
    if (window.PREBID_TIMEOUT) {
      bt = Math.min(window.PREBID_TIMEOUT, bt)
    }

    let requestUrl = url.parse(location.href)
    requestUrl.search = null
    requestUrl.hash = null

    // add common parameters
    let beaconParams = {
      renderformat: 'javascript',
      ver: BIDADAPTERVERSION,
      url: encodeURIComponent(utils.getTopWindowUrl()),
      secure: secure ? '1' : '0',
      source: SOURCE,
      uw: window.screen.width,
      uh: window.screen.height,
      dpr: ratio,
      bt: bt,
      isinframe: utils.inIframe(),
      cookies: utils.checkCookieSupport() ? '1' : '0',
      tz: dt.getTimezoneOffset(),
      dt: utils.timestamp(),
      iob: iobavailable ? '1' : '0',
      pbjs: '$prebid.version$',
      rndid: Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000
    }

    if (utils.getTopWindowReferrer()) {
      beaconParams.ref = encodeURIComponent(utils.getTopWindowReferrer())
    }

    if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) {
      beaconParams.gdpr = bidderRequest.gdprConsent.gdprApplies ? '1' : '0'
      beaconParams.gdpr_consent = bidderRequest.gdprConsent.consentString
    }

    let biddercustom = config.getConfig(BIDDER_CODE)
    if (biddercustom) {
      Object.keys(biddercustom)
        .filter(param => includes(USER_PARAMS_AUCTION, param))
        .forEach(param => beaconParams[param] = encodeURIComponent(biddercustom[param]))
    }

    // per impression parameters
    let adZoneIds = []
    let prebidBidIds = []
    let sizes = []
    let bidfloors = []

    validBidRequests.forEach((bid, index) => {
      adZoneIds.push(utils.getBidIdParameter('adzoneid', bid.params))
      prebidBidIds.push(bid.bidId)
      sizes.push(utils.parseSizesInput(bid.sizes).join('|'))

      let bidfloor = utils.getBidIdParameter('bidfloor', bid.params) || 0
      bidfloors.push(bidfloor)
      // copy video params
      if (isVideoRequest(bid)) {
        if (bid.params.video) {
          Object.keys(bid.params.video)
            .filter(param => includes(VIDEO_TARGETING, param))
            .forEach(param => beaconParams['video.' + param + '.' + index] = encodeURIComponent(bid.params.video[param]))
        }
        // copy video context params
        beaconParams['video.context' + '.' + index] = utils.deepAccess(bid, 'mediaTypes.video.context')
      }

      // copy all custom parameters impression level parameters not supported above
      let customBidParams = utils.getBidIdParameter('custom', bid.params) || {}
      if (customBidParams) {
        Object.keys(customBidParams)
          .filter(param => includes(USER_PARAMS_BID, param))
          .forEach(param => beaconParams[param + '.' + index] = encodeURIComponent(customBidParams[param]))
      }
    })

    beaconParams.adzoneid = adZoneIds.join(',')
    beaconParams.format = sizes.join(',')
    beaconParams.prebidBidIds = prebidBidIds.join(',')
    beaconParams.bidfloors = bidfloors.join(',')

    if (utils.isStr(utils.deepAccess(validBidRequests, '0.userId.pubcid'))) {
      beaconParams.pubcid = validBidRequests[0].userId.pubcid;
    }

    if (utils.isStr(utils.deepAccess(validBidRequests, '0.userId.tdid'))) {
      beaconParams.tdid = validBidRequests[0].userId.tdid;
    }

    let adxcgRequestUrl = url.format({
      protocol: secure ? 'https' : 'http',
      hostname: secure ? 'hbps.adxcg.net' : 'hbp.adxcg.net',
      pathname: '/get/adi',
      search: beaconParams
    })

    return {
      contentType: 'text/plain',
      method: 'GET',
      url: adxcgRequestUrl,
      withCredentials: true
    }
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {bidRequests[]} An array of bids which were nested inside the server.
   */
  interpretResponse:

    function (serverResponse, bidRequests) {
      let bids = []

      serverResponse = serverResponse.body
      if (serverResponse) {
        serverResponse.forEach(serverResponseOneItem => {
          let bid = {}

          bid.requestId = serverResponseOneItem.bidId
          bid.cpm = serverResponseOneItem.cpm
          bid.creativeId = parseInt(serverResponseOneItem.creativeId)
          bid.currency = serverResponseOneItem.currency ? serverResponseOneItem.currency : 'USD'
          bid.netRevenue = serverResponseOneItem.netRevenue ? serverResponseOneItem.netRevenue : true
          bid.ttl = serverResponseOneItem.ttl ? serverResponseOneItem.ttl : 300

          if (serverResponseOneItem.deal_id != null && serverResponseOneItem.deal_id.trim().length > 0) {
            bid.dealId = serverResponseOneItem.deal_id
          }

          if (serverResponseOneItem.ad) {
            bid.ad = serverResponseOneItem.ad
          } else if (serverResponseOneItem.vastUrl) {
            bid.vastUrl = serverResponseOneItem.vastUrl
            bid.mediaType = 'video'
          } else if (serverResponseOneItem.nativeResponse) {
            bid.mediaType = 'native'

            let nativeResponse = serverResponseOneItem.nativeResponse

            bid['native'] = {
              clickUrl: nativeResponse.link.url,
              impressionTrackers: nativeResponse.imptrackers,
              clickTrackers: nativeResponse.clktrackers,
              javascriptTrackers: nativeResponse.jstrackers
            }

            nativeResponse.assets.forEach(asset => {
              if (asset.title && asset.title.text) {
                bid['native'].title = asset.title.text
              }

              if (asset.img && asset.img.url) {
                let nativeImage = {}
                nativeImage.url = asset.img.url
                nativeImage.height = asset.img.h
                nativeImage.width = asset.img.w
                bid['native'].image = nativeImage
              }

              if (asset.icon && asset.icon.url) {
                let nativeIcon = {}
                nativeIcon.url = asset.icon.url
                nativeIcon.height = asset.icon.h
                nativeIcon.width = asset.icon.w
                bid['native'].icon = nativeIcon
              }

              if (asset.data && asset.data.label === 'DESC' && asset.data.value) {
                bid['native'].body = asset.data.value
              }

              if (asset.data && asset.data.label === 'SPONSORED' && asset.data.value) {
                bid['native'].sponsoredBy = asset.data.value
              }
            })
          }

          bid.width = serverResponseOneItem.width
          bid.height = serverResponseOneItem.height
          utils.logMessage(`submitting bid[${serverResponseOneItem.bidId}]: ${JSON.stringify(bid)}`)
          bids.push(bid)
        })
      } else {
        utils.logMessage(`empty bid response`)
      }
      return bids
    },

  getUserSyncs: function (syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: '//cdn.adxcg.net/pb-sync.html'
      }]
    }
  }
}

function isVideoRequest (bid) {
  return bid.mediaType === 'video' || !!utils.deepAccess(bid, 'mediaTypes.video')
}

registerBidder(spec)
