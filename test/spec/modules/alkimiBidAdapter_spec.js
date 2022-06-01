import { expect } from 'chai'
import { ENDPOINT, spec } from 'modules/alkimiBidAdapter.js'
import { newBidder } from 'src/adapters/bidderFactory.js'

const REQUEST = {
  'bidId': '456',
  'bidder': 'alkimi',
  'sizes': [[300, 250]],
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 250]]
    }
  },
  'params': {
    bidFloor: 0.1,
    token: 'e64782a4-8e68-4c38-965b-80ccf115d46f',
    pos: 7
  }
}

const BIDDER_BANNER_RESPONSE = {
  'prebidResponse': [{
    'ad': '<div>test</div>',
    'requestId': 'e64782a4-8e68-4c38-965b-80ccf115d46d',
    'cpm': 900.5,
    'currency': 'USD',
    'width': 640,
    'height': 480,
    'ttl': 300,
    'creativeId': 1,
    'netRevenue': true,
    'winUrl': 'http://test.com',
    'mediaType': 'banner',
    'adomain': ['test.com']
  }]
}

const BIDDER_VIDEO_RESPONSE = {
  'prebidResponse': [{
    'ad': '<xml>vast</xml>',
    'requestId': 'e64782a4-8e68-4c38-965b-80ccf115d46z',
    'cpm': 800.4,
    'currency': 'USD',
    'width': 1024,
    'height': 768,
    'ttl': 200,
    'creativeId': 2,
    'netRevenue': true,
    'winUrl': 'http://test.com',
    'mediaType': 'video',
    'adomain': ['test.com']
  }]
}

const BIDDER_NO_BID_RESPONSE = ''

describe('alkimiBidAdapter', function () {
  const adapter = newBidder(spec)

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  })

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(REQUEST)).to.equal(true)
    })

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, REQUEST)
      delete bid.params.token
      expect(spec.isBidRequestValid(bid)).to.equal(false)

      bid = Object.assign({}, REQUEST)
      delete bid.params.bidFloor
      expect(spec.isBidRequestValid(bid)).to.equal(false)

      bid = Object.assign({}, REQUEST)
      delete bid.params
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })
  })

  describe('buildRequests', function () {
    let bidRequests = [REQUEST]
    const bidderRequest = spec.buildRequests(bidRequests, {
      auctionId: '123',
      refererInfo: {
        referer: 'http://test.com/path.html'
      }
    })

    it('sends bid request to ENDPOINT via POST', function () {
      expect(bidderRequest.method).to.equal('POST')
      expect(bidderRequest.data.requestId).to.equal('123')
      expect(bidderRequest.data.referer).to.equal('http://test.com/path.html')
      expect(bidderRequest.data.signRequest.bids).to.deep.contains({ token: 'e64782a4-8e68-4c38-965b-80ccf115d46f', pos: 7, bidFloor: 0.1, width: 300, height: 250, impMediaType: 'Banner' })
      expect(bidderRequest.data.signRequest.randomUUID).to.equal(undefined)
      expect(bidderRequest.data.bidIds).to.deep.contains('456')
      expect(bidderRequest.data.signature).to.equal(undefined)
      expect(bidderRequest.options.customHeaders).to.deep.equal({ 'Rtb-Direct': true })
      expect(bidderRequest.options.contentType).to.equal('application/json')
      expect(bidderRequest.url).to.equal(ENDPOINT)
    })
  })

  describe('interpretResponse', function () {
    it('handles banner request : should get correct bid response', function () {
      const result = spec.interpretResponse({ body: BIDDER_BANNER_RESPONSE }, {})

      expect(result[0]).to.have.property('ad').equal('<div>test</div>')
      expect(result[0]).to.have.property('requestId').equal('e64782a4-8e68-4c38-965b-80ccf115d46d')
      expect(result[0]).to.have.property('cpm').equal(900.5)
      expect(result[0]).to.have.property('currency').equal('USD')
      expect(result[0]).to.have.property('width').equal(640)
      expect(result[0]).to.have.property('height').equal(480)
      expect(result[0]).to.have.property('ttl').equal(300)
      expect(result[0]).to.have.property('creativeId').equal(1)
      expect(result[0]).to.have.property('netRevenue').equal(true)
      expect(result[0]).to.have.property('winUrl').equal('http://test.com')
      expect(result[0]).to.have.property('mediaType').equal('banner')
      expect(result[0].meta).to.exist.property('advertiserDomains')
      expect(result[0].meta).to.have.property('advertiserDomains').lengthOf(1)
    })

    it('handles video request : should get correct bid response', function () {
      const result = spec.interpretResponse({ body: BIDDER_VIDEO_RESPONSE }, {})

      expect(result[0]).to.have.property('ad').equal('<xml>vast</xml>')
      expect(result[0]).to.have.property('requestId').equal('e64782a4-8e68-4c38-965b-80ccf115d46z')
      expect(result[0]).to.have.property('cpm').equal(800.4)
      expect(result[0]).to.have.property('currency').equal('USD')
      expect(result[0]).to.have.property('width').equal(1024)
      expect(result[0]).to.have.property('height').equal(768)
      expect(result[0]).to.have.property('ttl').equal(200)
      expect(result[0]).to.have.property('creativeId').equal(2)
      expect(result[0]).to.have.property('netRevenue').equal(true)
      expect(result[0]).to.have.property('winUrl').equal('http://test.com')
      expect(result[0]).to.have.property('mediaType').equal('video')
      expect(result[0]).to.have.property('vastXml').equal('<xml>vast</xml>')
      expect(result[0].meta).to.exist.property('advertiserDomains')
      expect(result[0].meta).to.have.property('advertiserDomains').lengthOf(1)
    })

    it('handles no bid response : should get empty array', function () {
      let result = spec.interpretResponse({ body: undefined }, {})
      expect(result).to.deep.equal([])

      result = spec.interpretResponse({ body: BIDDER_NO_BID_RESPONSE }, {})
      expect(result).to.deep.equal([])
    })
  })

  describe('onBidWon', function () {
    it('handles banner win: should get true', function () {
      const win = BIDDER_BANNER_RESPONSE.prebidResponse[0]
      const bidWonResult = spec.onBidWon(win)

      expect(bidWonResult).to.equal(true)
    })
  })
})
