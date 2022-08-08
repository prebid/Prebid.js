// jshint esversion: 6, es3: false, node: true
'use strict'

import { registerBidder } from '../src/adapters/bidderFactory.js'
import { BANNER, VIDEO } from '../src/mediaTypes.js'
import {
  deepAccess,
  deepSetValue,
  logError,
  mergeDeep,
  parseSizesInput
} from '../src/utils.js'
import { config } from '../src/config.js'

const { getConfig } = config

const BIDDER_CODE = 'caroda'
const GVLID = 954
const carodaDomain = 'prebid.caroda.io'

// some state info is required to synchronize with Caroda ad server
const topUsableWindow = getTopUsableWindow()

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: bid => {
    const params = bid.params || {}
    const { ctok, placementId } = params
    return ctok && placementId
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    const pageViewId = topUsableWindow.carodaPageViewId || Math.floor(Math.random() * 1e9)    
    const ortbCommon = getORTBCommon(bidderRequest)
    const priceType =
      setOnAny(validBidRequests, 'params.priceType') ||
      'net'
    const test = setOnAny(validBidRequests, 'params.test')
    const currency = getConfig('currency.adServerCurrency')
    const eids = setOnAny(validBidRequests, 'userIdAsEids')
    const schain = setOnAny(validBidRequests, 'schain')
    const request = {
      id: bidderRequest.auctionId,
      currency,
      hb_version: '$prebid.version$',
      ...ortbCommon,
      price_type: priceType
    }
    if (test) {
      request.test = 1
    }
    if (schain) {
      request.schain = schain
    }
    if (config.getConfig('coppa')) {
      deepSetValue(request, 'privacy.coppa', 1)
    }
    if (deepAccess(bidderRequest, 'gdprConsent.gdprApplies') !== undefined) {
      deepSetValue(
        request,
        'privacy.gdpr_consent',
        bidderRequest.gdprConsent.consentString
      )
      deepSetValue(
        request,
        'privacy.gdpr',
        bidderRequest.gdprConsent.gdprApplies & 1
      )
    }
    if (bidderRequest.uspConsent) {
      deepSetValue(request, 'privacy.us_privacy', bidderRequest.uspConsent)
    }
    if (eids) {
      deepSetValue(request, 'user.eids', eids)
    }
    return getImps(validBidRequests, request).map(imp => ({
      method: 'POST',
      url: 'https://' + carodaDomain + '/api/hb?entry_id=' + pageViewId,
      data: JSON.stringify(imp)
    }))
  },
  interpretResponse: function (serverResponse, { bids }) {
    if (!serverResponse.body) {
      return
    }
    const { ok, error } = serverResponse.body
    if (error) {
      return
    }
    try {
      return JSON.parse(ok)
        .map((bid) => {
          return {
            requestId: bid.bidId,
            cpm: bid.cpm,
            creativeId: bid.crid,
            ttl: 300,
            netRevenue: true,
            currency: bid.currency,
            width: bid.w,
            height: bid.h,
            meta: {
              advertiserDomains: bid && bid.adomain ? bid.adomain : []
            },
            ad: bid.ad,
            placementId: bid.placementId
          }
        })
        .filter(Boolean)
    } catch (e) {
      logError(BIDDER_CODE, ': caught', e)
    }
  }
}

registerBidder(spec)

function setOnAny (collection, key) {
  for (let i = 0, result; i < collection.length; i++) {
    result = deepAccess(collection[i], key)
    if (result) {
      return result
    }
  }
}

function getTopUsableWindow () {
  let res = window
  try {
    while (window.top !== res && res.parent.location.href.length) {
      res = res.parent
    }
  } catch (e) {}
  return res
}

function getORTBCommon (bidderRequest) {
  let app, site
  const commonFpd = bidderRequest.ortb2 || {}
  let { user } = commonFpd
  if (typeof getConfig('app') === 'object') {
    app = getConfig('app') || {}
    if (commonFpd.app) {
      mergeDeep(app, commonFpd.app)
    }
  } else {
    site = getConfig('site') || {}
    if (commonFpd.site) {
      mergeDeep(site, commonFpd.site)
    }
    if (!site.page) {
      site.page = bidderRequest.refererInfo.page
    }
  }
  const device = getConfig('device') || {}
  device.w = device.w || window.innerWidth
  device.h = device.h || window.innerHeight
  device.ua = device.ua || navigator.userAgent
  return {
    app,
    site,
    user,
    device
  }
}

function getImps (validBidRequests, common) {
  return validBidRequests.map((bid, id) => {
    const floorInfo = bid.getFloor
      ? bid.getFloor({ currency: common.currency || 'EUR' })
      : {}
    const bidfloor = floorInfo.floor
    const bidfloorcur = floorInfo.currency
    const { ctok, placementId } = bid.params
    const imp = {
      id: id + 1,
      ctok,
      bidfloor,
      bidfloorcur,
      ...common
    }
    const bannerParams = deepAccess(bid, 'mediaTypes.banner')
    if (bannerParams && bannerParams.sizes) {
      const sizes = parseSizesInput(bannerParams.sizes)
      const format = sizes.map(size => {
        const [width, height] = size.split('x')
        const w = parseInt(width, 10)
        const h = parseInt(height, 10)
        return { w, h }
      })
      imp.banner = {
        format
      }
    }
    if (placementId) {
      imp.placementId = placementId
    }
    const videoParams = deepAccess(bid, 'mediaTypes.video')
    if (videoParams) {
      imp.video = videoParams
    }
    return imp
  })
}
