import { expect } from 'chai'
import { spec, _getPlatform } from 'modules/marsmediaBidAdapter'
// import { newBidder } from 'src/adapters/bidderFactory'

describe('marsmediaBidAdapter', function () {
  // const adapter = newBidder(spec)

  let bidRequest = {
    'bidder': 'marsmedia',
    'params': {
      'zoneId': 9999
    },
    'adUnitCode': 'adunit-code',
    'mediaTypes': {
      'banner': {
        sizes: [[300, 250]]
      }
    },
    'bidId': '37386aade21a71'
  }

  describe('codes', function () {
    it('should return a bidder code of marsmedia', function () {
      expect(spec.code).to.equal('marsmedia')
    })
    it('should alias mars', function () {
      expect(spec.aliases.length > 0 && spec.aliases[0] === 'mars').to.be.true
    })
  })

  describe('isBidRequestValid', function () {
    it('should return true if all params present', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.be.true
    })

    it('should return false if any parameter missing', function () {
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
      expect(rdata.imp.length).to.equal(1)
    })

    it('should include all zoneId params', function () {
      let r = rdata.imp[0]
      expect(r.zoneId !== null).to.be.true
    })
  })

  describe('interpretResponse', function () {
    let response;
    beforeEach(function () {
      response = {
        body: {
          'id': '37386aade21a71',
          'seatbid': [{
            'bid': [{
              'id': '1',
              'impid': '1',
			        'cid': '1',
              'price': 0.1,
              'nurl': '<!-- NURL -->',
              'adm': '<!-- Creative -->',
              'w': 320,
              'h': 250
            }]
          }]
        }
      };
    });

    it('handles empty bid response', function () {
      let response = {
        body: ''
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    /* it('should return iframe sync', function () {
      let sync = spec.getUserSyncs({ iframeEnabled: true })
      expect(sync.length).to.equal(1)
      expect(sync[0].type === 'iframe')
      expect(typeof sync[0].url === 'string')
    })

    it('should return pixel sync', function () {
      let sync = spec.getUserSyncs({ pixelEnabled: true })
      expect(sync.length).to.equal(1)
      expect(sync[0].type === 'image')
      expect(typeof sync[0].url === 'string')
    }) */
  })
})
