import { expect } from 'chai'
import { spec, _getPlatform } from 'modules/automatadBidAdapter'
import { newBidder } from 'src/adapters/bidderFactory'

describe('automatadBidAdapter', function () {
  const adapter = newBidder(spec)

  let bidRequest = {
    bidder: 'automatad',
    params: {siteId: '123ad', placementId: '123abc345'},
    mediaTypes: {
      banner: {
        sizes: [[300, 600]],
      }
    },
    adUnitCode: 'some-ad-unit-code',
    transactionId: '1465569e-52cc-4c36-88a1-7174cfef4b44',
    sizes: [[300, 600]],
    bidId: '123abc',
    bidderRequestId: '3213887463c059',
    auctionId: 'abc-123',
    src: 'client',
    bidRequestsCount: 1,
  }

  describe('codes', function () {
    it('should return a bidder code of automatad', function () {
      expect(spec.code).to.equal('automatad')
    })
    it('should alias atd', function () {
      expect(spec.aliases.length > 0 && spec.aliases[0] === 'atd').to.be.true
    })
  })

  describe('isBidRequestValid', function () {
    let inValidBid = Object.assign({}, bidRequest)
    delete inValidBid.params
    it('should return true if all params present', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true)
    })

    it('should return false if any parameter missing', function () {
      expect(spec.isBidRequestValid(inValidBid)).to.be.false
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

    it('should include media types', function () {
      let r = rdata.imp[0]
      expect(r.media_types !== null).to.be.true
    })

    it('should include all publisher params', function () {
      let r = rdata.imp[0]
      expect(r.siteID !== null && r.placementID !== null).to.be.true
    })
  })

  describe('interpretResponse', function () {
    it('should get the correct bid response', function () {
      let expectedResponse = [{
        'body': {
          'id': 'abc-123',
          'seatbid': [
            {
              'bid': [
                {
                  'adm': '<!-- creative code -->',
                  'adomain': [
                    'someAdDomain'
                  ],
                  'crid': 123,
                  'h': 250,
                  'id': 'bid1',
                  'impid': '1',
                  'nurl': '<!-- nurl -->',
                  'price': 0.3,
                  'w': 300
                }
              ]
            }
          ]
        }
      }];

      let result = spec.interpretResponse(expectedResponse[0]);
      expect(result).to.be.an('array').that.is.not.empty;
    });

    it('handles empty bid response', function () {
      let response = {
        body: ''
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });
})
