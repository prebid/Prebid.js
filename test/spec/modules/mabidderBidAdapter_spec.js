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
      'ppid': 'string1',
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
      const ppid = bid.params.ppid
      delete bid.params.ppid
      expect(spec.isBidRequestValid(bid)).to.equal(false)
      bid.params.ppid = ppid

      bid = Object.assign({}, bidRequestBanner)
      const params = bidRequestBanner.params
      delete bid.params
      expect(spec.isBidRequestValid(bid)).to.equal(false)
      bidRequestBanner.params = params
    })
  })

  describe('buildRequests', () => {
    const bidRequests = [bidRequestBanner]
    const req = spec.buildRequests(bidRequests, {
      auctionId: '123',
      refererInfo: {
        referer: 'http://test.com/path.html'
      }
    })

    it('sends bid request to ENDPOINT via POST', () => {
      expect(req.method).to.equal('POST')
      expect(req.url.indexOf('https://')).to.equal(0)
      expect(req.url).to.equal(baseUrl)
    })

    it('contains prebid version parameter', () => {
      expect(req.data.v).to.equal($$PREBID_GLOBAL$$.version)
    })

    it('sends the correct bid parameters for banner', () => {
      expect(req.data.bids[0].bidId).to.equal(bidRequestBanner.bidId)
      expect(req.data.bids[0].ppid).to.equal(bidRequestBanner.params.ppid)
      expect(req.data.bids[0].sizes[0].width).to.equal(bidRequestBanner.sizes[0][0])
      expect(req.data.bids[0].sizes[0].height).to.equal(bidRequestBanner.sizes[0][1])
    })

    it('accepts an optional fpd parameter', () => {
      expect(req.data.fpd).to.exist.and.to.be.a('Object')
    })
  })

  describe('interpretResponse', () => {
    it('handles banner request and should get correct bid response', () => {
      const BIDDER_RESPONSE_BANNER = {
        'Responses': [{
          'width': 300,
          'height': 250,
          'creativeId': '123abc',
          'ad': '<!-- Creative -->',
          'cpm': 0.5,
          'requestId': 'abc123',
          'ttl': 60,
          'netRevenue': true,
          'currency': 'USD',
          'mediaType': BANNER,
          'meta': {
            'advertiserDomains': ['https://loblaws.ca']
          }
        }]
      }
      const results = spec.interpretResponse({ body: BIDDER_RESPONSE_BANNER }, {})
      const response = results[0]
      expect(results.length).to.equal(BIDDER_RESPONSE_BANNER.Responses.length)
      expect(response).to.have.property('ad').equal('<!-- Creative -->')
      expect(response).to.have.property('requestId').equal('abc123')
      expect(response).to.have.property('cpm').equal(0.5)
      expect(response).to.have.property('currency').equal('USD')
      expect(response).to.have.property('width').equal(300)
      expect(response).to.have.property('height').equal(250)
      expect(response).to.have.property('ttl').equal(60)
      expect(response).to.have.property('creativeId').equal('123abc')
      expect(response).to.have.property('mediaType').equal(BANNER)
      expect(response).to.have.property('meta')
      expect(response.meta).to.have.property('advertiserDomains')
      expect(response.meta.advertiserDomains).to.be.an('array')
      expect(response.meta.advertiserDomains[0]).equal('https://loblaws.ca')
    })

    it('handles no bid response by returning empty array', () => {
      let result = spec.interpretResponse({ body: undefined }, {})
      expect(result).to.deep.equal([])

      result = spec.interpretResponse({ body: '' }, {})
      expect(result).to.deep.equal([])
    })
  })
})
