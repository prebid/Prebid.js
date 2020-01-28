import {expect} from 'chai';
import {spec} from 'modules/videoreachBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';

const ENDPOINT_URL = 'https://a.videoreach.com/hb/';

describe('videoreachBidAdapter', function () {
  describe('isBidRequestValid', function () {
    let bid = {
      'params': {
        'TagId': 'ABCDE'
      },
      'bidId': '242d506d4e4f15',
      'bidderRequestId': '1893a2136a84a2',
      'auctionId': '8fb7b1c7-317b-4edf-83f0-c4669a318522',
      'transactionId': '85a2e190-0684-4f95-ad32-6c90757ed622'
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'TagId': ''
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'videoreach',
        'params': {
          'TagId': 'ABCDE'
        },
        'adUnitCode': 'adzone',
        'auctionId': '8fb7b1c7-317b-4edf-83f0-c4669a318522',
        'sizes': [[1, 1]],
        'bidId': '242d506d4e4f15',
        'bidderRequestId': '1893a2136a84a2',
        'transactionId': '85a2e190-0684-4f95-ad32-6c90757ed622',
        'mediaTypes': {
          'banner': {
            'sizes': [1, 1]
          },
        }
      }
    ];

    it('send bid request to endpoint', function () {
      const request = spec.buildRequests(bidRequests);

      expect(request.url).to.equal(ENDPOINT_URL);
      expect(request.method).to.equal('POST');
    });

    it('send bid request with GDPR to endpoint', function () {
      let consentString = 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA';

      let bidderRequest = {
        'gdprConsent': {
          'consentString': consentString,
          'gdprApplies': true
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr.consent_required).to.exist;
      expect(payload.gdpr.consent_string).to.equal(consentString);
    });
  });

  describe('interpretResponse', function () {
    let serverResponse =
      {
        'body': {
          'responses': [{
            'bidId': '242d506d4e4f15',
            'transactionId': '85a2e190-0684-4f95-ad32-6c90757ed622',
            'cpm': 10.0,
            'width': '1',
            'height': '1',
            'ad': '<script type="text/javascript" async="true" src="https://a.videoreach.com/hb/js/?t=f86fb856-15d0-4591-84eb-0830b38e9cf2"></script>',
            'ttl': 360,
            'creativeId': '5cb5dc9375c0e',
            'netRevenue': true,
            'currency': 'EUR',
            'sync': ['https:\/\/SYNC_URL']
          }]
        }
      };

    it('should handle response', function() {
      let expectedResponse = [
        {
          cpm: 10.0,
          width: '1',
          height: '1',
          currency: 'EUR',
          netRevenue: true,
          ttl: 360,
          ad: '<!-- AD -->',
          requestId: '242d506d4e4f15',
          creativeId: '5cb5dc9375c0e'
        }
      ];

      let result = spec.interpretResponse(serverResponse);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });

    it('should handles empty response', function() {
      let serverResponse = {
        'body': {
          'responses': []
        }
      };

      let result = spec.interpretResponse(serverResponse);
      expect(result.length).to.equal(0);
    });

    describe('getUserSyncs', () => {
      it('should push user sync images if enabled', () => {
        const syncOptions = { pixelEnabled: true };
        const syncs = spec.getUserSyncs(syncOptions, [serverResponse]);

        expect(syncs[0]).to.deep.equal({
          type: 'image',
          url: 'https://SYNC_URL'
        });
      })
    });
  });
});
