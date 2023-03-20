import 'src/prebid.js';
import {spec, resetBidderConfigs} from 'modules/relevantDigitalBidAdapter.js';
import {server} from 'test/mocks/xhr.js';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';
import {newAuctionManager, auctionManager} from 'src/auctionManager.js';
import { userSync } from 'src/userSync.js';

const { generateUUID, parseUrl } = utils;

const expect = require('chai').expect;

const HOST = 'pbs-domain-1.relevant-digital.com';
const HOST2 = 'pbs-domain-2.relevant-digital.com'; // Notice: Must be alphabetically ordered after HOST for some tests
const TEST_ALIAS = 'test_alias_of_relevantdigital';
const AD_UNIT_CODE = '/12345/stored/request/test-1';
const AD_UNIT_CODE2 = '/12345/stored/request/test-2';

const BID = {
  bid_id: AD_UNIT_CODE,
  bidder: spec.code,
  params: {
    placementId: '620525862d7518bfd4bbb81e_620523b5d1dbed6b0fbbb817',
    accountId: '620523ae7f4bbe1691bbb815',
    pbsHost: HOST,
  },
};

const AD_UNIT = {
  code: AD_UNIT_CODE,
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 600], [320, 320]],
    }
  },
  bids: [BID],
};

const makeResponse = ({ host = HOST } = {}) => ({
  'seatbid': [
    {
      'bid': [
        {
          'id': '613673EF-A07C-4486-8EE9-3FC71A7DC73D',
          'impid': AD_UNIT_CODE,
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
                'hb_cache_host': host,
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
                'win': `https://${host}/event?t=win&b=fed970f7-4295-456d-a251-38013faab795&a=620523ae7f4bbe1691bbb815&bidder=pubmatic&ts=1678646619765`,
                'imp': `https://${host}/event?t=imp&b=fed970f7-4295-456d-a251-38013faab795&a=620523ae7f4bbe1691bbb815&bidder=pubmatic&ts=1678646619765`
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
    'tmaxrequest': 2750,
    'prebid': {
      'auctiontimestamp': 1678646619765,
      'passthrough': {
        'relevant': {
          'bidder': spec.code
        }
      }
    }
  }
});

const STUBS = [
  [userSync, 'registerSync'],
  [utils, 'triggerPixel'],
];

const restoreStubs = () => STUBS.forEach(([k, v]) => k[v].restore?.());
const initStubs = () => {
  restoreStubs();
  STUBS.forEach(([k, v]) => sinon.stub(k, v));
};

describe('Relevant Digital Bid Adaper', function () {
  let oldIndex;
  let myAuctionManager;

  const runAuction = async ({ adUnits, response }) => {
    let cb;
    const promise = new Promise((resolve) => { cb = resolve; });
    const auction = myAuctionManager.createAuction({
      adUnits: adUnits.map((unit) => ({
        ...unit,
        transactionId: generateUUID(),
      })),
      adUnitCodes: adUnits.map(({ code }) => code),
      callback: cb,
    });
    auction.callBids();
    Object.entries(response).forEach(([host, resp]) => {
      const req = server.requests.find(({ url }) => url.includes(host) && url.includes('/openrtb2/auction'))
      const { id } = JSON.parse(req.requestBody);
      req.respond(200, {}, JSON.stringify({
        ...resp,
        id,
      }));
    });
    return promise;
  };

  before(() => {
    oldIndex = auctionManager.index;
    myAuctionManager = newAuctionManager();
    auctionManager.index = myAuctionManager.index;
    $$PREBID_GLOBAL$$.aliasBidder(spec.code, TEST_ALIAS);
    config.setConfig({
      userSync: {
        aliasSyncEnabled: true,
        filterSettings: {
          iframe: {
            bidders: '*',
            filter: 'include',
          },
        },
      },
    });
  });
  after(() => {
    auctionManager.index = oldIndex;
    restoreStubs();
    config.resetConfig();
    delete $$PREBID_GLOBAL$$.aliasRegistry[TEST_ALIAS];
  });
  const beforeEachDescribe = () => {
    resetBidderConfigs();
    initStubs();
  };
  describe('a basic auction', () => {
    let bidResponses;
    let pbsResponse;
    before(async () => {
      beforeEachDescribe();
      pbsResponse = makeResponse();
      bidResponses = await runAuction({
        adUnits: [AD_UNIT],
        response: { [HOST]: pbsResponse },
      });
    });
    it('should return a correct bid', () => {
      const bids = bidResponses[AD_UNIT_CODE].bids;
      expect(bids.length).to.equal(1);
      const bid = bids[0];
      expect(bid.bidderCode).to.equal(spec.code);
    });
    it('should use S2S-bidders for cookie-syncing', () => {
      const { args } = userSync.registerSync;
      expect(args.length).to.equal(1);
      const [type, bidder, url] = args[0];
      expect(type).to.equal('iframe');
      expect(bidder).to.equal(spec.code);
      const { bidders, endpoint } = parseUrl(url).search;
      expect(bidders.split(',').sort()).to.deep.equal(['appnexus', 'pubmatic']);
      expect(endpoint).to.equal(`https://${HOST}/cookie_sync`);
    });
    it('should trigger the correct impression-pixel when rendering', async () => {
      myAuctionManager.addWinningBid(bidResponses[AD_UNIT_CODE].bids[0]);
      const { args } = utils.triggerPixel;
      expect(args.length).to.equal(1);
      const [url] = args[0];
      expect(url).to.equal(pbsResponse.seatbid[0].bid[0].ext.prebid.events.win);
    });
  });
  describe('an auction with 2 bidders', () => {
    let bidResponses;
    let pbsResponse;
    const fix = (obj) => JSON.parse(JSON.stringify(obj)
      .replaceAll(AD_UNIT_CODE, AD_UNIT_CODE2)
      .replaceAll(HOST, HOST2)
      .replaceAll(spec.code, TEST_ALIAS));
    before(async () => {
      beforeEachDescribe();
      pbsResponse = makeResponse();
      bidResponses = await runAuction({
        adUnits: [AD_UNIT, fix(AD_UNIT)],
        response: {
          [HOST]: pbsResponse,
          [HOST2]: fix(pbsResponse),
        },
      });
    });
    it('should return 2 correct bids', () => {
      const [bid1] = bidResponses[AD_UNIT_CODE].bids;
      const [bid2] = bidResponses[AD_UNIT_CODE2].bids;
      expect(bid1.bidderCode).to.equal(spec.code);
      expect(bid2.bidderCode).to.equal(TEST_ALIAS);
    });
    it('should cookie-sync to the right hosts', () => {
      const { args } = userSync.registerSync;
      expect(args.length).to.equal(2);
      const [url1, url2] = args.map(([,, url]) => url).sort();
      expect(parseUrl(url1).search.endpoint).to.equal(`https://${HOST}/cookie_sync`);
      expect(parseUrl(url2).search.endpoint).to.equal(`https://${HOST2}/cookie_sync`);
    });
    it('should trigger impression-pixels to the right hosts when rendering', async () => {
      myAuctionManager.addWinningBid(bidResponses[AD_UNIT_CODE].bids[0]);
      myAuctionManager.addWinningBid(bidResponses[AD_UNIT_CODE2].bids[0]);
      const { args } = utils.triggerPixel;
      expect(args.length).to.equal(2);
      const [url1, url2] = args.map(([url]) => url).sort();
      expect(url1).to.include(HOST);
      expect(url2).to.include(HOST2);
    });
  });
});
