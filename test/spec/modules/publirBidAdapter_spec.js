import { expect } from 'chai';
import { spec } from 'modules/publirBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import { BANNER } from '../../../src/mediaTypes.js';
import * as utils from 'src/utils.js';

const ENDPOINT = 'https://prebid.publir.com/publirPrebidEndPoint';
const RTB_DOMAIN_TEST = 'prebid.publir.com';
const TTL = 360;

describe('publirAdapter', function () {
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
        'pubId': 'jdye8weeyirk00000001'
      }
    };

    it('should return true when required params are passed', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when pubId is missing', function () {
      const bid = {
        'bidder': spec.code,
        'adUnitCode': 'adunit-code',
        'sizes': [['640', '480']],
        'params': {}
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required params are not found', function () {
      const newBid = Object.assign({}, bid);
      delete newBid.params;
      newBid.params = {
        'pubId': null
      };
      expect(spec.isBidRequestValid(newBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        'bidder': spec.code,
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250]],
        'params': {
          'pubId': 'jdye8weeyirk00000001'
        },
        'bidId': '299ffc8cca0b87',
        'loop': 1,
        'bidderRequestId': '1144f487e563f9',
        'auctionId': 'bfc420c3-8577-4568-9766-a8a935fb620d',
        'mediaTypes': {
          'banner': {
          }
        },
        'ad': '"<img src=\"https://...\"/>"'
      }
    ];

    const bidderRequest = {
      bidderCode: 'publir',
    }

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('sends bid request to rtbDomain ENDPOINT via POST', function () {
      bidRequests[0].params.rtbDomain = RTB_DOMAIN_TEST;
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('should send the correct bid Id', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.bids[0].bidId).to.equal('299ffc8cca0b87');
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

    it('should have schain param if it is available in the bidRequest', () => {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [{ asi: 'indirectseller.com', sid: '00001', hp: 1 }],
      };
      bidRequests[0].schain = schain;
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
  });

  describe('interpretResponse', function () {
    const response = {
      params: {
        currency: 'USD',
        netRevenue: true,
      },
      bids: [
        {
          cpm: 12.5,
          ad: '"<img src=\"https://...\"/>"',
          width: 300,
          height: 250,
          requestId: '21e12606d47ba7',
          adomain: ['abc.com'],
          mediaType: BANNER,
          campId: '65902db45721d690ee0bc8c3'
        }]
    };

    const expectedBannerResponse = {
      requestId: '21e12606d47ba7',
      cpm: 12.5,
      currency: 'USD',
      width: 300,
      height: 250,
      ttl: TTL,
      creativeId: '639153ddd0s443',
      netRevenue: true,
      nurl: 'http://example.com/win/1234',
      mediaType: BANNER,
      meta: {
        mediaType: BANNER,
        ad_key: '9b5e00f2-8831-4efa-a933-c4f68710ffc0'
      },
      ad: '"<img src=\"https://...\"/>"',
      campId: '65902db45721d690ee0bc8c3',
      bidder: 'publir'
    };

    it('should get correct bid response', function () {
      const result = spec.interpretResponse({ body: response });
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedBannerResponse));
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
          'pubId': 'jdye8weeyirk00000001'
        }
      };

      spec.onBidWon(bid);
      expect(utils.triggerPixel.callCount).to.equal(1)
    })
  })
});
