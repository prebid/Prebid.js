import { expect } from 'chai'
import { spec, _getPlatform } from 'modules/smartrtbBidAdapter'
import { newBidder } from 'src/adapters/bidderFactory'

const res = {
  body: {
    bids: [{
      bid_id: '123',
      cpm: 1.23,
      w: 300,
      h: 250,
      html: '<b>deadbeef</b>',
      crid: 'crid'
    }],
    pixels: [
      { type: 'image', url: 'http://smrtb.com/image' },
      { type: 'iframe', url: 'http://smrtb.com/iframe' }
    ]
  }
}

describe('SmartRTBBidAdapter', function () {
  const adapter = newBidder(spec)

  let bidRequest = {
    bidId: '123',
    transactionId: '456',
    sizes: [[ 300, 250 ]],
    params: {
      pubId: 123,
      medId: 'm_00a95d003340dbb2fcb8ee668a84fa',
      zoneId: 'z_261b6c7e7d4d4985393b293cc903d1'
    }
  }

  describe('codes', function () {
    it('should return a bidder code of smartrtb', function () {
      expect(spec.code).to.equal('smartrtb')
    })
    it('should alias smrtb', function () {
      expect(spec.aliases.length > 0 && spec.aliases[0] === 'smrtb').to.be.true
    })
  })

  describe('isBidRequestValid', function () {
    it('should return true if all params present', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.be.true
    })

    it('should return false if any parameter missing', function () {
      expect(spec.isBidRequestValid(Object.assign(bidRequest, { params: { pubId: null } }))).to.be.false
      expect(spec.isBidRequestValid(Object.assign(bidRequest, { params: { medId: null } }))).to.be.false
      expect(spec.isBidRequestValid(Object.assign(bidRequest, { params: { zoneId: null } }))).to.be.false
    })
  })

  describe('buildRequests', function () {
    let req = spec.buildRequests([ bidRequest ], { refererInfo: { } })
    let rdata

    it('should return request object', function () {
      expect(req).to.not.be.null
    })

    it('should build request data', function () {
      expect(req.data).to.not.be.null
    })

    it('should include one request', function () {
      rdata = JSON.parse(req.data)
      expect(rdata.imps.length).to.equal(1)
    })

    it('should include all publisher params', function () {
      let r = rdata.imps[0]
      expect(r.pub_id !== null && r.med_id !== null && r.zone_id !== null).to.be.true
    })
  })

  describe('interpretResponse', function () {
    it('should form compliant bid object response', function () {
      let ir = spec.interpretResponse(res, bidRequest)

      expect(ir.length).to.equal(1)

      let en = ir[0]

      expect(en.requestId != null &&
            en.cpm != null && typeof en.cpm === 'number' &&
            en.width != null && typeof en.width === 'number' &&
            en.height != null && typeof en.height === 'number' &&
            en.ad != null &&
            en.creativeId != null
      ).to.be.true
    })
  })

  describe('getUserSyncs', function () {
    it('should return iframe sync', function () {
      let sync = spec.getUserSyncs({ iframeEnabled: true }, [res])
      expect(sync.length).to.equal(1)
      expect(sync[0].type === 'iframe')
      expect(typeof sync[0].url === 'string')
    })

    it('should return pixel sync', function () {
      let sync = spec.getUserSyncs({ pixelEnabled: true }, [res])
      expect(sync.length).to.equal(1)
      expect(sync[0].type === 'image')
      expect(typeof sync[0].url === 'string')
    })
  })
})
