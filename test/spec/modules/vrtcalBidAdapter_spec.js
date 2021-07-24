import { expect } from 'chai'
import { spec } from 'modules/vrtcalBidAdapter'
import { newBidder } from 'src/adapters/bidderFactory'

describe('vrtcalBidAdapter', function () {
  const adapter = newBidder(spec)

  let bidRequest = {
    bidId: 'bidID0001',
    transactionId: 'transID0001',
    sizes: [[ 300, 250 ]]
  }

  describe('isBidRequestValid', function () {
    it('should return true 100% of time as no special additional params are required, thus no additional validation needed', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.be.true
    })
  })

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'vrtcal',
        'adUnitCode': 'adunit0001',
        'sizes': [[300, 250]],
        'bidId': 'bidID0001',
        'bidderRequestId': 'br0001',
        'auctionId': 'auction0001',
      }
    ];

    const request = spec.buildRequests(bidRequests);

    it('sends bid request to our endpoint via POST', function () {
      expect(request[0].method).to.equal('POST');
    });

    it('adUnitCode should be sent as prebidAdUnitCode parameters on any requests', function () {
      expect(request[0].data).to.match(/"prebidAdUnitCode":"adunit0001"/);
    });
  });

  describe('interpretResponse', function () {
    it('should form compliant bid object response', function () {
      let res = {
        body: {
          id: 'bidID0001',
          seatbid: [{
            bid: [{
              id: 'VRTB_240d3c8a3c12b68_1',
              impid: '1',
              price: 0.7554,
              adm: 'TEST AD',
              nurl: 'https://adplatform.vrtcal.com/wintracker',
              w: 300,
              h: 250,
              crid: 'v2_1064_vrt_vrtcaltestdisplay2_300_250',
              adomain: ['vrtcal.com']
            }],
            seat: '16'
          }],
          cur: 'USD'
        }
      }

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
})
