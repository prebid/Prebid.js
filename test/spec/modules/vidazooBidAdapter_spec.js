import {expect} from 'chai';
import {
  spec as adapter,
  storage,
  createDomain,
  webSessionId
} from 'modules/vidazooBidAdapter.js';
import {
  hashCode,
  extractPID,
  extractCID,
  extractSubDomain,
  getStorageItem,
  setStorageItem,
  tryParseJSON,
  getUniqueDealId,
  getNextDealId,
  getTopWindowQueryParams,
  getVidazooSessionId
} from 'libraries/vidazooUtils/bidderUtils.js'
import * as utils from 'src/utils.js';
import {version} from 'package.json';
import {useFakeTimers} from 'sinon';
import {BANNER, VIDEO} from '../../../src/mediaTypes.js';
import {config} from '../../../src/config.js';
import {deepSetValue} from 'src/utils.js';
import {getGlobal} from '../../../src/prebidGlobal.js';

export const TEST_ID_SYSTEMS = ['criteoId', 'id5id', 'idl_env', 'lipb', 'netId', 'pubcid', 'tdid', 'pubProvidedId'];

const SUB_DOMAIN = 'openrtb';

const BID = {
  'bidId': '2d52001cabd527',
  'adUnitCode': 'div-gpt-ad-12345-0',
  'params': {
    'subDomain': SUB_DOMAIN,
    'cId': '59db6b3b4ffaa70004f45cdc',
    'pId': '59ac17c192832d0011283fe3',
    'bidFloor': 0.1,
    'ext': {
      'param1': 'loremipsum',
      'param2': 'dolorsitamet'
    }
  },
  'placementCode': 'div-gpt-ad-1460505748561-0',
  'sizes': [[300, 250], [300, 600]],
  'bidderRequestId': '1fdb5ff1b6eaa7',
  'bidRequestsCount': 4,
  'bidderRequestsCount': 3,
  'bidderWinsCount': 1,
  'requestId': 'b0777d85-d061-450e-9bc7-260dd54bbb7a',
  'schain': 'a0819c69-005b-41ed-af06-1be1e0aefefc',
  'mediaTypes': [BANNER],
  'ortb2Imp': {
    'ext': {
      tid: 'c881914b-a3b5-4ecf-ad9c-1c2f37c6aabf',
      'gpid': '1234567890'
    }
  }
};

const VIDEO_BID = {
  'bidId': '2d52001cabd527',
  'adUnitCode': '63550ad1ff6642d368cba59dh5884270560',
  'bidderRequestId': '12a8ae9ada9c13',
  ortb2Imp: {
    ext: {
      tid: '56e184c6-bde9-497b-b9b9-cf47a61381ee',
    }
  },
  'bidRequestsCount': 4,
  'bidderRequestsCount': 3,
  'bidderWinsCount': 1,
  'schain': 'a0819c69-005b-41ed-af06-1be1e0aefefc',
  'params': {
    'subDomain': SUB_DOMAIN,
    'cId': '635509f7ff6642d368cb9837',
    'pId': '59ac17c192832d0011283fe3',
    'bidFloor': 0.1
  },
  'sizes': [[545, 307]],
  'mediaTypes': {
    'video': {
      'playerSize': [[545, 307]],
      'context': 'instream',
      'mimes': [
        'video/mp4',
        'application/javascript'
      ],
      'protocols': [2, 3, 5, 6],
      'maxduration': 60,
      'minduration': 0,
      'startdelay': 0,
      'linearity': 1,
      'api': [2, 7],
      'placement': 1
    }
  }
}

const ORTB2_DEVICE = {
  sua: {
    'source': 2,
    'platform': {
      'brand': 'Android',
      'version': ['8', '0', '0']
    },
    'browsers': [
      {'brand': 'Not_A Brand', 'version': ['99', '0', '0', '0']},
      {'brand': 'Google Chrome', 'version': ['109', '0', '5414', '119']},
      {'brand': 'Chromium', 'version': ['109', '0', '5414', '119']}
    ],
    'mobile': 1,
    'model': 'SM-G955U',
    'bitness': '64',
    'architecture': ''
  },
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
};

const BIDDER_REQUEST = {
  'gdprConsent': {
    'consentString': 'consent_string',
    'gdprApplies': true
  },
  'gppString': 'gpp_string',
  'gppSid': [7],
  'uspConsent': 'consent_string',
  'refererInfo': {
    'page': 'https://www.greatsite.com',
    'ref': 'https://www.somereferrer.com'
  },
  'ortb2': {
    'site': {
      'cat': ['IAB2'],
      'pagecat': ['IAB2-2'],
      'content': {
        'language': 'en',
        'data': [{
          'name': 'example.com',
          'ext': {
            'segtax': 7
          },
          'segments': [
            {'id': 'segId1'},
            {'id': 'segId2'}
          ]
        }]
      }
    },
    'regs': {
      'gpp': 'gpp_string',
      'gpp_sid': [7],
      'coppa': 0
    },
    device: ORTB2_DEVICE,
    user: {
      data: [
        {
          ext: {segtax: 600, segclass: '1'},
          name: 'example.com',
          segment: [{id: '243'}],
        },
      ],
    },
    source: {
      ext: {
        omidpn: 'MyIntegrationPartner',
        omidpv: '7.1'
      }
    }
  }
};

const SERVER_RESPONSE = {
  body: {
    cid: 'testcid123',
    results: [{
      'ad': '<iframe>console.log("hello world")</iframe>',
      'bidId': '2d52001cabd527-response',
      'price': 0.8,
      'creativeId': '12610997325162499419',
      'exp': 30,
      'width': 300,
      'height': 250,
      'advertiserDomains': ['securepubads.g.doubleclick.net'],
      'cookies': [{
        'src': 'https://sync.com',
        'type': 'iframe'
      }, {
        'src': 'https://sync.com',
        'type': 'img'
      }]
    }]
  }
};

const VIDEO_SERVER_RESPONSE = {
  body: {
    'cid': '635509f7ff6642d368cb9837',
    'results': [{
      'ad': '<VAST version=\"3.0\" xmlns:xs=\"http://www.w3.org/2001/XMLSchema\"></VAST>',
      'advertiserDomains': ['vidazoo.com'],
      'exp': 60,
      'width': 545,
      'height': 307,
      'mediaType': 'video',
      'creativeId': '12610997325162499419',
      'price': 2,
      'cookies': []
    }]
  }
};

const ORTB2_OBJ = {
  "device": ORTB2_DEVICE,
  "regs": {"coppa": 0, "gpp": "gpp_string", "gpp_sid": [7]},
  "site": {
    "cat": ["IAB2"],
    "content": {
      "data": [{
        "ext": {"segtax": 7},
        "name": "example.com",
        "segments": [{"id": "segId1"}, {"id": "segId2"}]
      }],
      "language": "en"
    },
    "pagecat": ["IAB2-2"]
  },
  "source": {"ext": {"omidpn": "MyIntegrationPartner", "omidpv": "7.1"}},
  "user": {
    "data": [{"ext": {"segclass": "1", "segtax": 600}, "name": "example.com", "segment": [{"id": "243"}]}]
  }
};

const REQUEST = {
  data: {
    width: 300,
    height: 250,
    bidId: '2d52001cabd527'
  }
};

describe('VidazooBidAdapter', function () {
  before(() => config.resetConfig());
  after(() => config.resetConfig());

  describe('validtae spec', function () {
    it('exists and is a function', function () {
      expect(adapter.isBidRequestValid).to.exist.and.to.be.a('function');
    });

    it('exists and is a function', function () {
      expect(adapter.buildRequests).to.exist.and.to.be.a('function');
    });

    it('exists and is a function', function () {
      expect(adapter.interpretResponse).to.exist.and.to.be.a('function');
    });

    it('exists and is a function', function () {
      expect(adapter.getUserSyncs).to.exist.and.to.be.a('function');
    });

    it('exists and is a string', function () {
      expect(adapter.code).to.exist.and.to.be.a('string');
    });

    it('exists and contains media types', function () {
      expect(adapter.supportedMediaTypes).to.exist.and.to.be.an('array').with.length(2);
      expect(adapter.supportedMediaTypes).to.contain.members([BANNER, VIDEO]);
    });
  });

  describe('validate bid requests', function () {
    it('should require cId', function () {
      const isValid = adapter.isBidRequestValid({
        params: {
          pId: 'pid'
        }
      });
      expect(isValid).to.be.false;
    });

    it('should require pId', function () {
      const isValid = adapter.isBidRequestValid({
        params: {
          cId: 'cid'
        }
      });
      expect(isValid).to.be.false;
    });

    it('should validate correctly', function () {
      const isValid = adapter.isBidRequestValid({
        params: {
          cId: 'cid',
          pId: 'pid'
        }
      });
      expect(isValid).to.be.true;
    });
  });

  describe('build requests', function () {
    let sandbox;
    before(function () {
      getGlobal().bidderSettings = {
        vidazoo: {
          storageAllowed: true,
        }
      };
      sandbox = sinon.createSandbox();
      sandbox.stub(Date, 'now').returns(1000);
    });

    it('should build video request', function () {
      const hashUrl = hashCode(BIDDER_REQUEST.refererInfo.page);
      config.setConfig({
        bidderTimeout: 3000
      });
      const requests = adapter.buildRequests([VIDEO_BID], BIDDER_REQUEST);
      expect(requests).to.have.length(1);
      expect(requests[0]).to.deep.equal({
        method: 'POST',
        url: `${createDomain(SUB_DOMAIN)}/prebid/multi/635509f7ff6642d368cb9837`,
        data: {
          adUnitCode: '63550ad1ff6642d368cba59dh5884270560',
          bidFloor: 0.1,
          bidId: '2d52001cabd527',
          bidderVersion: adapter.version,
          cat: ['IAB2'],
          pagecat: ['IAB2-2'],
          ortb2Imp: VIDEO_BID.ortb2Imp,
          ortb2: ORTB2_OBJ,
          cb: 1000,
          dealId: 1,
          gdpr: 1,
          gdprConsent: 'consent_string',
          usPrivacy: 'consent_string',
          gppString: 'gpp_string',
          gppSid: [7],
          bidRequestsCount: 4,
          bidderRequestsCount: 3,
          bidderWinsCount: 1,
          bidderTimeout: 3000,
          transactionId: '56e184c6-bde9-497b-b9b9-cf47a61381ee',
          bidderRequestId: '12a8ae9ada9c13',
          gpid: '',
          prebidVersion: version,
          ptrace: '1000',
          vdzhum: '1000',
          publisherId: '59ac17c192832d0011283fe3',
          url: 'https%3A%2F%2Fwww.greatsite.com',
          referrer: 'https://www.somereferrer.com',
          res: `${window.top.screen.width}x${window.top.screen.height}`,
          schain: VIDEO_BID.schain,
          sessionId: '',
          sizes: ['545x307'],
          sua: {
            'source': 2,
            'platform': {
              'brand': 'Android',
              'version': ['8', '0', '0']
            },
            'browsers': [
              {'brand': 'Not_A Brand', 'version': ['99', '0', '0', '0']},
              {'brand': 'Google Chrome', 'version': ['109', '0', '5414', '119']},
              {'brand': 'Chromium', 'version': ['109', '0', '5414', '119']}
            ],
            'mobile': 1,
            'model': 'SM-G955U',
            'bitness': '64',
            'architecture': ''
          },
          contentLang: 'en',
          coppa: 0,
          device: ORTB2_DEVICE,
          contentData: [{
            'name': 'example.com',
            'ext': {
              'segtax': 7
            },
            'segments': [
              {'id': 'segId1'},
              {'id': 'segId2'}
            ]
          }],
          userData: [
            {
              ext: {segtax: 600, segclass: '1'},
              name: 'example.com',
              segment: [{id: '243'}],
            },
          ],
          uniqueDealId: `${hashUrl}_${Date.now().toString()}`,
          uqs: getTopWindowQueryParams(),
          isStorageAllowed: true,
          webSessionId: webSessionId,
          mediaTypes: {
            video: {
              api: [2, 7],
              context: 'instream',
              linearity: 1,
              maxduration: 60,
              mimes: [
                'video/mp4',
                'application/javascript'
              ],
              minduration: 0,
              placement: 1,
              playerSize: [[545, 307]],
              protocols: [2, 3, 5, 6],
              startdelay: 0
            }
          },
          omidpn: 'MyIntegrationPartner',
          omidpv: '7.1'
        }
      })
      ;
    });

    it('should build banner request for each size', function () {
      config.setConfig({
        bidderTimeout: 3000
      });
      const hashUrl = hashCode(BIDDER_REQUEST.refererInfo.page);
      const requests = adapter.buildRequests([BID], BIDDER_REQUEST);
      expect(requests).to.have.length(1);
      expect(requests[0]).to.deep.equal({
        method: 'POST',
        url: `${createDomain(SUB_DOMAIN)}/prebid/multi/59db6b3b4ffaa70004f45cdc`,
        data: {
          gdprConsent: 'consent_string',
          gdpr: 1,
          usPrivacy: 'consent_string',
          gppString: 'gpp_string',
          gppSid: [7],
          bidRequestsCount: 4,
          bidderRequestsCount: 3,
          bidderWinsCount: 1,
          bidderTimeout: 3000,
          transactionId: 'c881914b-a3b5-4ecf-ad9c-1c2f37c6aabf',
          bidderRequestId: '1fdb5ff1b6eaa7',
          sizes: ['300x250', '300x600'],
          sua: {
            'source': 2,
            'platform': {
              'brand': 'Android',
              'version': ['8', '0', '0']
            },
            'browsers': [
              {'brand': 'Not_A Brand', 'version': ['99', '0', '0', '0']},
              {'brand': 'Google Chrome', 'version': ['109', '0', '5414', '119']},
              {'brand': 'Chromium', 'version': ['109', '0', '5414', '119']}
            ],
            'mobile': 1,
            'model': 'SM-G955U',
            'bitness': '64',
            'architecture': ''
          },
          device: ORTB2_DEVICE,
          url: 'https%3A%2F%2Fwww.greatsite.com',
          referrer: 'https://www.somereferrer.com',
          cb: 1000,
          bidFloor: 0.1,
          bidId: '2d52001cabd527',
          adUnitCode: 'div-gpt-ad-12345-0',
          publisherId: '59ac17c192832d0011283fe3',
          dealId: 2,
          sessionId: '',
          uniqueDealId: `${hashUrl}_${Date.now().toString()}`,
          bidderVersion: adapter.version,
          prebidVersion: version,
          schain: BID.schain,
          ptrace: '1000',
          vdzhum: '1000',
          res: `${window.top.screen.width}x${window.top.screen.height}`,
          mediaTypes: [BANNER],
          uqs: getTopWindowQueryParams(),
          'ext.param1': 'loremipsum',
          'ext.param2': 'dolorsitamet',
          isStorageAllowed: true,
          gpid: '1234567890',
          cat: ['IAB2'],
          pagecat: ['IAB2-2'],
          ortb2Imp: BID.ortb2Imp,
          ortb2: ORTB2_OBJ,
          contentLang: 'en',
          coppa: 0,
          contentData: [{
            'name': 'example.com',
            'ext': {
              'segtax': 7
            },
            'segments': [
              {'id': 'segId1'},
              {'id': 'segId2'}
            ]
          }],
          userData: [
            {
              ext: {segtax: 600, segclass: '1'},
              name: 'example.com',
              segment: [{id: '243'}],
            },
          ],
          webSessionId: webSessionId
        }
      });
    });

    it('should build single banner request for multiple bids', function () {
      config.setConfig({
        bidderTimeout: 3000,
        vidazoo: {
          singleRequest: true,
          chunkSize: 2
        }
      });

      const hashUrl = hashCode(BIDDER_REQUEST.refererInfo.page);

      const BID2 = utils.deepClone(BID);
      BID2.bidId = '2d52001cabd528';
      BID2.adUnitCode = 'div-gpt-ad-12345-1';
      BID2.sizes = [[300, 250]];

      const REQUEST_DATA = {
        gdprConsent: 'consent_string',
        gdpr: 1,
        usPrivacy: 'consent_string',
        gppString: 'gpp_string',
        gppSid: [7],
        bidRequestsCount: 4,
        bidderRequestsCount: 3,
        bidderWinsCount: 1,
        bidderTimeout: 3000,
        transactionId: 'c881914b-a3b5-4ecf-ad9c-1c2f37c6aabf',
        bidderRequestId: '1fdb5ff1b6eaa7',
        sizes: ['300x250', '300x600'],
        sua: {
          'source': 2,
          'platform': {
            'brand': 'Android',
            'version': ['8', '0', '0']
          },
          'browsers': [
            {'brand': 'Not_A Brand', 'version': ['99', '0', '0', '0']},
            {'brand': 'Google Chrome', 'version': ['109', '0', '5414', '119']},
            {'brand': 'Chromium', 'version': ['109', '0', '5414', '119']}
          ],
          'mobile': 1,
          'model': 'SM-G955U',
          'bitness': '64',
          'architecture': ''
        },
        device: ORTB2_DEVICE,
        url: 'https%3A%2F%2Fwww.greatsite.com',
        referrer: 'https://www.somereferrer.com',
        cb: 1000,
        bidFloor: 0.1,
        bidId: '2d52001cabd527',
        adUnitCode: 'div-gpt-ad-12345-0',
        publisherId: '59ac17c192832d0011283fe3',
        dealId: 3,
        sessionId: '',
        uniqueDealId: `${hashUrl}_${Date.now().toString()}`,
        bidderVersion: adapter.version,
        prebidVersion: version,
        schain: BID.schain,
        ptrace: '1000',
        vdzhum: '1000',
        res: `${window.top.screen.width}x${window.top.screen.height}`,
        mediaTypes: [BANNER],
        uqs: getTopWindowQueryParams(),
        'ext.param1': 'loremipsum',
        'ext.param2': 'dolorsitamet',
        isStorageAllowed: true,
        gpid: '1234567890',
        cat: ['IAB2'],
        pagecat: ['IAB2-2'],
        contentLang: 'en',
        coppa: 0,
        contentData: [{
          'name': 'example.com',
          'ext': {
            'segtax': 7
          },
          'segments': [
            {'id': 'segId1'},
            {'id': 'segId2'}
          ]
        }],
        userData: [
          {
            ext: {segtax: 600, segclass: '1'},
            name: 'example.com',
            segment: [{id: '243'}],
          },
        ],
        webSessionId: webSessionId
      };

      const REQUEST_DATA2 = utils.deepClone(REQUEST_DATA);
      REQUEST_DATA2.bidId = '2d52001cabd528';
      REQUEST_DATA2.adUnitCode = 'div-gpt-ad-12345-1';
      REQUEST_DATA2.sizes = ['300x250'];
      REQUEST_DATA2.dealId = 4;

      const requests = adapter.buildRequests([BID, BID2], BIDDER_REQUEST);
      expect(requests).to.have.length(1);

      expect(requests[0]).to.deep.equal({
        method: 'POST',
        url: `${createDomain(SUB_DOMAIN)}/prebid/multi/59db6b3b4ffaa70004f45cdc`,
        data: {bids: [
          {...REQUEST_DATA, ortb2: ORTB2_OBJ, ortb2Imp: BID.ortb2Imp},
          {...REQUEST_DATA2, ortb2: ORTB2_OBJ, ortb2Imp: BID.ortb2Imp}
        ]}
      });
    });

    it('should return separated requests for video and banner if singleRequest is true', function () {
      config.setConfig({
        bidderTimeout: 3000,
        vidazoo: {
          singleRequest: true,
          chunkSize: 2
        }
      });

      const requests = adapter.buildRequests([BID, VIDEO_BID], BIDDER_REQUEST);
      expect(requests).to.have.length(2);
    });

    it('should chunk requests if requests exceed chunkSize and singleRequest is true', function () {
      config.setConfig({
        bidderTimeout: 3000,
        vidazoo: {
          singleRequest: true,
          chunkSize: 2
        }
      });

      const requests = adapter.buildRequests([BID, BID, BID, BID], BIDDER_REQUEST);
      expect(requests).to.have.length(2);
    });

    it('should set fledge correctly if enabled', function () {
      config.resetConfig();
      const bidderRequest = utils.deepClone(BIDDER_REQUEST);
      bidderRequest.paapi = {enabled: true};
      deepSetValue(bidderRequest, 'ortb2Imp.ext.ae', 1);
      const requests = adapter.buildRequests([BID], bidderRequest);
      expect(requests[0].data.fledge).to.equal(1);
    });

    after(function () {
      getGlobal().bidderSettings = {};
      config.resetConfig();
      sandbox.restore();
    });
  });

  describe('getUserSyncs', function () {
    it('should have valid user sync with iframeEnabled', function () {
      const result = adapter.getUserSyncs({iframeEnabled: true}, [SERVER_RESPONSE]);

      expect(result).to.deep.equal([{
        type: 'iframe',
        url: 'https://sync.cootlogix.com/api/sync/iframe/?cid=testcid123&gdpr=0&gdpr_consent=&us_privacy=&coppa=0'
      }]);
    });

    it('should have valid user sync with cid on response', function () {
      const result = adapter.getUserSyncs({iframeEnabled: true}, [SERVER_RESPONSE]);
      expect(result).to.deep.equal([{
        type: 'iframe',
        url: 'https://sync.cootlogix.com/api/sync/iframe/?cid=testcid123&gdpr=0&gdpr_consent=&us_privacy=&coppa=0'
      }]);
    });

    it('should have valid user sync with pixelEnabled', function () {
      const result = adapter.getUserSyncs({pixelEnabled: true}, [SERVER_RESPONSE]);

      expect(result).to.deep.equal([{
        'url': 'https://sync.cootlogix.com/api/sync/image/?cid=testcid123&gdpr=0&gdpr_consent=&us_privacy=&coppa=0',
        'type': 'image'
      }]);
    });

    it('should have valid user sync with coppa 1 on response', function () {
      config.setConfig({
        coppa: 1
      });
      const result = adapter.getUserSyncs({iframeEnabled: true}, [SERVER_RESPONSE]);
      expect(result).to.deep.equal([{
        type: 'iframe',
        url: 'https://sync.cootlogix.com/api/sync/iframe/?cid=testcid123&gdpr=0&gdpr_consent=&us_privacy=&coppa=1'
      }]);
    });
  });

  describe('interpret response', function () {
    it('should return empty array when there is no response', function () {
      const responses = adapter.interpretResponse(null);
      expect(responses).to.be.empty;
    });

    it('should return empty array when there is no ad', function () {
      const responses = adapter.interpretResponse({price: 1, ad: ''});
      expect(responses).to.be.empty;
    });

    it('should return empty array when there is no price', function () {
      const responses = adapter.interpretResponse({price: null, ad: 'great ad'});
      expect(responses).to.be.empty;
    });

    it('should return an array of interpreted banner responses', function () {
      const responses = adapter.interpretResponse(SERVER_RESPONSE, REQUEST);
      expect(responses).to.have.length(1);
      expect(responses[0]).to.deep.equal({
        requestId: '2d52001cabd527',
        cpm: 0.8,
        width: 300,
        height: 250,
        creativeId: '12610997325162499419',
        currency: 'USD',
        netRevenue: true,
        ttl: 30,
        ad: '<iframe>console.log("hello world")</iframe>',
        meta: {
          advertiserDomains: ['securepubads.g.doubleclick.net']
        }
      });
    });

    it('should get meta from response metaData', function () {
      const serverResponse = utils.deepClone(SERVER_RESPONSE);
      serverResponse.body.results[0].metaData = {
        advertiserDomains: ['vidazoo.com'],
        agencyName: 'Agency Name',
      };
      const responses = adapter.interpretResponse(serverResponse, REQUEST);
      expect(responses[0].meta).to.deep.equal({
        advertiserDomains: ['vidazoo.com'],
        agencyName: 'Agency Name'
      });
    });

    it('should return an array of interpreted video responses', function () {
      const responses = adapter.interpretResponse(VIDEO_SERVER_RESPONSE, REQUEST);
      expect(responses).to.have.length(1);
      expect(responses[0]).to.deep.equal({
        requestId: '2d52001cabd527',
        cpm: 2,
        width: 545,
        height: 307,
        mediaType: 'video',
        creativeId: '12610997325162499419',
        currency: 'USD',
        netRevenue: true,
        ttl: 60,
        vastXml: '<VAST version=\"3.0\" xmlns:xs=\"http://www.w3.org/2001/XMLSchema\"></VAST>',
        meta: {
          advertiserDomains: ['vidazoo.com']
        }
      });
    });

    it('should populate requestId from response in case of singleRequest true', function () {
      config.setConfig({
        vidazoo: {
          singleRequest: true,
          chunkSize: 2
        }
      });

      const responses = adapter.interpretResponse(SERVER_RESPONSE, REQUEST);
      expect(responses).to.have.length(1);
      expect(responses[0].requestId).to.equal('2d52001cabd527-response');

      config.resetConfig();
    });

    it('should take default TTL', function () {
      const serverResponse = utils.deepClone(SERVER_RESPONSE);
      delete serverResponse.body.results[0].exp;
      const responses = adapter.interpretResponse(serverResponse, REQUEST);
      expect(responses).to.have.length(1);
      expect(responses[0].ttl).to.equal(300);
    });

    it('should add nurl if exists on response', function () {
      const serverResponse = utils.deepClone(SERVER_RESPONSE);
      serverResponse.body.results[0].nurl = 'https://test.com/win-notice?test=123';
      const responses = adapter.interpretResponse(serverResponse, REQUEST);
      expect(responses).to.have.length(1);
      expect(responses[0].nurl).to.equal('https://test.com/win-notice?test=123');
    });
  });

  describe('user id system', function () {
    TEST_ID_SYSTEMS.forEach((idSystemProvider) => {
      const id = Date.now().toString();
      const bid = utils.deepClone(BID);

      const userId = (function () {
        switch (idSystemProvider) {
          case 'lipb':
            return {lipbid: id};
          case 'id5id':
            return {uid: id};
          default:
            return id;
        }
      })();

      bid.userId = {
        [idSystemProvider]: userId
      };

      it(`should include 'uid.${idSystemProvider}' in request params`, function () {
        const requests = adapter.buildRequests([bid], BIDDER_REQUEST);
        expect(requests[0].data[`uid.${idSystemProvider}`]).to.equal(id);
      });
    });
    // testing bid.userIdAsEids handling
    it("should include user ids from bid.userIdAsEids (length=1)", function() {
      const bid = utils.deepClone(BID);
      bid.userIdAsEids = [
        {
          "source": "audigent.com",
          "uids": [{"id": "fakeidi6j6dlc6e"}]
        }
      ]
      const requests = adapter.buildRequests([bid], BIDDER_REQUEST);
      expect(requests[0].data['uid.audigent.com']).to.equal("fakeidi6j6dlc6e");
    })
    it("should include user ids from bid.userIdAsEids (length=2)", function() {
      const bid = utils.deepClone(BID);
      bid.userIdAsEids = [
        {
          "source": "audigent.com",
          "uids": [{"id": "fakeidi6j6dlc6e"}]
        },
        {
          "source": "rwdcntrl.net",
          "uids": [{"id": "fakeid6f35197d5c", "atype": 1}]
        }
      ]
      const requests = adapter.buildRequests([bid], BIDDER_REQUEST);
      expect(requests[0].data['uid.audigent.com']).to.equal("fakeidi6j6dlc6e");
      expect(requests[0].data['uid.rwdcntrl.net']).to.equal("fakeid6f35197d5c");
    })
    // testing user.ext.eid handling
    it("should include user ids from user.ext.eid (length=1)", function() {
      const bid = utils.deepClone(BID);
      bid.user = {
        ext: {
          eids: [
            {
              "source": "pubcid.org",
              "uids": [{"id": "fakeid8888dlc6e"}]
            }
          ]
        }
      }
      const requests = adapter.buildRequests([bid], BIDDER_REQUEST);
      expect(requests[0].data['uid.pubcid.org']).to.equal("fakeid8888dlc6e");
    })
    it("should include user ids from user.ext.eid (length=2)", function() {
      const bid = utils.deepClone(BID);
      bid.user = {
        ext: {
          eids: [
            {
              "source": "pubcid.org",
              "uids": [{"id": "fakeid8888dlc6e"}]
            },
            {
              "source": "adserver.org",
              "uids": [{"id": "fakeid495ff1"}]
            }
          ]
        }
      }
      const requests = adapter.buildRequests([bid], BIDDER_REQUEST);
      expect(requests[0].data['uid.pubcid.org']).to.equal("fakeid8888dlc6e");
      expect(requests[0].data['uid.adserver.org']).to.equal("fakeid495ff1");
    })
  });

  describe('alternate param names extractors', function () {
    it('should return undefined when param not supported', function () {
      const cid = extractCID({'c_id': '1'});
      const pid = extractPID({'p_id': '1'});
      const subDomain = extractSubDomain({'sub_domain': 'prebid'});
      expect(cid).to.be.undefined;
      expect(pid).to.be.undefined;
      expect(subDomain).to.be.undefined;
    });

    it('should return value when param supported', function () {
      const cid = extractCID({'cID': '1'});
      const pid = extractPID({'Pid': '2'});
      const subDomain = extractSubDomain({'subDOMAIN': 'prebid'});
      expect(cid).to.be.equal('1');
      expect(pid).to.be.equal('2');
      expect(subDomain).to.be.equal('prebid');
    });
  });

  describe('vidazoo session id', function () {
    before(function () {
      getGlobal().bidderSettings = {
        vidazoo: {
          storageAllowed: true
        }
      };
    });
    after(function () {
      getGlobal().bidderSettings = {};
    });
    it('should get undefined vidazoo session id', function () {
      const sessionId = getVidazooSessionId(storage);
      expect(sessionId).to.be.empty;
    });

    it('should get vidazoo session id from storage', function () {
      const vidSid = '1234-5678';
      window.localStorage.setItem('vidSid', vidSid);
      const sessionId = getVidazooSessionId(storage);
      expect(sessionId).to.be.equal(vidSid);
    });
  });

  describe('deal id', function () {
    before(function () {
      getGlobal().bidderSettings = {
        vidazoo: {
          storageAllowed: true
        }
      };
    });
    after(function () {
      getGlobal().bidderSettings = {};
    });
    const key = 'myDealKey';

    it('should get the next deal id', function () {
      const dealId = getNextDealId(storage, key);
      const nextDealId = getNextDealId(storage, key);
      expect(dealId).to.be.equal(1);
      expect(nextDealId).to.be.equal(2);
    });

    it('should get the first deal id on expiration', function (done) {
      setTimeout(function () {
        const dealId = getNextDealId(storage, key, 100);
        expect(dealId).to.be.equal(1);
        done();
      }, 200);
    });
  });

  describe('unique deal id', function () {
    before(function () {
      getGlobal().bidderSettings = {
        vidazoo: {
          storageAllowed: true
        }
      };
    });
    after(function () {
      getGlobal().bidderSettings = {};
    });
    const key = 'myKey';
    let uniqueDealId;
    beforeEach(() => {
      uniqueDealId = getUniqueDealId(storage, key, 0);
    })

    it('should get current unique deal id', function (done) {
      // waiting some time so `now` will become past
      setTimeout(() => {
        const current = getUniqueDealId(storage, key);
        expect(current).to.be.equal(uniqueDealId);
        done();
      }, 200);
    });

    it('should get new unique deal id on expiration', function (done) {
      setTimeout(() => {
        const current = getUniqueDealId(storage, key, 100);
        expect(current).to.not.be.equal(uniqueDealId);
        done();
      }, 200)
    });
  });

  describe('storage utils', function () {
    before(function () {
      getGlobal().bidderSettings = {
        vidazoo: {
          storageAllowed: true
        }
      };
    });
    after(function () {
      getGlobal().bidderSettings = {};
    });
    it('should get value from storage with create param', function () {
      const now = Date.now();
      const clock = useFakeTimers({
        shouldAdvanceTime: true,
        now
      });
      setStorageItem(storage, 'myKey', 2020);
      const {value, created} = getStorageItem(storage, 'myKey');
      expect(created).to.be.equal(now);
      expect(value).to.be.equal(2020);
      expect(typeof value).to.be.equal('number');
      expect(typeof created).to.be.equal('number');
      clock.restore();
    });

    it('should get external stored value', function () {
      const value = 'superman'
      window.localStorage.setItem('myExternalKey', value);
      const item = getStorageItem(storage, 'myExternalKey');
      expect(item).to.be.equal(value);
    });

    it('should parse JSON value', function () {
      const data = JSON.stringify({event: 'send'});
      const {event} = tryParseJSON(data);
      expect(event).to.be.equal('send');
    });

    it('should get original value on parse fail', function () {
      const value = 21;
      const parsed = tryParseJSON(value);
      expect(typeof parsed).to.be.equal('number');
      expect(parsed).to.be.equal(value);
    });
  });

  describe('validate onBidWon', function () {
    beforeEach(function () {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function () {
      utils.triggerPixel.restore();
    });

    it('should call triggerPixel if nurl exists', function () {
      const bid = {
        adUnitCode: 'div-gpt-ad-12345-0',
        adId: '2d52001cabd527',
        auctionId: '1fdb5ff1b6eaa7',
        transactionId: 'c881914b-a3b5-4ecf-ad9c-1c2f37c6aabf',
        status: 'rendered',
        timeToRespond: 100,
        cpm: 0.8,
        originalCpm: 0.8,
        creativeId: '12610997325162499419',
        currency: 'USD',
        originalCurrency: 'USD',
        height: 250,
        mediaType: 'banner',
        nurl: 'https://test.com/win-notice?test=123',
        netRevenue: true,
        requestId: '2d52001cabd527',
        ttl: 30,
        width: 300
      };
      adapter.onBidWon(bid);
      expect(utils.triggerPixel.called).to.be.true;

      const url = utils.triggerPixel.args[0];

      expect(url[0]).to.be.equal('https://test.com/win-notice?test=123&adId=2d52001cabd527&creativeId=12610997325162499419&auctionId=1fdb5ff1b6eaa7&transactionId=c881914b-a3b5-4ecf-ad9c-1c2f37c6aabf&adUnitCode=div-gpt-ad-12345-0&cpm=0.8&currency=USD&originalCpm=0.8&originalCurrency=USD&netRevenue=true&mediaType=banner&timeToRespond=100&status=rendered');
    });

    it('should not call triggerPixel if nurl does not exist', function () {
      const bid = {
        adUnitCode: 'div-gpt-ad-12345-0',
        adId: '2d52001cabd527',
        auctionId: '1fdb5ff1b6eaa7',
        transactionId: 'c881914b-a3b5-4ecf-ad9c-1c2f37c6aabf',
        status: 'rendered',
        timeToRespond: 100,
        cpm: 0.8,
        originalCpm: 0.8,
        creativeId: '12610997325162499419',
        currency: 'USD',
        originalCurrency: 'USD',
        height: 250,
        mediaType: 'banner',
        netRevenue: true,
        requestId: '2d52001cabd527',
        ttl: 30,
        width: 300
      };
      adapter.onBidWon(bid);
      expect(utils.triggerPixel.called).to.be.false;
    });
  });
});
