import { expect } from 'chai';
import { spec } from 'modules/viBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const ENDPOINT = `//pb.vi-serve.com/prebid/bid`;

describe('viBidAdapter', function() {
  newBidder(spec);

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'vi',
      'params': {
        'pubId': 'sb_test',
        'lang': 'en-US',
        'cat': 'IAB1',
        'bidFloor': 0.05
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [320, 480]
      ],
      'bidId': '29b891ad542377',
      'bidderRequestId': '1dc9a08206a57b',
      'requestId': '24176695-e3f0-44db-815b-ed97cf5ad49b',
      'placementCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': '474da635-9cf0-4188-a3d9-58961be8f905'
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when pubId not passed', function () {
      bid.params.pubId = undefined;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [{
      'bidder': 'vi',
      'params': {
        'pubId': 'sb_test',
        'lang': 'en-US',
        'cat': 'IAB1',
        'bidFloor': 0.05
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [320, 480]
      ],
      'bidId': '29b891ad542377',
      'bidderRequestId': '1dc9a08206a57b',
      'requestId': '24176695-e3f0-44db-815b-ed97cf5ad49b',
      'placementCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': '474da635-9cf0-4188-a3d9-58961be8f905'
    }];

    const request = spec.buildRequests(bidRequests);

    it('POST bid request to vi', function () {
      expect(request.method).to.equal('POST');
    });

    it('check endpoint URL', function () {
      expect(request.url).to.equal(ENDPOINT)
    });
  });

  describe('buildRequests can handle size in 1-dim array', function () {
    let bidRequests = [{
      'bidder': 'vi',
      'params': {
        'pubId': 'sb_test',
        'lang': 'en-US',
        'cat': 'IAB1',
        'bidFloor': 0.05
      },
      'adUnitCode': 'adunit-code',
      'sizes': [320, 480],
      'bidId': '29b891ad542377',
      'bidderRequestId': '1dc9a08206a57b',
      'requestId': '24176695-e3f0-44db-815b-ed97cf5ad49b',
      'placementCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': '474da635-9cf0-4188-a3d9-58961be8f905'
    }];

    const request = spec.buildRequests(bidRequests);

    it('POST bid request to vi', function () {
      expect(request.method).to.equal('POST');
    });

    it('check endpoint URL', function () {
      expect(request.url).to.equal(ENDPOINT)
    });
  });

  describe('interpretResponse', function () {
    let response = {
      body: [{
        'id': '29b891ad542377',
        'price': 0.1,
        'width': 320,
        'height': 480,
        'ad': '<!-- Real ad markup -->',
        'creativeId': 'dZsPGv'
      }]
    };

    it('should get the correct bid response', function () {
      let expectedResponse = [{
        'requestId': '29b891ad542377',
        'cpm': 0.1,
        'width': 320,
        'height': 480,
        'creativeId': 'dZsPGv',
        'dealId': null,
        'currency': 'USD',
        'netRevenue': true,
        'mediaType': 'banner',
        'ad': decodeURIComponent(`<!-- Creative -->`),
        'ttl': 60000
      }];

      let result = spec.interpretResponse(response);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });

    it('handles empty bid response', function () {
      let response = {
        body: []
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });
});
