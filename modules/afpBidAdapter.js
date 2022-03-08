import {includes} from '../src/polyfill.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {Renderer} from '../src/Renderer.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';

export const IS_DEV = location.hostname === 'localhost'
export const BIDDER_CODE = 'afp'
export const SSP_ENDPOINT = 'https://ssp.afp.ai/api/prebid'
export const REQUEST_METHOD = 'POST'
export const TEST_PAGE_URL = 'https://rtbinsight.ru/smiert-bolshikh-dannykh-kto-na-novienkogo/'
const SDK_PATH = 'https://cdn.afp.ai/ssp/sdk.js?auto_initialization=false&deploy_to_parent_window=true'
const TTL = 60
export const IN_IMAGE_BANNER_TYPE = 'In-image'
export const IN_IMAGE_MAX_BANNER_TYPE = 'In-image Max'
export const IN_CONTENT_BANNER_TYPE = 'In-content Banner'
export const IN_CONTENT_VIDEO_TYPE = 'In-content Video'
export const OUT_CONTENT_VIDEO_TYPE = 'Out-content Video'
export const IN_CONTENT_STORY_TYPE = 'In-content Stories'
export const ACTION_SCROLLER_TYPE = 'Action Scroller'
export const ACTION_SCROLLER_LIGHT_TYPE = 'Action Scroller Light'
export const JUST_BANNER_TYPE = 'Just Banner'

export const mediaTypeByPlaceType = {
  [IN_IMAGE_BANNER_TYPE]: BANNER,
  [IN_IMAGE_MAX_BANNER_TYPE]: BANNER,
  [IN_CONTENT_BANNER_TYPE]: BANNER,
  [IN_CONTENT_STORY_TYPE]: BANNER,
  [ACTION_SCROLLER_TYPE]: BANNER,
  [ACTION_SCROLLER_LIGHT_TYPE]: BANNER,
  [JUST_BANNER_TYPE]: BANNER,
  [IN_CONTENT_VIDEO_TYPE]: VIDEO,
  [OUT_CONTENT_VIDEO_TYPE]: VIDEO,
}

const wrapAd = (dataToCreatePlace) => {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>html, body {width: 100%; height: 100%; margin: 0;}</style>
        <script src="${SDK_PATH}"></script>
    </head>
    <body>
        <script>
            window.afp.createPlaceByData(JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(dataToCreatePlace))}")))
        </script>
    </body>
  </html>`
}

const bidRequestMap = {}

const createRenderer = (bid, dataToCreatePlace) => {
  const renderer = new Renderer({
    targetId: bid.adUnitCode,
    url: SDK_PATH,
    callback() {
      renderer.loaded = true
      window.afp.createPlaceByData(dataToCreatePlace)
    }
  })

  return renderer
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid({mediaTypes, params}) {
    if (typeof params !== 'object' || typeof mediaTypes !== 'object') {
      return false
    }

    const {placeId, placeType, imageUrl, imageWidth, imageHeight} = params
    const media = mediaTypes[mediaTypeByPlaceType[placeType]]

    if (placeId && media) {
      if (mediaTypeByPlaceType[placeType] === VIDEO) {
        if (!media.playerSize) {
          return false
        }
      } else if (mediaTypeByPlaceType[placeType] === BANNER) {
        if (!media.sizes) {
          return false
        }
      }
      if (includes([IN_IMAGE_BANNER_TYPE, IN_IMAGE_MAX_BANNER_TYPE], placeType)) {
        if (imageUrl && imageWidth && imageHeight) {
          return true
        }
      } else {
        return true
      }
    }
    return false
  },
  buildRequests(validBidRequests, {refererInfo, gdprConsent}) {
    const payload = {
      pageUrl: IS_DEV ? TEST_PAGE_URL : refererInfo.referer,
      gdprConsent: gdprConsent,
      bidRequests: validBidRequests.map(validBidRequest => {
        const {bidId, transactionId, sizes, params: {
          placeId, placeType, imageUrl, imageWidth, imageHeight
        }} = validBidRequest
        bidRequestMap[bidId] = validBidRequest
        const bidRequest = {
          bidId,
          transactionId,
          sizes,
          placeId,
        }
        if (includes([IN_IMAGE_BANNER_TYPE, IN_IMAGE_MAX_BANNER_TYPE], placeType)) {
          Object.assign(bidRequest, {
            imageUrl,
            imageWidth: Math.floor(imageWidth),
            imageHeight: Math.floor(imageHeight),
          })
        }
        return bidRequest
      })
    }

    return {
      method: REQUEST_METHOD,
      url: SSP_ENDPOINT,
      data: payload,
      options: {
        contentType: 'application/json'
      }
    }
  },
  interpretResponse(serverResponse) {
    let bids = serverResponse.body && serverResponse.body.bids
    bids = Array.isArray(bids) ? bids : []

    return bids.map(({bidId, cpm, width, height, creativeId, currency, netRevenue, adSettings, placeSettings}, index) => {
      const bid = {
        requestId: bidId,
        cpm,
        width,
        height,
        creativeId,
        currency,
        netRevenue,
        meta: {
          mediaType: mediaTypeByPlaceType[placeSettings.placeType],
        },
        ttl: TTL
      }

      const bidRequest = bidRequestMap[bidId]
      const placeContainer = bidRequest.params.placeContainer
      const dataToCreatePlace = { adSettings, placeSettings, placeContainer, isPrebid: true }

      if (mediaTypeByPlaceType[placeSettings.placeType] === BANNER) {
        bid.ad = wrapAd(dataToCreatePlace)
      } else if (mediaTypeByPlaceType[placeSettings.placeType] === VIDEO) {
        bid.vastXml = adSettings.content
        bid.renderer = createRenderer(bid, dataToCreatePlace)
      }
      return bid
    })
  }
}

registerBidder(spec);
