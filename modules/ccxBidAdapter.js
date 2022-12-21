import {_each, deepAccess, isArray, isEmpty, logWarn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {getStorageManager} from '../src/storageManager.js';

const BIDDER_CODE = 'ccx'
const storage = getStorageManager({bidderCode: BIDDER_CODE});
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
  // TODO: does the fallback to window.location make sense?
  let url = bidderRequest?.refererInfo?.page || window.location.href
  if (url.length > 0) {
    url = url.split('?')[0]
  }
  site.page = url

  return site
}

function _validateSizes (sizeObj, type) {
  if (!isArray(sizeObj) || typeof sizeObj[0] === 'undefined') {
    return false
  }

  if (type === 'video' && (!isArray(sizeObj[0]) || sizeObj[0].length !== 2)) {
    return false
  }

  let result = true

  if (type === 'banner') {
    _each(sizeObj, function (size) {
      if (!isArray(size) || (size.length !== 2)) {
        result = false
      }
    })
    return result
  }

  if (type === 'old') {
    if (!isArray(sizeObj[0]) && sizeObj.length !== 2) {
      result = false
    } else if (isArray(sizeObj[0])) {
      _each(sizeObj, function (size) {
        if (!isArray(size) || (size.length !== 2)) {
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

  let sizes = deepAccess(bid, 'mediaTypes.banner.sizes') || deepAccess(bid, 'mediaTypes.video.playerSize') || deepAccess(bid, 'sizes')

  if (deepAccess(bid, 'mediaTypes.banner') || deepAccess(bid, 'mediaType') === 'banner' || (!deepAccess(bid, 'mediaTypes.video') && !deepAccess(bid, 'mediaType'))) {
    placement.banner = {'format': []}
    if (isArray(sizes[0])) {
      _each(sizes, function (size) {
        placement.banner.format.push({'w': size[0], 'h': size[1]})
      })
    } else {
      placement.banner.format.push({'w': sizes[0], 'h': sizes[1]})
    }
  } else if (deepAccess(bid, 'mediaTypes.video') || deepAccess(bid, 'mediaType') === 'video') {
    placement.video = {}

    if (typeof sizes !== 'undefined') {
      if (isArray(sizes[0])) {
        placement.video.w = sizes[0][0]
        placement.video.h = sizes[0][1]
      } else {
        placement.video.w = sizes[0]
        placement.video.h = sizes[1]
      }
    }

    placement.video.protocols = deepAccess(bid, 'mediaTypes.video.protocols') || deepAccess(bid, 'params.video.protocols') || SUPPORTED_VIDEO_PROTOCOLS
    placement.video.mimes = deepAccess(bid, 'mediaTypes.video.mimes') || deepAccess(bid, 'params.video.mimes') || SUPPORTED_VIDEO_MIMES
    placement.video.playbackmethod = deepAccess(bid, 'mediaTypes.video.playbackmethod') || deepAccess(bid, 'params.video.playbackmethod') || SUPPORTED_VIDEO_PLAYBACK_METHODS
    placement.video.skip = deepAccess(bid, 'mediaTypes.video.skip') || deepAccess(bid, 'params.video.skip') || 0
    if (placement.video.skip === 1 && (deepAccess(bid, 'mediaTypes.video.skipafter') || deepAccess(bid, 'params.video.skipafter'))) {
      placement.video.skipafter = deepAccess(bid, 'mediaTypes.video.skipafter') || deepAccess(bid, 'params.video.skipafter')
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

  resp.meta = {};
  if (bid.adomain && bid.adomain.length > 0) {
    resp.meta.advertiserDomains = bid.adomain;
  }

  if (bid.ext.type === 'video') {
    resp.vastXml = bid.adm
  } else {
    resp.ad = bid.adm
  }

  if (deepAccess(bid, 'dealid')) {
    resp.dealId = bid.dealid
  }

  return resp
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner', 'video'],

  isBidRequestValid: function (bid) {
    if (!deepAccess(bid, 'params.placementId')) {
      logWarn('placementId param is reqeuired.')
      return false
    }
    if (deepAccess(bid, 'mediaTypes.banner.sizes')) {
      let isValid = _validateSizes(bid.mediaTypes.banner.sizes, 'banner')
      if (!isValid) {
        logWarn('Bid sizes are invalid.')
      }
      return isValid
    } else if (deepAccess(bid, 'mediaTypes.video.playerSize')) {
      let isValid = _validateSizes(bid.mediaTypes.video.playerSize, 'video')
      if (!isValid) {
        logWarn('Bid sizes are invalid.')
      }
      return isValid
    } else if (deepAccess(bid, 'sizes')) {
      let isValid = _validateSizes(bid.sizes, 'old')
      if (!isValid) {
        logWarn('Bid sizes are invalid.')
      }
      return isValid
    } else {
      logWarn('Bid sizes are required.')
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

      _each(validBidRequests, function (bid) {
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
    if (!isEmpty(serverResponse.body)) {
      _each(serverResponse.body.seatbid, function (seatbid) {
        _each(seatbid.bid, function (bid) {
          bidResponses.push(_buildResponse(bid, serverResponse.body.cur, serverResponse.body.ext.ttl))
        })
      })
    }

    return bidResponses
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = []

    if (deepAccess(serverResponses[0], 'body.ext.usersync') && !isEmpty(serverResponses[0].body.ext.usersync)) {
      _each(serverResponses[0].body.ext.usersync, function (match) {
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
