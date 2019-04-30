import {expect} from 'chai';
import {spec} from 'modules/bucksenseBidAdapter';

describe('the bucksense adapter', function() {
  function getValidBidObject() {
    return {
      bidId: 12345,
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      params: {
        placementId: 1000,
      }
    };
  };

  describe('isBidRequestValid', function() {
    var bid;

    beforeEach(function() {
      bid = getValidBidObject();
    });

    it('should success validation', function() {
      var result = spec.isBidRequestValid(bid);
      expect(result).to.equal(true);
    });
  });

  describe('buildRequests', function() {
    var bid, bidRequestObj;

    beforeEach(function() {
      bid = getValidBidObject();
      bidRequestObj = {};
    });

    it('should build a very basic request', function() {
      var request = spec.buildRequests([bid], bidRequestObj);
      expect(request[0].method).to.equal('POST');
    });
  });

  describe('interpretResponse', function() {
    var serverResponse;

    beforeEach(function() {
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
      var responses = spec.interpretResponse(serverResponse);
      expect(responses).to.be.an('array').with.length(1);
    });
  });
});
