// jshint esversion: 6, es3: false, node: true
'use strict'

import { registerBidder } from '../src/adapters/bidderFactory.js'
import { BANNER, VIDEO } from '../src/mediaTypes.js'
import {
  _map,
  deepAccess,
  deepSetValue,
  flatten,
  logError,
  mergeDeep,
  parseSizesInput
} from '../src/utils.js'
import { config } from '../src/config.js'

const { getConfig } = config

const BIDDER_CODE = 'caroda'
const GVLID = 954
const carodaDomain = 'prebid.caroda.io'

// const OUTSTREAM_RENDERER_URL = 'https://s2.adform.net/banners/scripts/video/outstream/render.js';

// some state info is required to synchronize wi
const topUsableWindow = getTopUsableWindow()
const pageViewId = topUsableWindow.carodaPageViewId || Math.floor(Math.random() * 1e9)

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
    const ortbCommon = getOrtbCommon(bidderRequest)
    const priceType =
      setOnAny(validBidRequests, 'params.priceType') ||
      'net'
    const test = setOnAny(validBidRequests, 'params.test')
    const currency = getConfig('currency.adServerCurrency')
    const cur = currency && [currency]
    const eids = setOnAny(validBidRequests, 'userIdAsEids')
    const schain = setOnAny(validBidRequests, 'schain')
    const request = {
      id: bidderRequest.auctionId,
      hb_version: '$prebid.version$',
      ...ortbCommon,
      pt: priceType,
      cur
    }
    if (test) {
      request.is_debug = !!test
      request.test = 1
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
    if (schain) {
      deepSetValue(request, 'schain', schain)
    }
    return getImps(validBidRequests).map(imp => ({
      method: 'POST',
      url: 'https://' + carodaDomain + '/api/hb?entry_id=' + pageViewId,
      data: JSON.stringify({
        ...request,
        ...imp
      })
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
      return
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

function getOrtbCommon (bidderRequest) {
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

function getImps (validBidRequests) {
    return validBidRequests.map((bid, id) => {
        bid.netRevenue = pt
        const floorInfo = bid.getFloor
          ? bid.getFloor({
              currency: currency || 'USD'
            })
          : {}
        const bidfloor = floorInfo.floor
        const bidfloorcur = floorInfo.currency
        const { ctok, placementId } = bid.params
        const imp = {
          id: id + 1,
          ctok,
          placementId,
          bidfloor,
          bidfloorcur
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
        const videoParams = deepAccess(bid, 'mediaTypes.video')
        if (videoParams) {
          imp.video = videoParams
        }
        return imp
    })
}