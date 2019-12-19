import {expect} from 'chai';
import {LogError, spec} from 'modules/sovrnBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';

const ENDPOINT = `https://ap.lijit.com/rtb/bid?src=$$REPO_AND_VERSION$$`;

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
        [300, 250],
        [300, 600]
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
        [300, 250],
        [300, 600]
      ],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    }];
    const bidderRequest = {
      refererInfo: {
        referer: 'http://example.com/page.html',
      }
    };
    const request = spec.buildRequests(bidRequests, bidderRequest);

    it('sends bid request to our endpoint via POST', function () {
      expect(request.method).to.equal('POST');
    });

    it('attaches source and version to endpoint URL as query params', function () {
      expect(request.url).to.equal(ENDPOINT)
    });

    it('sets the proper banner object', function() {
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}])
      expect(payload.imp[0].banner.w).to.equal(1)
      expect(payload.imp[0].banner.h).to.equal(1)
    })

    it('accepts a single array as a size', function() {
      const singleSize = [{
        'bidder': 'sovrn',
        'params': {
          'tagid': '403370',
          'iv': 'vet'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [300, 250],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475'
      }]
      const bidderRequest = {
        refererInfo: {
          referer: 'http://example.com/page.html',
        }
      }
      const request = spec.buildRequests(singleSize, bidderRequest)
      const payload = JSON.parse(request.data)
      expect(payload.imp[0].banner.format).to.deep.equal([{w: 300, h: 250}])
      expect(payload.imp[0].banner.w).to.equal(1)
      expect(payload.imp[0].banner.h).to.equal(1)
    })

    it('sends \'iv\' as query param if present', function () {
      const ivBidRequests = [{
        'bidder': 'sovrn',
        'params': {
          'tagid': '403370',
          'iv': 'vet'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475'
      }];
      const bidderRequest = {
        refererInfo: {
          referer: 'http://example.com/page.html',
        }
      };
      const request = spec.buildRequests(ivBidRequests, bidderRequest);

      expect(request.url).to.contain('iv=vet')
    });

    it('sends gdpr info if exists', function () {
      let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      let bidderRequest = {
        'bidderCode': 'sovrn',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        gdprConsent: {
          consentString: consentString,
          gdprApplies: true
        },
        refererInfo: {
          referer: 'http://example.com/page.html',
        }
      };
      bidderRequest.bids = bidRequests;

      const data = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);

      expect(data.regs.ext.gdpr).to.exist.and.to.be.a('number');
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.user.ext.consent).to.exist.and.to.be.a('string');
      expect(data.user.ext.consent).to.equal(consentString);
    });

    it('should send us_privacy if bidderRequest has a value for uspConsent', function () {
      let uspString = '1NYN';
      let bidderRequest = {
        'bidderCode': 'sovrn',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        uspConsent: uspString,
        refererInfo: {
          referer: 'http://example.com/page.html',
        }
      };
      bidderRequest.bids = bidRequests;

      const data = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);

      expect(data.regs.ext['us_privacy']).to.equal(uspString);
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
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475'
      }];
      const bidderRequest = {
        refererInfo: {
          referer: 'http://example.com/page.html',
        }
      };
      const request = spec.buildRequests(ivBidRequests, bidderRequest);

      expect(request.data).to.contain('"tagid":"403370"')
    });

    it('should add schain if present', function() {
      const schainRequests = [{
        'bidder': 'sovrn',
        'params': {
          'tagid': 403370
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'schain': {
          'ver': '1.0',
          'complete': 1,
          'nodes': [
            {
              'asi': 'directseller.com',
              'sid': '00001',
              'rid': 'BidRequest1',
              'hp': 1
            }
          ]
        }
      }].concat(bidRequests);
      const bidderRequest = {
        refererInfo: {
          referer: 'http://example.com/page.html',
        }
      };
      const data = JSON.parse(spec.buildRequests(schainRequests, bidderRequest).data);

      expect(data.source.ext.schain.nodes.length).to.equal(1)
    });

    it('should add digitrust data if present', function() {
      const digitrustRequests = [{
        'bidder': 'sovrn',
        'params': {
          'tagid': 403370
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250],
          [300, 600]
        ],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'userId': {
          'digitrustid': {
            'data': {
              'id': 'digitrust-id-123',
              'keyv': 4
            }
          }
        }
      }].concat(bidRequests);
      const bidderRequest = {
        refererInfo: {
          referer: 'http://example.com/page.html',
        }
      };
      const data = JSON.parse(spec.buildRequests(digitrustRequests, bidderRequest).data);

      expect(data.user.ext.digitrust.id).to.equal('digitrust-id-123');
      expect(data.user.ext.digitrust.keyv).to.equal(4);
    });
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

  describe('getUserSyncs ', function() {
    let syncOptions = { iframeEnabled: true, pixelEnabled: false };
    let iframeDisabledSyncOptions = { iframeEnabled: false, pixelEnabled: false };
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
            'iid': 13487408,
            sync: {
              pixels: [
                {
                  url: 'http://idprovider1.com'
                },
                {
                  url: 'http://idprovider2.com'
                }
              ]
            }
          }
        },
        'headers': {}
      }
    ];

    it('should return if iid present on server response & iframe syncs enabled', function() {
      const expectedReturnStatement = [
        {
          'type': 'iframe',
          'url': 'https://ap.lijit.com/beacon?informer=13487408',
        }
      ];
      const returnStatement = spec.getUserSyncs(syncOptions, serverResponse);
      expect(returnStatement[0]).to.deep.equal(expectedReturnStatement[0]);
    });

    it('should include gdpr consent string if present', function() {
      const gdprConsent = {
        gdprApplies: 1,
        consentString: 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A=='
      }
      const expectedReturnStatement = [
        {
          'type': 'iframe',
          'url': `https://ap.lijit.com/beacon?gdpr_consent=${gdprConsent.consentString}&informer=13487408`,
        }
      ];
      const returnStatement = spec.getUserSyncs(syncOptions, serverResponse, gdprConsent, '');
      expect(returnStatement[0]).to.deep.equal(expectedReturnStatement[0]);
    });

    it('should include us privacy string if present', function() {
      const uspString = '1NYN';
      const expectedReturnStatement = [
        {
          'type': 'iframe',
          'url': `https://ap.lijit.com/beacon?us_privacy=${uspString}&informer=13487408`,
        }
      ];
      const returnStatement = spec.getUserSyncs(syncOptions, serverResponse, null, uspString);
      expect(returnStatement[0]).to.deep.equal(expectedReturnStatement[0]);
    });

    it('should include all privacy strings if present', function() {
      const gdprConsent = {
        gdprApplies: 1,
        consentString: 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A=='
      }
      const uspString = '1NYN';
      const expectedReturnStatement = [
        {
          'type': 'iframe',
          'url': `https://ap.lijit.com/beacon?gdpr_consent=${gdprConsent.consentString}&us_privacy=${uspString}&informer=13487408`,
        }
      ];
      const returnStatement = spec.getUserSyncs(syncOptions, serverResponse, gdprConsent, uspString);
      expect(returnStatement[0]).to.deep.equal(expectedReturnStatement[0]);
    });

    it('should not return if iid missing on server response', function() {
      const returnStatement = spec.getUserSyncs(syncOptions, []);
      expect(returnStatement).to.be.empty;
    });

    it('should not return if iframe syncs disabled', function() {
      const returnStatement = spec.getUserSyncs(iframeDisabledSyncOptions, serverResponse);
      expect(returnStatement).to.be.empty;
    });

    it('should include pixel syncs', function() {
      let pixelEnabledOptions = { iframeEnabled: false, pixelEnabled: true };
      const resp2 = {
        'body': {
          'id': '546956d68c757f-2',
          'seatbid': [
            {
              'bid': [
                {
                  'id': 'a_448326_16c2ada014224bee815a90d2248322f5-2',
                  'impid': '2a3826aae345f4',
                  'price': 1.0099999904632568,
                  'nurl': 'http://localhost/rtb/impression?bannerid=220958&campaignid=3890&rtb_tid=15588614-75d2-40ab-b27e-13d2127b3c2e&rpid=1295&seatid=seat1&zoneid=448326&cb=26900712&tid=a_448326_16c2ada014224bee815a90d2248322f5',
                  'adm': 'yo a creative',
                  'crid': 'cridprebidrtb',
                  'w': 160,
                  'h': 600
                },
                {
                  'id': 'a_430392_beac4c1515da4576acf6cb9c5340b40c-2',
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
            'iid': 13487408,
            sync: {
              pixels: [
                {
                  url: 'http://idprovider3.com'
                },
                {
                  url: 'http://idprovider4.com'
                }
              ]
            }
          }
        },
        'headers': {}
      }
      const returnStatement = spec.getUserSyncs(pixelEnabledOptions, [...serverResponse, resp2]);
      expect(returnStatement.length).to.equal(4);
      expect(returnStatement).to.deep.include.members([
        { type: 'image', url: 'http://idprovider1.com' },
        { type: 'image', url: 'http://idprovider2.com' },
        { type: 'image', url: 'http://idprovider3.com' },
        { type: 'image', url: 'http://idprovider4.com' }
      ]);
    });
  });

  describe('prebid 3 upgrade', function() {
    const bidRequests = [{
      'bidder': 'sovrn',
      'params': {
        'tagid': '403370'
      },
      'adUnitCode': 'adunit-code',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [300, 600]
          ]
        }
      },
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    }];
    const bidderRequest = {
      refererInfo: {
        referer: 'http://example.com/page.html',
      }
    };
    const request = spec.buildRequests(bidRequests, bidderRequest);
    const payload = JSON.parse(request.data);

    it('gets sizes from mediaTypes.banner', function() {
      expect(payload.imp[0].banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}])
      expect(payload.imp[0].banner.w).to.equal(1)
      expect(payload.imp[0].banner.h).to.equal(1)
    })

    it('gets correct site info', function() {
      expect(payload.site.page).to.equal('http://example.com/page.html');
      expect(payload.site.domain).to.equal('example.com');
    })
  })
})
