import adagioAnalyticsAdapter from 'modules/adagioAnalyticsAdapter.js';
import { expect } from 'chai';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
import * as prebidGlobal from 'src/prebidGlobal.js';
import { EVENTS } from 'src/constants.js';

let adapterManager = require('src/adapterManager').default;
let events = require('src/events');

describe('adagio analytics adapter - adagio.js', () => {
  let sandbox;
  let adagioQueuePushSpy;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    sandbox.stub(events, 'getEvents').returns([]);

    const w = utils.getWindowTop();

    adapterManager.registerAnalyticsAdapter({
      code: 'adagio',
      adapter: adagioAnalyticsAdapter
    });

    w.ADAGIO = w.ADAGIO || {};
    w.ADAGIO.queue = w.ADAGIO.queue || [];

    adagioQueuePushSpy = sandbox.spy(w.ADAGIO.queue, 'push');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('track', () => {
    beforeEach(() => {
      adapterManager.enableAnalytics({
        provider: 'adagio'
      });
    });

    afterEach(() => {
      adagioAnalyticsAdapter.disableAnalytics();
    });

    it('builds and sends auction data', () => {
      const w = utils.getWindowTop();

      let bidRequest = {
        bids: [{
          adUnitCode: 'div-1',
          params: {
            features: {
              siteId: '2',
              placement: 'pave_top',
              pagetype: 'article',
              category: 'IAB12,IAB12-2',
              device: '2',
            }
          }
        }, {
          adUnitCode: 'div-2',
          params: {
            features: {
              siteId: '2',
              placement: 'ban_top',
              pagetype: 'article',
              category: 'IAB12,IAB12-2',
              device: '2',
            }
          },
        }],
      };
      let bidResponse = {
        bidderCode: 'adagio',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        cpm: 6.2189757658226075,
        currency: '',
        netRevenue: false,
        adUnitCode: 'div-1',
        timeToRespond: 132,
      };

      const testEvents = {
        [EVENTS.BID_REQUESTED]: bidRequest,
        [EVENTS.BID_RESPONSE]: bidResponse,
        [EVENTS.AUCTION_END]: {}
      };

      // Step 1-3: Send events
      Object.entries(testEvents).forEach(([ev, payload]) => events.emit(ev, payload));

      function eventItem(eventName, args) {
        return sinon.match({
          action: 'pb-analytics-event',
          ts: sinon.match((val) => val !== undefined),
          data: {
            eventName,
            args
          }
        })
      }

      Object.entries(testEvents).forEach(([ev, payload]) => sinon.assert.calledWith(adagioQueuePushSpy, eventItem(ev, payload)));
    });
  });

  describe('no track', () => {
    beforeEach(() => {
      sandbox.stub(utils, 'getWindowTop').throws();

      adapterManager.enableAnalytics({
        provider: 'adagio'
      });
    });

    afterEach(() => {
      adagioAnalyticsAdapter.disableAnalytics();
      sandbox.restore();
    });

    it('builds and sends auction data', () => {
      let bidRequest = {
        bids: [{
          adUnitCode: 'div-1',
          params: {
            features: {
              siteId: '2',
              placement: 'pave_top',
              pagetype: 'article',
              category: 'IAB12,IAB12-2',
              device: '2',
            }
          }
        }, {
          adUnitCode: 'div-2',
          params: {
            features: {
              siteId: '2',
              placement: 'ban_top',
              pagetype: 'article',
              category: 'IAB12,IAB12-2',
              device: '2',
            }
          },
        }],
      };
      let bidResponse = {
        bidderCode: 'adagio',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        cpm: 6.2189757658226075,
        currency: '',
        netRevenue: false,
        adUnitCode: 'div-1',
        timeToRespond: 132,
      };

      // Step 1: Send bid requested event
      events.emit(EVENTS.BID_REQUESTED, bidRequest);

      // Step 2: Send bid response event
      events.emit(EVENTS.BID_RESPONSE, bidResponse);

      // Step 3: Send auction end event
      events.emit(EVENTS.AUCTION_END, {});

      utils.getWindowTop.restore();

      sandbox.assert.callCount(adagioQueuePushSpy, 0);
    });
  });
});

const AUCTION_ID = '25c6d7f5-699a-4bfc-87c9-996f915341fa';
const AUCTION_ID_ADAGIO = '6fc53663-bde5-427b-ab63-baa9ed296f47'
const AUCTION_ID_CACHE = 'b43d24a0-13d4-406d-8176-3181402bafc4';
const AUCTION_ID_CACHE_ADAGIO = 'a9cae98f-efb5-477e-9259-27350044f8db';

const BID_ADAGIO = Object.assign({}, BID_ADAGIO, {
  bidder: 'adagio',
  auctionId: AUCTION_ID,
  adUnitCode: '/19968336/header-bid-tag-1',
  bidId: '3bd4ebb1c900e2',
  partnerImpId: 'partnerImpressionID-2',
  adId: 'fake_ad_id_2',
  requestId: '3bd4ebb1c900e2',
  width: 728,
  height: 90,
  mediaType: 'banner',
  cpm: 1.42,
  currency: 'USD',
  originalCpm: 1.42,
  originalCurrency: 'USD',
  dealId: 'the-deal-id',
  dealChannel: 'PMP',
  mi: 'matched-impression',
  seatBidId: 'aaaa-bbbb-cccc-dddd',
  adserverTargeting: {
    'hb_bidder': 'another',
    'hb_adid': '3bd4ebb1c900e2',
    'hb_pb': '1.500',
    'hb_size': '728x90',
    'hb_source': 'server'
  },
  meta: {
    advertiserDomains: ['example.com']
  },
  pba: {
    sid: '42',
    e_pba_test: true
  }
});

const BID_ANOTHER = Object.assign({}, BID_ANOTHER, {
  bidder: 'another',
  auctionId: AUCTION_ID,
  adUnitCode: '/19968336/header-bid-tag-1',
  bidId: '3bd4ebb1c900e2',
  partnerImpId: 'partnerImpressionID-2',
  adId: 'fake_ad_id_2',
  requestId: '3bd4ebb1c900e2',
  width: 728,
  height: 90,
  mediaType: 'banner',
  cpm: 1.71,
  currency: 'EUR',
  originalCpm: 1.62,
  originalCurrency: 'GBP',
  dealId: 'the-deal-id',
  dealChannel: 'PMP',
  mi: 'matched-impression',
  seatBidId: 'aaaa-bbbb-cccc-dddd',
  adserverTargeting: {
    'hb_bidder': 'another',
    'hb_adid': '3bd4ebb1c900e2',
    'hb_pb': '1.500',
    'hb_size': '728x90',
    'hb_source': 'server'
  },
  meta: {
    advertiserDomains: ['example.com']
  }
});

const BID_CACHED = Object.assign({}, BID_ADAGIO, {
  auctionId: AUCTION_ID_CACHE,
  latestTargetedAuctionId: BID_ADAGIO.auctionId,
});

const PARAMS_ADG = {
  organizationId: '1001',
  site: 'test-com',
  pageviewId: 'a68e6d70-213b-496c-be0a-c468ff387106',
  environment: 'desktop',
  pagetype: 'article',
  placement: 'pave_top',
  testName: 'test',
  testVersion: 'version',
};

const AUCTION_INIT_ANOTHER = {
  'auctionId': AUCTION_ID,
  'timestamp': 1519767010567,
  'auctionStatus': 'inProgress',
  'adUnits': [ {
    'code': '/19968336/header-bid-tag-1',
    'mediaTypes': {
      'banner': {
        'sizes': [
          [
            640,
            480
          ],
          [
            640,
            100
          ]
        ]
      }
    },
    'sizes': [[640, 480]],
    'bids': [ {
      'bidder': 'another',
      'params': {
        'publisherId': '1001'
      },
    }, {
      'bidder': 'nobid',
      'params': {
        'publisherId': '1002'
      },
    }, {
      'bidder': 'adagio',
      'params': {
        ...PARAMS_ADG
      },
    }, ],
    'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014'
  }, {
    'code': '/19968336/footer-bid-tag-1',
    'mediaTypes': {
      'banner': {
        'sizes': [
          [
            640,
            480
          ]
        ]
      }
    },
    'sizes': [[640, 480]],
    'bids': [ {
      'bidder': 'another',
      'params': {
        'publisherId': '1001'
      },
    } ],
    'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014'
  } ],
  'adUnitCodes': ['/19968336/header-bid-tag-1', '/19968336/footer-bid-tag-1'],
  'bidderRequests': [ {
    'bidderCode': 'another',
    'auctionId': AUCTION_ID,
    'bidderRequestId': '1be65d7958826a',
    'bids': [ {
      'bidder': 'another',
      'params': {
        'publisherId': '1001',
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[640, 480]]
        }
      },
      'adUnitCode': '/19968336/header-bid-tag-1',
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
      'sizes': [[640, 480]],
      'bidId': '2ecff0db240757',
      'bidderRequestId': '1be65d7958826a',
      'auctionId': AUCTION_ID,
      'src': 'client',
      'bidRequestsCount': 1
    }, {
      'bidder': 'another',
      'params': {
        'publisherId': '1001'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[640, 480]]
        }
      },
      'adUnitCode': '/19968336/footer-bid-tag-1',
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
      'sizes': [[640, 480]],
      'bidId': '2ecff0db240757',
      'bidderRequestId': '1be65d7958826a',
      'auctionId': AUCTION_ID,
      'src': 'client',
      'bidRequestsCount': 1
    }, {
      'bidder': 'nobid',
      'params': {
        'publisherId': '1001'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[640, 480]]
        }
      },
      'adUnitCode': '/19968336/footer-bid-tag-1',
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
      'sizes': [[640, 480]],
      'bidId': '2ecff0db240757',
      'bidderRequestId': '1be65d7958826a',
      'auctionId': AUCTION_ID,
      'src': 'client',
      'bidRequestsCount': 1
    }
    ],
    'timeout': 3000,
    'refererInfo': {
      'topmostLocation': 'http://www.test.com/page.html', 'reachedTop': true, 'numIframes': 0, 'stack': ['http://www.test.com/page.html']
    }
  }, {
    'bidderCode': 'adagio',
    'auctionId': AUCTION_ID,
    'bidderRequestId': '1be65d7958826a',
    'bids': [ {
      'bidder': 'adagio',
      'params': {
        ...PARAMS_ADG,
        adagioAuctionId: AUCTION_ID_ADAGIO
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[640, 480]]
        }
      },
      'adUnitCode': '/19968336/header-bid-tag-1',
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
      'sizes': [[640, 480]],
      'bidId': '2ecff0db240757',
      'bidderRequestId': '1be65d7958826a',
      'auctionId': AUCTION_ID,
      'src': 'client',
      'bidRequestsCount': 1
    }
    ],
    'timeout': 3000,
    'refererInfo': {
      'topmostLocation': 'http://www.test.com/page.html', 'reachedTop': true, 'numIframes': 0, 'stack': ['http://www.test.com/page.html']
    }
  }
  ],
  'bidsReceived': [],
  'winningBids': [],
  'timeout': 3000
};

const AUCTION_INIT_CACHE = {
  'auctionId': AUCTION_ID_CACHE,
  'timestamp': 1519767010567,
  'auctionStatus': 'inProgress',
  'adUnits': [ {
    'code': '/19968336/header-bid-tag-1',
    'mediaTypes': {
      'banner': {
        'sizes': [
          [
            640,
            480
          ],
          [
            640,
            100
          ]
        ]
      }
    },
    'sizes': [[640, 480]],
    'bids': [ {
      'bidder': 'another',
      'params': {
        'publisherId': '1001'
      },
    }, {
      'bidder': 'adagio',
      'params': {
        ...PARAMS_ADG
      },
    }, ],
    'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014'
  }, {
    'code': '/19968336/footer-bid-tag-1',
    'mediaTypes': {
      'banner': {
        'sizes': [
          [
            640,
            480
          ]
        ]
      }
    },
    'sizes': [[640, 480]],
    'bids': [ {
      'bidder': 'another',
      'params': {
        'publisherId': '1001'
      },
    } ],
    'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014'
  } ],
  'adUnitCodes': ['/19968336/header-bid-tag-1', '/19968336/footer-bid-tag-1'],
  'bidderRequests': [ {
    'bidderCode': 'another',
    'auctionId': AUCTION_ID_CACHE,
    'bidderRequestId': '1be65d7958826a',
    'bids': [ {
      'bidder': 'another',
      'params': {
        'publisherId': '1001',
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[640, 480]]
        }
      },
      'adUnitCode': '/19968336/header-bid-tag-1',
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
      'sizes': [[640, 480]],
      'bidId': '2ecff0db240757',
      'bidderRequestId': '1be65d7958826a',
      'auctionId': AUCTION_ID_CACHE,
      'src': 'client',
      'bidRequestsCount': 1
    }, {
      'bidder': 'another',
      'params': {
        'publisherId': '1001'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[640, 480]]
        }
      },
      'adUnitCode': '/19968336/footer-bid-tag-1',
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
      'sizes': [[640, 480]],
      'bidId': '2ecff0db240757',
      'bidderRequestId': '1be65d7958826a',
      'auctionId': AUCTION_ID_CACHE,
      'src': 'client',
      'bidRequestsCount': 1
    }
    ],
    'timeout': 3000,
    'refererInfo': {
      'topmostLocation': 'http://www.test.com/page.html', 'reachedTop': true, 'numIframes': 0, 'stack': ['http://www.test.com/page.html']
    }
  }, {
    'bidderCode': 'adagio',
    'auctionId': AUCTION_ID_CACHE,
    'bidderRequestId': '1be65d7958826a',
    'bids': [ {
      'bidder': 'adagio',
      'params': {
        ...PARAMS_ADG,
        adagioAuctionId: AUCTION_ID_CACHE_ADAGIO
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[640, 480]]
        }
      },
      'adUnitCode': '/19968336/header-bid-tag-1',
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
      'sizes': [[640, 480]],
      'bidId': '2ecff0db240757',
      'bidderRequestId': '1be65d7958826a',
      'auctionId': AUCTION_ID_CACHE,
      'src': 'client',
      'bidRequestsCount': 1
    }
    ],
    'timeout': 3000,
    'refererInfo': {
      'topmostLocation': 'http://www.test.com/page.html', 'reachedTop': true, 'numIframes': 0, 'stack': ['http://www.test.com/page.html']
    }
  }
  ],
  'bidsReceived': [],
  'winningBids': [],
  'timeout': 3000
};

const AUCTION_END_ANOTHER = Object.assign({}, AUCTION_INIT_ANOTHER, {
  bidsReceived: [BID_ANOTHER, BID_ADAGIO]
});

const AUCTION_END_ANOTHER_NOBID = Object.assign({}, AUCTION_INIT_ANOTHER, {
  bidsReceived: []
});

const MOCK = {
  SET_TARGETING: {
    [BID_ADAGIO.adUnitCode]: BID_ADAGIO.adserverTargeting,
    [BID_ANOTHER.adUnitCode]: BID_ANOTHER.adserverTargeting
  },
  AUCTION_INIT: {
    another: AUCTION_INIT_ANOTHER,
    bidcached: AUCTION_INIT_CACHE
  },
  BID_RESPONSE: {
    adagio: BID_ADAGIO,
    another: BID_ANOTHER
  },
  AUCTION_END: {
    another: AUCTION_END_ANOTHER,
    another_nobid: AUCTION_END_ANOTHER_NOBID
  },
  BID_WON: {
    adagio: Object.assign({}, BID_ADAGIO, {
      'status': 'rendered'
    }),
    another: Object.assign({}, BID_ANOTHER, {
      'status': 'rendered'
    }),
    bidcached: Object.assign({}, BID_CACHED, {
      'status': 'rendered'
    }),
  },
  AD_RENDER_SUCCEEDED: {
    another: {
      ad: '<div>ad</div>',
      adId: 'fake_ad_id_2',
      bid: BID_ANOTHER
    },
    bidcached: {
      ad: '<div>ad</div>',
      adId: 'fake_ad_id_2',
      bid: BID_CACHED
    }
  },
  AD_RENDER_FAILED: {
    bidcached: {
      adId: 'fake_ad_id_2',
      bid: BID_CACHED
    }
  }
};

describe('adagio analytics adapter', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    sandbox.stub(events, 'getEvents').returns([]);

    adapterManager.registerAnalyticsAdapter({
      code: 'adagio',
      adapter: adagioAnalyticsAdapter
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('track', () => {
    beforeEach(() => {
      adapterManager.enableAnalytics({
        provider: 'adagio'
      });
    });

    afterEach(() => {
      adagioAnalyticsAdapter.disableAnalytics();
    });

    it('builds and sends auction data', () => {
      sandbox.stub(prebidGlobal, 'getGlobal').returns({
        convertCurrency: (cpm, from, to) => {
          const convKeys = {
            'GBP-EUR': 0.7,
            'EUR-GBP': 1.3,
            'USD-EUR': 0.8,
            'EUR-USD': 1.2,
            'USD-GBP': 0.6,
            'GBP-USD': 1.6,
          };
          return cpm * (convKeys[`${from}-${to}`] || 1);
        }
      });

      events.emit(EVENTS.AUCTION_INIT, MOCK.AUCTION_INIT.another);
      events.emit(EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE.adagio);
      events.emit(EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE.another);
      events.emit(EVENTS.AUCTION_END, MOCK.AUCTION_END.another);
      events.emit(EVENTS.BID_WON, MOCK.BID_WON.another);
      events.emit(EVENTS.AD_RENDER_SUCCEEDED, MOCK.AD_RENDER_SUCCEEDED.another);

      expect(server.requests.length).to.equal(3, 'requests count');
      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[0].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('1');
        expect(search.pbjsv).to.equal('$prebid.version$');
        expect(search.auct_id).to.equal(AUCTION_ID_ADAGIO);
        expect(search.adu_code).to.equal('/19968336/header-bid-tag-1');
        expect(search.org_id).to.equal('1001');
        expect(search.site).to.equal('test-com');
        expect(search.pv_id).to.equal('a68e6d70-213b-496c-be0a-c468ff387106');
        expect(search.url_dmn).to.equal(window.location.hostname);
        expect(search.pgtyp).to.equal('article');
        expect(search.plcmt).to.equal('pave_top');
        expect(search.mts).to.equal('ban');
        expect(search.ban_szs).to.equal('640x100,640x480');
        expect(search.bdrs).to.equal('adagio,another,nobid');
        expect(search.adg_mts).to.equal('ban');
      }

      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[1].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('2');
        expect(search.e_sid).to.equal('42');
        expect(search.e_pba_test).to.equal('true');
        expect(search.bdrs_bid).to.equal('1,1,0');
        expect(search.bdrs_cpm).to.equal('1.42,2.052,');
      }

      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[2].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('3');
        expect(search.auct_id).to.equal(AUCTION_ID_ADAGIO);
        expect(search.adu_code).to.equal('/19968336/header-bid-tag-1');
        expect(search.win_bdr).to.equal('another');
        expect(search.win_mt).to.equal('ban');
        expect(search.win_ban_sz).to.equal('728x90');
        expect(search.win_net_cpm).to.equal('2.052');
        expect(search.win_og_cpm).to.equal('2.592');
      }
    });

    it('builds and sends auction data with a cached bid win', () => {
      sandbox.stub(prebidGlobal, 'getGlobal').returns({
        convertCurrency: (cpm, from, to) => {
          const convKeys = {
            'GBP-EUR': 0.7,
            'EUR-GBP': 1.3,
            'USD-EUR': 0.8,
            'EUR-USD': 1.2,
            'USD-GBP': 0.6,
            'GBP-USD': 1.6,
          };
          return cpm * (convKeys[`${from}-${to}`] || 1);
        }
      });

      events.emit(EVENTS.AUCTION_INIT, MOCK.AUCTION_INIT.bidcached);
      events.emit(EVENTS.AUCTION_INIT, MOCK.AUCTION_INIT.another);
      events.emit(EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE.adagio);
      events.emit(EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE.another);
      events.emit(EVENTS.AUCTION_END, MOCK.AUCTION_END.another_nobid);
      events.emit(EVENTS.BID_WON, MOCK.BID_WON.bidcached);
      events.emit(EVENTS.AD_RENDER_FAILED, MOCK.AD_RENDER_FAILED.bidcached);

      expect(server.requests.length).to.equal(5, 'requests count');
      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[0].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('1');
        expect(search.pbjsv).to.equal('$prebid.version$');
        expect(search.auct_id).to.equal(AUCTION_ID_CACHE_ADAGIO);
        expect(search.adu_code).to.equal('/19968336/header-bid-tag-1');
        expect(search.org_id).to.equal('1001');
        expect(search.site).to.equal('test-com');
        expect(search.pv_id).to.equal('a68e6d70-213b-496c-be0a-c468ff387106');
        expect(search.url_dmn).to.equal(window.location.hostname);
        expect(search.pgtyp).to.equal('article');
        expect(search.plcmt).to.equal('pave_top');
        expect(search.mts).to.equal('ban');
        expect(search.ban_szs).to.equal('640x100,640x480');
        expect(search.bdrs).to.equal('adagio,another');
        expect(search.adg_mts).to.equal('ban');
        expect(search.t_n).to.equal('test');
        expect(search.t_v).to.equal('version');
      }

      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[1].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('1');
        expect(search.pbjsv).to.equal('$prebid.version$');
        expect(search.auct_id).to.equal(AUCTION_ID_ADAGIO);
        expect(search.adu_code).to.equal('/19968336/header-bid-tag-1');
        expect(search.org_id).to.equal('1001');
        expect(search.site).to.equal('test-com');
        expect(search.pv_id).to.equal('a68e6d70-213b-496c-be0a-c468ff387106');
        expect(search.url_dmn).to.equal(window.location.hostname);
        expect(search.pgtyp).to.equal('article');
        expect(search.plcmt).to.equal('pave_top');
        expect(search.mts).to.equal('ban');
        expect(search.ban_szs).to.equal('640x100,640x480');
        expect(search.bdrs).to.equal('adagio,another,nobid');
        expect(search.adg_mts).to.equal('ban');
      }

      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[2].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('2');
        expect(search.e_sid).to.equal('42');
        expect(search.e_pba_test).to.equal('true');
        expect(search.bdrs_bid).to.equal('0,0,0');
        expect(search.bdrs_cpm).to.equal(',,');
      }

      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[3].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('3');
        expect(search.auct_id).to.equal(AUCTION_ID_ADAGIO);
        expect(search.auct_id_c).to.equal(AUCTION_ID_CACHE_ADAGIO);
        expect(search.adu_code).to.equal('/19968336/header-bid-tag-1');
        expect(search.win_bdr).to.equal('adagio');
        expect(search.win_mt).to.equal('ban');
        expect(search.win_ban_sz).to.equal('728x90');
        expect(search.win_net_cpm).to.equal('1.42');
        expect(search.win_og_cpm).to.equal('1.42');
        expect(search.rndr).to.not.exist;
      }

      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[4].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('4');
        expect(search.auct_id).to.equal(AUCTION_ID_ADAGIO);
        expect(search.auct_id_c).to.equal(AUCTION_ID_CACHE_ADAGIO);
        expect(search.adu_code).to.equal('/19968336/header-bid-tag-1');
        expect(search.rndr).to.equal('0');
      }
    });

    it('send an "empty" cpm when adserver currency != USD and convertCurrency() is undefined', () => {
      sandbox.stub(prebidGlobal, 'getGlobal').returns({});

      events.emit(EVENTS.AUCTION_INIT, MOCK.AUCTION_INIT.another);
      events.emit(EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE.adagio);
      events.emit(EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE.another);
      events.emit(EVENTS.AUCTION_END, MOCK.AUCTION_END.another);
      events.emit(EVENTS.BID_WON, MOCK.BID_WON.another);
      events.emit(EVENTS.AD_RENDER_SUCCEEDED, MOCK.AD_RENDER_SUCCEEDED.another);

      expect(server.requests.length).to.equal(3, 'requests count');

      // fail to compute bidder cpm and send an "empty" cpm
      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[1].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('2');
        expect(search.e_sid).to.equal('42');
        expect(search.e_pba_test).to.equal('true');
        expect(search.bdrs_bid).to.equal('1,1,0');
        expect(search.bdrs_cpm).to.equal('1.42,,');
      }
    });
  });
});
