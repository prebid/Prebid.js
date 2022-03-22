import {includes} from 'src/polyfill.js'
import cloneDeep from 'lodash/cloneDeep'
import unset from 'lodash/unset'
import { expect } from 'chai'
import { BANNER, VIDEO } from '../../../src/mediaTypes.js'
import {
  spec,
  IN_IMAGE_BANNER_TYPE,
  IN_IMAGE_MAX_BANNER_TYPE,
  IN_CONTENT_BANNER_TYPE,
  IN_CONTENT_VIDEO_TYPE,
  OUT_CONTENT_VIDEO_TYPE,
  IN_CONTENT_STORY_TYPE,
  ACTION_SCROLLER_TYPE,
  ACTION_SCROLLER_LIGHT_TYPE,
  JUST_BANNER_TYPE,
  BIDDER_CODE,
  SSP_ENDPOINT,
  REQUEST_METHOD,
  TEST_PAGE_URL,
  IS_DEV, mediaTypeByPlaceType
} from 'modules/afpBidAdapter.js'

const placeId = '613221112871613d1517d181'
const bidId = '2a67c5577ff6a5'
const transactionId = '7e8515a2-2ed9-4733-b976-6c2596a03287'
const imageUrl = 'https://rtbinsight.ru/content/images/size/w1000/2021/05/ximage-30.png.pagespeed.ic.IfuX4zAEPP.png'
const placeContainer = '#container'
const imageWidth = 600
const imageHeight = 400
const pageUrl = IS_DEV ? TEST_PAGE_URL : 'referer'
const sizes = [[imageWidth, imageHeight]]
const bidderRequest = {
  refererInfo: { referer: pageUrl },
}
const mediaTypeBanner = { [BANNER]: {sizes: [[imageWidth, imageHeight]]} }
const mediaTypeVideo = { [VIDEO]: {playerSize: [[imageWidth, imageHeight]]} }
const commonParams = {
  placeId,
  placeContainer,
}
const commonParamsForInImage = Object.assign({}, commonParams, {
  imageUrl,
  imageWidth,
  imageHeight,
})
const configByPlaceType = {
  get [IN_IMAGE_BANNER_TYPE]() {
    return cloneDeep({
      mediaTypes: mediaTypeBanner,
      params: Object.assign({}, commonParamsForInImage, {
        placeType: IN_IMAGE_BANNER_TYPE
      }),
    })
  },
  get [IN_IMAGE_MAX_BANNER_TYPE]() {
    return cloneDeep({
      mediaTypes: mediaTypeBanner,
      params: Object.assign({}, commonParamsForInImage, {
        placeType: IN_IMAGE_MAX_BANNER_TYPE
      }),
    })
  },
  get [IN_CONTENT_BANNER_TYPE]() {
    return cloneDeep({
      mediaTypes: mediaTypeBanner,
      params: Object.assign({}, commonParams, {
        placeType: IN_CONTENT_BANNER_TYPE
      }),
    })
  },
  get [IN_CONTENT_VIDEO_TYPE]() {
    return cloneDeep({
      mediaTypes: mediaTypeVideo,
      params: Object.assign({}, commonParams, {
        placeType: IN_CONTENT_VIDEO_TYPE
      }),
    })
  },
  get [OUT_CONTENT_VIDEO_TYPE]() {
    return cloneDeep({
      mediaTypes: mediaTypeVideo,
      params: Object.assign({}, commonParams, {
        placeType: OUT_CONTENT_VIDEO_TYPE
      }),
    })
  },
  get [IN_CONTENT_STORY_TYPE]() {
    return cloneDeep({
      mediaTypes: mediaTypeBanner,
      params: Object.assign({}, commonParams, {
        placeType: IN_CONTENT_STORY_TYPE
      }),
    })
  },
  get [ACTION_SCROLLER_TYPE]() {
    return cloneDeep({
      mediaTypes: mediaTypeBanner,
      params: Object.assign({}, commonParams, {
        placeType: ACTION_SCROLLER_TYPE
      }),
    })
  },
  get [ACTION_SCROLLER_LIGHT_TYPE]() {
    return cloneDeep({
      mediaTypes: mediaTypeBanner,
      params: Object.assign({}, commonParams, {
        placeType: ACTION_SCROLLER_LIGHT_TYPE
      }),
    })
  },
  get [JUST_BANNER_TYPE]() {
    return cloneDeep({
      mediaTypes: mediaTypeBanner,
      params: Object.assign({}, commonParams, {
        placeType: JUST_BANNER_TYPE
      }),
    })
  },
}
const getTransformedConfig = ({mediaTypes, params}) => {
  return {
    params: params,
    sizes,
    bidId,
    bidder: BIDDER_CODE,
    mediaTypes: mediaTypes,
    transactionId,
  }
}
const validBidRequests = Object.keys(configByPlaceType).map(key => getTransformedConfig(configByPlaceType[key]))

describe('AFP Adapter', function() {
  describe('isBidRequestValid method', function() {
    describe('returns true', function() {
      describe('when config has all mandatory params', () => {
        Object.keys(configByPlaceType).forEach(placeType => {
          it(`and ${placeType} config has the correct value`, function() {
            const isBidRequestValid = spec.isBidRequestValid(configByPlaceType[placeType])
            expect(isBidRequestValid).to.equal(true)
          })
        })
      })
    })
    describe('returns false', function() {
      const checkMissingParams = (placesTypes, missingParams) =>
        placesTypes.forEach(placeType =>
          missingParams.forEach(missingParam => {
            const config = configByPlaceType[placeType]
            it(`${placeType} does not have the ${missingParam}.`, function() {
              unset(config, missingParam)
              const isBidRequestValid = spec.isBidRequestValid(config)
              expect(isBidRequestValid).to.equal(false)
            })
          })
        )

      describe('when params are not correct', function() {
        checkMissingParams(Object.keys(configByPlaceType), ['params.placeId', 'params.placeType'])
        checkMissingParams([IN_IMAGE_BANNER_TYPE, IN_IMAGE_MAX_BANNER_TYPE],
          ['params.imageUrl', 'params.imageWidth', 'params.imageHeight'])

        it('does not have a the correct placeType.', function() {
          const config = configByPlaceType[IN_IMAGE_BANNER_TYPE]
          config.params.placeType = 'something'
          const isBidRequestValid = spec.isBidRequestValid(config)
          expect(isBidRequestValid).to.equal(false)
        })
      })
      describe('when video mediaType object is not correct.', function() {
        checkMissingParams([IN_CONTENT_VIDEO_TYPE, OUT_CONTENT_VIDEO_TYPE],
          [`mediaTypes.${VIDEO}.playerSize`, `mediaTypes.${VIDEO}`])
        checkMissingParams([
          IN_IMAGE_BANNER_TYPE,
          IN_IMAGE_MAX_BANNER_TYPE,
          IN_CONTENT_BANNER_TYPE,
          IN_CONTENT_STORY_TYPE,
          ACTION_SCROLLER_TYPE,
          ACTION_SCROLLER_LIGHT_TYPE,
          JUST_BANNER_TYPE
        ], [`mediaTypes.${BANNER}.sizes`, `mediaTypes.${BANNER}`])
      })
    })
  })

  describe('buildRequests method', function() {
    const request = spec.buildRequests(validBidRequests, bidderRequest)

    it('Url should be correct', function() {
      expect(request.url).to.equal(SSP_ENDPOINT)
    })

    it('Method should be correct', function() {
      expect(request.method).to.equal(REQUEST_METHOD)
    })

    describe('Common data request should be correct', function() {
      it('pageUrl should be correct', function() {
        expect(request.data.pageUrl).to.equal(pageUrl)
      })
      it('bidRequests should be array', function() {
        expect(Array.isArray(request.data.bidRequests)).to.equal(true)
      })

      request.data.bidRequests.forEach((bid, index) => {
        describe(`bid with ${validBidRequests[index].params.placeType} should be correct`, function() {
          it('bidId should be correct', function() {
            expect(bid.bidId).to.equal(bidId)
          })
          it('placeId should be correct', function() {
            expect(bid.placeId).to.equal(placeId)
          })
          it('transactionId should be correct', function() {
            expect(bid.transactionId).to.equal(transactionId)
          })
          it('sizes should be correct', function() {
            expect(bid.sizes).to.equal(sizes)
          })

          if (includes([IN_IMAGE_BANNER_TYPE, IN_IMAGE_MAX_BANNER_TYPE], validBidRequests[index].params.placeType)) {
            it('imageUrl should be correct', function() {
              expect(bid.imageUrl).to.equal(imageUrl)
            })
            it('imageWidth should be correct', function() {
              expect(bid.imageWidth).to.equal(Math.floor(imageWidth))
            })
            it('imageHeight should be correct', function() {
              expect(bid.imageHeight).to.equal(Math.floor(imageHeight))
            })
          }
        })
      })
    })
  })

  describe('interpretResponse method', function() {
    it('should return a void array, when the server response are not correct.', function() {
      const request = { data: JSON.stringify({}) }
      const serverResponse = {
        body: {}
      }
      const bids = spec.interpretResponse(serverResponse, request)
      expect(Array.isArray(bids)).to.equal(true)
      expect(bids.length).to.equal(0)
    })
    it('should return a void array, when the server response have not got bids.', function() {
      const request = { data: JSON.stringify({}) }
      const serverResponse = { body: { bids: [] } }
      const bids = spec.interpretResponse(serverResponse, request)
      expect(Array.isArray(bids)).to.equal(true)
      expect(bids.length).to.equal(0)
    })
    describe('when the server response return a bids', function() {
      Object.keys(configByPlaceType).forEach(placeType => {
        it(`should return a bid with ${placeType} placeType`, function() {
          const cpm = 10
          const currency = 'RUB'
          const creativeId = '123'
          const netRevenue = true
          const width = sizes[0][0]
          const height = sizes[0][1]
          const adSettings = {
            content: 'html'
          }
          const placeSettings = {
            placeType,
          }
          const request = spec.buildRequests([validBidRequests[0]], bidderRequest)
          const serverResponse = {
            body: {
              bids: [
                {
                  bidId,
                  cpm,
                  currency,
                  creativeId,
                  netRevenue,
                  width,
                  height,
                  adSettings,
                  placeSettings,
                }
              ]
            }
          }
          const bids = spec.interpretResponse(serverResponse, request)
          expect(bids.length).to.equal(1)
          expect(bids[0].requestId).to.equal(bidId)
          expect(bids[0].meta.mediaType).to.equal(mediaTypeByPlaceType[placeSettings.placeType])
          expect(bids[0].cpm).to.equal(cpm)
          expect(bids[0].width).to.equal(width)
          expect(bids[0].height).to.equal(height)
          expect(bids[0].currency).to.equal(currency)
          expect(bids[0].netRevenue).to.equal(netRevenue)

          if (mediaTypeByPlaceType[placeSettings.placeType] === BANNER) {
            expect(typeof bids[0].ad).to.equal('string')
          } else if (mediaTypeByPlaceType[placeSettings.placeType] === VIDEO) {
            expect(typeof bids[0].vastXml).to.equal('string')
            expect(typeof bids[0].renderer).to.equal('object')
          }
        })
      })
    })
  })
})
