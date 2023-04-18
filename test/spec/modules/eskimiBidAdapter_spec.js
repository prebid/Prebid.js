import {expect} from 'chai';
import {spec} from 'modules/eskimiBidAdapter.js';

const REQUEST = {
  'bidderCode': 'eskimi',
  'auctionId': 'auctionId-56a2-4f71-9098-720a68f2f708',
  'bidderRequestId': 'requestId',
  'bidRequest': [{
    'bidder': 'eskimi',
    'params': {
      'placementId': 1003000,
      'accId': 123
    },
    'sizes': [
      [300, 250]
    ],
    'bidId': 'bidId1',
    'adUnitCode': 'adUnitCode1',
    'bidderRequestId': 'bidderRequestId',
    'auctionId': 'auctionId-56a2-4f71-9098-720a68f2f708'
  },
  {
    'bidder': 'eskimi',
    'params': {
      'placementId': 1003001,
      'accId': 123
    },
    'sizes': [
      [300, 250]
    ],
    'bidId': 'bidId2',
    'adUnitCode': 'adUnitCode2',
    'bidderRequestId': 'bidderRequestId',
    'auctionId': 'auctionId-56a2-4f71-9098-720a68f2f708'
  }],
  'start': 1487883186070,
  'auctionStart': 1487883186069,
  'timeout': 3000
};

const RESPONSE = {
  'headers': null,
  'body': {
    'id': 'requestId',
    'seatbid': [
      {
        'bid': [
          {
            'id': 'bidId1',
            'impid': 'bidId1',
            'price': 0.18,
            'adm': '<script>adm</script>',
            'adid': '144762342',
            'adomain': [
              'https://dummydomain.com'
            ],
            'iurl': 'iurl',
            'cid': '109',
            'crid': 'creativeId',
            'cat': [],
            'w': 300,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'eskimi': {
                  'brand_id': 334553,
                  'auction_id': 514667951122925701,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            }
          }
        ],
        'seat': 'seat'
      }
    ]
  }
};

describe('Eskimi bid adapter', function () {
  describe('isBidRequestValid', function () {
    it('should accept request if placementId is passed', function () {
      let bid = {
        bidder: 'eskimi',
        params: {
          placementId: 123
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('reject requests without params', function () {
      let bid = {
        bidder: 'eskimi',
        params: {}
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('creates request data', function () {
      let request = spec.buildRequests(REQUEST.bidRequest, REQUEST)[0];
      expect(request).to.exist.and.to.be.a('object');
      const payload = request.data;
      expect(payload.imp[0]).to.have.property('id', REQUEST.bidRequest[0].bidId);
      expect(payload.imp[1]).to.have.property('id', REQUEST.bidRequest[1].bidId);
    });

    it('has gdpr data if applicable', function () {
      const req = Object.assign({}, REQUEST, {
        gdprConsent: {
          consentString: 'consentString',
          gdprApplies: true,
        }
      });
      let request = spec.buildRequests(REQUEST.bidRequest, req)[0];

      const payload = request.data;
      expect(payload.user.ext).to.have.property('consent', req.gdprConsent.consentString);
      expect(payload.regs.ext).to.have.property('gdpr', 1);
    });
  });

  describe('interpretResponse', function () {
    it('has bids', function () {
      let request = spec.buildRequests(REQUEST.bidRequest, REQUEST)[0];
      let bids = spec.interpretResponse(RESPONSE, request);
      expect(bids).to.be.an('array').that.is.not.empty;
      validateBidOnIndex(0);

      function validateBidOnIndex(index) {
        expect(bids[index]).to.have.property('currency', 'USD');
        expect(bids[index]).to.have.property('requestId', RESPONSE.body.seatbid[0].bid[index].id);
        expect(bids[index]).to.have.property('cpm', RESPONSE.body.seatbid[0].bid[index].price);
        expect(bids[index]).to.have.property('width', RESPONSE.body.seatbid[0].bid[index].w);
        expect(bids[index]).to.have.property('height', RESPONSE.body.seatbid[0].bid[index].h);
        expect(bids[index]).to.have.property('ad', RESPONSE.body.seatbid[0].bid[index].adm);
        expect(bids[index]).to.have.property('creativeId', RESPONSE.body.seatbid[0].bid[index].crid);
        expect(bids[index]).to.have.property('ttl', 30);
        expect(bids[index]).to.have.property('netRevenue', true);
      }
    });

    it('handles empty response', function () {
      let request = spec.buildRequests(REQUEST.bidRequest, REQUEST)[0];
      const EMPTY_RESP = Object.assign({}, RESPONSE, {'body': {}});
      const bids = spec.interpretResponse(EMPTY_RESP, request);
      expect(bids).to.be.empty;
    });
  });
});
