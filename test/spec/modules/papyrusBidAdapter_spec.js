import { expect } from 'chai';
import { spec } from 'modules/papyrusBidAdapter';

const ENDPOINT = 'https://prebid.papyrus.global';
const BIDDER_CODE = 'papyrus';

describe('papyrus Adapter', function () {
  describe('isBidRequestValid', function () {
    let validBidReq = {
      bidder: BIDDER_CODE,
      params: {
        address: '0xd7e2a771c5dcd5df7f789477356aecdaeee6c985',
        placementId: 'b57e55fd18614b0591893e9fff41fbea'
      }
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(validBidReq)).to.equal(true);
    });

    let invalidBidReq = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': ''
      }
    };

    it('should not validate incorrect bid request', function () {
      expect(spec.isBidRequestValid(invalidBidReq)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        bidder: BIDDER_CODE,
        params: {
          address: '0xd7e2a771c5dcd5df7f789477356aecdaeee6c985',
          placementId: 'b57e55fd18614b0591893e9fff41fbea'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('sends valid bids count', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.data.length).to.equal(1);
    });

    it('sends all bid parameters', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.data[0]).to.have.all.keys(['address', 'placementId', 'sizes', 'bidId', 'transactionId']);
    });

    it('sedns valid sizes parameter', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.data[0].sizes[0]).to.equal('300x250');
    });
  });

  describe('interpretResponse', function () {
    let bidRequests = [
      {
        bidder: BIDDER_CODE,
        params: {
          address: '0xd7e2a771c5dcd5df7f789477356aecdaeee6c985',
          placementId: 'b57e55fd18614b0591893e9fff41fbea'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    let bidResponse = {
      bids: [
        {
          id: '1036e9746c-d186-49ae-90cb-2796d0f9b223',
          adm: 'test adm',
          cpm: 100,
          height: 250,
          width: 300
        }
      ]
    };

    it('should build bid array', function () {
      const request = spec.buildRequests(bidRequests);
      const result = spec.interpretResponse({body: bidResponse}, request[0]);
      expect(result.length).to.equal(1);
    });

    it('should have all relevant fields', function () {
      const request = spec.buildRequests(bidRequests);
      const result = spec.interpretResponse({body: bidResponse}, request[0]);
      const bid = result[0];

      expect(bid.cpm).to.equal(bidResponse.bids[0].cpm);
      expect(bid.width).to.equal(bidResponse.bids[0].width);
      expect(bid.height).to.equal(bidResponse.bids[0].height);
    });
  });
});
