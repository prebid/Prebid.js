import { expect } from 'chai';
import { spec as adapter } from 'modules/excoBidAdapter';
import { version } from 'package.json';
import { BANNER, VIDEO } from '../../../src/mediaTypes';
import { config } from '../../../src/config';

const BID = {
  bidId: '1731e91fa1236fd',
  adUnitCode: '300x250',
  params: {
    accountId: 'accountId',
    publisherId: 'publisherId',
    tagId: 'tagId',
  },
  maxBidderCalls: -1,
  ortb2Imp: { ext: {} },
  mediaTypes: {
    banner: {
      sizes: [[300, 250]],
    },
  },
  transactionId: null,
  sizes: [[300, 250]],
  bidderRequestId: '1677eaa35e64f46',
  auctionId: null,
  bidRequestsCount: 1,
  bidderRequestsCount: 1,
  bidderWinsCount: 0,
};

const ORTB2_DEVICE = {
  w: 1309,
  h: 1305,
  dnt: 0,
  ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  language: 'en',
  sua: {
    source: 1,
    platform: { brand: 'Windows' },
    browsers: [
      { brand: 'Not(A:Brand', version: ['99'] },
      { brand: 'Google Chrome', version: ['133'] },
      { brand: 'Chromium', version: ['133'] },
    ],
    mobile: 0,
  },
};

const BIDDER_REQUEST = {
  gdprConsent: {
    consentString: 'consent_string',
    gdprApplies: true,
  },
  gppString: 'gpp_string',
  gppSid: [7],
  uspConsent: 'consent_string',
  refererInfo: {
    page: 'https://www.greatsite.com',
    ref: 'https://www.somereferrer.com',
  },
  ortb2: {
    site: {
      content: {
        language: 'en',
      },
    },
    device: ORTB2_DEVICE,
  },
};

const SERVER_RESPONSE = {
  body: {
    cid: 'testcid123',
    results: [
      {
        ad: '<iframe>console.log("hello world")</iframe>',
        price: 0.8,
        creativeId: '12610997325162499419',
        exp: 30,
        width: 300,
        height: 250,
        advertiserDomains: ['securepubads.g.doubleclick.net'],
        cookies: [
          {
            src: 'https://sync.com',
            type: 'iframe',
          },
        ],
      },
    ],
  },
};

const REQUEST = {
  data: {
    width: 300,
    height: 250,
    bidId: BID.bidId,
  },
};

describe('ExcoBidAdapter', function () {
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
      expect(adapter.supportedMediaTypes)
        .to.exist.and.to.be.an('array')
        .with.length(2);
      expect(adapter.supportedMediaTypes).to.contain.members([BANNER, VIDEO]);
    });
  });

  describe('validate bid requests', function () {
    it('should require accountId', function () {
      const isValid = adapter.isBidRequestValid({
        params: {
          publisherId: 'publisherId',
          // accountId: 'accountId',
          tagId: 'tagId',
        },
      });
      expect(isValid).to.be.false;
    });

    it('should require publisherId', function () {
      const isValid = adapter.isBidRequestValid({
        params: {
          // publisherId: 'publisherId',
          accountId: 'accountId',
          tagId: 'tagId',
        },
      });
      expect(isValid).to.be.false;
    });

    it('should require tagId', function () {
      const isValid = adapter.isBidRequestValid({
        params: {
          publisherId: 'publisherId',
          accountId: 'accountId',
          // tagId: 'tagId',
        },
      });
      expect(isValid).to.be.false;
    });

    it('should validate correctly', function () {
      const isValid = adapter.isBidRequestValid({
        params: {
          publisherId: 'publisherId',
          accountId: 'accountId',
          tagId: 'tagId',
        },
      });
      expect(isValid).to.be.true;
    });
  });

  describe('build requests', function () {
    let sandbox;
    before(function () {
      $$PREBID_GLOBAL$$.bidderSettings = {
        exco: {
          storageAllowed: true,
        },
      };
      sandbox = sinon.sandbox.create();
      sandbox.stub(Date, 'now').returns(1000);
    });

    it('should build banner request for each size', function () {
      config.setConfig({
        bidderTimeout: 3000,
        enableTIDs: true,
      });
      const requests = adapter.buildRequests([BID], BIDDER_REQUEST);
      expect(requests).to.have.length(1);
      expect(requests[0]).to.deep.equal({
        method: 'POST',
        url: '//v.ex.co/se/openrtb/hb/pbjs',
        data: {
          imp: [
            {
              ext: {
                prebid: {
                  bidder: {
                    exco: {
                      accountId: 'accountId',
                      publisherId: 'publisherId',
                      tagId: 'tagId',
                    },
                  },
                  adunitcode: '300x250',
                },
              },
              id: BID.bidId,
              banner: {
                topframe: 1,
                format: [
                  {
                    w: 300,
                    h: 250,
                  },
                ],
              },
              secure: 1,
              tagId: 'tagId',
            },
          ],
          source: {},
          site: {
            content: {
              language: 'en',
            },
          },
          device: {
            w: 1309,
            h: 1305,
            dnt: 0,
            ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            language: 'en',
            sua: {
              source: 1,
              platform: {
                brand: 'Windows',
              },
              browsers: [
                {
                  brand: 'Not(A:Brand',
                  version: ['99'],
                },
                {
                  brand: 'Google Chrome',
                  version: ['133'],
                },
                {
                  brand: 'Chromium',
                  version: ['133'],
                },
              ],
              mobile: 0,
            },
          },
          id: '2761790c-1ee0-4aea-8cba-e201d5474920',
          test: 0,
          tmax: 3000,
          ext: {
            prebid: {
              auctiontimestamp: 1739870889391,
              targeting: {
                includewinners: true,
                includebidderkeys: false,
              },
              channel: {
                name: 'pbjs',
                version: `v${version}`,
              },
            },
            exco: {
              version: '0.0.1',
              pbversion: version,
              sid: '234a2e26-d55e-4de3-b49f-ab0f3729f03b',
              aid: '1677eaa35e64f46',
              rc: 1,
              brc: 1,
            },
          },
          cur: ['USD'],
        },
      });
    });

    after(function () {
      $$PREBID_GLOBAL$$.bidderSettings = {};
      sandbox.restore();
    });
  });

  describe('interpret response', function () {
    it('should return empty array when there is no response', function () {
      const responses = adapter.interpretResponse(null);
      expect(responses).to.be.empty;
    });

    it('should return empty array when there is no ad', function () {
      const responses = adapter.interpretResponse({ price: 1, ad: '' });
      expect(responses).to.be.empty;
    });

    it('should return empty array when there is no price', function () {
      const responses = adapter.interpretResponse({
        price: null,
        ad: 'great ad',
      });
      expect(responses).to.be.empty;
    });

    it('should return an array of interpreted banner responses', function () {
      const responses = adapter.interpretResponse(SERVER_RESPONSE, REQUEST);
      expect(responses).to.have.length(1);
      expect(responses[0]).to.deep.equal({
        'mediaType': 'banner',
        'requestId': BID.bidId,
        'seatBidId': '7f79235c-9f04-4241-b55f-62bc8b23740c',
        'cpm': 16.38,
        'width': 450,
        'height': 350,
        'creative_id': 'h6bvt3rl',
        'creativeId': 'h6bvt3rl',
        'ttl': 3000,
        'meta': {
          'advertiserDomains': [
            'crest.com'
          ],
          'mediaType': 'banner'
        },
        'bidderCode': 'exco',
        'adapterCode': 'exco',
        'ad': '<iframe>console.log("hello world")</iframe>',
        'netRevenue': true,
        'currency': 'USD'
      });
    });
  });
});
