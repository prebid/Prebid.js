import { BANNER } from '../../../src/mediaTypes'
import { expect } from 'chai'
import { newBidder } from 'src/adapters/bidderFactory.js'
import { spec } from 'modules/glimpseBidAdapter.js'

const ENDPOINT = 'https://api.glimpsevault.io/ads/serving/public/v1/prebid'

const mock = {
  bidRequest: {
    bidder: 'glimpse',
    bidId: '26a80b71cfd671',
    bidderRequestId: '133baeded6ac94',
    auctionId: '96692a73-307b-44b8-8e4f-ddfb40341570',
    adUnitCode: 'banner-div-a',
    sizes: [[300, 250]],
    params: {
      placementId: 'glimpse-demo-300x250',
    },
  },
  bidderRequest: {
    bidderCode: 'glimpse',
    bidderRequestId: '133baeded6ac94',
    auctionId: '96692a73-307b-44b8-8e4f-ddfb40341570',
    timeout: 3000,
    gdprConsent: {
      consentString: 'COzP517OzP517AcABBENAlCsAP_AAAAAAAwIF8NX-T5eL2vju2Zdt7JEaYwfZxyigOgThgQIsW8NwIeFbBoGP2EgHBG4JCQAGBAkkgCBAQMsHGBcCQAAgIgRiRKMYE2MjzNKBJJAigkbc0FACDVunsHS2ZCY70-8O__bPAviADAvUC-AAAAA.YAAAAAAAAAAA',
      vendorData: {},
      gdprApplies: true,
    },
    refererInfo: {
      numIframes: 0,
      reachedTop: true,
      referer: 'https://demo.glimpseprotocol.io/prebid/desktop',
      stack: ['https://demo.glimpseprotocol.io/prebid/desktop'],
    },
  },
  bidResponse: {
    auth: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJoZWxsbyI6IndvcmxkISJ9.1p6T0ORhJ6riLprhXBGdzRhG3Q1egM27uFhPGNapPxs',
    data: {
      bids: [
        {
          bidder: 'glimpse',
          requestId: '133baeded6ac94',
          creativeId: 'glimpse-demo-300x250',
          adUnitCode: 'banner-div-a',
          currency: 'GBP',
          ad: '<div>Hello, World!</div>',
          width: 300,
          height: 250,
          cpm: 1.04,
          pbAg: '1.04',
          pbDg: '1.04',
          pbHg: '1.04',
          pbLg: '1.00',
          pbMg: '1.05',
          netRevenue: true,
          mediaType: 'banner',
          ttl: 300,
        }
      ],
    },
  },
}

const getBidRequest = () => getDeepCopy(mock.bidRequest)
const getBidderRequest = () => ({
  bids: [getBidRequest()],
  ...getDeepCopy(mock.bidderRequest),
})

const getBidResponseHelper = () => getDeepCopy(mock.bidResponse)
const getBidResponse = () => ({
  body: getBidResponseHelper(),
})

function getDeepCopy(object) {
  return JSON.parse(JSON.stringify(object))
}

describe('GlimpseProtocolAdapter', () => {
  const glimpseAdapter = newBidder(spec)

  describe('spec', () => {
    it('Has defined the glimpse gvlid', () => {
      expect(spec.gvlid).to.equal(1012)
    })

    it('Has defined glimpse as the bidder', () => {
      expect(spec.code).to.equal('glimpse')
    })

    it('Has defined valid mediaTypes', () => {
      expect(spec.supportedMediaTypes).to.deep.equal([BANNER])
    })
  })

  describe('Inherited functions', () => {
    it('Functions exist and are valid types', () => {
      expect(glimpseAdapter.callBids).to.exist.and.to.be.a('function')
      expect(glimpseAdapter.getSpec).to.exist.and.to.be.a('function')
    })
  })

  describe('isBidRequestValid', () => {
    it('Returns true when a bid request has a valid placement id', () => {
      const bidRequest = getBidRequest()

      const isValidBidRequest = spec.isBidRequestValid(bidRequest)
      expect(isValidBidRequest).to.be.true
    })

    it('Returns false when params are empty', () => {
      const bidRequest = getBidRequest()
      bidRequest.params = {}

      const isValidBidRequest = spec.isBidRequestValid(bidRequest)
      expect(isValidBidRequest).to.be.false
    })

    it('Returns false when params are null', () => {
      const bidRequest = getBidRequest()
      bidRequest.params = null

      const isValidBidRequest = spec.isBidRequestValid(bidRequest)
      expect(isValidBidRequest).to.be.false
    })

    it('Returns false when params are undefined', () => {
      const bidRequest = getBidRequest()
      delete bidRequest.params

      const isValidBidRequest = spec.isBidRequestValid(bidRequest)
      expect(isValidBidRequest).to.be.false
    })

    it('Returns false when params are invalid type', () => {
      const bidRequest = getBidRequest()
      bidRequest.params = 123

      const isValidBidRequest = spec.isBidRequestValid(bidRequest)
      expect(isValidBidRequest).to.be.false
    })

    it('Returns false when placement id is empty', () => {
      const bidRequest = getBidRequest()
      bidRequest.params.placementId = ''

      const isValidBidRequest = spec.isBidRequestValid(bidRequest)
      expect(isValidBidRequest).to.be.false
    })

    it('Returns false when placement id is null', () => {
      const bidRequest = getBidRequest()
      bidRequest.params.placementId = null

      const isValidBidRequest = spec.isBidRequestValid(bidRequest)
      expect(isValidBidRequest).to.be.false
    })

    it('Returns false when placement id is undefined', () => {
      const bidRequest = getBidRequest()
      delete bidRequest.params.placementId

      const isValidBidRequest = spec.isBidRequestValid(bidRequest)
      expect(isValidBidRequest).to.be.false
    })

    it('Returns false when placement id has an invalid type', () => {
      const bidRequest = getBidRequest()
      bidRequest.params.placementId = 123

      const isValidBidRequest = spec.isBidRequestValid(bidRequest)
      expect(isValidBidRequest).to.be.false
    })
  })

  describe('buildRequests', () => {
    const bidRequests = [getBidRequest()]
    const bidderRequest = getBidderRequest()

    it('Adds GDPR consent', () => {
      const request = spec.buildRequests(bidRequests, bidderRequest)
      const payload = JSON.parse(request.data)
      const expected = bidderRequest.gdprConsent.consentString

      expect(payload.data.gdprConsent).to.exist
      expect(payload.data.gdprConsent.gdprApplies).to.be.true
      expect(payload.data.gdprConsent.consentString).to.equal(expected)
    })

    it('Adds referer information', () => {
      const request = spec.buildRequests(bidRequests, bidderRequest)
      const payload = JSON.parse(request.data)
      const expected = mock.bidderRequest.refererInfo.referer

      expect(payload.data.referer).to.equal(expected)
    })

    it('Sends a POST request to the Glimpse server', () => {
      const request = spec.buildRequests(bidRequests)

      expect(request.url).to.equal(ENDPOINT)
      expect(request.method).to.equal('POST')
    })
  })

  describe('interpretResponse', () => {
    it('Handles valid bid responses', () => {
      const bidResponse = getBidResponse()
      const bids = spec.interpretResponse(bidResponse)

      expect(bids).to.have.lengthOf(1)
      expect(bids[0].adUnitCode).to.equal(mock.bidRequest.adUnitCode)
    })

    it('Handles no bid responses', () => {
      const bidResponse = getBidResponse()
      bidResponse.body.data.bids = []

      const bids = spec.interpretResponse(bidResponse)
      expect(bids).to.have.lengthOf(0)
    })

    it('Returns no bids if body is empty', () => {
      const bidResponse = getBidResponse()
      bidResponse.body = {}

      const bids = spec.interpretResponse(bidResponse)
      expect(bids).to.have.lengthOf(0)
    })

    it('Returns no bids if body is null', () => {
      const bidResponse = getBidResponse()
      bidResponse.body = null

      const bids = spec.interpretResponse(bidResponse)
      expect(bids).to.have.lengthOf(0)
    })

    it('Returns no bids if body is undefined', () => {
      const bidResponse = getBidResponse()
      delete bidResponse.body

      const bids = spec.interpretResponse(bidResponse)
      expect(bids).to.have.lengthOf(0)
    })

    it('Returns no bids if body is invalid type', () => {
      const bidResponse = getBidResponse()
      bidResponse.body = 123

      const bids = spec.interpretResponse(bidResponse)
      expect(bids).to.have.lengthOf(0)
    })

    it('Returns no bids if auth is empty', () => {
      const bidResponse = getBidResponse()
      bidResponse.body.auth = ''

      const bids = spec.interpretResponse(bidResponse)
      expect(bids).to.have.lengthOf(0)
    })

    it('Returns no bids if auth is null', () => {
      const bidResponse = getBidResponse()
      bidResponse.body.auth = null

      const bids = spec.interpretResponse(bidResponse)
      expect(bids).to.have.lengthOf(0)
    })

    it('Returns no bids if auth is undefined', () => {
      const bidResponse = getBidResponse()
      delete bidResponse.body.auth

      const bids = spec.interpretResponse(bidResponse)
      expect(bids).to.have.lengthOf(0)
    })

    it('Returns no bids if auth is invalid type', () => {
      const bidResponse = getBidResponse()
      bidResponse.body.auth = 123

      const bids = spec.interpretResponse(bidResponse)
      expect(bids).to.have.lengthOf(0)
    })

    it('Returns no bid if data is empty', () => {
      const bidResponse = getBidResponse()
      bidResponse.body.data = {}

      const bids = spec.interpretResponse(bidResponse)
      expect(bids).to.have.lengthOf(0)
    })

    it('Returns no bid if data is null', () => {
      const bidResponse = getBidResponse()
      bidResponse.body.data = null

      const bids = spec.interpretResponse(bidResponse)
      expect(bids).to.have.lengthOf(0)
    })

    it('Returns no bid if data is undefined', () => {
      const bidResponse = getBidResponse()
      delete bidResponse.body.data

      const bids = spec.interpretResponse(bidResponse)
      expect(bids).to.have.lengthOf(0)
    })

    it('Returns no bid if data is invalid type', () => {
      const bidResponse = getBidResponse()
      bidResponse.body.data = "This shouldn't be a string"

      const bids = spec.interpretResponse(bidResponse)
      expect(bids).to.have.lengthOf(0)
    })
  })
})
