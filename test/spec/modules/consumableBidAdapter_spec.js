import {expect} from 'chai';
import {spec} from 'modules/consumableBidAdapter.js';
import {createBid} from 'src/bidfactory.js';
import {config} from 'src/config.js';
import {deepClone} from 'src/utils.js';
import { createEidsArray } from 'modules/userId/eids.js';

const ENDPOINT = 'https://e.serverbid.com/api/v2';
const SMARTSYNC_CALLBACK = 'serverbidCallBids';

const BIDDER_REQUEST_1 = {
  bidderCode: 'consumable',
  auctionId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
  bidderRequestId: '1c56ad30b9b8ca8',
  bidRequest: [
    {
      bidder: 'consumable',
      params: {
        networkId: '9969',
        siteId: '730181',
        unitId: '123456',
        unitName: 'cnsmbl-unit'
      },
      placementCode: 'header-bid-tag-1',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      },
      bidId: '23acc48ad47af5',
      auctionId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
      bidderRequestId: '1c56ad30b9b8ca8',
      transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
    }
  ],
  schain: {
    'ver': '1.0',
    'complete': 1,
    'nodes': [
      {
        'asi': 'indirectseller.com',
        'sid': '00001',
        'hp': 1
      },
      {
        'asi': 'indirectseller-2.com',
        'sid': '00002',
        'hp': 2
      },
    ]
  },
  gdprConsent: {
    consentString: 'consent-test',
    gdprApplies: false
  },
  refererInfo: {
    referer: 'http://example.com/page.html',
    reachedTop: true,
    numIframes: 2,
    stack: [
      'http://example.com/page.html',
      'http://example.com/iframe1.html',
      'http://example.com/iframe2.html'
    ]
  }
};

const BIDDER_REQUEST_2 = {
  bidderCode: 'consumable',
  auctionId: 'a4713c32-3762-4798-b342-4ab810ca770d',
  bidderRequestId: '109f2a181342a9',
  bidRequest: [
    {
      bidder: 'consumable',
      params: {
        networkId: 9969,
        siteId: 730181,
        unitId: 123456,
        unitName: 'cnsmbl-unit'
      },
      placementCode: 'div-gpt-ad-1487778092495-0',
      mediaTypes: {
        banner: {
          sizes: [
            [728, 90],
            [970, 90]
          ]
        }
      },
      bidId: '2b0f82502298c9',
      bidderRequestId: '109f2a181342a9',
      auctionId: 'a4713c32-3762-4798-b342-4ab810ca770d'
    },
    {
      bidder: 'consumable',
      params: {
        networkId: 9969,
        siteId: 730181,
        unitId: 123456,
        unitName: 'cnsmbl-unit'
      },
      placementCode: 'div-gpt-ad-1487778092495-0',
      mediaTypes: {
        banner: {
          sizes: [
            [728, 90],
            [970, 90]
          ]
        }
      },
      bidId: '123',
      bidderRequestId: '109f2a181342a9',
      auctionId: 'a4713c32-3762-4798-b342-4ab810ca770d'
    }
  ],
  gdprConsent: {
    consentString: 'consent-test',
    gdprApplies: true
  },
  refererInfo: {
    referer: 'http://example.com/page.html',
    reachedTop: true,
    numIframes: 2,
    stack: [
      'http://example.com/page.html',
      'http://example.com/iframe1.html',
      'http://example.com/iframe2.html'
    ]
  }
};

const BIDDER_REQUEST_VIDEO = {
  bidderCode: 'consumable',
  auctionId: 'a4713c32-3762-4798-b342-4ab810ca770d',
  bidderRequestId: '109f2a181342a9',
  bidRequest: [
    {
      bidder: 'consumable',
      params: {
        networkId: 9969,
        siteId: 730181,
        unitId: 123456,
        unitName: 'cnsmbl-unit'
      },
      placementCode: 'div-gpt-ad-1487778092495-0',
      mediaTypes: {
        video: {
          playerSize: [188, 106],
          context: 'instream',
          mimes: ['application/javascript', 'application/x-mpegurl', 'video/3gpp', 'video/mp4', 'video/mpeg', 'video/ogg', 'video/webm', 'video/x-m4v', 'video/x-ms-asf', 'video/x-ms-wmv', 'video/x-msvideo'],
          minduration: 0,
          maxduration: 120,
          protocols: [1, 2, 3, 4, 5, 6, 7, 8],
          api: [1, 2],
          linearity: 1
        }
      },
      bidId: '6202d555b2f94537',
      bidderRequestId: '109f2a181342a9',
      auctionId: 'a4713c32-3762-4798-b342-4ab810ca770d'
    }
  ],
  gdprConsent: {
    consentString: 'consent-test',
    gdprApplies: true
  },
  refererInfo: {
    referer: 'http://example.com/page.html',
    reachedTop: true,
    numIframes: 2,
    stack: [
      'http://example.com/page.html',
      'http://example.com/iframe1.html',
      'http://example.com/iframe2.html'
    ]
  }
};

const BIDDER_REQUEST_EMPTY = {
  bidderCode: 'consumable',
  auctionId: 'b06458ef-4fe5-4a0b-a61b-bccbcedb7b11',
  bidderRequestId: '8c8006750b10fd',
  bidRequest: [],
  gdprConsent: {
    consentString: 'consent-test',
    gdprApplies: false
  }
};

const AD_SERVER_RESPONSE = {
  'headers': null,
  'body': {
    'user': { 'key': 'ue1-2d33e91b71e74929b4aeecc23f4376f1' },
    'pixels': [{ 'type': 'image', 'url': '//sync.serverbid.com/ss/' }],
    'decisions': {
      '2b0f82502298c9': {
        'adId': 2364764,
        'creativeId': 1950991,
        'flightId': 2788300,
        'campaignId': 542982,
        'clickUrl': 'https://e.serverbid.com/r',
        'impressionUrl': 'https://e.serverbid.com/i.gif',
        'contents': [{
          'type': 'html',
          'body': '<html></html>',
          'data': {
            'height': 90,
            'width': 728,
            'imageUrl': 'https://static.adzerk.net/Advertisers/b0ab77db8a7848c8b78931aed022a5ef.gif',
            'fileName': 'b0ab77db8a7848c8b78931aed022a5ef.gif'
          },
          'template': 'image'
        }],
        'height': 90,
        'width': 728,
        'events': [],
        'pricing': {'price': 0.5, 'clearPrice': 0.5, 'revenue': 0.0005, 'rateType': 2, 'eCPM': 0.5}
      },
      '123': {
        'adId': 2364764,
        'creativeId': 1950991,
        'flightId': 2788300,
        'campaignId': 542982,
        'clickUrl': 'https://e.serverbid.com/r',
        'impressionUrl': 'https://e.serverbid.com/i.gif',
        'contents': [{
          'type': 'html',
          'body': '<html></html>',
          'data': {
            'height': 90,
            'width': 728,
            'imageUrl': 'https://static.adzerk.net/Advertisers/b0ab77db8a7848c8b78931aed022a5ef.gif',
            'fileName': 'b0ab77db8a7848c8b78931aed022a5ef.gif'
          },
          'template': 'image'
        }],
        'height': 90,
        'width': 728,
        'events': [],
        'pricing': {'price': 0.5, 'clearPrice': 0.5, 'revenue': 0.0005, 'rateType': 2, 'eCPM': 0.5}
      }
    }
  }
};

const AD_SERVER_RESPONSE_2 = {
  'headers': null,
  'body': {
    'user': { 'key': 'ue1-2d33e91b71e74929b4aeecc23f4376f1' },
    'pixels': [{ 'type': 'image', 'url': '//sync.serverbid.com/ss/' }],
    'bdr': 'notcx',
    'decisions': {
      '2b0f82502298c9': {
        'adId': 2364764,
        'creativeId': 1950991,
        'flightId': 2788300,
        'campaignId': 542982,
        'clickUrl': 'https://e.serverbid.com/r',
        'impressionUrl': 'https://e.serverbid.com/i.gif',
        'contents': [{
          'type': 'html',
          'body': '<html></html>',
          'data': {
            'height': 90,
            'width': 728,
            'imageUrl': 'https://static.adzerk.net/Advertisers/b0ab77db8a7848c8b78931aed022a5ef.gif',
            'fileName': 'b0ab77db8a7848c8b78931aed022a5ef.gif'
          },
          'template': 'image'
        }],
        'height': 90,
        'width': 728,
        'events': [],
        'pricing': {'price': 0.5, 'clearPrice': 0.5, 'revenue': 0.0005, 'rateType': 2, 'eCPM': 0.5},
        'mediaType': 'banner',
        'cats': ['IAB1', 'IAB2', 'IAB3'],
        'networkId': 1234567,
      },
      '123': {
        'adId': 2364764,
        'creativeId': 1950991,
        'flightId': 2788300,
        'campaignId': 542982,
        'clickUrl': 'https://e.serverbid.com/r',
        'impressionUrl': 'https://e.serverbid.com/i.gif',
        'contents': [{
          'type': 'html',
          'body': '<html></html>',
          'data': {
            'height': 90,
            'width': 728,
            'imageUrl': 'https://static.adzerk.net/Advertisers/b0ab77db8a7848c8b78931aed022a5ef.gif',
            'fileName': 'b0ab77db8a7848c8b78931aed022a5ef.gif'
          },
          'template': 'image'
        }],
        'height': 90,
        'width': 728,
        'events': [],
        'pricing': {'price': 0.5, 'clearPrice': 0.5, 'revenue': 0.0005, 'rateType': 2, 'eCPM': 0.5},
        'mediaType': 'banner',
        'cats': ['IAB1', 'IAB2'],
        'networkId': 2345678,
      }
    }
  }
};

const AD_SERVER_RESPONSE_VIDEO_1 = {
  'headers': null,
  'body': {
    'user': { 'key': 'ue1-2d33e91b71e74929b4aeecc23f4376f1' },
    'pixels': [{ 'type': 'image', 'url': '//sync.serverbid.com/ss/' }],
    'decisions': {
      '6202d555b2f94537': {
        'adId': 3866158402,
        'creativeId': 'C1-somo-test-video',
        'width': 640,
        'height': 480,
        'pricing': {
          'clearPrice': 1.58
        },
        'vastUrl': 'https://x.serverbid.com/rtb/v?auc=217c051d06b011ed9cbc72b17f01ec03&sc=1.575&s=22&a=9dcab16d340d664310c2135a76989fe946a9d46e5d5f24ff5e2f17bffbb7704a43638bd3f600951e&n=9&r=0&t=1658158906595',
        'uuid': 'f1e7287514ce11ed9c1de2b3ba87449a',
        'bidderName': 'consumable',
        'adomain': ['consumabletv.com'],
        'cats': ['IAB3-1'],
        'mediaType': 'video',
        'networkId': 1
      }
    }
  }
};

const AD_SERVER_RESPONSE_VIDEO_2 = {
  'headers': null,
  'body': {
    'user': { 'key': 'ue1-2d33e91b71e74929b4aeecc23f4376f1' },
    'pixels': [{ 'type': 'image', 'url': '//sync.serverbid.com/ss/' }],
    'decisions': {
      '6202d555b2f94537': {
        'adId': 3866158402,
        'creativeId': 'C1-somo-test-video',
        'width': 640,
        'height': 480,
        'pricing': {
          'clearPrice': 1.58
        },
        'vastXml': '<VAST version="3.0">',
        'uuid': 'f1e7287514ce11ed9c1de2b3ba87449a',
        'bidderName': 'consumable',
        'adomain': ['consumabletv.com'],
        'cats': ['IAB3-1'],
        'mediaType': 'video',
        'networkId': 1
      }
    }
  }
};

const BUILD_REQUESTS_OUTPUT = {
  method: 'POST',
  url: 'https://e.serverbid.com/api/v2',
  data: '',
  bidRequest: BIDDER_REQUEST_2.bidRequest,
  bidderRequest: BIDDER_REQUEST_2
};

const BUILD_REQUESTS_VIDEO_OUTPUT = {
  method: 'POST',
  url: 'https://e.serverbid.com/api/v2',
  data: '',
  bidRequest: BIDDER_REQUEST_VIDEO.bidRequest,
  bidderRequest: BIDDER_REQUEST_VIDEO
};

describe('Consumable BidAdapter', function () {
  let adapter = spec;

  describe('bid request validation', function () {
    it('should accept valid bid requests', function () {
      let bid = {
        bidder: 'consumable',
        params: {
          networkId: '9969',
          siteId: '123',
          unitId: '123456',
          unitName: 'cnsmbl-unit'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should accept valid bid requests with extra fields', function () {
      let bid = {
        bidder: 'consumable',
        params: {
          networkId: '9969',
          siteId: '123',
          unitId: '123456',
          unitName: 'cnsmbl-unit',
          zoneId: '123'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should reject bid requests without siteId', function () {
      let bid = {
        bidder: 'consumable',
        params: {
          networkId: '9969',
          unitId: '123456',
          unitName: 'cnsmbl-unit'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should reject bid requests without networkId', function () {
      let bid = {
        bidder: 'consumable',
        params: {
          siteId: '9969',
          unitId: '123456',
          unitName: 'cnsmbl-unit'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests validation', function () {
    it('creates request data', function () {
      let request = spec.buildRequests(BIDDER_REQUEST_1.bidRequest, BIDDER_REQUEST_1);

      expect(request).to.exist.and.to.be.a('object');
    });

    it('request to consumable should contain a url', function () {
      let request = spec.buildRequests(BIDDER_REQUEST_1.bidRequest, BIDDER_REQUEST_1);

      expect(request.url).to.have.string('serverbid.com');
    });

    it('requires valid bids to make request', function () {
      let request = spec.buildRequests(BIDDER_REQUEST_EMPTY.bidRequest, BIDDER_REQUEST_EMPTY);
      expect(request.bidRequest).to.be.empty;
    });

    it('sends bid request to ENDPOINT via POST', function () {
      let request = spec.buildRequests(BIDDER_REQUEST_1.bidRequest, BIDDER_REQUEST_1);

      expect(request.method).to.have.string('POST');
    });

    it('passes through bidderRequest', function () {
      let request = spec.buildRequests(BIDDER_REQUEST_1.bidRequest, BIDDER_REQUEST_1);

      expect(request.bidderRequest).to.equal(BIDDER_REQUEST_1);
    });

    it('should contain schain if it exists in the bidRequest', function () {
      let request = spec.buildRequests(BIDDER_REQUEST_1.bidRequest, BIDDER_REQUEST_1);
      let data = JSON.parse(request.data);

      expect(data.schain).to.deep.equal(BIDDER_REQUEST_1.schain)
    });

    it('should not contain schain if it does not exist in the bidRequest', function () {
      let request = spec.buildRequests(BIDDER_REQUEST_2.bidRequest, BIDDER_REQUEST_2);
      let data = JSON.parse(request.data);

      expect(data.schain).to.be.undefined;
    });

    it('should contain coppa if configured', function () {
      config.setConfig({ coppa: true });
      let request = spec.buildRequests(BIDDER_REQUEST_1.bidRequest, BIDDER_REQUEST_1);
      let data = JSON.parse(request.data);

      expect(data.coppa).to.be.true;
    });

    it('should not contain coppa if not configured', function () {
      config.setConfig({ coppa: false });
      let request = spec.buildRequests(BIDDER_REQUEST_1.bidRequest, BIDDER_REQUEST_1);
      let data = JSON.parse(request.data);

      expect(data.coppa).to.be.undefined;
    });

    it('should contain video object for video requests', function () {
      let request = spec.buildRequests(BIDDER_REQUEST_VIDEO.bidRequest, BIDDER_REQUEST_VIDEO);
      let data = JSON.parse(request.data);

      expect(data.placements[0].video).to.deep.equal(BIDDER_REQUEST_VIDEO.bidRequest[0].mediaTypes.video);
    });

    it('sets bidfloor param if present', function () {
      let bidderRequest1 = deepClone(BIDDER_REQUEST_1);
      let bidderRequest2 = deepClone(BIDDER_REQUEST_2);
      bidderRequest1.bidRequest[0].params.bidFloor = 0.05;
      bidderRequest2.bidRequest[0].getFloor = function() {
        return {
          currency: 'USD',
          floor: 0.15
        }
      };
      let request1 = spec.buildRequests(bidderRequest1.bidRequest, BIDDER_REQUEST_1);
      let data1 = JSON.parse(request1.data);
      let request2 = spec.buildRequests(bidderRequest2.bidRequest, BIDDER_REQUEST_2);
      let data2 = JSON.parse(request2.data);

      expect(data1.placements[0].bidfloor).to.equal(0.05);
      expect(data2.placements[0].bidfloor).to.equal(0.15);
    });
  });
  describe('interpretResponse validation', function () {
    it('response should have valid bidderCode', function () {
      let bidRequest = spec.buildRequests(BIDDER_REQUEST_2.bidRequest, BIDDER_REQUEST_2);
      let bid = createBid(1, bidRequest.bidRequest[0]);

      expect(bid.bidderCode).to.equal('consumable');
    });

    it('response should include objects for all bids', function () {
      let bids = spec.interpretResponse(AD_SERVER_RESPONSE, BUILD_REQUESTS_OUTPUT);
      expect(bids.length).to.equal(2);
    });

    it('registers bids', function () {
      let bids = spec.interpretResponse(AD_SERVER_RESPONSE_2, BUILD_REQUESTS_OUTPUT);
      bids.forEach(b => {
        expect(b).to.have.property('cpm');
        expect(b.cpm).to.be.above(0);
        expect(b).to.have.property('requestId');
        expect(b).to.have.property('unitId');
        expect(b).to.have.property('unitName');
        expect(b).to.have.property('cpm');
        expect(b).to.have.property('width');
        expect(b).to.have.property('height');
        expect(b).to.have.property('ad');
        expect(b).to.have.property('currency', 'USD');
        expect(b).to.have.property('creativeId');
        expect(b).to.have.property('ttl', 30);
        expect(b).to.have.property('netRevenue', true);
        expect(b).to.have.property('referrer');
        expect(b.meta).to.have.property('advertiserDomains');
        expect(b.meta).to.have.property('primaryCatId');
        expect(b.meta).to.have.property('secondaryCatIds');
        expect(b.meta).to.have.property('networkId');
        expect(b.meta).to.have.property('mediaType');
      });
    });

    it('registers video bids with vastUrl', function () {
      let bids = spec.interpretResponse(AD_SERVER_RESPONSE_VIDEO_1, BUILD_REQUESTS_VIDEO_OUTPUT);

      bids.forEach(b => {
        expect(b.mediaType).to.equal('video');
        expect(b.meta).to.have.property('mediaType', 'video');
        expect(b.vastUrl).to.equal('https://x.serverbid.com/rtb/v?auc=217c051d06b011ed9cbc72b17f01ec03&sc=1.575&s=22&a=9dcab16d340d664310c2135a76989fe946a9d46e5d5f24ff5e2f17bffbb7704a43638bd3f600951e&n=9&r=0&t=1658158906595');
        expect(b.vastXml).to.be.undefined;
        expect(b.videoCacheKey).to.equal('f1e7287514ce11ed9c1de2b3ba87449a');
      });
    })

    it('registers video bids with vastXml', function () {
      let bids = spec.interpretResponse(AD_SERVER_RESPONSE_VIDEO_2, BUILD_REQUESTS_VIDEO_OUTPUT);

      bids.forEach(b => {
        expect(b.mediaType).to.equal('video');
        expect(b.meta).to.have.property('mediaType', 'video');
        expect(b.vastXml).to.equal('<VAST version="3.0">');
        expect(b.vastUrl).to.be.undefined;
        expect(b.ad).to.equal('<VAST version="3.0">');
        expect(b.videoCacheKey).to.equal('f1e7287514ce11ed9c1de2b3ba87449a');
      });
    })

    it('handles nobid responses', function () {
      let EMPTY_RESP = Object.assign({}, AD_SERVER_RESPONSE, {'body': {'decisions': null}})
      let bids = spec.interpretResponse(EMPTY_RESP, BUILD_REQUESTS_OUTPUT);

      expect(bids).to.be.empty;
    });

    it('handles no server response', function () {
      let bids = spec.interpretResponse(null, BUILD_REQUESTS_OUTPUT);

      expect(bids).to.be.empty;
    });
  });
  describe('getUserSyncs', function () {
    let syncOptions = {'iframeEnabled': true};

    it('handles empty sync options', function () {
      let opts = spec.getUserSyncs({});

      expect(opts).to.be.undefined;
    });

    it('should return a sync url if iframe syncs are enabled', function () {
      let opts = spec.getUserSyncs(syncOptions);

      expect(opts.length).to.equal(1);
    });

    it('should return a sync url if iframe syncs are enabled and server response is empty', function () {
      let opts = spec.getUserSyncs(syncOptions, []);

      expect(opts.length).to.equal(1);
    });

    it('should return a sync url if iframe syncs are enabled and server response does not contain a bdr attribute', function () {
      let opts = spec.getUserSyncs(syncOptions, [AD_SERVER_RESPONSE]);

      expect(opts.length).to.equal(1);
    });

    it('should return a sync url if iframe syncs are enabled and server response contains a bdr attribute that is not cx', function () {
      let opts = spec.getUserSyncs(syncOptions, [AD_SERVER_RESPONSE_2]);

      expect(opts.length).to.equal(1);
    });

    it('should return a sync url if iframe syncs are enabled and GDPR applies', function () {
      let gdprConsent = {
        consentString: 'GDPR_CONSENT_STRING',
        gdprApplies: true,
      }
      let opts = spec.getUserSyncs(syncOptions, [AD_SERVER_RESPONSE], gdprConsent);

      expect(opts.length).to.equal(1);
      expect(opts[0].url).to.equal('https://sync.serverbid.com/ss/730181.html?gdpr=1&gdpr_consent=GDPR_CONSENT_STRING');
    })

    it('should return a sync url if iframe syncs are enabled and GDPR is undefined', function () {
      let gdprConsent = {
        consentString: 'GDPR_CONSENT_STRING',
        gdprApplies: undefined,
      }
      let opts = spec.getUserSyncs(syncOptions, [AD_SERVER_RESPONSE], gdprConsent);

      expect(opts.length).to.equal(1);
      expect(opts[0].url).to.equal('https://sync.serverbid.com/ss/730181.html?gdpr=0&gdpr_consent=GDPR_CONSENT_STRING');
    })

    it('should return a sync url if iframe syncs are enabled and USP applies', function () {
      let uspConsent = {
        consentString: 'USP_CONSENT_STRING',
      }
      let opts = spec.getUserSyncs(syncOptions, [AD_SERVER_RESPONSE], {}, uspConsent);

      expect(opts.length).to.equal(1);
      expect(opts[0].url).to.equal('https://sync.serverbid.com/ss/730181.html?us_privacy=USP_CONSENT_STRING');
    })

    it('should return a sync url if iframe syncs are enabled, GDPR and USP applies', function () {
      let gdprConsent = {
        consentString: 'GDPR_CONSENT_STRING',
        gdprApplies: true,
      }
      let uspConsent = {
        consentString: 'USP_CONSENT_STRING',
      }
      let opts = spec.getUserSyncs(syncOptions, [AD_SERVER_RESPONSE], gdprConsent, uspConsent);

      expect(opts.length).to.equal(1);
      expect(opts[0].url).to.equal('https://sync.serverbid.com/ss/730181.html?gdpr=1&gdpr_consent=GDPR_CONSENT_STRING&us_privacy=USP_CONSENT_STRING');
    })

    it('should return a sync url if pixel syncs are enabled and some are returned from the server', function () {
      let syncOptions = {'pixelEnabled': true};
      let opts = spec.getUserSyncs(syncOptions, [AD_SERVER_RESPONSE]);

      expect(opts.length).to.equal(1);
    });
  });
  describe('unifiedId from userId module', function() {
    let sandbox, bidderRequest;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      bidderRequest = deepClone(BIDDER_REQUEST_1);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('Request should have unifiedId config params', function() {
      bidderRequest.bidRequest[0].userId = {};
      bidderRequest.bidRequest[0].userId.tdid = 'TTD_ID';
      bidderRequest.bidRequest[0].userIdAsEids = createEidsArray(bidderRequest.bidRequest[0].userId);
      let request = spec.buildRequests(bidderRequest.bidRequest, BIDDER_REQUEST_1);
      let data = JSON.parse(request.data);
      expect(data.user.eids).to.deep.equal([{
        'source': 'adserver.org',
        'uids': [{
          'id': 'TTD_ID',
          'atype': 1,
          'ext': {
            'rtiPartner': 'TDID'
          }
        }]
      }]);
    });

    it('Request should have adsrvrOrgId from UserId Module if config and userId module both have TTD ID', function() {
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        var config = {
          adsrvrOrgId: {
            'TDID': 'TTD_ID_FROM_CONFIG',
            'TDID_LOOKUP': 'TRUE',
            'TDID_CREATED_AT': '2022-06-21T09:47:00'
          }
        };
        return config[key];
      });
      bidderRequest.bidRequest[0].userId = {};
      bidderRequest.bidRequest[0].userId.tdid = 'TTD_ID';
      bidderRequest.bidRequest[0].userIdAsEids = createEidsArray(bidderRequest.bidRequest[0].userId);
      let request = spec.buildRequests(bidderRequest.bidRequest, BIDDER_REQUEST_1);
      let data = JSON.parse(request.data);
      expect(data.user.eids).to.deep.equal([{
        'source': 'adserver.org',
        'uids': [{
          'id': 'TTD_ID',
          'atype': 1,
          'ext': {
            'rtiPartner': 'TDID'
          }
        }]
      }]);
    });

    it('Request should NOT have adsrvrOrgId params if userId is NOT object', function() {
      let request = spec.buildRequests(bidderRequest.bidRequest, BIDDER_REQUEST_1);
      let data = JSON.parse(request.data);
      expect(data.user.eids).to.deep.equal(undefined);
    });

    it('Request should NOT have adsrvrOrgId params if userId.tdid is NOT string', function() {
      bidderRequest.bidRequest[0].userId = {
        tdid: 1234
      };
      let request = spec.buildRequests(bidderRequest.bidRequest, BIDDER_REQUEST_1);
      let data = JSON.parse(request.data);
      expect(data.user.eids).to.deep.equal(undefined);
    });
  });
});
