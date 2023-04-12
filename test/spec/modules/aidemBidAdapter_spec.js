import {expect} from 'chai';
import {setEndPoints, spec} from 'modules/aidemBidAdapter.js';
import * as utils from '../../../src/utils';
import {deepSetValue} from '../../../src/utils';
import {server} from '../../mocks/xhr';
import {config} from '../../../src/config';
import {NATIVE} from '../../../src/mediaTypes.js';

// Full banner + Full Video + Basic Banner + Basic Video
const VALID_BIDS = [
  {
    bidder: 'aidem',
    params: {
      siteId: '301491',
      publisherId: '3021491',
      placementId: '13144370',
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]],
      }
    },
  },
  {
    bidder: 'aidem',
    params: {
      siteId: '301491',
      publisherId: '3021491',
      placementId: '13144370',
    },
    mediaTypes: {
      video: {
        context: 'instream',
        minduration: 7,
        maxduration: 30,
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [2]
      }
    },
  },
]

const INVALID_BIDS = [
  {
    bidder: 'aidem',
    params: {
      siteId: '3014912'
    }
  },
  {
    bidder: 'aidem',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]],
      }
    },
    params: {
      siteId: '3014912',
    }
  },
  {
    bidder: 'aidem',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]],
      }
    },
    params: {
      publisherId: '3014912',
    }
  },
  {
    bidder: 'aidem',
    params: {
      siteId: '3014912',
      member: '301e4912'
    }
  },
  {
    bidder: 'aidem',
    params: {
      siteId: '3014912',
      invCode: '3014912'
    }
  },
  {
    bidder: 'aidem',
    mediaType: NATIVE,
    params: {
      siteId: '3014912'
    }
  },
  {
    bidder: 'aidem',
    mediaTypes: {
      banner: {}
    },
  },
  {
    bidder: 'aidem',
    mediaTypes: {
      video: {
        placement: 1,
        minduration: 7,
        maxduration: 30,
        mimes: ['video/mp4'],
        protocols: [2]
      }
    },
    params: {
      siteId: '301491',
      placementId: '13144370',
    },
  },
  {
    bidder: 'aidem',
    mediaTypes: {
      video: {
        minduration: 7,
        maxduration: 30,
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [2]
      }
    },
    params: {
      siteId: '301491',
      placementId: '13144370',
    },
  },
  {
    bidder: 'aidem',
    mediaTypes: {
      video: {
        minduration: 7,
        maxduration: 30,
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [2],
        placement: 1
      }
    },
    params: {
      siteId: '301491',
      placementId: '13144370',
      video: {
        size: [480, 40]
      }
    },
  },
]

const DEFAULT_VALID_BANNER_REQUESTS = [
  {
    adUnitCode: 'test-div',
    auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
    bidId: '22c4871113f461',
    bidder: 'aidem',
    bidderRequestId: '15246a574e859f',
    mediaTypes: {
      banner: {
        sizes: [
          [ 300, 250 ],
          [ 300, 600 ]
        ]
      }
    },
    params: {
      siteId: '1',
      placementId: '13144370'
    },
    src: 'client',
    transactionId: '54a58774-7a41-494e-9aaf-fa7b79164f0c'
  }
];

const DEFAULT_VALID_VIDEO_REQUESTS = [
  {
    adUnitCode: 'test-div',
    auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
    bidId: '22c4871113f461',
    bidder: 'aidem',
    bidderRequestId: '15246a574e859f',
    mediaTypes: {
      video: {
        minduration: 7,
        maxduration: 30,
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [2]
      }
    },
    params: {
      siteId: '1',
      placementId: '13144370'
    },
    src: 'client',
    transactionId: '54a58774-7a41-494e-9aaf-fa7b79164f0c'
  }
];

const VALID_BIDDER_REQUEST = {
  auctionId: '6e9b46c3-65a8-46ea-89f4-c5071110c85c',
  bidderCode: 'aidem',
  bidderRequestId: '170ea5d2b1d073',
  refererInfo: {
    page: 'test-page',
    domain: 'test-domain',
    ref: 'test-referer'
  },
}

// Add mediatype
const SERVER_RESPONSE_BANNER = {
  body: {
    id: 'efa1930a-bc3e-4fd0-8368-08bc40236b4f',
    bid: [
      // BANNER
      {
        'id': '2e614be960ee1d',
        'impid': '2e614be960ee1d',
        'price': 7.91,
        'mediatype': 'banner',
        'adid': '24277955',
        'adm': 'creativity_banner',
        'adomain': [
          'aidem.com'
        ],
        'iurl': 'http://www.aidem.com',
        'cat': [],
        'cid': '4193561',
        'crid': '24277955',
        'w': 300,
        'h': 250,
        'ext': {
          'dspid': 85,
          'advbrandid': 1246,
          'advbrand': 'AIDEM'
        }
      },
    ],
    cur: 'USD'
  },
}

const SERVER_RESPONSE_VIDEO = {
  body: {
    id: 'efa1930a-bc3e-4fd0-8368-08bc40236b4f',
    bid: [
      // VIDEO
      {
        'id': '2876a29392a47c',
        'impid': '2876a29392a47c',
        'price': 7.93,
        'mediatype': 'video',
        'adid': '24277955',
        'adm': 'https://hermes.aidemsrv.com/vast-tag/cl9mzhhd502uq09l720uegb02?auction_id={{AUCTION_ID}}&cachebuster={{CACHEBUSTER}}',
        'adomain': [
          'aidem.com'
        ],
        'iurl': 'http://www.aidem.com',
        'cat': [],
        'cid': '4193561',
        'crid': '24277955',
        'w': 640,
        'h': 480,
        'ext': {
          'dspid': 85,
          'advbrandid': 1246,
          'advbrand': 'AIDEM'
        }
      }
    ],
    cur: 'USD'
  },
}

const WIN_NOTICE_WEB = {
  'adId': '3a20ee5dc78c1e',
  'adUnitCode': 'div-gpt-ad-1460505748561-0',
  'creativeId': '24277955',
  'cpm': 1,
  'netRevenue': false,
  'adserverTargeting': {
    'hb_bidder': 'aidem',
    'hb_adid': '3a20ee5dc78c1e',
    'hb_pb': '1.00',
    'hb_size': '300x250',
    'hb_source': 'client',
    'hb_format': 'banner',
    'hb_adomain': 'example.com'
  },

  'auctionId': '85864730-6cbc-4e56-bc3c-a4a6596dca5b',
  'currency': [
    'USD'
  ],
  'mediaType': 'banner',
  'meta': {
    'advertiserDomains': [
      'cloudflare.com'
    ],
    'ext': {}
  },
  'size': '300x250',
  'params': [
    {
      'placementId': '13144370',
      'siteId': '23434',
      'publisherId': '7689670753'
    }
  ],
  'width': 300,
  'height': 250,
  'status': 'rendered',
  'transactionId': 'ce089116-4251-45c3-bdbb-3a03cb13816b',
  'ttl': 300,
  'requestTimestamp': 1666796241007,
  'responseTimestamp': 1666796241021,
  metrics: {
    getMetrics() {
      return {

      }
    }
  }
}

const WIN_NOTICE_APP = {
  'adId': '3a20ee5dc78c1e',
  'adUnitCode': 'div-gpt-ad-1460505748561-0',
  'creativeId': '24277955',
  'cpm': 1,
  'netRevenue': false,
  'adserverTargeting': {
    'hb_bidder': 'aidem',
    'hb_adid': '3a20ee5dc78c1e',
    'hb_pb': '1.00',
    'hb_size': '300x250',
    'hb_source': 'client',
    'hb_format': 'banner',
    'hb_adomain': 'example.com'
  },

  'auctionId': '85864730-6cbc-4e56-bc3c-a4a6596dca5b',
  'currency': [
    'USD'
  ],
  'mediaType': 'banner',
  'meta': {
    'advertiserDomains': [
      'cloudflare.com'
    ],
    'ext': {
      'app': {
        'app_bundle': '{{APP_BUNDLE}}',
        'app_id': '{{APP_ID}}',
        'app_name': '{{APP_NAME}}',
        'app_store_url': '{{APP_STORE_URL}}',
        'inventory_source': '{{INVENTORY_SOURCE}}'
      }
    }
  },
  'size': '300x250',
  'params': [
    {
      'placementId': '13144370',
      'siteId': '23434',
      'publisherId': '7689670753'
    }
  ],
  'width': 300,
  'height': 250,
  'status': 'rendered',
  'transactionId': 'ce089116-4251-45c3-bdbb-3a03cb13816b',
  'ttl': 300,
  'requestTimestamp': 1666796241007,
  'responseTimestamp': 1666796241021,
  metrics: {
    getMetrics() {
      return {

      }
    }
  }
}

const ERROR_NOTICE = {
  'message': 'Prebid.js: Server call for aidem failed.',
  'url': 'http%3A%2F%2Flocalhost%3A9999%2FintegrationExamples%2Fgpt%2Fhello_world.html%3Fpbjs_debug%3Dtrue',
  'auctionId': 'b57faab7-23f7-4b63-90db-67b259d20db7',
  'bidderRequestId': '1c53857d1ce616',
  'timeout': 1000,
  'bidderCode': 'aidem',
  metrics: {
    getMetrics() {
      return {

      }
    }
  }
}

describe('Aidem adapter', () => {
  describe('isBidRequestValid', () => {
    it('should return true for each valid bid requests', function () {
      // spec.isBidRequestValid()
      VALID_BIDS.forEach((value, index) => {
        expect(spec.isBidRequestValid(value)).to.be.true
      })
    });

    it('should return false for each invalid bid requests', function () {
      // spec.isBidRequestValid()
      INVALID_BIDS.forEach((value, index) => {
        expect(spec.isBidRequestValid(value)).to.be.false
      })
    });

    it('should return true if valid banner sizes are specified in params as single array', function () {
      // spec.isBidRequestValid()
      const validBannerRequest = utils.deepClone(VALID_BIDS[0])
      deepSetValue(validBannerRequest.params, 'banner.size', [300, 250])
      expect(spec.isBidRequestValid(validBannerRequest)).to.be.true
    });

    it('should return true if valid banner sizes are specified in params as array of array', function () {
      // spec.isBidRequestValid()
      const validBannerRequest = utils.deepClone(VALID_BIDS[0])
      deepSetValue(validBannerRequest.params, 'banner.size', [[300, 600]])
      expect(spec.isBidRequestValid(validBannerRequest)).to.be.true
    });

    it('should return true if valid video sizes are specified in params as single array', function () {
      // spec.isBidRequestValid()
      const validVideoRequest = utils.deepClone(VALID_BIDS[1])
      deepSetValue(validVideoRequest.params, 'video.size', [640, 480])
      expect(spec.isBidRequestValid(validVideoRequest)).to.be.true
    });

    it('BANNER: should return true if rateLimit is 1', function () {
      // spec.isBidRequestValid()
      const validBannerRequest = utils.deepClone(VALID_BIDS[0])
      deepSetValue(validBannerRequest.params, 'rateLimit', 1)
      expect(spec.isBidRequestValid(validBannerRequest)).to.be.true
    });

    it('BANNER: should return false if rateLimit is 0', function () {
      // spec.isBidRequestValid()
      const validBannerRequest = utils.deepClone(VALID_BIDS[0])
      deepSetValue(validBannerRequest.params, 'rateLimit', 0)
      expect(spec.isBidRequestValid(validBannerRequest)).to.be.false
    });

    it('BANNER: should return false if rateLimit is not between 0 and 1', function () {
      // spec.isBidRequestValid()
      const validBannerRequest = utils.deepClone(VALID_BIDS[0])
      deepSetValue(validBannerRequest.params, 'rateLimit', 1.2)
      expect(spec.isBidRequestValid(validBannerRequest)).to.be.false
    });

    it('BANNER: should return false if rateLimit is not a number', function () {
      // spec.isBidRequestValid()
      const validBannerRequest = utils.deepClone(VALID_BIDS[0])
      deepSetValue(validBannerRequest.params, 'rateLimit', '0.5')
      expect(spec.isBidRequestValid(validBannerRequest)).to.be.false
    });

    it('VIDEO: should return true if rateLimit is 1', function () {
      // spec.isBidRequestValid()
      const validVideoRequest = utils.deepClone(VALID_BIDS[1])
      deepSetValue(validVideoRequest.params, 'rateLimit', 1)
      expect(spec.isBidRequestValid(validVideoRequest)).to.be.true
    });

    it('VIDEO: should return false if rateLimit is 0', function () {
      // spec.isBidRequestValid()
      const validVideoRequest = utils.deepClone(VALID_BIDS[1])
      deepSetValue(validVideoRequest.params, 'rateLimit', 0)
      expect(spec.isBidRequestValid(validVideoRequest)).to.be.false
    });

    it('VIDEO: should return false if rateLimit is not between 0 and 1', function () {
      // spec.isBidRequestValid()
      const validBannerRequest = utils.deepClone(VALID_BIDS[1])
      deepSetValue(validBannerRequest.params, 'rateLimit', 1.2)
      expect(spec.isBidRequestValid(validBannerRequest)).to.be.false
    });

    it('VIDEO: should return false if rateLimit is not a number', function () {
      // spec.isBidRequestValid()
      const validBannerRequest = utils.deepClone(VALID_BIDS[1])
      deepSetValue(validBannerRequest.params, 'rateLimit', '0.5')
      expect(spec.isBidRequestValid(validBannerRequest)).to.be.false
    });
  });

  describe('buildRequests', () => {
    it('should match server requirements', () => {
      const requests = spec.buildRequests(DEFAULT_VALID_BANNER_REQUESTS, VALID_BIDDER_REQUEST);
      expect(requests).to.be.an('object');
      expect(requests.method).to.be.a('string')
      expect(requests.data).to.be.a('string')
      expect(requests.options).to.be.an('object').that.have.a.property('withCredentials')
    });

    it('should have a well formatted banner payload', () => {
      const requests = spec.buildRequests(DEFAULT_VALID_BANNER_REQUESTS, VALID_BIDDER_REQUEST);
      const payload = JSON.parse(requests.data)
      expect(payload).to.be.a('object').that.has.all.keys(
        'id', 'imp', 'device', 'cur', 'tz', 'regs', 'site', 'environment', 'at'
      )
      expect(payload.imp).to.be.a('array').that.has.lengthOf(DEFAULT_VALID_BANNER_REQUESTS.length)

      expect(payload.imp[0]).to.be.a('object').that.has.all.keys(
        'banner', 'id', 'mediatype', 'imp_ext', 'tid', 'tagid'
      )
      expect(payload.imp[0].banner).to.be.a('object').that.has.all.keys(
        'format', 'topframe'
      )
    });

    it('should have a well formatted video payload', () => {
      const requests = spec.buildRequests(DEFAULT_VALID_VIDEO_REQUESTS, VALID_BIDDER_REQUEST);
      const payload = JSON.parse(requests.data)
      expect(payload).to.be.a('object').that.has.all.keys(
        'id', 'imp', 'device', 'cur', 'tz', 'regs', 'site', 'environment', 'at'
      )
      expect(payload.imp).to.be.a('array').that.has.lengthOf(DEFAULT_VALID_VIDEO_REQUESTS.length)

      expect(payload.imp[0]).to.be.a('object').that.has.all.keys(
        'video', 'id', 'mediatype', 'imp_ext', 'tid', 'tagid'
      )
      expect(payload.imp[0].video).to.be.a('object').that.has.all.keys(
        'format', 'mimes', 'minDuration', 'maxDuration', 'protocols'
      )
    });

    it('should have a well formatted bid floor payload if configured', () => {
      const validBannerRequests = utils.deepClone(DEFAULT_VALID_BANNER_REQUESTS)
      validBannerRequests[0].params.floor = {
        value: 1.98,
        currency: 'USD'
      }
      const requests = spec.buildRequests(validBannerRequests, VALID_BIDDER_REQUEST);
      const payload = JSON.parse(requests.data)
      const { floor } = payload.imp[0]
      expect(floor).to.be.a('object').that.has.all.keys(
        'value', 'currency'
      )
    });

    it('should hav wpar keys in environment object', function () {
      const requests = spec.buildRequests(DEFAULT_VALID_VIDEO_REQUESTS, VALID_BIDDER_REQUEST);
      const payload = JSON.parse(requests.data)
      expect(payload).to.have.property('environment')
      expect(payload.environment).to.be.a('object').that.have.property('wpar')
      expect(payload.environment.wpar).to.be.a('object').that.has.keys('innerWidth', 'innerHeight')
    });
  })

  describe('interpretResponse', () => {
    it('should return a valid bid array with a banner bid', () => {
      const response = utils.deepClone(SERVER_RESPONSE_BANNER)
      const interpreted = spec.interpretResponse(response)
      expect(interpreted).to.be.a('array').that.has.lengthOf(1)
      interpreted.forEach(value => {
        expect(value).to.be.a('object').that.has.all.keys(
          'ad', 'cpm', 'creativeId', 'currency', 'height', 'mediaType', 'meta', 'netRevenue', 'requestId', 'ttl', 'width', 'dealId'
        )
      })
    });

    it('should return a valid bid array with a banner bid', () => {
      const response = utils.deepClone(SERVER_RESPONSE_VIDEO)
      const interpreted = spec.interpretResponse(response)
      expect(interpreted).to.be.a('array').that.has.lengthOf(1)
      interpreted.forEach(value => {
        expect(value).to.be.a('object').that.has.all.keys(
          'vastUrl', 'cpm', 'creativeId', 'currency', 'height', 'mediaType', 'meta', 'netRevenue', 'requestId', 'ttl', 'width', 'dealId'
        )
      })
    });

    it('should return a valid bid array with netRevenue', () => {
      const response = utils.deepClone(SERVER_RESPONSE_BANNER)
      response.body.bid[0].isNet = true
      const interpreted = spec.interpretResponse(response)
      expect(interpreted).to.be.a('array').that.has.lengthOf(1)
      expect(interpreted[0].netRevenue).to.be.true
    });

    it('should return an empty bid array if one of seatbid entry is missing price property', () => {
      const response = utils.deepClone(SERVER_RESPONSE_BANNER)
      delete response.body.bid[0].price
      const interpreted = spec.interpretResponse(response)
      expect(interpreted).to.be.a('array').that.has.lengthOf(0)
    });

    it('should return an empty bid array if one of seatbid entry is missing adm property', () => {
      const response = utils.deepClone(SERVER_RESPONSE_BANNER)
      delete response.body.bid[0].adm
      const interpreted = spec.interpretResponse(response)
      expect(interpreted).to.be.a('array').that.has.lengthOf(0)
    });
  })

  describe('onBidWon', () => {
    it(`should exists and type function`, function () {
      expect(spec.onBidWon).to.exist.and.to.be.a('function')
    });

    it(`should send a valid bid won notice from web environment`, function () {
      spec.onBidWon(WIN_NOTICE_WEB);
      expect(server.requests.length).to.equal(1);
    });

    it(`should send a valid bid won notice from app environment`, function () {
      spec.onBidWon(WIN_NOTICE_APP);
      expect(server.requests.length).to.equal(1);
    });
  });

  describe('onBidderError', () => {
    it(`should exists and type function`, function () {
      expect(spec.onBidderError).to.exist.and.to.be.a('function')
    });

    it(`should send a valid error notice`, function () {
      spec.onBidderError({ bidderRequest: ERROR_NOTICE })
      expect(server.requests.length).to.equal(1);
      const body = JSON.parse(server.requests[0].requestBody)
      expect(body).to.be.a('object').that.has.all.keys('message', 'auctionId', 'bidderRequestId', 'url', 'metrics')
      // const { bids } = JSON.parse(server.requests[0].requestBody)
      // expect(bids).to.be.a('array').that.has.lengthOf(1)
      // _each(bids, (bid) => {
      //   expect(bid).to.be.a('object').that.has.all.keys('adUnitCode', 'auctionId', 'bidId', 'bidderRequestId', 'transactionId', 'metrics')
      // })
    });
  });

  describe('setEndPoints', () => {
    it(`should exists and type function`, function () {
      expect(setEndPoints).to.exist.and.to.be.a('function')
    });

    it(`should not modify default endpoints`, function () {
      const endpoints = setEndPoints()
      const requestURL = new URL(endpoints.request)
      const winNoticeURL = new URL(endpoints.notice.win)
      const timeoutNoticeURL = new URL(endpoints.notice.timeout)
      const errorNoticeURL = new URL(endpoints.notice.error)

      expect(requestURL.host).to.equal('zero.aidemsrv.com')
      expect(winNoticeURL.host).to.equal('zero.aidemsrv.com')
      expect(timeoutNoticeURL.host).to.equal('zero.aidemsrv.com')
      expect(errorNoticeURL.host).to.equal('zero.aidemsrv.com')

      expect(decodeURIComponent(requestURL.pathname)).to.equal('/bid/request')
      expect(decodeURIComponent(winNoticeURL.pathname)).to.equal('/notice/win')
      expect(decodeURIComponent(timeoutNoticeURL.pathname)).to.equal('/notice/timeout')
      expect(decodeURIComponent(errorNoticeURL.pathname)).to.equal('/notice/error')
    });

    it(`should not change request endpoint`, function () {
      const endpoints = setEndPoints('default')
      const requestURL = new URL(endpoints.request)
      expect(decodeURIComponent(requestURL.pathname)).to.equal('/bid/request')
    });

    it(`should change to local env`, function () {
      const endpoints = setEndPoints('local')
      const requestURL = new URL(endpoints.request)
      const winNoticeURL = new URL(endpoints.notice.win)
      const timeoutNoticeURL = new URL(endpoints.notice.timeout)
      const errorNoticeURL = new URL(endpoints.notice.error)

      expect(requestURL.host).to.equal('127.0.0.1:8787')
      expect(winNoticeURL.host).to.equal('127.0.0.1:8787')
      expect(timeoutNoticeURL.host).to.equal('127.0.0.1:8787')
      expect(errorNoticeURL.host).to.equal('127.0.0.1:8787')
    });

    it(`should add a path prefix`, function () {
      const endpoints = setEndPoints('local', '/path')
      const requestURL = new URL(endpoints.request)
      const winNoticeURL = new URL(endpoints.notice.win)
      const timeoutNoticeURL = new URL(endpoints.notice.timeout)
      const errorNoticeURL = new URL(endpoints.notice.error)

      expect(decodeURIComponent(requestURL.pathname)).to.equal('/path/bid/request')
      expect(decodeURIComponent(winNoticeURL.pathname)).to.equal('/path/notice/win')
      expect(decodeURIComponent(timeoutNoticeURL.pathname)).to.equal('/path/notice/timeout')
      expect(decodeURIComponent(errorNoticeURL.pathname)).to.equal('/path/notice/error')
    });

    it(`should add a path prefix and change request endpoint`, function () {
      const endpoints = setEndPoints('local', '/path')
      const requestURL = new URL(endpoints.request)
      const winNoticeURL = new URL(endpoints.notice.win)
      const timeoutNoticeURL = new URL(endpoints.notice.timeout)
      const errorNoticeURL = new URL(endpoints.notice.error)

      expect(decodeURIComponent(requestURL.pathname)).to.equal('/path/bid/request')
      expect(decodeURIComponent(winNoticeURL.pathname)).to.equal('/path/notice/win')
      expect(decodeURIComponent(timeoutNoticeURL.pathname)).to.equal('/path/notice/timeout')
      expect(decodeURIComponent(errorNoticeURL.pathname)).to.equal('/path/notice/error')
    });
  });

  describe('config', () => {
    beforeEach(() => {
      config.setConfig({
        aidem: {
          env: 'main'
        }
      });
    })

    it(`should not override default endpoints`, function () {
      config.setConfig({
        aidem: {
          env: 'unknown',
          path: '/test'
        }
      });
      const { url } = spec.buildRequests(DEFAULT_VALID_BANNER_REQUESTS, VALID_BIDDER_REQUEST);
      const requestURL = new URL(url)
      expect(requestURL.host).to.equal('zero.aidemsrv.com')
    });

    it(`should set local endpoints`, function () {
      config.setConfig({
        aidem: {
          env: 'local',
          path: '/test'
        }
      });
      const { url } = spec.buildRequests(DEFAULT_VALID_BANNER_REQUESTS, VALID_BIDDER_REQUEST);
      const requestURL = new URL(url)
      expect(requestURL.host).to.equal('127.0.0.1:8787')
    });

    it(`should set coppa`, function () {
      config.setConfig({
        coppa: true
      });
      const { data } = spec.buildRequests(DEFAULT_VALID_BANNER_REQUESTS, VALID_BIDDER_REQUEST);
      const request = JSON.parse(data)
      expect(request.regs.coppa_applies).to.equal(true)
    });

    it(`should set gdpr to true`, function () {
      config.setConfig({
        consentManagement: {
          gdpr: {
            // any data here set gdpr to true
          },
        }
      });
      const { data } = spec.buildRequests(DEFAULT_VALID_BANNER_REQUESTS, VALID_BIDDER_REQUEST);
      const request = JSON.parse(data)
      expect(request.regs.gdpr_applies).to.equal(true)
    });

    it(`should set usp_consent string`, function () {
      config.setConfig({
        consentManagement: {
          usp: {
            cmpApi: 'static',
            consentData: {
              getUSPData: {
                uspString: '1YYY'
              }
            }
          }
        }
      });
      const { data } = spec.buildRequests(DEFAULT_VALID_BANNER_REQUESTS, VALID_BIDDER_REQUEST);
      const request = JSON.parse(data)
      expect(request.regs.us_privacy).to.equal('1YYY')
    });

    it(`should not set usp_consent string`, function () {
      config.setConfig({
        consentManagement: {
          usp: {
            cmpApi: 'iab',
            consentData: {
              getUSPData: {
                uspString: '1YYY'
              }
            }
          }
        }
      });
      const { data } = spec.buildRequests(DEFAULT_VALID_BANNER_REQUESTS, VALID_BIDDER_REQUEST);
      const request = JSON.parse(data)
      expect(request.regs.us_privacy).to.undefined
    });
  });
});
