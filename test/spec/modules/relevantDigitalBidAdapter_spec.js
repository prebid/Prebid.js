import 'src/prebid.js';
import {spec} from 'modules/relevantDigitalBidAdapter.js';
import {server} from 'test/mocks/xhr.js';
import { config } from 'src/config.js';
import { generateUUID, parseUrl } from 'src/utils.js';
import {newAuctionManager, auctionManager} from 'src/auctionManager.js';
import { userSync } from 'src/userSync.js';

const expect = require('chai').expect;

const HOST = 'dev-api.relevant-digital.com';
const IMP_ID = '/12345/stored/request/test';

const BID = {
  bid_id: IMP_ID,
  bidder: spec.code,
  params: {
    adUnitCode: '620525862d7518bfd4bbb81e_620523b5d1dbed6b0fbbb817',
    accountId: '620523ae7f4bbe1691bbb815',
    pbsHost: HOST,
  },
};

const AD_UNIT = {
  code: IMP_ID,
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
          'impid': IMP_ID,
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

const findReq = (str) => server.requests.find((r) => r.url.includes(str));

describe('Relevant Digital Bid Adaper', function () {
  let oldIndex;
  let myAuctionManager;
  let userSyncStub;

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
    const req = findReq('/openrtb2/auction');
    const { id } = JSON.parse(req.requestBody);
    req.respond(200, {}, JSON.stringify({
      ...response,
      id,
    }));
    return promise;
  };

  before(() => {
    oldIndex = auctionManager.index;
    myAuctionManager = newAuctionManager();
    auctionManager.index = myAuctionManager.index;
    userSyncStub = sinon.stub(userSync, 'registerSync')
    config.setConfig({
      userSync: {
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
    userSyncStub.restore();
    config.resetConfig();
  });
  afterEach(() => {
    userSyncStub.resetHistory();
  });
  describe('a basic auction with cookie-syncing', () => {
    let bidResponses;
    before(async () => {
      bidResponses = await runAuction({
        adUnits: [AD_UNIT],
        response: makeResponse(),
      });
    });
    after(() => {
    });
    it('should return a correct bid', () => {
      const bids = bidResponses[AD_UNIT.code].bids;
      expect(bids.length).to.equal(1);
      const bid = bids[0];
      expect(bid.bidderCode).to.be.equal(spec.code);
    });
    it('should use S2S-bidders for cookie-syncing', () => {
      expect(userSyncStub.args.length).to.equal(1);
      const [type, bidder, url] = userSyncStub.args;
      expect(type).to.equal('iframe');
      expect(bidder).to.equal(spec.code);
      const x = parseUrl(url);
      console.info(x);
    });
  });
});
