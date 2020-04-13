import * as utils from '../src/utils.js'
import { registerBidder } from '../src/adapters/bidderFactory.js'
import { config } from '../src/config.js'
import { getStorageManager } from '../src/storageManager.js';

const storage = getStorageManager();
const BIDDER_CODE = 'ccx'
const BID_URL = 'https://delivery.clickonometrics.pl/ortb/prebid/bid'
const SUPPORTED_VIDEO_PROTOCOLS = [2, 3, 5, 6]
const SUPPORTED_VIDEO_MIMES = ['video/mp4', 'video/x-flv']
const SUPPORTED_VIDEO_PLAYBACK_METHODS = [1, 2, 3, 4]

function _getDeviceObj () {
  let device = {}
  device.w = screen.width
  device.y = screen.height
  device.ua = navigator.userAgent
  return device
}

function _getSiteObj (bidderRequest) {
  let site = {}
  let url = config.getConfig('pageUrl') || utils.deepAccess(window, 'location.href');
  if (url.length > 0) {
    url = url.split('?')[0]
  }
  site.page = url

  return site
}

function _validateSizes (sizeObj, type) {
  if (!utils.isArray(sizeObj) || typeof sizeObj[0] === 'undefined') {
    return false
  }

  if (type === 'video' && (!utils.isArray(sizeObj[0]) || sizeObj[0].length !== 2)) {
    return false
  }

  let result = true

  if (type === 'banner') {
    utils._each(sizeObj, function (size) {
      if (!utils.isArray(size) || (size.length !== 2)) {
        result = false
      }
    })
    return result
  }

  if (type === 'old') {
    if (!utils.isArray(sizeObj[0]) && sizeObj.length !== 2) {
      result = false
    } else if (utils.isArray(sizeObj[0])) {
      utils._each(sizeObj, function (size) {
        if (!utils.isArray(size) || (size.length !== 2)) {
          result = false
        }
      })
    }
    return result;
  }

  return true
}

function _buildBid (bid) {
  let placement = {}
  placement.id = bid.bidId
  placement.secure = 1

  let sizes = utils.deepAccess(bid, 'mediaTypes.banner.sizes') || utils.deepAccess(bid, 'mediaTypes.video.playerSize') || utils.deepAccess(bid, 'sizes')

  if (utils.deepAccess(bid, 'mediaTypes.banner') || utils.deepAccess(bid, 'mediaType') === 'banner' || (!utils.deepAccess(bid, 'mediaTypes.video') && !utils.deepAccess(bid, 'mediaType'))) {
    placement.banner = {'format': []}
    if (utils.isArray(sizes[0])) {
      utils._each(sizes, function (size) {
        placement.banner.format.push({'w': size[0], 'h': size[1]})
      })
    } else {
      placement.banner.format.push({'w': sizes[0], 'h': sizes[1]})
    }
  } else if (utils.deepAccess(bid, 'mediaTypes.video') || utils.deepAccess(bid, 'mediaType') === 'video') {
    placement.video = {}

    if (typeof sizes !== 'undefined') {
      if (utils.isArray(sizes[0])) {
        placement.video.w = sizes[0][0]
        placement.video.h = sizes[0][1]
      } else {
        placement.video.w = sizes[0]
        placement.video.h = sizes[1]
      }
    }

    placement.video.protocols = utils.deepAccess(bid, 'params.video.protocols') || SUPPORTED_VIDEO_PROTOCOLS
    placement.video.mimes = utils.deepAccess(bid, 'params.video.mimes') || SUPPORTED_VIDEO_MIMES
    placement.video.playbackmethod = utils.deepAccess(bid, 'params.video.playbackmethod') || SUPPORTED_VIDEO_PLAYBACK_METHODS
    placement.video.skip = utils.deepAccess(bid, 'params.video.skip') || 0
    if (placement.video.skip === 1 && utils.deepAccess(bid, 'params.video.skipafter')) {
      placement.video.skipafter = utils.deepAccess(bid, 'params.video.skipafter')
    }
  }

  placement.ext = {'pid': bid.params.placementId}

  return placement
}

function _buildResponse (bid, currency, ttl) {
  let resp = {
    requestId: bid.impid,
    cpm: bid.price,
    width: bid.w,
    height: bid.h,
    creativeId: bid.crid,
    netRevenue: false,
    ttl: ttl,
    currency: currency
  }

  if (bid.ext.type === 'video') {
    resp.vastXml = bid.adm
  } else {
    resp.ad = bid.adm
  }

  if (utils.deepAccess(bid, 'dealid')) {
    resp.dealId = bid.dealid
  }

  return resp
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner', 'video'],

  isBidRequestValid: function (bid) {
    if (!utils.deepAccess(bid, 'params.placementId')) {
      utils.logWarn('placementId param is reqeuired.')
      return false
    }
    if (utils.deepAccess(bid, 'mediaTypes.banner.sizes')) {
      let isValid = _validateSizes(bid.mediaTypes.banner.sizes, 'banner')
      if (!isValid) {
        utils.logWarn('Bid sizes are invalid.')
      }
      return isValid
    } else if (utils.deepAccess(bid, 'mediaTypes.video.playerSize')) {
      let isValid = _validateSizes(bid.mediaTypes.video.playerSize, 'video')
      if (!isValid) {
        utils.logWarn('Bid sizes are invalid.')
      }
      return isValid
    } else if (utils.deepAccess(bid, 'sizes')) {
      let isValid = _validateSizes(bid.sizes, 'old')
      if (!isValid) {
        utils.logWarn('Bid sizes are invalid.')
      }
      return isValid
    } else {
      utils.logWarn('Bid sizes are required.')
      return false
    }
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    // check if validBidRequests is not empty
    if (validBidRequests.length > 0) {
      let requestBody = {}
      requestBody.imp = []
      requestBody.site = _getSiteObj(bidderRequest)
      requestBody.device = _getDeviceObj()
      requestBody.id = bidderRequest.bids[0].auctionId
      requestBody.ext = {'ce': (storage.cookiesAreEnabled() ? 1 : 0)}

      // Attaching GDPR Consent Params
      if (bidderRequest && bidderRequest.gdprConsent) {
        requestBody.user = {
          ext: {
            consent: bidderRequest.gdprConsent.consentString
          }
        };

        requestBody.regs = {
          ext: {
            gdpr: (bidderRequest.gdprConsent.gdprApplies ? 1 : 0)
          }
        };
      }

      utils._each(validBidRequests, function (bid) {
        requestBody.imp.push(_buildBid(bid))
      })
      // Return the server request
      return {
        'method': 'POST',
        'url': BID_URL,
        'data': JSON.stringify(requestBody)
      }
    }
  },
  interpretResponse: function (serverResponse, request) {
    const bidResponses = []

    // response is not empty (HTTP 204)
    if (!utils.isEmpty(serverResponse.body)) {
      utils._each(serverResponse.body.seatbid, function (seatbid) {
        utils._each(seatbid.bid, function (bid) {
          bidResponses.push(_buildResponse(bid, serverResponse.body.cur, serverResponse.body.ext.ttl))
        })
      })
    }

    return bidResponses
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = []

    if (utils.deepAccess(serverResponses[0], 'body.ext.usersync') && !utils.isEmpty(serverResponses[0].body.ext.usersync)) {
      utils._each(serverResponses[0].body.ext.usersync, function (match) {
        if ((syncOptions.iframeEnabled && match.type === 'iframe') || (syncOptions.pixelEnabled && match.type === 'image')) {
          syncs.push({
            type: match.type,
            url: match.url
          })
        }
      })
    }

    return syncs
  }
}
registerBidder(spec)
