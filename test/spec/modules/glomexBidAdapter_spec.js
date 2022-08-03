import { expect } from 'chai'
import { spec } from 'modules/glomexBidAdapter.js'
import { newBidder } from 'src/adapters/bidderFactory.js'

const REQUEST = {
  bidder: 'glomex',
  params: {
    integrationId: 'abcdefg',
    playlistId: 'defghjk'
  },
  bidderRequestId: '143346cf0f1732',
  auctionId: '2e41f65424c87c',
  adUnitCode: 'adunit-code',
  bidId: '2d925f27f5079f',
  sizes: [640, 360]
}

const BIDDER_REQUEST = {
  auctionId: '2d921234f5079f',
  refererInfo: {
    isAmp: true,
    numIframes: 0,
    reachedTop: true,
    topmostLocation: 'https://glomex.com'
  },
  gdprConsent: {
    gdprApplies: true,
    consentString: 'CO5asbJO5asbJE-AAAENAACAAAAAAAAAAAYgAAAAAAAA.IAAA'
  }
}

const RESPONSE = {
  bids: [
    {
      id: '2d925f27f5079f',
      cpm: 3.5,
      width: 640,
      height: 360,
      creativeId: 'creative-1j75x4ln1kk6m1ius',
      dealId: 'deal-1j75x4ln1kk6m1iut',
      currency: 'EUR',
      netRevenue: true,
      ttl: 300,
      ad: '<ad />',
      adomain: ['glomex.com']
    }
  ]
}
describe('glomexBidAdapter', function () {
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
          'integrationId': 'abcdefg'
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
    const request = spec.buildRequests(bidRequests, BIDDER_REQUEST)

    it('sends bid request to ENDPOINT via POST', function () {
      expect(request.method).to.equal('POST')
    })

    it('returns a list of valid requests', function () {
      expect(request.validBidRequests).to.eql([REQUEST])
    })

    it('sends params.integrationId', function () {
      expect(request.validBidRequests[0].params.integrationId).to.eql(REQUEST.params.integrationId)
    })

    it('sends params.playlistId', function () {
      expect(request.validBidRequests[0].params.playlistId).to.eql(REQUEST.params.playlistId)
    })

    it('sends refererInfo', function () {
      const expected = {
        ...BIDDER_REQUEST.refererInfo,
        referer: BIDDER_REQUEST.refererInfo.topmostLocation
      }
      delete expected.topmostLocation;
      expect(request.data.refererInfo).to.eql(expected)
    })

    it('sends gdprConsent', function () {
      expect(request.data.gdprConsent).to.eql(BIDDER_REQUEST.gdprConsent)
    })

    it('sends the auctionId', function () {
      expect(request.data.auctionId).to.eql(BIDDER_REQUEST.auctionId)
    })
  })

  describe('interpretResponse', function () {
    it('handles nobid responses', function () {
      expect(spec.interpretResponse({body: {}}, {validBidRequests: []}).length).to.equal(0)
      expect(spec.interpretResponse({body: []}, {validBidRequests: []}).length).to.equal(0)
    })

    it('handles the server response', function () {
      const result = spec.interpretResponse(
        {
          body: RESPONSE
        },
        {
          validBidRequests: [REQUEST]
        }
      )

      expect(result[0].requestId).to.equal('2d925f27f5079f')
      expect(result[0].cpm).to.equal(3.5)
      expect(result[0].width).to.equal(640)
      expect(result[0].height).to.equal(360)
      expect(result[0].creativeId).to.equal('creative-1j75x4ln1kk6m1ius')
      expect(result[0].dealId).to.equal('deal-1j75x4ln1kk6m1iut')
      expect(result[0].currency).to.equal('EUR')
      expect(result[0].netRevenue).to.equal(true)
      expect(result[0].ttl).to.equal(300)
      expect(result[0].ad).to.equal('<ad />')
      expect(result[0].meta.advertiserDomains).to.deep.equal(['glomex.com'])
    })
  })
})
