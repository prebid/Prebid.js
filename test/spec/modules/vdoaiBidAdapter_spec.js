import {assert, expect} from 'chai';
import {spec} from 'modules/vdoaiBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';

const ENDPOINT_URL = 'https://prebid-v2.vdo.ai/auction';

describe('vdoaiBidAdapter', function () {
  const adapter = newBidder(spec);
  const sandbox = sinon.sandbox.create();
  beforeEach(function() {
    sandbox.stub(config, 'getConfig').withArgs('coppa').returns(true);
  });
  afterEach(function() {
    sandbox.restore();
  });
  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'vdoai',
      'params': {
        placementId: 'testPlacementId'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [300, 250]
      ],
      'bidId': '1234asdf1234',
      'bidderRequestId': '1234asdf1234asdf',
      'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf120'
    };
    let invalidParams = {
      'bidder': 'vdoai',
      'params': {
        placementId: false
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [300, 250]
      ],
      'bidId': '1234asdf1234',
      'bidderRequestId': '1234asdf1234asdf',
      'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf120'
    };
    it('should return true where required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should return false where required params not found', function () {
      expect(spec.isBidRequestValid(invalidParams)).to.equal(false);
    });
  });
  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'vdoai',
        'params': {
          placementId: 'testPlacementId',
          bidFloor: 0.1
        },
        'sizes': [
          [300, 250]
        ],
        'bidId': '23beaa6af6cdde',
        'bidderRequestId': '19c0c1efdf37e7',
        'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
        'mediaType': 'banner',
        'adUnitCode': '1234',
        'mediaTypes': {
          banner: {
            sizes: [300, 250]
          }
        }
      },
      {
        'bidder': 'vdoai',
        'params': {
          placementId: 'testPlacementId',
          bidFloor: 0.1
        },
        'width': '300',
        'height': '200',
        'bidId': 'bidId123',
        'referer': 'www.example.com',
        'mediaType': 'video',
        'mediaTypes': {
          video: {
            context: 'instream',
            playerSize: [[640, 360]]
          }
        }
      }
    ];

    let bidderRequests = {
      timeout: 3000,
      'refererInfo': {
        'numIframes': 0,
        'reachedTop': true,
        'referer': 'https://example.com',
        'stack': ['https://example.com'],
        'page': 'example.com',
        'ref': 'example2.com'
      },
      'ortb2': {
        source: {
          tid: 123456789
        },
        'site': {
          'domain': 'abc.com',
          'publisher': {
            'domain': 'abc.com'
          }
        }
      },
      'ortb2Imp': {
        ext: {
          tid: '12345',
          gpid: '1234'
        }
      },
      gdprConsent: {
        consentString: 'abc',
        gdprApplies: true,
        addtlConsent: 'xyz'
      },
      gppConsent: {
        gppString: 'abcd',
        applicableSections: ''
      },
      uspConsent: {
        uspConsent: '12345'
      },
      userIdAsEids: {},
      schain: {
        'ver': '1.0',
        'complete': 1,
        'nodes': [
          {
            'asi': 'vdo.ai',
            'sid': '4359',
            'hp': 1
          }
        ]
      }
    };

    const request = spec.buildRequests(bidRequests, bidderRequests);
    it('sends bid request to our endpoint via POST', function () {
      expect(request[0].method).to.equal('POST');
    });
    it('attaches source and version to endpoint URL as query params', function () {
      expect(request[0].url).to.equal(ENDPOINT_URL);
    });
    it('should contain all keys', function() {
      expect(request[0].data.pageInfo).to.include.all.keys('location', 'referrer', 'stack', 'numIframes', 'sHeight', 'sWidth', 'docHeight', 'wHeight', 'wWidth', 'oHeight', 'oWidth', 'aWidth', 'aHeight', 'sLeft', 'sTop', 'hLength', 'xOffset', 'yOffset', 'version');
    })
    it('should return empty array if no valid bid was passed', function () {
      expect(spec.buildRequests([], bidderRequests)).to.be.empty;
    });
    it('should not send invalid schain', function () {
      delete bidderRequests.schain.nodes[0].asi;
      let result = spec.buildRequests(bidRequests, bidderRequests);
      expect(result[0].data.schain).to.be.undefined;
    });
    it('should not send invalid schain', function () {
      delete bidderRequests.schain;
      let result = spec.buildRequests(bidRequests, bidderRequests);
      expect(result[0].data.schain).to.be.undefined;
    });
    it('should check for correct sizes', function () {
      delete bidRequests[1].mediaTypes.video.playerSize;
      let result = spec.buildRequests(bidRequests, bidderRequests);
      expect(result[1].data.playerSize).to.be.empty;
    });
    it('should not pass undefined in GDPR string', function () {
      delete bidderRequests.gdprConsent;
      let result = spec.buildRequests(bidRequests, bidderRequests);
      expect(result[0].data.gdprConsent).to.be.undefined;
    });

    it('should not pass undefined in gppConsent', function () {
      delete bidderRequests.gppConsent;
      let result = spec.buildRequests(bidRequests, bidderRequests);
      expect(result[0].data.gppConsent).to.be.undefined;
    });

    it('should not pass undefined in uspConsent', function () {
      delete bidderRequests.uspConsent;
      let result = spec.buildRequests(bidRequests, bidderRequests);
      expect(result[0].data.uspConsent).to.be.undefined;
    });
  });

  describe('interpretResponse', function () {
    let bidRequest = [
      {
        'method': 'POST',
        'url': ENDPOINT_URL,
        'data': {
          'placementId': 'testPlacementId',
          'width': '300',
          'height': '200',
          'bidId': 'bidId123',
          'referer': 'www.example.com'
        }

      }
    ];
    let serverResponse = {
      body:
      {
        'price': 2,
        'adid': 'test-ad',
        'adomain': [
          'text.abc'
        ],
        'w': 300,
        'h': 250,
        'vdoCreative': '<html><h3>I am an ad</h3></html>',
        'bidId': '31d1375caab87a',
        'mediaType': 'banner'
      }
    };

    it('should get the correct bid response', function () {
      let expectedResponse = [{
        'requestId': '31d1375caab87a',
        'cpm': 2,
        'width': 300,
        'height': 250,
        'creativeId': 'test-ad',
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 60,
        'ad': '<html><h3>I am an ad</h3></html>',
        'meta': {
          'advertiserDomains': ['text.abc']
        }
      }];
      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponse));
      expect(result[0].meta.advertiserDomains).to.deep.equal(expectedResponse[0].meta.advertiserDomains);
    });

    it('handles instream video responses', function () {
      let serverResponse = {
        body: {
          'vdoCreative': '<!-- VAST Creative -->',
          'price': 2,
          'adid': '12345asdfg',
          'currency': 'USD',
          'statusMessage': 'Bid available',
          'requestId': 'bidId123',
          'width': 300,
          'height': 250,
          'netRevenue': true,
          'mediaType': 'video'
        }
      };
      let bidRequest = [
        {
          'method': 'POST',
          'url': ENDPOINT_URL,
          'data': {
            'placementId': 'testPlacementId',
            'width': '300',
            'height': '200',
            'bidId': 'bidId123',
            'referer': 'www.example.com',
            'mediaType': 'video',
            'mediaTypes': {
              video: {
                context: 'instream',
                playerSize: [[640, 360]]
              }
            }
          }
        }
      ];

      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(result[0]).to.have.property('vastXml');
      expect(result[0]).to.have.property('mediaType', 'video');
    });
    it('should not return invalid responses', function() {
      serverResponse.body.w = 0;
      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(result).to.be.empty;
    });
    it('should not return invalid responses with invalid height', function() {
      serverResponse.body.w = 300;
      serverResponse.body.h = 0;
      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(result).to.be.empty;
    });
    it('should not return invalid responses with invalid cpm', function() {
      serverResponse.body.h = 250;
      serverResponse.body.price = 0;
      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(result).to.be.empty;
    });
    it('should not return invalid responses with invalid creative ID', function() {
      serverResponse.body.price = 2;
      serverResponse.body.adid = undefined;
      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(result).to.be.empty;
    });
  });
  describe('getUserSyncs', function() {
    it('should return correct sync urls', function() {
      let serverResponse = [{
        body: {
          'vdoCreative': '<!-- VAST Creative -->',
          'price': 2,
          'adid': '12345asdfg',
          'currency': 'USD',
          'statusMessage': 'Bid available',
          'requestId': 'bidId123',
          'width': 300,
          'height': 250,
          'netRevenue': true,
          'mediaType': 'video',
          'cookiesync': {
            'status': 'no_cookie',
            'bidder_status': [
              {
                'bidder': 'vdoai',
                'no_cookie': true,
                'usersync': {
                  'url': 'https://rtb.vdo.ai/setuid/',
                  'type': 'iframe'
                }
              }
            ]
          }
        }
      }];

      let syncUrls = spec.getUserSyncs({
        iframeEnabled: true
      }, serverResponse);
      expect(syncUrls[0].url).to.be.equal(serverResponse[0].body.cookiesync.bidder_status[0].usersync.url);

      syncUrls = spec.getUserSyncs({
        iframeEnabled: false
      }, serverResponse);
      expect(syncUrls[0]).to.be.undefined;
    });
    it('should not return invalid sync urls', function() {
      let serverResponse = [{
        body: {
          'vdoCreative': '<!-- VAST Creative -->',
          'price': 2,
          'adid': '12345asdfg',
          'currency': 'USD',
          'statusMessage': 'Bid available',
          'requestId': 'bidId123',
          'width': 300,
          'height': 250,
          'netRevenue': true,
          'mediaType': 'video',
          'cookiesync': {
            'status': 'no_cookie',
            'bidder_status': [
            ]
          }
        }
      }];

      var syncUrls = spec.getUserSyncs({
        iframeEnabled: true
      }, serverResponse);
      expect(syncUrls[0]).to.be.undefined;

      delete serverResponse[0].body.cookiesync.bidder_status;
      syncUrls = spec.getUserSyncs({
        iframeEnabled: true
      }, serverResponse);
      expect(syncUrls[0]).to.be.undefined;

      delete serverResponse[0].body.cookiesync;
      syncUrls = spec.getUserSyncs({
        iframeEnabled: true
      }, serverResponse);
      expect(syncUrls[0]).to.be.undefined;

      delete serverResponse[0].body;
      syncUrls = spec.getUserSyncs({
        iframeEnabled: true
      }, serverResponse);
      expect(syncUrls[0]).to.be.undefined;
    });
  });

  describe('onTimeout', function() {
    it('should run without errors', function() {
      spec.onTimeout();
    });
  });

  describe('onBidWon', function() {
    it('should run without errors', function() {
      spec.onBidWon();
    });
  });

  describe('onSetTargeting', function() {
    it('should run without errors', function() {
      spec.onSetTargeting();
    });
  });
});
