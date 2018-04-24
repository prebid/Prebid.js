import { expect } from 'chai';
import { spec } from 'modules/featureforwardBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import { REPO_AND_VERSION } from 'src/constants';

const ENDPOINT = `//prmbdr.featureforward.com/newbidder/bidder1_pb1.php?`;

describe('featureforwardBidAdapter', function() {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'featureforward',
      'params': {
        'tagid': '403370'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'pubId': '001',
      'siteId': 'siteId',
      'placementId': '1',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when pubId not passed correctly', () => {
      bid.pubId = '000';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    let bidRequests = [{
      'bidder': 'featureforward',
      'params': {
        'tagid': '403370'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'pubId': '001',
      'siteId': 'siteId',
      'placementId': '1',
    }];

    const request = spec.buildRequests(bidRequests);

    it('sends bid request to our endpoint via POST', () => {
      expect(request.method).to.equal('POST');
    });

    it('attaches source and version to endpoint URL as query params', () => {
      expect(request.url).to.equal(ENDPOINT)
    });
  });

  describe('interpretResponse', () => {
    let response = {
      body: {
        'id': '37386aade21a71',
        'seatbid': [{
          'bid': [{
            'id': 'a_403370_332fdb9b064040ddbec05891bd13ab28',
            'impid': '263c448586f5a1',
            'price': 0.45882675,
            'nurl': '<!-- NURL -->',
            'adm': '<!-- Creative -->',
            'h': 90,
            'w': 728
          }]
        }]
      }
    };

    it('should get the correct bid response', () => {
      let expectedResponse = [{
        'requestId': '263c448586f5a1',
        'cpm': 0.45882675,
        'width': 728,
        'height': 90,
        'creativeId': 'a_403370_332fdb9b064040ddbec05891bd13ab28',
        'dealId': null,
        'currency': 'USD',
        'netRevenue': true,
        'mediaType': 'banner',
        'ad': decodeURIComponent(`<!-- Creative --><img src=<!-- NURL -->>`),
        'ttl': 60000
      }];

      let result = spec.interpretResponse(response);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });

    it('should get correct bid response when dealId is passed', () => {
      response.body.dealId = 'baking';

      let expectedResponse = [{
        'requestId': '263c448586f5a1',
        'cpm': 0.45882675,
        'width': 728,
        'height': 90,
        'creativeId': 'a_403370_332fdb9b064040ddbec05891bd13ab28',
        'dealId': 'baking',
        'currency': 'USD',
        'netRevenue': true,
        'mediaType': 'banner',
        'ad': decodeURIComponent(`<!-- Creative --><img src=<!-- NURL -->>`),
        'ttl': 60000
      }];

      let result = spec.interpretResponse(response);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });
  });
});
