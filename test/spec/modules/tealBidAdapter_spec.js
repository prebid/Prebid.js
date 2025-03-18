import { spec } from 'modules/tealBidAdapter.js';
import { parseUrl } from 'src/utils.js';

const expect = require('chai').expect;

const PBS_HOST = 'a.bids.ws';
const PLACEMENT = 'test-placement300x250';
const ACCOUNT = 'test-account';
const SUB_ACCOUNT = 'test-sub-account';
const TEST_DOMAIN = 'example.com';
const TEST_PAGE = `https://${TEST_DOMAIN}/page.html`;
const ADUNIT_CODE = '/1234/header-bid-tag-0';

const BID_PARAMS = {
  params: {
    placement: PLACEMENT,
    account: ACCOUNT,
    testMode: true
  }
};

const BID_REQUEST = {
  bidder: 'teal',
  ...BID_PARAMS,
  ortb2Imp: {
    ext: {
      tid: 'e13391ea-00f3-495d-99a6-d937990d73a9'
    }
  },
  mediaTypes: {
    banner: {
      sizes: [
        [
          300,
          250
        ],
      ]
    }
  },
  adUnitCode: ADUNIT_CODE,
  transactionId: 'e13391ea-00f3-495d-99a6-d937990d73a9',
  sizes: [
    [
      300,
      250
    ],
  ],
  bidId: '123456789',
  bidderRequestId: '1decd098c76ed2',
  auctionId: '251a6a36-a5c5-4b82-b2b3-538c148a29dd',
  src: 'client',
  bidRequestsCount: 1,
  bidderRequestsCount: 1,
  bidderWinsCount: 0,
  ortb2: {
    site: {
      page: TEST_PAGE,
      domain: TEST_DOMAIN,
      publisher: {
        domain: 'example.com'
      }
    },
    device: {
      w: 1848,
      h: 1007,
      dnt: 0,
      ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
      language: 'en',
      sua: {
        source: 2,
        platform: {
          brand: 'Linux',
          version: [
            '5',
            '4',
            '0'
          ]
        },
        browsers: [
          {
            brand: 'Google Chrome',
            version: [
              '111',
              '0',
              '5563',
              '146'
            ]
          },
        ],
        mobile: 0,
        model: '',
        bitness: '64',
        architecture: 'x86'
      }
    }
  }
};

const BIDDER_REQUEST = {
  bidderCode: BID_REQUEST.bidder,
  auctionId: BID_REQUEST.auctionId,
  bidderRequestId: BID_REQUEST.bidderRequestId,
  bids: [BID_REQUEST],
  metrics: BID_REQUEST.metrics,
  ortb2: BID_REQUEST.ortb2,
  auctionStart: 1681224591370,
  timeout: 1000,
  refererInfo: {
    reachedTop: true,
    isAmp: false,
    numIframes: 0,
    stack: [
      TEST_PAGE
    ],
    topmostLocation: TEST_PAGE,
    location: TEST_PAGE,
    canonicalUrl: null,
    page: TEST_PAGE,
    domain: TEST_DOMAIN,
    ref: null,
    legacy: {
      reachedTop: true,
      isAmp: false,
      numIframes: 0,
      stack: [
        TEST_PAGE
      ],
      referer: TEST_PAGE,
      canonicalUrl: null
    }
  },
  start: 1681224591375
};

const BID_RESPONSE = {
  seatbid: [
    {
      bid: [
        {
          id: '123456789',
          impid: BID_REQUEST.bidId,
          price: 0.286000000000000004,
          adm: '<img src ="//files.prebid.org/creatives/prebid300x250.png" />',
          adomain: [
            'teal.works'
          ],
          crid: '684f9b94-b8b9-4c32-83da-b075ca753f65',
          w: 300,
          h: 250,
          exp: 300,
          mtype: 1,
          ext: {
            ct: 0,
            prebid: {
              type: 'banner',
              targeting: {
                tl_size: '300x250',
                tl_bidder: 'teal',
                tl_pb: '0.20'
              },
              meta: {
                advertiserDomains: [
                  'teal.works'
                ]
              }
            },
            origbidcpm: 0.286000000000000004
          }
        }
      ],
      seat: 'appnexus',
      group: 0
    }
  ],
  cur: 'USD',
  ext: {
    responsetimemillis: {
      appnexus: 0
    },
    tmaxrequest: 750,
    prebid: {
      auctiontimestamp: 1678646619765,
      passthrough: {
        teal: {
          bidder: spec.code
        }
      }
    }
  }
};

const S2S_RESPONSE_BIDDER = BID_RESPONSE.seatbid[0].seat;

const buildRequest = (params) => {
  const bidRequest = {
    ...BID_REQUEST,
    params: {
      ...BID_REQUEST.params,
      ...params,
    },
  };
  var response = spec.buildRequests([bidRequest], BIDDER_REQUEST);
  return response;
};

describe('Teal Bid Adaper', function () {
  describe('buildRequests', () => {
    const {data, url} = buildRequest();
    it('should give the correct URL', () => {
      expect(url).equal(`https://${PBS_HOST}/openrtb2/auction`);
    });
    it('should set the correct stored request ids', () => {
      expect(data.ext.prebid.storedrequest.id).equal(ACCOUNT);
      expect(data.imp[0].ext.prebid.storedrequest.id).equal(PLACEMENT);
    });
    it('should include bidder code in passthrough object', () => {
      expect(data.ext.prebid.passthrough.teal.bidder).equal(spec.code);
    });
    it('should set tmax to something below the timeout', () => {
      expect(data.tmax).be.greaterThan(0);
      expect(data.tmax).be.lessThan(BIDDER_REQUEST.timeout)
    });
  });
  describe('buildRequests with subAccount', () => {
    const {data} = buildRequest({ subAccount: SUB_ACCOUNT });
    it('should set the correct stored request ids', () => {
      expect(data.ext.prebid.storedrequest.id).equal(SUB_ACCOUNT);
    });
  });
  describe('interpreteResponse', () => {
    const request = buildRequest();
    const [bid] = spec.interpretResponse({ body: BID_RESPONSE }, request);
    it('should not have S2S bidder\'s bidder code', () => {
      expect(bid.bidderCode).not.equal(S2S_RESPONSE_BIDDER);
    });
    it('should return the right creative content', () => {
      const respBid = BID_RESPONSE.seatbid[0].bid[0];
      expect(bid.cpm).equal(respBid.price);
      expect(bid.ad).equal(respBid.adm);
      expect(bid.width).equal(respBid.w);
      expect(bid.height).equal(respBid.h);
    });
  });
  describe('interpreteResponse with useSourceBidderCode', () => {
    const request = buildRequest({ useSourceBidderCode: true });
    const [bid] = spec.interpretResponse({ body: BID_RESPONSE }, request);
    it('should have S2S bidder\'s code', () => {
      expect(bid.bidderCode).equal(S2S_RESPONSE_BIDDER);
    });
  });
  describe('getUserSyncs with iframeEnabled', () => {
    const allSyncs = spec.getUserSyncs({ iframeEnabled: true }, [{ body: BID_RESPONSE }], null, null);
    const [{ url, type }] = allSyncs;
    const { bidders, endpoint } = parseUrl(url).search;
    it('should return a single sync object', () => {
      expect(allSyncs.length).equal(1);
    });
    it('should use iframe sync when available', () => {
      expect(type).equal('iframe');
    });
    it('should sync to the right endpoint', () => {
      expect(endpoint).equal(`https://${PBS_HOST}/cookie_sync`);
    });
    it('should sync to at least one bidders', () => {
      expect(bidders.split(',').length).be.greaterThan(0);
    });
  });
});
