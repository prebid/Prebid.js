import {spec} from 'modules/displayioBidAdapter.js'
import {BANNER} from '/src/mediaTypes'

describe('Displayio adapter', function () {
  const BIDDER = 'displayio'
  const bidRequests = [{
    bidId: 'bidId_001',
    bidder: BIDDER,
    adUnitCode: 'adUnit_001',
    auctionId: 'auctionId_001',
    bidderRequestId: 'bidderRequestId_001',
    mediaTypes: {
      banner: {
        sizes: [[320, 480]]
      }
    },
    params: {
      siteId: 1,
      placementId: 1,
      adsSrvDomain: 'adsSrvDomain',
      cdnDomain: 'cdnDomain',
    }
  }]
  const bidderRequest = {
    refererInfo: {
      referer: 'testprebid.com'
    }
  }

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function() {
      const validBid = spec.isBidRequestValid(bidRequests[0])
      expect(validBid).to.be.true
    })

    const bidRequestsNoParams = [{
      bidder: BIDDER,
    }]
    it('should not validate without params', function () {
      const request = spec.isBidRequestValid(bidRequestsNoParams, bidderRequest)
      expect(request).to.be.false
    })

    const noSiteId = {
      bidder: BIDDER,
      params: {
        placementId: 1,
        adsSrvDomain: 'adsSrvDomain',
        cdnDomain: 'cdnDomain',
      }
    }
    it('should not validate without siteId', function() {
      const invalidBid = spec.isBidRequestValid(noSiteId)
      expect(invalidBid).to.be.false
    })

    const noPlacementId = {
      bidder: BIDDER,
      params: {
        siteId: 1,
        adsSrvDomain: 'adsSrvDomain',
        cdnDomain: 'cdnDomain',
      }
    }
    it('should not validate without placementId', function() {
      const invalidBid = spec.isBidRequestValid(noPlacementId)
      expect(invalidBid).to.be.false
    })

    const noAdsSrvDomain = {
      bidder: BIDDER,
      params: {
        siteId: 1,
        placementId: 1,
        cdnDomain: 'cdnDomain',
      }
    }
    it('should not validate without adsSrvDomain', function() {
      const invalidBid = spec.isBidRequestValid(noAdsSrvDomain)
      expect(invalidBid).to.be.false
    })

    const noCdnDomain = {
      bidder: BIDDER,
      params: {
        siteId: 1,
        placementId: 1,
        adsSrvDomain: 'adsSrvDomain',
      }
    }
    it('should not validate without cdnDomain', function() {
      const invalidBid = spec.isBidRequestValid(noCdnDomain)
      expect(invalidBid).to.be.false
    })
  })

  describe('buildRequests', function () {
    it('should build request', function() {
      const request = spec.buildRequests(bidRequests, bidderRequest)
      expect(request).to.not.be.empty
    })

    it('sends bid request to the endpoint via POST', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)
      expect(request[0].method).to.equal('POST')
    })

    it('sends all bid parameters', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)
      expect(request[0]).to.have.keys(['headers', 'data', 'method', 'url'])
    })

    it('should not crash when there is no media types', function () {
      const bidRequestsNoMediaTypes = [{
        bidder: BIDDER,
        params: {
          siteId: 1,
          placementId: 1,
          adsSrvDomain: 'adsSrvDomain',
          cdnDomain: 'cdnDomain',
        }
      }]
      const request = spec.buildRequests(bidRequestsNoMediaTypes, bidderRequest)
      expect(request[0]).to.have.keys(['headers', 'data', 'method', 'url'])
    })
  })

  describe('interpretResponse', function () {
    const response = {
      body: {
        status: 'ok',
        data: {
          ads: [{
            ad: {
              data: {
                id: '001',
                ecpm: 100,
                w: 32,
                h: 480,
                markup: 'test ad'
              }
            },
            subtype: 'html'
          }],
        }
      }
    }
    const serverRequest = {
      data: {
        data: {
          id: 'id_001',
          adUnitCode: 'test-div',
          renderURL: 'testprebid.com/render.js',
          data: {
            ref: 'testprebid.com'
          }
        }
      }
    }

    let ir = spec.interpretResponse(response, serverRequest)

    expect(ir.length).to.equal(1)

    ir = ir[0]

    it('should have requestId', function() {
      expect(ir.requestId).to.be.a('string')
    })

    it('should have cpm', function() {
      expect(ir.cpm).to.be.a('number')
    })

    it('should have width', function() {
      expect(ir.width).to.be.a('number')
    })

    it('should have height', function() {
      expect(ir.height).to.be.a('number')
    })

    it('should have creativeId', function() {
      expect(ir.creativeId).to.be.a('number')
    })

    it('should have ad', function() {
      expect(ir.ad).to.be.a('string')
    })

    it('should have mediaType', function() {
      expect(ir.mediaType).to.be.equal(BANNER)
    })

    it('should have adUnitCode', function() {
      expect(ir.adUnitCode).to.be.a('string')
    })

    it('should have renderURL', function() {
      expect(ir.renderURL).to.be.a('string')
    })
  })
})
