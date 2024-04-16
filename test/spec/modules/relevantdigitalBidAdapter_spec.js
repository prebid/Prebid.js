import {spec, resetBidderConfigs} from 'modules/relevantdigitalBidAdapter.js';
import { parseUrl, deepClone } from 'src/utils.js';
import { config } from 'src/config.js';
import { S2S } from 'src/constants.js';

import adapterManager, {
} from 'src/adapterManager.js';

const expect = require('chai').expect;

const PBS_HOST = 'dev-api.relevant-digital.com';
const PLACEMENT_ID = 'example_placement_id';
const ACCOUNT_ID = 'example_account_id';
const TEST_DOMAIN = 'example.com';
const TEST_PAGE = `https://${TEST_DOMAIN}/page.html`;

const CONFIG = {
  enabled: true,
  endpoint: S2S.DEFAULT_ENDPOINT,
  timeout: 1000,
  maxBids: 1,
  adapter: 'prebidServer',
  bidders: ['relevantdigital'],
  accountId: 'abc'
};

const ADUNIT_CODE = '/19968336/header-bid-tag-0';

const BID_PARAMS = {
  'params': {
    'placementId': PLACEMENT_ID,
    'accountId': ACCOUNT_ID,
    'pbsHost': PBS_HOST
  }
};

const BID_REQUEST = {
  'bidder': 'relevantdigital',
  ...BID_PARAMS,
  'ortb2Imp': {
    'ext': {
      'tid': 'e13391ea-00f3-495d-99a6-d937990d73a9'
    }
  },
  'mediaTypes': {
    'banner': {
      'sizes': [
        [
          300,
          250
        ],
      ]
    }
  },
  'adUnitCode': ADUNIT_CODE,
  'transactionId': 'e13391ea-00f3-495d-99a6-d937990d73a9',
  'sizes': [
    [
      300,
      250
    ],
  ],
  'bidId': '2d69406037a662',
  'bidderRequestId': '1decd098c76ed2',
  'auctionId': '251a6a36-a5c5-4b82-b2b3-538c148a29dd',
  'src': 'client',
  'metrics': {
    'requestBids.validate': 0.7,
    'requestBids.makeRequests': 2.9,
    'adapter.client.validate': 0.4,
    'adapters.client.relevantdigital.validate': 0.4
  },
  'bidRequestsCount': 1,
  'bidderRequestsCount': 1,
  'bidderWinsCount': 0,
  'ortb2': {
    'site': {
      'page': TEST_PAGE,
      'domain': TEST_DOMAIN,
      'publisher': {
        'domain': 'relevant-digital.com'
      }
    },
    'device': {
      'w': 1848,
      'h': 1007,
      'dnt': 0,
      'ua': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
      'language': 'en',
      'sua': {
        'source': 2,
        'platform': {
          'brand': 'Linux',
          'version': [
            '5',
            '4',
            '0'
          ]
        },
        'browsers': [
          {
            'brand': 'Google Chrome',
            'version': [
              '111',
              '0',
              '5563',
              '146'
            ]
          },
        ],
        'mobile': 0,
        'model': '',
        'bitness': '64',
        'architecture': 'x86'
      }
    }
  }
};

const BIDDER_REQUEST = {
  'bidderCode': BID_REQUEST.bidder,
  'auctionId': BID_REQUEST.auctionId,
  'bidderRequestId': BID_REQUEST.bidderRequestId,
  'bids': [BID_REQUEST],
  'metrics': BID_REQUEST.metrics,
  'ortb2': BID_REQUEST.ortb2,
  'auctionStart': 1681224591370,
  'timeout': 1000,
  'refererInfo': {
    'reachedTop': true,
    'isAmp': false,
    'numIframes': 0,
    'stack': [
      TEST_PAGE
    ],
    'topmostLocation': TEST_PAGE,
    'location': TEST_PAGE,
    'canonicalUrl': null,
    'page': TEST_PAGE,
    'domain': TEST_DOMAIN,
    'ref': null,
    'legacy': {
      'reachedTop': true,
      'isAmp': false,
      'numIframes': 0,
      'stack': [
        TEST_PAGE
      ],
      'referer': TEST_PAGE,
      'canonicalUrl': null
    }
  },
  'start': 1681224591375
};

const BID_RESPONSE = {
  'seatbid': [
    {
      'bid': [
        {
          'id': '613673EF-A07C-4486-8EE9-3FC71A7DC73D',
          'impid': BID_REQUEST.bidId,
          'price': 10.76091063668997,
          'adm': '<html><a href="http://www.pubmatic.com" target="_blank"><img src ="https://stagingva.pubmatic.com:8443/image/300x250.jpg" /></a></html>',
          'adomain': [
            'www.addomain.com'
          ],
          'iurl': 'http://localhost11',
          'crid': 'creative111',
          'w': 300,
          'h': 250,
          'ext': {
            'bidtype': 0,
            'dspid': 6,
            'origbidcpm': 1,
            'origbidcur': 'USD',
            'prebid': {
              'meta': {
                'adaptercode': 'pubmatic'
              },
              'targeting': {
                'hb_bidder': 'pubmatic',
                'hb_cache_host': PBS_HOST,
                'hb_cache_path': '/analytics_cache/read',
                'hb_format': 'banner',
                'hb_pb': '10.70',
                'hb_size': '300x250'
              },
              'type': 'banner',
              'video': {
                'duration': 0,
                'primary_category': ''
              },
              'events': {
                'win': `https://${PBS_HOST}/event?t=win&b=fed970f7-4295-456d-a251-38013faab795&a=620523ae7f4bbe1691bbb815&bidder=pubmatic&ts=1678646619765`,
                'imp': `https://${PBS_HOST}/event?t=imp&b=fed970f7-4295-456d-a251-38013faab795&a=620523ae7f4bbe1691bbb815&bidder=pubmatic&ts=1678646619765`
              },
              'bidid': 'fed970f7-4295-456d-a251-38013faab795'
            }
          }
        }
      ],
      'seat': 'pubmatic'
    }
  ],
  'cur': 'SEK',
  'ext': {
    'responsetimemillis': {
      'appnexus': 305,
      'pubmatic': 156
    },
    'tmaxrequest': 750,
    'relevant': {
      'sync': [
        { 'type': 'redirect', 'url': 'https://example1.com/sync' },
        { 'type': 'redirect', 'url': 'https://example2.com/sync' },
      ],
    },
    'prebid': {
      'auctiontimestamp': 1678646619765,
      'passthrough': {
        'relevant': {
          'bidder': spec.code
        }
      }
    }
  }
};

const S2S_RESPONSE_BIDDER = BID_RESPONSE.seatbid[0].seat;

const resetAndBuildRequest = (params) => {
  resetBidderConfigs();
  const bidRequest = {
    ...BID_REQUEST,
    params: {
      ...BID_REQUEST.params,
      ...params,
    },
  };
  return spec.buildRequests([bidRequest], BIDDER_REQUEST);
};

describe('Relevant Digital Bid Adaper', function () {
  describe('buildRequests', () => {
    const [request] = resetAndBuildRequest();
    const {data, url} = request
    it('should give the correct URL', () => {
      expect(url).equal(`https://${PBS_HOST}/openrtb2/auction`);
    });
    it('should set the correct stored request ids', () => {
      expect(data.ext.prebid.storedrequest.id).equal(ACCOUNT_ID);
      expect(data.imp[0].ext.prebid.storedrequest.id).equal(PLACEMENT_ID);
    });
    it('should include bidder code in passthrough object', () => {
      expect(data.ext.prebid.passthrough.relevant.bidder).equal(spec.code);
    });
    it('should set tmax to something below the timeout', () => {
      expect(data.tmax).be.greaterThan(0);
      expect(data.tmax).be.lessThan(BIDDER_REQUEST.timeout)
    });
  });
  describe('interpreteResponse', () => {
    const [request] = resetAndBuildRequest();
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
    const [request] = resetAndBuildRequest({ useSourceBidderCode: true });
    const [bid] = spec.interpretResponse({ body: BID_RESPONSE }, request);
    it('should have S2S bidder\'s code', () => {
      expect(bid.bidderCode).equal(S2S_RESPONSE_BIDDER);
    });
  });
  describe('getUserSyncs with iframeEnabled', () => {
    resetAndBuildRequest()
    const allSyncs = spec.getUserSyncs({ iframeEnabled: true }, [{ body: BID_RESPONSE }], null, null);
    const [{ url, type }] = allSyncs;
    const { bidders, endpoint } = parseUrl(url).search;
    it('should return a single sync object', () => {
      expect(allSyncs.length).equal(1);
    });
    it('should use iframe sync when available', () => {
      expect(type).equal('iframe');
    });
    it('should sync to all s2s bidders', () => {
      expect(bidders.split(',').sort()).to.deep.equal(['appnexus', 'pubmatic']);
    });
    it('should sync to the right endpoint', () => {
      expect(endpoint).equal(`https://${PBS_HOST}/cookie_sync`);
    });
    it('should not sync to the same s2s bidders when called again', () => {
      const newSyncs = spec.getUserSyncs({ iframeEnabled: true }, [{ body: BID_RESPONSE }], null, null);
      expect(newSyncs).to.deep.equal([]);
    });
  });
  describe('getUserSyncs with pixelEnabled', () => {
    resetAndBuildRequest()
    const responseSyncs = BID_RESPONSE.ext.relevant.sync;
    const allSyncs = spec.getUserSyncs({ pixelEnabled: true }, [{ body: BID_RESPONSE }], null, null);
    it('should return one sync object per pixel', () => {
      const expectedResult = responseSyncs.map(({ url }) => ({url, type: 'image'}));
      expect(allSyncs).to.deep.equal(expectedResult)
    });
  });
  describe('transformBidParams', function () {
    beforeEach(() => {
      config.setConfig({
        s2sConfig: CONFIG,
      });
    });
    afterEach(() => {
      config.resetConfig();
    });

    const adUnit = (params) => ({
      code: ADUNIT_CODE,
      bids: [
        {
          bidder: 'relevantdigital',
          adUnitCode: ADUNIT_CODE,
          params,
        }
      ]
    });

    const request = (params) => adapterManager.makeBidRequests([adUnit(params)], 123, 'auction-id', 123, [], {})[0];

    it('transforms adunit bid params and config params correctly', function () {
      config.setConfig({
        relevantdigital: {
          pbsHost: PBS_HOST,
          accountId: ACCOUNT_ID,
        },
      });
      const adUnitParams = { placementId: PLACEMENT_ID };
      const expextedTransformedBidParams = {
        ...BID_PARAMS.params, pbsHost: `https://${BID_PARAMS.params.pbsHost}`, 'pbsBufferMs': 250
      };
      expect(spec.transformBidParams(adUnitParams, null, null, [request(adUnitParams)])).to.deep.equal(expextedTransformedBidParams);
    });
    it('transforms adunit bid params correctly', function () {
      const adUnitParams = { ...BID_PARAMS.params, pbsHost: 'host.relevant-digital.com', pbsBufferMs: 500 };
      const expextedTransformedBidParams = {
        ...BID_PARAMS.params, pbsHost: 'host.relevant-digital.com', pbsBufferMs: 500
      };
      expect(spec.transformBidParams(adUnitParams, null, null, [request(adUnitParams)])).to.deep.equal(expextedTransformedBidParams);
    });
    it('transforms adunit bid params correctly', function () {
      const adUnitParams = { ...BID_PARAMS.params, pbsHost: 'host.relevant-digital.com', pbsBufferMs: 500 };
      const expextedTransformedBidParams = {
        ...BID_PARAMS.params, pbsHost: 'host.relevant-digital.com', pbsBufferMs: 500
      };
      expect(spec.transformBidParams(adUnitParams, null, null, [request(adUnitParams)])).to.deep.equal(expextedTransformedBidParams);
    });
    it('does not transform bid params if placementId is missing', function () {
      const adUnitParams = { ...BID_PARAMS.params, placementId: null };
      expect(spec.transformBidParams(adUnitParams, null, null, [request(adUnitParams)])).to.equal(undefined);
    });
    it('does not transform bid params s2s config is missing', function () {
      config.resetConfig();
      const adUnitParams = BID_PARAMS.params;
      expect(spec.transformBidParams(adUnitParams, null, null, [request(adUnitParams)])).to.equal(undefined);
    });
  })
});
