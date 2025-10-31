import { expect } from 'chai';
import { spec } from 'modules/riseBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import {BANNER, NATIVE, VIDEO} from '../../../src/mediaTypes.js';
import * as utils from 'src/utils.js';
import {decorateAdUnitsWithNativeParams} from '../../../src/native.js';

const ENDPOINT = 'https://hb.yellowblue.io/hb-multi';
const TEST_ENDPOINT = 'https://hb.yellowblue.io/hb-multi-test';
const RTB_DOMAIN_TEST = 'testseller.com';
const RTB_DOMAIN_ENDPOINT = `https://${RTB_DOMAIN_TEST}/hb-multi`;
const RTB_DOMAIN_TEST_ENDPOINT = `https://${RTB_DOMAIN_TEST}/hb-multi-test`;
const TTL = 360;
/* eslint no-console: ["error", { allow: ["log", "warn", "error"] }] */

describe('riseAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('bid adapter', function () {
    it('should have aliases', function () {
      expect(spec.aliases).to.be.an('array').that.is.not.empty;
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      'bidder': spec.code,
      'adUnitCode': 'adunit-code',
      'sizes': [['640', '480']],
      'params': {
        'org': 'jdye8weeyirk00000001'
      }
    };

    it('should return true when required params are passed', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not found', function () {
      const newBid = Object.assign({}, bid);
      delete newBid.params;
      newBid.params = {
        'org': null
      };
      expect(spec.isBidRequestValid(newBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        'bidder': spec.code,
        'adUnitCode': 'adunit-code',
        'sizes': [[640, 480]],
        'params': {
          'org': 'jdye8weeyirk00000001',
        },
        'bidId': '299ffc8cca0b87',
        'loop': 1,
        'bidderRequestId': '1144f487e563f9',
        'auctionId': 'bfc420c3-8577-4568-9766-a8a935fb620d',
        'mediaTypes': {
          'video': {
            'playerSize': [[640, 480]],
            'context': 'instream',
            'plcmt': 1
          }
        },
      },
      {
        'bidder': spec.code,
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250]],
        'params': {
          'org': 'jdye8weeyirk00000001'
        },
        'bidId': '299ffc8cca0b87',
        'loop': 1,
        'bidderRequestId': '1144f487e563f9',
        'auctionId': 'bfc420c3-8577-4568-9766-a8a935fb620d',
        'mediaTypes': {
          'banner': {
          }
        },
      },
      {
        'bidder': spec.code,
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250]],
        'params': {
          'org': 'jdye8weeyirk00000001'
        },
        'bidId': '299ffc8cca0b87',
        'loop': 1,
        'bidderRequestId': '1144f487e563f9',
        'auctionId': 'bfc420c3-8577-4568-9766-a8a935fb620d',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [ 300, 250 ]
            ]
          },
          'video': {
            'playerSize': [[640, 480]],
            'context': 'instream',
            'plcmt': 1
          },
          'native': {
            'ortb': {
              'assets': [
                {
                  'id': 1,
                  'required': 1,
                  'img': {
                    'type': 3,
                    'w': 300,
                    'h': 200,
                  }
                },
                {
                  'id': 2,
                  'required': 1,
                  'title': {
                    'len': 80
                  }
                },
                {
                  'id': 3,
                  'required': 1,
                  'data': {
                    'type': 1
                  }
                }
              ]
            }
          },
        },
      }
    ];

    const testModeBidRequests = [
      {
        'bidder': spec.code,
        'adUnitCode': 'adunit-code',
        'sizes': [[640, 480]],
        'params': {
          'org': 'jdye8weeyirk00000001',
          'testMode': true
        },
        'bidId': '299ffc8cca0b87',
        'loop': 2,
        'bidderRequestId': '1144f487e563f9',
        'auctionId': 'bfc420c3-8577-4568-9766-a8a935fb620d',
      }
    ];

    const bidderRequest = {
      bidderCode: 'rise',
      ortb2: {device: {}},
    }
    const placementId = '12345678';
    const api = [1, 2];
    const mimes = ['application/javascript', 'video/mp4', 'video/quicktime'];
    const protocols = [2, 3, 5, 6];

    it('sends the placementId to ENDPOINT via POST', function () {
      bidRequests[0].params.placementId = placementId;
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.bids[0].placementId).to.equal(placementId);
    });

    it('sends the plcmt to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.bids[0].plcmt).to.equal(1);
    });

    it('sends the is_wrapper parameter to ENDPOINT via POST', function() {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.have.property('is_wrapper');
      expect(request.data.params.is_wrapper).to.equal(false);
    });

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('sends bid request to TEST ENDPOINT via POST', function () {
      const request = spec.buildRequests(testModeBidRequests, bidderRequest);
      expect(request.url).to.equal(TEST_ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('sends bid request to rtbDomain ENDPOINT via POST', function () {
      bidRequests[0].params.rtbDomain = RTB_DOMAIN_TEST;
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.equal(RTB_DOMAIN_ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('sends bid request to rtbDomain TEST ENDPOINT via POST', function () {
      testModeBidRequests[0].params.rtbDomain = RTB_DOMAIN_TEST;
      const request = spec.buildRequests(testModeBidRequests, bidderRequest);
      expect(request.url).to.equal(RTB_DOMAIN_TEST_ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('should send the correct bid Id', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.bids[0].bidId).to.equal('299ffc8cca0b87');
    });

    it('should send the correct supported api array', function () {
      bidRequests[0].mediaTypes.video.api = api;
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.bids[0].api).to.be.an('array');
      expect(request.data.bids[0].api).to.eql([1, 2]);
    });

    it('should send the correct mimes array', function () {
      bidRequests[0].mediaTypes.video.mimes = mimes;
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.bids[0].mimes).to.be.an('array');
      expect(request.data.bids[0].mimes).to.eql(['application/javascript', 'video/mp4', 'video/quicktime']);
    });

    it('should send the correct protocols array', function () {
      bidRequests[0].mediaTypes.video.protocols = protocols;
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.bids[0].protocols).to.be.an('array');
      expect(request.data.bids[0].protocols).to.eql([2, 3, 5, 6]);
    });

    it('should send the correct sizes array', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.bids[0].sizes).to.be.an('array');
      expect(request.data.bids[0].sizes).to.equal(bidRequests[0].sizes)
      expect(request.data.bids[1].sizes).to.be.an('array');
      expect(request.data.bids[1].sizes).to.equal(bidRequests[1].sizes)
      expect(request.data.bids[2].sizes).to.be.an('array');
      expect(request.data.bids[2].sizes).to.eql(bidRequests[2].sizes)
    });

    it('should send nativeOrtbRequest in native bid request', function () {
      decorateAdUnitsWithNativeParams(bidRequests)
      const request = spec.buildRequests(bidRequests, bidderRequest);
      assert.deepEqual(request.data.bids[2].nativeOrtbRequest, bidRequests[2].mediaTypes.native.ortb)
    });

    it('should send the correct media type', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.bids[0].mediaType).to.equal(VIDEO)
      expect(request.data.bids[1].mediaType).to.equal(BANNER)
      expect(request.data.bids[2].mediaType.split(',')).to.include.members([VIDEO, NATIVE, BANNER])
    });

    it('should respect syncEnabled option', function() {
      config.setConfig({
        userSync: {
          syncEnabled: false,
          filterSettings: {
            all: {
              bidders: '*',
              filter: 'include'
            }
          }
        }
      });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.not.have.property('cs_method');
    });

    it('should respect "iframe" filter settings', function () {
      config.setConfig({
        userSync: {
          syncEnabled: true,
          filterSettings: {
            iframe: {
              bidders: [spec.code],
              filter: 'include'
            }
          }
        }
      });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.have.property('cs_method', 'iframe');
    });

    it('should respect "all" filter settings', function () {
      config.setConfig({
        userSync: {
          syncEnabled: true,
          filterSettings: {
            all: {
              bidders: [spec.code],
              filter: 'include'
            }
          }
        }
      });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.have.property('cs_method', 'iframe');
    });

    it('should send the pixel user sync param if userSync is enabled and no "iframe" or "all" configs are present', function () {
      config.resetConfig();
      config.setConfig({
        userSync: {
          syncEnabled: true,
        }
      });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.have.property('cs_method', 'pixel');
    });

    it('should respect total exclusion', function() {
      config.setConfig({
        userSync: {
          syncEnabled: true,
          filterSettings: {
            image: {
              bidders: [spec.code],
              filter: 'exclude'
            },
            iframe: {
              bidders: [spec.code],
              filter: 'exclude'
            }
          }
        }
      });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.not.have.property('cs_method');
    });

    it('should have us_privacy param if usPrivacy is available in the bidRequest', function () {
      const bidderRequestWithUSP = Object.assign({uspConsent: '1YNN'}, bidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequestWithUSP);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.have.property('us_privacy', '1YNN');
    });

    it('should have an empty us_privacy param if usPrivacy is missing in the bidRequest', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.not.have.property('us_privacy');
    });

    it('should not send the gdpr param if gdprApplies is false in the bidRequest', function () {
      const bidderRequestWithGDPR = Object.assign({gdprConsent: {gdprApplies: false}}, bidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequestWithGDPR);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.not.have.property('gdpr');
      expect(request.data.params).to.not.have.property('gdpr_consent');
    });

    it('should send the gdpr param if gdprApplies is true in the bidRequest', function () {
      const bidderRequestWithGDPR = Object.assign({gdprConsent: {gdprApplies: true, consentString: 'test-consent-string'}}, bidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequestWithGDPR);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.have.property('gdpr', true);
      expect(request.data.params).to.have.property('gdpr_consent', 'test-consent-string');
    });

    it('should not send the gpp param if gppConsent is false in the bidRequest', function () {
      const bidderRequestWithoutGPP = Object.assign({gppConsent: false}, bidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequestWithoutGPP);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.not.have.property('gpp');
      expect(request.data.params).to.not.have.property('gpp_sid');
    });

    it('should send the gpp param if gppConsent is true in the bidRequest', function () {
      const bidderRequestWithGPP = Object.assign({gppConsent: {gppString: 'gpp-consent', applicableSections: [7]}}, bidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequestWithGPP);
      console.log('request.data.params');
      console.log(request.data.params);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.have.property('gpp', 'gpp-consent');
      expect(request.data.params.gpp_sid[0]).to.be.equal(7);
    });

    it('should have schain param if it is available in the bidRequest', () => {
      bidderRequest.ortb2 = {
        source: {
          ext: {
            schain: {
              ver: '1.0',
              complete: 1,
              nodes: [{ asi: 'indirectseller.com', sid: '00001', hp: 1 }],
            }
          }
        }
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.params).to.be.an('object');
      expect(request.data.params).to.have.property('schain', '1.0,1!indirectseller.com,00001,1,,,');
    });

    it('should set flooPrice to getFloor.floor value if it is greater than params.floorPrice', function() {
      const bid = utils.deepClone(bidRequests[0]);
      bid.getFloor = () => {
        return {
          currency: 'USD',
          floor: 3.32
        }
      }
      bid.params.floorPrice = 0.64;
      const request = spec.buildRequests([bid], bidderRequest);
      expect(request.data.bids[0]).to.be.an('object');
      expect(request.data.bids[0]).to.have.property('floorPrice', 3.32);
    });

    it('should set floorPrice to params.floorPrice value if it is greater than getFloor.floor', function() {
      const bid = utils.deepClone(bidRequests[0]);
      bid.getFloor = () => {
        return {
          currency: 'USD',
          floor: 0.8
        }
      }
      bid.params.floorPrice = 1.5;
      const request = spec.buildRequests([bid], bidderRequest);
      expect(request.data.bids[0]).to.be.an('object');
      expect(request.data.bids[0]).to.have.property('floorPrice', 1.5);
    });

    it('should check sua param in bid request', function() {
      const sua = {
        'platform': {
          'brand': 'macOS',
          'version': ['12', '4', '0']
        },
        'browsers': [
          {
            'brand': 'Chromium',
            'version': [ '106', '0', '5249', '119' ]
          },
          {
            'brand': 'Google Chrome',
            'version': [ '106', '0', '5249', '119' ]
          },
          {
            'brand': 'Not;A=Brand',
            'version': [ '99', '0', '0', '0' ]
          }
        ],
        'mobile': 0,
        'model': '',
        'bitness': '64',
        'architecture': 'x86'
      }
      const bid = utils.deepClone(bidRequests[0]);
      bid.ortb2 = {
        'device': {
          'sua': {
            'platform': {
              'brand': 'macOS',
              'version': [ '12', '4', '0' ]
            },
            'browsers': [
              {
                'brand': 'Chromium',
                'version': [ '106', '0', '5249', '119' ]
              },
              {
                'brand': 'Google Chrome',
                'version': [ '106', '0', '5249', '119' ]
              },
              {
                'brand': 'Not;A=Brand',
                'version': [ '99', '0', '0', '0' ]
              }
            ],
            'mobile': 0,
            'model': '',
            'bitness': '64',
            'architecture': 'x86'
          }
        }
      }
      const requestWithSua = spec.buildRequests([bid], bidderRequest);
      const data = requestWithSua.data;
      expect(data.bids[0].sua).to.exist;
      expect(data.bids[0].sua).to.deep.equal(sua);
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.bids[0].sua).to.not.exist;
    });

    it('should send ORTB2 device data in bid request', function() {
      const ortb2 = {
        device: {
          w: 980,
          h: 1720,
          dnt: 0,
          ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1',
          language: 'en',
          devicetype: 1,
          make: 'Apple',
          model: 'iPhone 12 Pro Max',
          os: 'iOS',
          osv: '17.4',
          ext: {fiftyonedegrees_deviceId: '17595-133085-133468-18092'},
        },
      };

      const request = spec.buildRequests(bidRequests, {
        ...bidderRequest,
        ortb2,
      });

      expect(request.data.params.device).to.deep.equal(ortb2.device);
    });

    describe('COPPA Param', function() {
      it('should set coppa equal 0 in bid request if coppa is set to false', function() {
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request.data.bids[0].coppa).to.be.equal(0);
      });

      it('should set coppa equal 1 in bid request if coppa is set to true', function() {
        const bid = utils.deepClone(bidRequests[0]);
        bid.ortb2 = {
          'regs': {
            'coppa': true,
          }
        };
        const request = spec.buildRequests([bid], bidderRequest);
        expect(request.data.bids[0].coppa).to.be.equal(1);
      });
    });

    describe('User Eids', function() {
      it('should get the Eids from the userIdAsEids object and set them in the request', function() {
        const bid = utils.deepClone(bidRequests[0]);
        const userIds = [
          {
            sourcer: 'pubcid.org',
            uids: [{
              id: '12345678',
              atype: 1,
            }]
          }];
        bid.userIdAsEids = userIds;
        const request = spec.buildRequests([bid], bidderRequest);
        expect(request.data.params.userIds).to.be.equal(JSON.stringify(userIds));
      });

      it('should not set the userIds request param if no userIdAsEids are set', function() {
        const bid = utils.deepClone(bidRequests[0]);
        const request = spec.buildRequests([bid], bidderRequest);
        expect(request.data.params.userIds).to.be.undefined;
      });
    });
  });

  describe('interpretResponse', function () {
    const response = {
      params: {
        currency: 'USD',
        netRevenue: true,
      },
      bids: [{
        cpm: 12.5,
        vastXml: '<VAST version="3.0"></VAST>',
        width: 640,
        height: 480,
        requestId: '21e12606d47ba7',
        adomain: ['abc.com'],
        creativeId: 'creative-id',
        nurl: 'http://example.com/win/1234',
        mediaType: VIDEO
      },
      {
        cpm: 12.5,
        ad: '"<img src=\"https://...\"/>"',
        width: 300,
        height: 250,
        requestId: '21e12606d47ba7',
        adomain: ['abc.com'],
        creativeId: 'creative-id',
        nurl: 'http://example.com/win/1234',
        mediaType: BANNER
      },
      {
        cpm: 12.5,
        width: 300,
        height: 200,
        requestId: '21e12606d47ba7',
        adomain: ['abc.com'],
        creativeId: 'creative-id',
        nurl: 'http://example.com/win/1234',
        mediaType: NATIVE,
        native: {
          body: 'Advertise with Rise',
          clickUrl: 'https://risecodes.com',
          cta: 'Start now',
          image: {
            width: 300,
            height: 200,
            url: 'https://sdk.streamrail.com/media/rise-image.jpg'
          },
          sponsoredBy: 'Rise',
          title: 'Rise Ad Tech Solutions'
        }
      }]
    };

    const expectedVideoResponse = {
      requestId: '21e12606d47ba7',
      cpm: 12.5,
      currency: 'USD',
      width: 640,
      height: 480,
      ttl: TTL,
      creativeId: 'creative-id',
      netRevenue: true,
      nurl: 'http://example.com/win/1234',
      mediaType: VIDEO,
      meta: {
        mediaType: VIDEO,
        advertiserDomains: ['abc.com']
      },
      vastXml: '<VAST version="3.0"></VAST>',
    };

    const expectedBannerResponse = {
      requestId: '21e12606d47ba7',
      cpm: 12.5,
      currency: 'USD',
      width: 300,
      height: 250,
      ttl: TTL,
      creativeId: 'creative-id',
      netRevenue: true,
      nurl: 'http://example.com/win/1234',
      mediaType: BANNER,
      meta: {
        mediaType: BANNER,
        advertiserDomains: ['abc.com']
      },
      ad: '"<img src=\"https://...\"/>"'
    };

    const expectedNativeResponse = {
      requestId: '21e12606d47ba7',
      cpm: 12.5,
      currency: 'USD',
      width: 300,
      height: 200,
      ttl: TTL,
      creativeId: 'creative-id',
      netRevenue: true,
      nurl: 'http://example.com/win/1234',
      mediaType: NATIVE,
      meta: {
        mediaType: NATIVE,
        advertiserDomains: ['abc.com']
      },
      native: {
        ortb: {
          body: 'Advertise with Rise',
          clickUrl: 'https://risecodes.com',
          cta: 'Start now',
          image: {
            width: 300,
            height: 200,
            url: 'https://sdk.streamrail.com/media/rise-image.jpg',
          },
          sponsoredBy: 'Rise',
          title: 'Rise Ad Tech Solutions'
        }
      },
    };

    it('should get correct bid response', function () {
      const result = spec.interpretResponse({ body: response });
      expect(result[0]).to.deep.equal(expectedVideoResponse);
      expect(result[1]).to.deep.equal(expectedBannerResponse);
      expect(result[2]).to.deep.equal(expectedNativeResponse);
    });

    it('video type should have vastXml key', function () {
      const result = spec.interpretResponse({ body: response });
      expect(result[0].vastXml).to.equal(expectedVideoResponse.vastXml)
    });

    it('banner type should have ad key', function () {
      const result = spec.interpretResponse({ body: response });
      expect(result[1].ad).to.equal(expectedBannerResponse.ad)
    });

    it('native type should have native key', function () {
      const result = spec.interpretResponse({ body: response });
      expect(result[2].native).to.eql(expectedNativeResponse.native)
    });
  })

  describe('getUserSyncs', function() {
    const imageSyncResponse = {
      body: {
        params: {
          userSyncPixels: [
            'https://image-sync-url.test/1',
            'https://image-sync-url.test/2',
            'https://image-sync-url.test/3'
          ]
        }
      }
    };

    const iframeSyncResponse = {
      body: {
        params: {
          userSyncURL: 'https://iframe-sync-url.test'
        }
      }
    };

    it('should register all img urls from the response', function() {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, [imageSyncResponse]);
      expect(syncs).to.deep.equal([
        {
          type: 'image',
          url: 'https://image-sync-url.test/1'
        },
        {
          type: 'image',
          url: 'https://image-sync-url.test/2'
        },
        {
          type: 'image',
          url: 'https://image-sync-url.test/3'
        }
      ]);
    });

    it('should register the iframe url from the response', function() {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [iframeSyncResponse]);
      expect(syncs).to.deep.equal([
        {
          type: 'iframe',
          url: 'https://iframe-sync-url.test'
        }
      ]);
    });

    it('should register both image and iframe urls from the responses', function() {
      const syncs = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: true }, [iframeSyncResponse, imageSyncResponse]);
      expect(syncs).to.deep.equal([
        {
          type: 'iframe',
          url: 'https://iframe-sync-url.test'
        },
        {
          type: 'image',
          url: 'https://image-sync-url.test/1'
        },
        {
          type: 'image',
          url: 'https://image-sync-url.test/2'
        },
        {
          type: 'image',
          url: 'https://image-sync-url.test/3'
        }
      ]);
    });

    it('should handle an empty response', function() {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);
      expect(syncs).to.deep.equal([]);
    });

    it('should handle when user syncs are disabled', function() {
      const syncs = spec.getUserSyncs({ pixelEnabled: false }, [imageSyncResponse]);
      expect(syncs).to.deep.equal([]);
    });
  })

  describe('onBidWon', function() {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });

    it('Should trigger pixel if bid nurl', function() {
      const bid = {
        'bidder': spec.code,
        'adUnitCode': 'adunit-code',
        'sizes': [['640', '480']],
        'nurl': 'http://example.com/win/1234',
        'params': {
          'org': 'jdye8weeyirk00000001'
        }
      };

      spec.onBidWon(bid);
      expect(utils.triggerPixel.callCount).to.equal(1)
    })
  })
});
