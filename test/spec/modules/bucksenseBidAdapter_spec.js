import {expect} from 'chai';
import {spec} from 'modules/bucksenseBidAdapter';

describe('the bucksense adapter', function () {

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

    it('should fail validation if the bid isn\'t defined or not an object', function() {
      var result = spec.isBidRequestValid();

      expect(result).to.equal(false);

      result = spec.isBidRequestValid('not an object');

      expect(result).to.equal(false);
    });
  });


  describe('buildRequests', function() {
    var bid, bidRequestObj;

    beforeEach(function() {
      bid = getValidBidObject();
      bidRequestObj = {refererInfo: {referer: 'prebid.js'}};
    });

    it('should build a very basic request', function() {
      var request = spec.buildRequests([bid], bidRequestObj);
      expect(request.method).to.equal('POST');
    });
  });


  describe('interpretResponse', function() {
    var serverResponse;

    beforeEach(function() {
      serverResponse = {
        body: {
            "requestId": "",
            "cpm": 0.3,
            "width": 300,
            "height": 250,
            "ttl": 360,
            "creativeId": "creative002",
            "currency": "USD",
            "netRevenue": false,
            "ad": "<div id=\"bks-banner\"><a href=\"https://www.bucksense.com\" target=\"_blank\"><img src=\"https://i.bksn.se/s/1334/c5acdc75ba096bk.jpg\" width=\"300\" height=\"250\"/></a></div>"
        }
      };
    });

    it('should return an array of bid responses', function() {
      var responses = spec.interpretResponse(serverResponse);
      expect(responses).to.be.an('array').with.length(1);
    });
  });
});
