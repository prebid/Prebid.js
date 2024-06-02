import { expect } from 'chai';
import { spec } from 'modules/bedigitechBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import {BANNER} from 'src/mediaTypes.js';

describe('BedigitechAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      bidder: 'bedigitech',
      adUnitCode: 'adunit-code',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      },
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
      params: {
        placementId: 309,
      },
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      const bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'masterId': 0
      };

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [{
      bidder: 'bedigitech',
      adUnitCode: 'adunit-code',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      },
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
      params: {
        placementId: 309,
      },
    }];

    it('sends bid request to url via GET', function () {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.method).to.equal('GET');
      expect(request.url).to.equal('https://bid.bedigitech.com/bid/pub_bid.php');
    });

    it('should attach pid to url', function () {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.data.pid).to.equal(309);
    });
  });

  describe('interpretResponse', function () {
    const response = {
      'body': [
        {
          'ad': '%3C!--%20Creative%20--%3E',
          'cpm': '5.0',
          'crid': '0af345b42983cc4bc0',
          'currency': 'USD',
          'height': 250,
          'id': 'bedigitechMyidfdfdf',
          'netRevenue':	true,
          'requestTime':	1686306237,
          'timeToRespond':	300,
          'ttl': 300,
          'width': 300
        }
      ],
      'headers': {
        'get': function() {}
      }
    };

    it('should get correct bid responseiiiiii', function () {
      const expectedResponse = [
        {
          'ad': '%3C!--%20Creative%20--%3E',
          'cpm': '5.0',
          'creativeId': '0af345b42983cc4bc0',
          'currency': 'USD',
          'height': 250,
          'id': 'bedigitechMyidfdfdf',
          'meta': {
            'mediaType': BANNER,
          },
          'netRevenue':	true,
          'requestId': 'bedigitechMyidfdfdf',
          'requestTimestamp':	1686306237,
          'timeToRespond':	300,
          'ttl': 300,
          'width': 300,
          'bidderCode': 'bedigitech',
        }
      ];
      const result = spec.interpretResponse(response);
      expect(result).to.have.lengthOf(1);
      let resultKeys = Object.keys(result[0]);
      expect(resultKeys.sort()).to.deep.equal(Object.keys(expectedResponse[0]).sort());
      resultKeys.forEach(function(k) {
        if (k === 'ad') {
          expect(result[0][k]).to.match(/<!-- Creative -->$/);
        } else if (k === 'meta') {
          expect(result[0][k]).to.deep.equal(expectedResponse[0][k]);
        } else {
          expect(result[0][k]).to.equal(expectedResponse[0][k]);
        }
      });
    });
  });
});
