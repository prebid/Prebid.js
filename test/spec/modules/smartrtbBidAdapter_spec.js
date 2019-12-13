import { expect } from 'chai'
import { spec, _getPlatform } from 'modules/smartrtbBidAdapter'
import { newBidder } from 'src/adapters/bidderFactory'

const br = {
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
      { type: 'image', url: 'https://smrtb.com/image' },
      { type: 'iframe', url: 'https://smrtb.com/iframe' }
    ]
  }
}

const vr = {
  body: {
    bids: [{
      bid_id: 'abc',
      cpm: 2.34,
      w: 640,
      h: 480,
      vast_url: 'https://demo.tremorvideo.com/proddev/vast/vast_inline_nonlinear.xml',
      crid: 'video_crid'
    }],
    pixels: [
      { type: 'image', url: 'https://smrtb.com/image' },
      { type: 'iframe', url: 'https://smrtb.com/iframe' }
    ]
  }
}

describe('SmartRTBBidAdapter', function () {
  const adapter = newBidder(spec)

  let bannerRequest = {
    bidId: '123',
    transactionId: '456',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]]
      }
    },
    params: {
      zoneId: 'N4zTDq3PPEHBIODv7cXK'
    }
  }

  let videoRequest = {
    bidId: 'abc',
    transactionId: 'def',
    mediaTypes: {
      video: {
        playerDimension: [640, 480]
      }
    },
    params: {
      zoneId: 'CK6gUYp58EGopLJnUvM2'
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
      expect(spec.isBidRequestValid(bannerRequest)).to.be.true
    })

    it('should return false if any zone id missing', function () {
      expect(spec.isBidRequestValid(Object.assign(bannerRequest, { params: { zoneId: null } }))).to.be.false
    })
  })

  describe('buildRequests', function () {
    let req = spec.buildRequests([ bannerRequest ], { refererInfo: { } })
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
      expect(rdata.imps[0].zone_id !== null).to.be.true
    })

    it('should include media types', function () {
      expect(rdata.imps[0].media_types !== null).to.be.true
    })
  })

  describe('interpretResponse', function () {
    it('should form compliant banner bid object response', function () {
      let ir = spec.interpretResponse(br, bannerRequest)

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
    it('should form compliant video object response', function () {
      let ir = spec.interpretResponse(vr, videoRequest)

      expect(ir.length).to.equal(1)

      let en = ir[0]

      expect(en.requestId != null &&
            en.cpm != null && typeof en.cpm === 'number' &&
            en.width != null && typeof en.width === 'number' &&
            en.height != null && typeof en.height === 'number' &&
            (en.vastUrl != null || en.vastXml != null) &&
            en.creativeId != null
      ).to.be.true
    })
  })

  describe('getUserSyncs', function () {
    it('should return iframe sync', function () {
      let sync = spec.getUserSyncs({ iframeEnabled: true }, [br])
      expect(sync.length).to.equal(1)
      expect(sync[0].type === 'iframe')
      expect(typeof sync[0].url === 'string')
    })

    it('should return pixel sync', function () {
      let sync = spec.getUserSyncs({ pixelEnabled: true }, [br])
      expect(sync.length).to.equal(1)
      expect(sync[0].type === 'image')
      expect(typeof sync[0].url === 'string')
    })
  })
})
