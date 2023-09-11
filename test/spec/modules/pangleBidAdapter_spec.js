import { expect } from 'chai';
import { spec } from 'modules/pangleBidAdapter.js';

const REQUEST = [{
  adUnitCode: 'adUnitCode1',
  bidId: 'bidId1',
  auctionId: 'auctionId-56a2-4f71-9098-720a68f2f708',
  ortb2Imp: {
    ext: {
      tid: 'cccc1234',
    }
  },
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250]
      ]
    }
  },
  bidder: 'pangle',
  params: {
    placementid: 999,
    appid: 111,
  },
},
{
  adUnitCode: 'adUnitCode2',
  bidId: 'bidId2',
  auctionId: 'auctionId-56a2-4f71-9098-720a68f2f708',
  ortb2Imp: {
    ext: {
      tid: 'cccc1234',
    }
  },
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250]
      ]
    }
  },
  bidder: 'pangle',
  params: {
    placementid: 999,
    appid: 111,
  },
}];
const DEFAULT_OPTIONS = {
  userId: {
    britepoolid: 'pangle-britepool',
    criteoId: 'pangle-criteo',
    digitrustid: { data: { id: 'pangle-digitrust' } },
    id5id: { uid: 'pangle-id5' },
    idl_env: 'pangle-idl-env',
    lipb: { lipbid: 'pangle-liveintent' },
    netId: 'pangle-netid',
    parrableId: { eid: 'pangle-parrable' },
    pubcid: 'pangle-pubcid',
    tdid: 'pangle-ttd',
  }
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
                'pangle': {
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

describe('pangle bid adapter', function () {
  describe('isBidRequestValid', function () {
    it('should accept request if placementid and appid is passed', function () {
      let bid = {
        bidder: 'pangle',
        params: {
          token: 'xxx',
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('reject requests without params', function () {
      let bid = {
        bidder: 'pangle',
        params: {}
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('creates request data', function () {
      let request = spec.buildRequests(REQUEST, DEFAULT_OPTIONS)[0];
      expect(request).to.exist.and.to.be.a('object');
      const payload = request.data;
      expect(payload.imp[0]).to.have.property('id', REQUEST[0].bidId);
      expect(payload.imp[1]).to.have.property('id', REQUEST[1].bidId);
    });
  });

  describe('interpretResponse', function () {
    it('has bids', function () {
      let request = spec.buildRequests(REQUEST, DEFAULT_OPTIONS)[0];
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
      let request = spec.buildRequests(REQUEST, DEFAULT_OPTIONS)[0];
      const EMPTY_RESP = Object.assign({}, RESPONSE, { 'body': {} });
      const bids = spec.interpretResponse(EMPTY_RESP, request);
      expect(bids).to.be.empty;
    });
  });

  describe('parseUserAgent', function () {
    let desktop, mobile, tablet;
    beforeEach(function () {
      desktop = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36';
      mobile = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
      tablet = 'Apple iPad: Mozilla/5.0 (iPad; CPU OS 13_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/605.1.15';
    });

    it('should return correct device type: tablet', function () {
      let deviceType = spec.getDeviceType(tablet);
      expect(deviceType).to.equal(5);
    });

    it('should return correct device type: mobile', function () {
      let deviceType = spec.getDeviceType(mobile);
      expect(deviceType).to.equal(4);
    });

    it('should return correct device type: desktop', function () {
      let deviceType = spec.getDeviceType(desktop);
      expect(deviceType).to.equal(2);
    });
  });
});
