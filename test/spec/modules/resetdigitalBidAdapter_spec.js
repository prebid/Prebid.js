import { expect } from 'chai'
import { spec, _getPlatform } from 'modules/resetdigitalBidAdapter.js'
import { newBidder } from 'src/adapters/bidderFactory.js'

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
      { type: 'image', url: 'https://reset.com/image' },
      { type: 'iframe', url: 'https://reset.com/iframe' }
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
      { type: 'image', url: 'https://reset.com/image' },
      { type: 'iframe', url: 'https://reset.com/iframe' }
    ]
  }
}

describe('resetdigitalBidAdapter', function () {
  const adapter = newBidder(spec)

  const bannerRequest = {
    bidId: '123',
    transactionId: '456',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]]
      }
    },
    params: {
      pubId: '12345'
    }
  }

  const videoRequest = {
    bidId: 'abc',
    transactionId: 'def',
    mediaTypes: {
      video: {
        playerDimension: [640, 480]
      }
    },
    params: {
      pubId: 'CK6gUYp58EGopLJnUvM2'
    }
  }

  describe('codes', function () {
    it('should return a bidder code of resetdigital', function () {
      expect(spec.code).to.equal('resetdigital')
    })
  })

  describe('isBidRequestValid', function () {
    it('should return true if all params present', function () {
      expect(spec.isBidRequestValid(bannerRequest)).to.be.true
    })

    it('should return false if zone id and pub id missing', function () {
      expect(spec.isBidRequestValid(Object.assign(bannerRequest, { params: { pubId: null, zoneId: null } }))).to.be.false
    })
  })

  describe('buildRequests', function () {
    const req = spec.buildRequests([ bannerRequest ], { refererInfo: { } })
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
      const ir = spec.interpretResponse(br, bannerRequest)

      expect(ir.length).to.equal(1)

      const en = ir[0]

      expect(en.requestId != null &&
            en.cpm != null && typeof en.cpm === 'number' &&
            en.width != null && typeof en.width === 'number' &&
            en.height != null && typeof en.height === 'number' &&
            en.ad != null &&
            en.creativeId != null
      ).to.be.true
    })
    it('should form compliant video object response', function () {
      const ir = spec.interpretResponse(vr, videoRequest)

      expect(ir.length).to.equal(1)

      const en = ir[0]

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
      const sync = spec.getUserSyncs({ iframeEnabled: true }, [br])
      expect(sync.length).to.equal(1)
      expect(sync[0].type === 'iframe')
      expect(typeof sync[0].url === 'string')
    })

    it('should return pixel sync', function () {
      const sync = spec.getUserSyncs({ pixelEnabled: true }, [br])
      expect(sync.length).to.equal(1)
      expect(sync[0].type === 'image')
      expect(typeof sync[0].url === 'string')
    })
  })

  describe('schain support', function () {
    it('should include schain in the payload if present in bidderRequest', function () {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'example.com',
          sid: '00001',
          hp: 1,
          rid: 'req-1',
          name: 'seller',
          domain: 'example.com'
        }]
      };

      const bidRequest = {
        bidId: 'schain-test-id',
        params: {
          pubId: 'schain-pub'
        }
      };

      const bidderRequest = {
        ortb2: {
          source: {
            ext: {
              schain
            }
          }
        },
        refererInfo: {}
      };

      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.schain).to.deep.equal(schain);
    });

    it('should not include schain if not present in bidderRequest', function () {
      const bidRequest = {
        bidId: 'no-schain-id',
        params: {
          pubId: 'no-schain-pub'
        }
      };

      const bidderRequest = {
        ortb2: {
          source: {
            ext: {}
          }
        },
        refererInfo: {}
      };

      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload).to.not.have.property('schain');
    });
  });
})
