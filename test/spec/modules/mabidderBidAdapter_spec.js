import { expect } from 'chai'
import { baseUrl, spec } from 'modules/mabidderBidAdapter.js'
import { newBidder } from 'src/adapters/bidderFactory.js'
import { BANNER } from '../../../src/mediaTypes.js';

describe('mabidderBidAdapter', () => {
  const adapter = newBidder(spec)
  const bidRequestBanner = {
    'bidId': '12345',
    'bidder': 'mabidder',
    'sizes': [[300, 250]],
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 250]]
      }
    },
    'params': {
      'accountId': 'string1',
      'placementId': 'string2'
    }

  }

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  })

  describe('isBidRequestValid', () => {
    it('should return true when required params are found', () => {
      expect(spec.isBidRequestValid(bidRequestBanner)).to.equal(true)
    })

    it('should return false when required params are not found', () => {
      let bid = Object.assign({}, bidRequestBanner)
      delete bid.params.accountId
      expect(spec.isBidRequestValid(bid)).to.equal(false)

      bid = Object.assign({}, bidRequestBanner)
      delete bid.params.placementId
      expect(spec.isBidRequestValid(bid)).to.equal(false)

      bid = Object.assign({}, bidRequestBanner)
      delete bid.params
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })
  })

  describe('buildRequests', () => {
    const bidRequests = [bidRequestBanner]
    const req = spec.buildRequests(bidRequests, {
      auctionId: '123',
      refererInfo: {
        referer: 'http://test.com/path.html'
      }
    })[0]

    it('sends bid request to ENDPOINT via POST', () => {
      expect(req.method).to.equal('POST')
      expect(req.url.indexOf('https://')).to.equal(0)
      expect(req.url).to.equal(baseUrl)
    })

    it('contains prebid version parameter', () => {
      expect(req.data.v).to.equal($$PREBID_GLOBAL$$.version)
    })

    it('sends the correct bid parameters for banner', () => {
      expect(req.data.bidId).to.equal(bidRequestBanner.bidId)
      expect(req.data.params.accountId).to.equal(bidRequestBanner.params.accountId)
      expect(req.data.params.placementId).to.equal(bidRequestBanner.params.placementId)
      expect(req.data.sizes).to.equal(bidRequestBanner.sizes)
    })

    it('accepts an optional fpd parameter', () => {
      expect(req.data.fpd).to.exist.and.to.be.a('String')
    })
  })

  describe('interpretResponse', () => {
    it('handles banner request and should get correct bid response', () => {
      const BIDDER_RESPONSE_BANNER = [{
        'width': 300,
        'height': 250,
        'creativeId': '123abc',
        'ad': '<!-- Creative -->',
        'cpm': 0.5,
        'requestId': 'abc123',
        'ttl': 60,
        'netRevenue': true,
        'currency': 'CAD',
        'mediaType': BANNER,
      }]
      const result = spec.interpretResponse({ body: BIDDER_RESPONSE_BANNER }, {})
      const response = result[0]
      expect(result.length).to.equal(BIDDER_RESPONSE_BANNER.length)
      expect(response).to.have.property('ad').equal('<!-- Creative -->')
      expect(response).to.have.property('requestId').equal('abc123')
      expect(response).to.have.property('cpm').equal(0.5)
      expect(response).to.have.property('currency').equal('CAD')
      expect(response).to.have.property('width').equal(300)
      expect(response).to.have.property('height').equal(250)
      expect(response).to.have.property('ttl').equal(60)
      expect(response).to.have.property('creativeId').equal('123abc')
      expect(response).to.have.property('mediaType').equal(BANNER)
      expect(response).to.have.property('meta')
      expect(response.meta).to.have.property('advertiserDomains')
      expect(response.meta.advertiserDomains).to.be.an('array').that.is.empty
    })

    it('handles no bid response by returning empty array', () => {
      let result = spec.interpretResponse({ body: undefined }, {})
      expect(result).to.deep.equal([])

      result = spec.interpretResponse({ body: '' }, {})
      expect(result).to.deep.equal([])
    })

    it('should get correct bid response with advertiserDomains', () => {
      const serverResponse = [{
        'width': 300,
        'height': 250,
        'creativeId': '29681110',
        'ad': '<!-- Creative -->',
        'cpm': 0.5,
        'requestId': '30b31c1838de1e',
        'ttl': 60,
        'netRevenue': true,
        'currency': 'EUR',
        'advertiserDomains': ['loblaw.ca'],
        'mediaType': BANNER
      }]
      const result = spec.interpretResponse({ body: serverResponse })[0]
      expect(result).to.have.property('meta')
      expect(result.meta).to.have.property('advertiserDomains').deep.include('loblaw.ca')
    })
  })
})
