import { expect } from 'chai';
import { polymorphAdapterSpec } from 'modules/polymorphBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'polymorph';
const ENDPOINT_URL = '//api.adsnative.com/v1/ad-template.json';
const PLACEMENT_ID = 'ping';

const spec = newBidder(polymorphAdapterSpec).getSpec();

const bidRequests = [{
  'bidder': BIDDER_CODE,
  'params': {
    'placementId': PLACEMENT_ID
  },
  'adUnitCode': 'adunit-code',
  'sizes': [[300, 250], [300, 600]],
  'bidId': '30b31c1838de1e',
  'bidderRequestId': '22edbae2733bf6',
  'auctionId': '1d1a030790a475',
},
{
  'bidder': BIDDER_CODE,
  'params': {
    'placementId': PLACEMENT_ID,
    'defaultWidth': 300,
    'defaultHeight': 600,
  },
  'adUnitCode': 'adunit-code',
  'sizes': [[700, 250], [300, 600]],
  'bidId': '30b31c1838de1d',
  'bidderRequestId': '22edbae2733bf7',
  'auctionId': '1d1a030790a476',
}];

describe('Polymorph adapter test', () => {
  describe('.code', () => {
    it('should return a bidder code of polymorph', () => {
      expect(spec.code).to.eql(BIDDER_CODE);
    });
  });

  describe('isBidRequestValid', () => {
    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bidRequests[0])).to.equal(true);
    });

    it('should return false if req has no placementId', () => {
      const invalidBidRequest = {
        bidder: BIDDER_CODE,
        params: {
          someKey: 'abc123'
        }
      };
      expect(spec.isBidRequestValid(invalidBidRequest)).to.eql(false);
    });

    it('should return false if req has wrong bidder code', () => {
      const invalidBidRequest = {
        bidder: 'something',
        params: {
          someKey: 'abc123'
        }
      };
      expect(spec.isBidRequestValid(invalidBidRequest)).to.eql(false);
    });
  });

  describe('buildRequests', () => {
    it('payload test', () => {
      const requests = spec.buildRequests(bidRequests);
      var payload1 = {};
      requests[0].data.replace(/([^=&]+)=([^&]*)/g, function(m, key, value) {
        payload1[decodeURIComponent(key)] = decodeURIComponent(value);
      });
      expect(payload1.ref).to.not.be.undefined;
      expect(payload1.url).to.not.be.undefined;
      expect(payload1.hb).to.equal('1');
      expect(payload1.hb_source).to.equal('prebid');
      expect(payload1.zid).to.equal(PLACEMENT_ID);
      expect(payload1.sizes).to.equal('300,250,300,600');

      var payload2 = {};
      requests[1].data.replace(/([^=&]+)=([^&]*)/g, function(m, key, value) {
        payload2[decodeURIComponent(key)] = decodeURIComponent(value);
      });
      expect(payload2.ref).to.not.be.undefined;
      expect(payload2.url).to.not.be.undefined;
      expect(payload2.hb).to.equal('1');
      expect(payload2.hb_source).to.equal('prebid');
      expect(payload2.zid).to.equal(PLACEMENT_ID);
      expect(payload2.sizes).to.equal('700,250,300,600');
    });

    it('sends bid request to ENDPOINT via GET', () => {
      const requests = spec.buildRequests(bidRequests);
      expect(requests[0].url).to.equal(ENDPOINT_URL);
      expect(requests[0].method).to.equal('GET');
    });
  });

  describe('interpretResponse', () => {
    const response = {
      body: {
        'status': 'OK',
        'crid': '5ISP4995',
        'ecpm': 10,
        'ad': {
          'html': '<div></div>',
          'height': 250,
          'width': 300
        }
      }
    };

    const response2 = {
      body: {
        'status': 'OK',
        'ecpm': 10,
        'html': '<label></label>',
        'ads': [{
          'crid': '5ISP4995',
          'ad': {
            'html': '<div></div>'
          }
        },
        {
          'crid': '5ISP4996',
          'ad': {
            'html': '<div></div>'
          }
        }]
      }
    };

    it('should get correct bid response', () => {
      const body = response.body;
      const expectedResponse = [{
        requestId: bidRequests[0].bidId,
        cpm: body.ecpm,
        width: body.ad.width,
        height: body.ad.height,
        ad: body.ad.html,
        ttl: 3600,
        creativeId: body.crid,
        netRevenue: false,
        currency: 'USD',
        mediaType: 'banner'
      }];

      let result = spec.interpretResponse(response, { 'bidderRequest': bidRequests[0] });
      expect(result).to.deep.equal(expectedResponse);
    });

    it('widget use case', () => {
      const body = response2.body;
      const expectedResponse = [
        {
          requestId: bidRequests[1].bidId,
          cpm: body.ecpm,
          width: 300,
          height: 600,
          ad: body.html,
          ttl: 3600,
          creativeId: body.ads[0].crid,
          netRevenue: false,
          currency: 'USD',
          mediaType: 'banner'
        }
      ];

      let result = spec.interpretResponse(response2, { 'bidderRequest': bidRequests[1] });
      expect(result).to.deep.equal(expectedResponse);
    });

    it('handles nobid responses', () => {
      let response = [];

      let result = spec.interpretResponse(response, { 'bidderRequest': bidRequests[0] });
      expect(result.length).to.equal(0);
    });
  });
});
