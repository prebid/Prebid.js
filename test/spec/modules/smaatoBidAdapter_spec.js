// import { assert, expect } from 'chai';
import { spec } from 'modules/smaatoBidAdapter.js';
// import * as _ from 'lodash';
import { config } from 'src/config.js';

const bidRequests = [
  {
    bidder: 'smaato',
    params: {
      publisherId: '1100042525',
      adspaceId: '130563103'
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 50]]
      }
    },
    adUnitCode: '/19968336/header-bid-tag-0',
    transactionId: 'transactionId',
    sizes: [[300, 50]],
    bidId: 'bidId',
    bidderRequestId: 'bidderRequestId',
    auctionId: 'auctionId',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0
  }
];

const validBidRequests = bidRequests

const bidderRequest = {
  bidderCode: 'smaato',
  auctionId: 'auctionId',
  bidderRequestId: 'bidderRequestId',
  bids: [
    {
      bidder: 'smaato',
      params: {
        publisherId: '1100042525',
        adspaceId: '130563103'
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 50]]
        }
      },
      adUnitCode: '/19968336/header-bid-tag-0',
      transactionId: 'transactionId',
      sizes: [[300, 50]],
      bidId: 'bidId',
      bidderRequestId: 'bidderRequestId',
      auctionId: 'auctionId',
      src: 'client',
      bidRequestsCount: 1,
      bidderRequestsCount: 1,
      bidderWinsCount: 0
    }
  ],
  coppa: true,
  gdprConsent: {
    gdprApplies: true
  },
  auctionStart: 1581064124172,
  timeout: 1000,
  refererInfo: {
    referer: 'https://smaato.com/',
    reachedTop: true,
    numIframes: 0,
    stack: ['https://smaato.com/']
  },
  start: 1581064124177
};

const openRTBRequest = {
  id: 'auctionId',
  at: 1,
  imp: [
    {
      id: 'bidId',
      banner: {
        w: '300',
        h: '50'
      },
      tagid: '130563103'
    }
  ],
  cur: 'USD',
  site: {
    id: 'smaato.com',
    publisher: {
      id: '1100042525'
    },
    domain: 'smaato.com',
    page: 'https://smaato.com/',
    ref: 'https://smaato.com/'
  },
  device: {
    language: 'ja',
    ua:
      'Mozilla/5.0 (Linux; Android 8.0.0; ONEPLUS A5000) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.93 Mobile Safari/537.36'
  },
  regs: {
    coppa: 1,
    ext: {
      gdpr: 1
    }
  }
};

const serverResponse = {
  body: {
    bidid: '04db8629-179d-4bcd-acce-e54722969006',
    cur: 'USD',
    ext: {},
    id: '5ebea288-f13a-4754-be6d-4ade66c68877',
    seatbid: [
      {
        bid: [
          {
            'adm': '<div>test</div>',
            'adomain': [
              'smaato.com'
            ],
            'bidderName': 'smaato',
            'cid': 'CM6523',
            'crid': 'CR69381',
            'id': '6906aae8-7f74-4edd-9a4f-f49379a3cadd',
            'impid': '226416e6e6bf41',
            'iurl': 'https://bidstalkcreatives.s3.amazonaws.com/1x1.png',
            'nurl': 'https://ets-eu-west-1.track.smaato.net/v1/view?sessionId=e4e17adb-9599-42b1-bb5f-a1f1b3bee572&adSourceId=6906aae8-7f74-4edd-9a4f-f49379a3cadd&originalRequestTime=1552310449698&expires=1552311350698&winurl=ama8JbpJVpFWxvEja5viE3cLXFu58qRI8dGUh23xtsOn3N2-5UU0IwkgNEmR82pI37fcMXejL5IWTNAoW6Cnsjf-Dxl_vx2dUqMrVEevX-Vdx2VVnf-D5f73gZhvi4t36iPL8Dsw4aACekoLvVOV7-eXDjz7GHy60QFqcwKf5g2AlKPOInyZ6vJg_fn4qA9argvCRgwVybXE9Ndm2W0v8La4uFYWpJBOUveDDUrSQfzal7RsYvLb_OyaMlPHdrd_bwA9qqZWuyJXd-L9lxr7RQ%3D%3D%7CMw3kt91KJR0Uy5L-oNztAg%3D%3D&dpid=4XVofb_lH-__hr2JNGhKfg%3D%3D%7Cr9ciCU1cx3zmHXihItKO0g%3D%3D',
            'price': 0.01,
            'w': 350,
            'h': 50
          }
        ],
        seat: 'CM6523'
      }
    ],
  },
  headers: {}
};

const request = {
  method: 'POST',
  url: 'https://unifiedbidding.ad.smaato.net/oapi/unifiedbidding',
  data:
    ''
};

const interpretedBids = [
  {
    requestId: '226416e6e6bf41',
    cpm: 0.01,
    width: 350,
    height: 50,
    ad: '<div>test</div>',
    ttl: 1000,
    creativeId: 'CR69381',
    netRevenue: false,
    currency: 'USD'
  }
];

describe('smaatoBidAdapterTest', () => {
  describe('isBidRequestValid', () => {
    it('isBidRequestValid', () => {
      expect(spec.isBidRequestValid(bidRequests[0])).to.equal(true);
      expect(spec.isBidRequestValid(bidRequests[1])).to.equal(true);
      expect(spec.isBidRequestValid(bidRequests[2])).to.equal(true);
    });
  });

  describe('buildBidRequest', () => {
    it.only('buildBidRequest', () => {
      config.setConfig({'coppa': true});

      const req = spec.buildRequests(validBidRequests, bidderRequest);
      const removeUntestableAttrs = data => {
        delete data['device'];
        delete data['site']['domain'];
        delete data['site']['id'];
        delete data['site']['page'];
        // delete data['id'];
        data['imp'].forEach(imp => {
          delete imp['id'];
        })
        return data;
      };

      const reqData = removeUntestableAttrs(JSON.parse(req.data));
      const openRTBRequestData = removeUntestableAttrs(openRTBRequest);
      assert.deepStrictEqual(reqData, openRTBRequestData);
    });
  });

  describe('interpretResponse', () => {
    it('interpretResponse', () => {
      const bids = spec.interpretResponse(serverResponse, request);
      assert.deepStrictEqual(bids, interpretedBids);
    });
  });
});
