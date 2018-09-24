import { expect } from 'chai'
import { spec } from 'modules/yieldlabBidAdapter'
import { newBidder } from 'src/adapters/bidderFactory'

const REQUEST = {
  'bidder': 'yieldlab',
  'params': {
    'adslotId': '1111',
    'supplyId': '2222',
    'adSize': '728x90',
    'targeting': {
      'key1': 'value1',
      'key2': 'value2'
    }
  },
  'bidderRequestId': '143346cf0f1731',
  'auctionId': '2e41f65424c87c',
  'adUnitCode': 'adunit-code',
  'bidId': '2d925f27f5079f',
  'sizes': [728, 90]
}

const RESPONSE = {
  advertiser: 'yieldlab',
  curl: 'https://www.yieldlab.de',
  format: 0,
  id: 1111,
  price: 1,
  pid: 2222
}

describe('yieldlabBidAdapter', function () {
  const adapter = newBidder(spec)

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  })

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      const request = {
        'params': {
          'adslotId': '1111',
          'supplyId': '2222',
          'adSize': '728x90'
        }
      }
      expect(spec.isBidRequestValid(request)).to.equal(true)
    })

    it('should return false when required params are not passed', function () {
      expect(spec.isBidRequestValid({})).to.equal(false)
    })
  })

  describe('buildRequests', function () {
    const bidRequests = [REQUEST]
    const request = spec.buildRequests(bidRequests)

    it('sends bid request to ENDPOINT via GET', function () {
      expect(request.method).to.equal('GET')
    })

    it('returns a list of valid requests', function () {
      expect(request.validBidRequests).to.eql([REQUEST])
    })

    it('passes targeting to bid request', function () {
      expect(request.url).to.include('t=key1%3Dvalue1%26key2%3Dvalue2')
    })

    const gdprRequest = spec.buildRequests(bidRequests, {
      gdprConsent: {
        consentString: 'BN5lERiOMYEdiAKAWXEND1AAAAE6DABACMA',
        gdprApplies: true
      }
    })

    it('passes gdpr flag and consent if present', function () {
      expect(gdprRequest.url).to.include('consent=BN5lERiOMYEdiAKAWXEND1AAAAE6DABACMA')
      expect(gdprRequest.url).to.include('gdpr=true')
    })
  })

  describe('interpretResponse', function () {
    const validRequests = {
      validBidRequests: [REQUEST]
    }

    it('handles nobid responses', function () {
      expect(spec.interpretResponse({body: {}}, {validBidRequests: []}).length).to.equal(0)
      expect(spec.interpretResponse({body: []}, {validBidRequests: []}).length).to.equal(0)
    })

    it('should get correct bid response', function () {
      const result = spec.interpretResponse({body: [RESPONSE]}, validRequests)

      expect(result[0].requestId).to.equal('2d925f27f5079f')
      expect(result[0].cpm).to.equal(0.01)
      expect(result[0].width).to.equal(728)
      expect(result[0].height).to.equal(90)
      expect(result[0].creativeId).to.equal('1111')
      expect(result[0].dealId).to.equal(2222)
      expect(result[0].currency).to.equal('EUR')
      expect(result[0].netRevenue).to.equal(false)
      expect(result[0].ttl).to.equal(300)
      expect(result[0].referrer).to.equal('')
      expect(result[0].ad).to.include('<script src="https://ad.yieldlab.net/d/1111/2222/728x90?ts=')
    })

    it('should add vastUrl when type is video', function () {
      const VIDEO_REQUEST = Object.assign({}, REQUEST, {
        'mediaTypes': {
          'video': {
            'context': 'instream'
          }
        }
      })
      const validRequests = {
        validBidRequests: [VIDEO_REQUEST]
      }
      const result = spec.interpretResponse({body: [RESPONSE]}, validRequests)

      expect(result[0].requestId).to.equal('2d925f27f5079f')
      expect(result[0].cpm).to.equal(0.01)
      expect(result[0].mediaType).to.equal('video')
      expect(result[0].vastUrl).to.include('https://ad.yieldlab.net/d/1111/2222/728x90?ts=')
    })
  })
})
