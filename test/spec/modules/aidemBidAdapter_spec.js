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
    bidId: '2705bfae8ea667',
    bidder: 'aidem',
    bidderRequestId: '1bbb7854dfa0d8',
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
      placementId: '13144370',
    },
    src: 'client',
    transactionId: 'db739693-9b4a-4669-9945-8eab938783cc'
  }
];

const DEFAULT_VALID_VIDEO_REQUESTS = [
  {
    adUnitCode: 'test-div',
    auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
    bidId: '2705bfae8ea667',
    bidder: 'aidem',
    bidderRequestId: '1bbb7854dfa0d8',
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
      placementId: '13144370',
    },
    src: 'client',
    transactionId: 'db739693-9b4a-4669-9945-8eab938783cc'
  }
];

const VALID_BIDDER_REQUEST = {
  auctionId: '19c97f22-5bd1-4b16-a128-80f75fb0a8a0',
  bidderCode: 'aidem',
  bidderRequestId: '1bbb7854dfa0d8',
  bids: [
    {
      params: {
        placementId: '13144370',
        siteId: '23434',
        publisherId: '7689670753',
      },
    }
  ],
  refererInfo: {
    page: 'test-page',
    domain: 'test-domain',
    ref: 'test-referer'
  },
}

const VALID_GDPR_BIDDER_REQUEST = {
  auctionId: '19c97f22-5bd1-4b16-a128-80f75fb0a8a0',
  bidderCode: 'aidem',
  bidderRequestId: '1bbb7854dfa0d8',
  bids: [
    {
      params: {
        placementId: '13144370',
        siteId: '23434',
        publisherId: '7689670753',
      },
    }
  ],
  refererInfo: {
    page: 'test-page',
    domain: 'test-domain',
    ref: 'test-referer'
  },
  gdprConsent: {
    consentString: 'test-gdpr-string'
  }
}

const VALID_USP_BIDDER_REQUEST = {
  auctionId: '19c97f22-5bd1-4b16-a128-80f75fb0a8a0',
  bidderCode: 'aidem',
  bidderRequestId: '1bbb7854dfa0d8',
  bids: [
    {
      params: {
        placementId: '13144370',
        siteId: '23434',
        publisherId: '7689670753',
      },
    }
  ],
  refererInfo: {
    page: 'test-page',
    domain: 'test-domain',
    ref: 'test-referer'
  },
  uspConsent: '1YYY'
}

const SERVER_RESPONSE_BANNER = {
  'id': '19c97f22-5bd1-4b16-a128-80f75fb0a8a0',
  'seatbid': [
    {
      'bid': [
        {
          'id': 'beeswax/aidem',
          'impid': '2705bfae8ea667',
          'price': 0.00875,
          'burl': 'imp_burl',
          'adm': 'creativity_banner',
          'adid': '2:64:162:1001',
          'adomain': [
            'aidem.com'
          ],
          'cid': '64',
          'crid': 'aidem-1001',
          'cat': [],
          'w': 300,
          'h': 250,
          'mtype': 1
        }
      ],
      'seat': 'aidemdsp',
      'group': 0
    }
  ],
  'cur': 'USD'
}

const SERVER_RESPONSE_VIDEO = {
  'id': '19c97f22-5bd1-4b16-a128-80f75fb0a8a0',
  'seatbid': [
    {
      'bid': [
        {
          'id': 'beeswax/aidem',
          'impid': '2705bfae8ea667',
          'price': 0.00875,
          'burl': 'imp_burl',
          'adm': 'creativity_banner',
          'adid': '2:64:162:1001',
          'adomain': [
            'aidem.com'
          ],
          'cid': '64',
          'crid': 'aidem-1001',
          'cat': [],
          'w': 300,
          'h': 250,
          'mtype': 2
        }
      ],
      'seat': 'aidemdsp',
      'group': 0
    }
  ],
  'cur': 'USD'
}

const WIN_NOTICE = {
  burl: 'burl'
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
      expect(requests.data).to.be.a('object')
      expect(requests.options).to.be.an('object').that.have.a.property('withCredentials')
    });

    it('should have a well formatted banner payload', () => {
      const {data} = spec.buildRequests(DEFAULT_VALID_BANNER_REQUESTS, VALID_BIDDER_REQUEST);
      expect(data).to.be.a('object').that.has.all.keys(
        'id', 'imp', 'regs', 'site', 'environment', 'at', 'test'
      )
      expect(data.imp).to.be.a('array').that.has.lengthOf(DEFAULT_VALID_BANNER_REQUESTS.length)

      expect(data.imp[0]).to.be.a('object').that.has.all.keys(
        'banner', 'id', 'tagId'
      )
      expect(data.imp[0].banner).to.be.a('object').that.has.all.keys(
        'format', 'topframe'
      )
    });

    if (FEATURES.VIDEO) {
      it('should have a well formatted video payload', () => {
        const {data} = spec.buildRequests(DEFAULT_VALID_VIDEO_REQUESTS, VALID_BIDDER_REQUEST);
        expect(data).to.be.a('object').that.has.all.keys(
          'id', 'imp', 'regs', 'site', 'environment', 'at', 'test'
        )
        expect(data.imp).to.be.a('array').that.has.lengthOf(DEFAULT_VALID_VIDEO_REQUESTS.length)

        expect(data.imp[0]).to.be.a('object').that.has.all.keys(
          'video', 'id', 'tagId'
        )
        expect(data.imp[0].video).to.be.a('object').that.has.all.keys(
          'mimes', 'minduration', 'maxduration', 'protocols', 'w', 'h'
        )
      });
    }

    it('should hav wpar keys in environment object', function () {
      const {data} = spec.buildRequests(DEFAULT_VALID_VIDEO_REQUESTS, VALID_BIDDER_REQUEST);
      expect(data).to.have.property('environment')
      expect(data.environment).to.be.a('object').that.have.property('wpar')
      expect(data.environment.wpar).to.be.a('object').that.has.keys('innerWidth', 'innerHeight')
    });
  })

  describe('interpretResponse', () => {
    it('should return a valid bid array with a banner bid', () => {
      const {data} = spec.buildRequests(DEFAULT_VALID_BANNER_REQUESTS, VALID_BIDDER_REQUEST)
      const bids = spec.interpretResponse({body: SERVER_RESPONSE_BANNER}, { data })
      expect(bids).to.be.a('array').that.has.lengthOf(1)
      bids.forEach(value => {
        expect(value).to.be.a('object').that.has.all.keys(
          'ad', 'cpm', 'creativeId', 'currency', 'height', 'mediaType', 'meta', 'netRevenue', 'requestId', 'ttl', 'width', 'burl', 'seatBidId', 'creative_id'
        )
      })
    });

    if (FEATURES.VIDEO) {
      it('should return a valid bid array with a video bid', () => {
        const {data} = spec.buildRequests(DEFAULT_VALID_VIDEO_REQUESTS, VALID_BIDDER_REQUEST)
        const bids = spec.interpretResponse({body: SERVER_RESPONSE_VIDEO}, { data })
        expect(bids).to.be.a('array').that.has.lengthOf(1)
        bids.forEach(value => {
          expect(value).to.be.a('object').that.has.all.keys(
            'vastUrl', 'vastXml', 'playerHeight', 'playerWidth', 'cpm', 'creativeId', 'currency', 'height', 'mediaType', 'meta', 'netRevenue', 'requestId', 'ttl', 'width', 'burl', 'seatBidId', 'creative_id'
          )
        })
      });
    }

    it('should return a valid bid array with netRevenue', () => {
      const {data} = spec.buildRequests(DEFAULT_VALID_VIDEO_REQUESTS, VALID_BIDDER_REQUEST)
      const bids = spec.interpretResponse({body: SERVER_RESPONSE_VIDEO}, { data })
      expect(bids).to.be.a('array').that.has.lengthOf(1)
      expect(bids[0].netRevenue).to.be.true
    });

    // it('should return an empty bid array if one of seatbid entry is missing price property', () => {
    //   const response = utils.deepClone(SERVER_RESPONSE_BANNER)
    //   delete response.body.bid[0].price
    //   const interpreted = spec.interpretResponse(response)
    //   expect(interpreted).to.be.a('array').that.has.lengthOf(0)
    // });

    // it('should return an empty bid array if one of seatbid entry is missing adm property', () => {
    //   const response = utils.deepClone(SERVER_RESPONSE_BANNER)
    //   delete response.body.bid[0].adm
    //   const interpreted = spec.interpretResponse(response)
    //   expect(interpreted).to.be.a('array').that.has.lengthOf(0)
    // });
  })

  describe('onBidWon', () => {
    it(`should exists and type function`, function () {
      expect(spec.onBidWon).to.exist.and.to.be.a('function')
    });

    it(`should send a win notice`, function () {
      spec.onBidWon(WIN_NOTICE);
      expect(server.requests.length).to.equal(1);
    });
  });

  // describe('onBidderError', () => {
  //   it(`should exists and type function`, function () {
  //     expect(spec.onBidderError).to.exist.and.to.be.a('function')
  //   });
  //
  //   it(`should send a valid error notice`, function () {
  //     spec.onBidderError({ bidderRequest: ERROR_NOTICE })
  //     expect(server.requests.length).to.equal(1);
  //     const body = JSON.parse(server.requests[0].requestBody)
  //     expect(body).to.be.a('object').that.has.all.keys('message', 'auctionId', 'bidderRequestId', 'url', 'metrics')
  //     // const { bids } = JSON.parse(server.requests[0].requestBody)
  //     // expect(bids).to.be.a('array').that.has.lengthOf(1)
  //     // _each(bids, (bid) => {
  //     //   expect(bid).to.be.a('object').that.has.all.keys('adUnitCode', 'auctionId', 'bidId', 'bidderRequestId', 'transactionId', 'metrics')
  //     // })
  //   });
  // });

  describe('setEndPoints', () => {
    it(`should exists and type function`, function () {
      expect(setEndPoints).to.exist.and.to.be.a('function')
    });

    it(`should not modify default endpoints`, function () {
      const endpoints = setEndPoints()
      const requestURL = new URL(endpoints.request)
      expect(requestURL.host).to.equal('zero.aidemsrv.com')
      expect(decodeURIComponent(requestURL.pathname)).to.equal('/prebidjs/ortb/v2.6/bid/request')
    });

    it(`should not change request endpoint`, function () {
      const endpoints = setEndPoints('default')
      const requestURL = new URL(endpoints.request)
      expect(decodeURIComponent(requestURL.pathname)).to.equal('/prebidjs/ortb/v2.6/bid/request')
    });

    it(`should change to local env`, function () {
      const endpoints = setEndPoints('local')
      const requestURL = new URL(endpoints.request)

      expect(requestURL.host).to.equal('127.0.0.1:8787')
    });

    it(`should add a path prefix`, function () {
      const endpoints = setEndPoints('local', '/path')
      const requestURL = new URL(endpoints.request)

      expect(decodeURIComponent(requestURL.pathname)).to.equal('/path/prebidjs/ortb/v2.6/bid/request')
    });

    it(`should add a path prefix and change request endpoint`, function () {
      const endpoints = setEndPoints('local', '/path')
      const requestURL = new URL(endpoints.request)

      expect(decodeURIComponent(requestURL.pathname)).to.equal('/path/prebidjs/ortb/v2.6/bid/request')
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
      expect(data.regs.coppa_applies).to.equal(true)
    });

    it(`should set gdpr to true`, function () {
      // config.setConfig({
      //   consentManagement: {
      //     gdpr: {
      //       consentData: {
      //         getTCData: {
      //           tcString: 'test-gdpr-string'
      //         }
      //       }
      //     },
      //   }
      // });
      const { data } = spec.buildRequests(DEFAULT_VALID_BANNER_REQUESTS, VALID_GDPR_BIDDER_REQUEST);
      expect(data.regs.gdpr_applies).to.equal(true)
    });

    it(`should set usp_consent string`, function () {
      // config.setConfig({
      //   consentManagement: {
      //     usp: {
      //       cmpApi: 'static',
      //       consentData: {
      //         getUSPData: {
      //           uspString: '1YYY'
      //         }
      //       }
      //     }
      //   }
      // });
      const { data } = spec.buildRequests(DEFAULT_VALID_BANNER_REQUESTS, VALID_USP_BIDDER_REQUEST);
      expect(data.regs.us_privacy).to.equal('1YYY')
    });

    it(`should not set usp_consent string`, function () {
      // config.setConfig({
      //   consentManagement: {
      //     usp: {
      //       cmpApi: 'iab',
      //       consentData: {
      //         getUSPData: {
      //           uspString: '1YYY'
      //         }
      //       }
      //     }
      //   }
      // });
      const { data } = spec.buildRequests(DEFAULT_VALID_BANNER_REQUESTS, VALID_BIDDER_REQUEST);
      expect(data.regs.us_privacy).to.undefined
    });
  });
});
