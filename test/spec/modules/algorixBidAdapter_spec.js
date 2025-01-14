import { spec } from 'modules/algorixBidAdapter.js';
const ENDPOINT = 'https://apac.xyz.svr-algorix.com/rtb/sa?sid=260785&token=89b6d58567e3913e507f2be61fe8823e';

const REQUEST = [
  {
    adUnitCode: 'adUnitCode1',
    bidId: 'bidId1',
    auctionId: 'auctionId-56a2-4f71-9098-720a68f2f708',
    mediaTypes: {
      banner: {},
    },
    bidder: 'algorix',
    params: {
      region: 'APAC',
      token: '89b6d58567e3913e507f2be61fe8823e',
      sid: '260785',
    },
  },
];

const RESPONSE = {
  headers: null,
  body: {
    id: 'requestId',
    bidid: 'bidId1',
    cur: 'USD',
    seatbid: [
      {
        bid: [
          {
            id: 'bidId1',
            impid: 'bidId1',
            adm: '<script>algorix adm</script>',
            cid: '24:17:18',
            crid: '40_37_66:30_32_132:31_27_70',
            adomain: ['www.algorix.co'],
            price: 10.00,
            bundle:
              'com.xinggame.cast.video.screenmirroring.casttotv:https://www.greysa.com.tw/Product/detail/pid/119/?utm_source=popIn&utm_medium=cpc&utm_campaign=neck_202307_300*250:https://www.avaige.top/',
            iurl: 'https://crs.rixbeedesk.com/test/kkd2ms/04c6d62912cff9037106fb50ed21b558.png:https://crs.rixbeedesk.com/test/kkd2ms/69a72b23c6c52e703c0c8e3f634e44eb.png:https://crs.rixbeedesk.com/test/kkd2ms/d229c5cd66bcc5856cb26bb2817718c9.png',
            w: 300,
            h: 250,
            exp: 30,
          },
        ],
        seat: 'Zh2Kiyk=',
      },
    ],
  },
};

describe('algorix bid adapter', function () {
  describe('isBidRequestValid', function () {
    let bid = {
      bidder: 'algorix',
      params: {
        region: 'APAC',
        token: '89b6d58567e3913e507f2be61fe8823e',
        sid: '260785',
      },
    };
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should return false when missing sid', function () {
      delete bid.params.sid;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return false when missing token', function () {
      delete bid.params.token;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });
  describe('buildRequests', function () {
    it('creates request data', function () {
      const request = spec.buildRequests(REQUEST, {
        refererInfo: {
          page: 'page',
        },
      })[0];
      expect(request).to.exist.and.to.be.a('object');
    });
    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(REQUEST, {})[0];
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });
  });

  describe('interpretResponse', function () {
    it('has bids', function () {
      let request = spec.buildRequests(REQUEST, {})[0];
      let bids = spec.interpretResponse(RESPONSE, request);
      expect(bids).to.be.an('array').that.is.not.empty;
      validateBidOnIndex(0);

      function validateBidOnIndex(index) {
        expect(bids[index]).to.have.property('currency', 'USD');
        expect(bids[index]).to.have.property(
          'requestId',
          RESPONSE.body.seatbid[0].bid[index].id
        );
        expect(bids[index]).to.have.property(
          'cpm',
          RESPONSE.body.seatbid[0].bid[index].price
        );
        expect(bids[index]).to.have.property(
          'width',
          RESPONSE.body.seatbid[0].bid[index].w
        );
        expect(bids[index]).to.have.property(
          'height',
          RESPONSE.body.seatbid[0].bid[index].h
        );
        expect(bids[index]).to.have.property(
          'ad',
          RESPONSE.body.seatbid[0].bid[index].adm
        );
        expect(bids[index]).to.have.property(
          'creativeId',
          RESPONSE.body.seatbid[0].bid[index].crid
        );
        expect(bids[index]).to.have.property('ttl', 30);
        expect(bids[index]).to.have.property('netRevenue', true);
      }
    });

    it('handles empty response', function () {
      it('No bid response', function() {
        var noBidResponse = spec.interpretResponse({
          body: '',
        });
        expect(noBidResponse.length).to.equal(0);
      });
    });
  });
});
