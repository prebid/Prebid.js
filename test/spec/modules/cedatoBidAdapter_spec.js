import {expect} from 'chai';
import {spec} from 'modules/cedatoBidAdapter.js';

describe('the cedato adapter', function () {
  function getValidBidObject() {
    return {
      bidId: '2f4a613a702b6c',
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      params: {
        player_id: 1450133326,
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
      bidRequestObj = {
        refererInfo: {referer: 'prebid.js'},
        gdprConsent: {
          consentString: 'test-string',
          gdprApplies: true
        },
        uspConsent: '1NYN'
      };
    });

    it('should build a very basic request', function() {
      var [request] = spec.buildRequests([bid], bidRequestObj);
      expect(request.method).to.equal('POST');
    });

    it('should pass gdpr and usp strings to server', function() {
      var [request] = spec.buildRequests([bid], bidRequestObj);
      var payload = JSON.parse(request.data);
      expect(payload.gdpr_consent).to.not.be.undefined;
      expect(payload.gdpr_consent.consent_string).to.equal(bidRequestObj.gdprConsent.consentString);
      expect(payload.gdpr_consent.consent_required).to.equal(bidRequestObj.gdprConsent.gdprApplies);
      expect(payload.us_privacy).to.equal(bidRequestObj.uspConsent);
    });
  });

  describe('interpretResponse', function() {
    var bid, serverResponse, bidderRequest;

    beforeEach(function() {
      bid = getValidBidObject();
      serverResponse = {
        body: {
          bidid: '0.36157306192821',
          seatbid: [
            {
              seat: '0',
              bid: [{
                gp: {
                  'negative': 0.496954,
                  'positive': 0.503046,
                  'class': '0'
                },
                id: '0.75549202124378',
                adomain: 'cedato.com',
                uuid: bid.bidId,
                crid: '1450133326',
                adm: "<div id=\"cedato-unit\"></div>\n<script src=\"https://p.cedatoplayer.com/zplayer.js?p=952030718&cb=874433&d=localhost\" type=\"text/javascript\"></script>\n<img src='https://h.cedatoplayer.com/hbwon?cb=874433&p=0.1&pi=952030718&w=300&h=250&s=952030718&d=localhost&u=a4657bf1-c373-4676-b79a-0d9de0129e38&ab=2' width=\"1\" height=\"1\"/>\n",
                h: 250,
                w: 300,
                price: '0.1'
              }]
            }
          ],
          cur: 'USD'
        }
      };
      bidderRequest = {
        bids: [bid]
      };
    });

    it('should return an array of bid responses', function() {
      var responses = spec.interpretResponse(serverResponse, {bidderRequest});
      expect(responses).to.be.an('array').with.length(1);
    });
  });

  describe('getUserSyncs', function() {
    var bid;

    beforeEach(function() {
      bid = getValidBidObject();
    });

    it('should sync with iframe', function() {
      var syncs = spec.getUserSyncs({ iframeEnabled: true }, null, {
        consentString: '',
        gdprApplies: true
      });

      expect(syncs).to.be.an('array').with.length(1);
      expect(syncs[0].type).to.equal('iframe');
    });

    it('should sync with image', function() {
      var syncs = spec.getUserSyncs({ pixelEnabled: true });

      expect(syncs).to.be.an('array').with.length(1);
      expect(syncs[0].type).to.equal('image');
    });
  });
});
