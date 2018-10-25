import { expect } from 'chai';
import { spec } from 'modules/sovrnBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import { REPO_AND_VERSION } from 'src/constants';

const ENDPOINT = `//ap.lijit.com/rtb/bid?src=${REPO_AND_VERSION}`;

describe('sovrnBidAdapter', function() {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'sovrn',
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
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when tagid not passed correctly', function () {
      bid.params.tagid = 'ABCD';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when require params are not passed', function () {
      let bid = Object.assign({}, bid);
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [{
      'bidder': 'sovrn',
      'params': {
        'tagid': '403370'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    }];

    const request = spec.buildRequests(bidRequests);

    it('sends bid request to our endpoint via POST', function () {
      expect(request.method).to.equal('POST');
    });

    it('attaches source and version to endpoint URL as query params', function () {
      expect(request.url).to.equal(ENDPOINT)
    });

    it('sends \'iv\' as query param if present', function () {
      const ivBidRequests = [{
        'bidder': 'sovrn',
        'params': {
          'tagid': '403370',
          'iv': 'vet'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250]
        ],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475'
      }];
      const request = spec.buildRequests(ivBidRequests);

      expect(request.url).to.contain('iv=vet')
    });

    it('sends gdpr info if exists', function () {
      let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      let bidderRequest = {
        'bidderCode': 'sovrn',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          consentString: consentString,
          gdprApplies: true
        }
      };
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.regs.ext.gdpr).to.exist.and.to.be.a('number');
      expect(payload.regs.ext.gdpr).to.equal(1);
      expect(payload.user.ext.consent).to.exist.and.to.be.a('string');
      expect(payload.user.ext.consent).to.equal(consentString);
    });

    it('converts tagid to string', function () {
      const ivBidRequests = [{
        'bidder': 'sovrn',
        'params': {
          'tagid': 403370,
          'iv': 'vet'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250]
        ],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475'
      }];
      const request = spec.buildRequests(ivBidRequests);

      expect(request.data).to.contain('"tagid":"403370"')
    })
  });

  describe('interpretResponse', function () {
    let response;
    beforeEach(function () {
      response = {
        body: {
          'id': '37386aade21a71',
          'seatbid': [{
            'bid': [{
              'id': 'a_403370_332fdb9b064040ddbec05891bd13ab28',
              'crid': 'creativelycreatedcreativecreative',
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
    });

    it('should get the correct bid response', function () {
      let expectedResponse = [{
        'requestId': '263c448586f5a1',
        'cpm': 0.45882675,
        'width': 728,
        'height': 90,
        'creativeId': 'creativelycreatedcreativecreative',
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

    it('crid should default to the bid id if not on the response', function () {
      delete response.body.seatbid[0].bid[0].crid;
      let expectedResponse = [{
        'requestId': '263c448586f5a1',
        'cpm': 0.45882675,
        'width': 728,
        'height': 90,
        'creativeId': response.body.seatbid[0].bid[0].id,
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

    it('should get correct bid response when dealId is passed', function () {
      response.body.dealid = 'baking';

      let expectedResponse = [{
        'requestId': '263c448586f5a1',
        'cpm': 0.45882675,
        'width': 728,
        'height': 90,
        'creativeId': 'creativelycreatedcreativecreative',
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

    it('handles empty bid response', function () {
      let response = {
        body: {
          'id': '37386aade21a71',
          'seatbid': []
        }
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs ', () => {
    let syncOptions = {iframeEnabled: true, pixelEnabled: true};
    let iframeDisabledSyncOptions = {iframeEnabled: false, pixelEnabled: true};
    let serverResponse = [
      {
        'body': {
          'id': '546956d68c757f',
          'seatbid': [
            {
              'bid': [
                {
                  'id': 'a_448326_16c2ada014224bee815a90d2248322f5',
                  'impid': '2a3826aae345f4',
                  'price': 1.0099999904632568,
                  'nurl': 'http://localhost/rtb/impression?bannerid=220958&campaignid=3890&rtb_tid=15588614-75d2-40ab-b27e-13d2127b3c2e&rpid=1295&seatid=seat1&zoneid=448326&cb=26900712&tid=a_448326_16c2ada014224bee815a90d2248322f5',
                  'adm': 'yo a creative',
                  'crid': 'cridprebidrtb',
                  'w': 160,
                  'h': 600
                },
                {
                  'id': 'a_430392_beac4c1515da4576acf6cb9c5340b40c',
                  'impid': '3cf96fd26ed4c5',
                  'price': 1.0099999904632568,
                  'nurl': 'http://localhost/rtb/impression?bannerid=220957&campaignid=3890&rtb_tid=5bc0e68b-3492-448d-a6f9-26fa3fd0b646&rpid=1295&seatid=seat1&zoneid=430392&cb=62735099&tid=a_430392_beac4c1515da4576acf6cb9c5340b40c',
                  'adm': 'yo a creative',
                  'crid': 'cridprebidrtb',
                  'w': 300,
                  'h': 250
                },
              ]
            }
          ],
          'ext': {
            'iid': 13487408
          }
        },
        'headers': {}
      }
    ];
    it('should return if iid present on server response & iframe syncs enabled', () => {
      let expectedReturnStatement = [
        {
          'type': 'iframe',
          'url': '//ap.lijit.com/beacon?informer=13487408&gdpr_consent=',
        }
      ];
      let returnStatement = spec.getUserSyncs(syncOptions, serverResponse);
      expect(returnStatement[0]).to.deep.equal(expectedReturnStatement[0]);
    });

    it('should not return if iid missing on server response', () => {
      let returnStatement = spec.getUserSyncs(syncOptions, []);
      expect(returnStatement).to.be.empty;
    });

    it('should not return if iframe syncs disabled', () => {
      let returnStatement = spec.getUserSyncs(iframeDisabledSyncOptions, serverResponse);
      expect(returnStatement).to.be.empty;
    });
  });
});
