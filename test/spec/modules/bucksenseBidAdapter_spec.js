import {expect} from 'chai';
import {spec} from 'modules/bucksenseBidAdapter';

describe('Bucksense Adapter', function() {
  const BIDDER_CODE = 'bucksense';
  const BID_ID = '12345';
  const PLACE_ID = '1000';

  function getValidBidObject() {
    return {
      bidder: BIDDER_CODE,
      params: {
        placementId: PLACE_ID,
      }
    }
  };

  describe('isBidRequestValid', function() {
    var bid;

    beforeEach(function() {
      bid = getValidBidObject();
    });

    it('returns true when valid bid request is sent', function() {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('returns true when valid test bid request is sent', function() {
      bid.params['test'] = 1;
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('returns false when bidder not set to "bucksense"', function() {
      bid.bidder = 'dummy';
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when params not set', function() {
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', function() {
    var bid, bidRequestObj;

    beforeEach(function() {
      bid = getValidBidObject();
      bidRequestObj = {
        'bidderCode': 'bucksense',
        'auctionId': '73540558-86cb-4eef-895f-bf99c5353bd7',
        'bidderRequestId': '1feebcb5938c7e',
        'bids': [
          {
            'bidder': 'bucksense',
            'params': {
              'placementId': 1000
            },
            'mediaTypes': {
              'banner': {
                'sizes': [ [ 300, 250 ], [ 300, 600 ] ]
              }
            },
            'adUnitCode': 'test-div',
            'transactionId': '52b3ed07-2a09-4f58-a426-75acc7602c96',
            'sizes': [ [ 300, 250 ], [ 300, 600 ] ],
            'bidId': '22aecdacdcd773',
            'bidderRequestId': '1feebcb5938c7e',
            'auctionId': '73540558-86cb-4eef-895f-bf99c5353bd7',
            'src': 'client',
            'bidRequestsCount': 1
          }
        ],
        'auctionStart': 1557176022728,
        'timeout': 1000,
        'refererInfo': {
          'referer': 'https://stefanod.hera.pe/prebid/?pbjs_debug=true',
          'reachedTop': true,
          'numIframes': 0,
          'stack': [
            'https://stefanod.hera.pe/prebid/?pbjs_debug=true'
          ]
        },
        'start': 1557176022731
      };
    });

    it('should build a very basic request', function() {
      var request = spec.buildRequests([bid], bidRequestObj);
      expect(request[0].method).to.equal('POST');
    });

    it('bidRequest data', function () {
      var request = spec.buildRequests([bid], bidRequestObj);
      expect(request[0].data).to.exist;
    });
  });

  describe('interpretResponse', function() {
    var serverResponse;
    var serverRequest;

    beforeEach(function() {
      serverRequest = {
        'method': 'POST',
        'url': 'https://prebid.bksn.se:445/prebidjs/',
        'data': {
          'pub_id': 'prebid.org',
          'pl_id': '1000',
          'secure': 0,
          'href': 'https://prebid.org/developers.html',
          'bid_id': '27aaf8e96d9fd5',
          'params': {
            'placementId': '1000'
          },
          'sizes': [ [ 300, 250 ], [ 300, 600 ] ]
        }
      };

      serverResponse = {
        body: {
          'requestId': '',
          'cpm': 0.3,
          'width': 300,
          'height': 250,
          'ttl': 360,
          'creativeId': 'creative002',
          'currency': 'USD',
          'netRevenue': false,
          'ad': '<div id=\"bks-banner\"><a href=\"https://www.bucksense.com\" target=\"_blank\"><img src=\"https://i.bksn.se/s/1334/c5acdc75ba096bk.jpg\" width=\"300\" height=\"250\"/></a></div>'
        }
      };
    });

    it('should return an array of bid responses', function() {
      var responses = spec.interpretResponse(serverResponse, serverRequest);
      expect(responses).to.be.an('array').with.length(1);
    });

    it('should return an array of bid responses', function() {
      serverResponse = {};
      var responses = spec.interpretResponse(serverResponse, serverRequest);
      expect(responses).to.be.an('array').with.length(0);
    });
  });
});
