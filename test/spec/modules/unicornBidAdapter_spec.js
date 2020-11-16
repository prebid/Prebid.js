import { assert, expect } from 'chai';
import { spec } from 'modules/unicornBidAdapter.js';
import * as _ from 'lodash';

const bidRequests = [
  {
    bidder: 'unicorn',
    params: {
      bidfloorCpm: 0,
      accountId: 12345
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    adUnitCode: '/19968336/header-bid-tag-0',
    transactionId: 'ea0aa332-a6e1-4474-8180-83720e6b87bc',
    sizes: [[300, 250]],
    bidId: '226416e6e6bf41',
    bidderRequestId: '1f41cbdcbe58d5',
    auctionId: '77987c3a-9be9-4e43-985a-26fc91d84724',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0
  },
  {
    bidder: 'unicorn',
    params: {
      bidfloorCpm: 0,
      accountId: 12345
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    transactionId: 'cf801303-cf98-4b4a-9e0a-c27b93bce6d8',
    sizes: [[300, 250]],
    bidId: '37cdc0b5d0363b',
    bidderRequestId: '1f41cbdcbe58d5',
    auctionId: '77987c3a-9be9-4e43-985a-26fc91d84724',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0
  },
  {
    bidder: 'unicorn',
    params: {
      bidfloorCpm: 0
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    adUnitCode: '/19968336/header-bid-tag-2',
    transactionId: 'ba7f114c-3676-4a08-a26d-1ee293d521ed',
    sizes: [[300, 250]],
    bidId: '468569a6597a4',
    bidderRequestId: '1f41cbdcbe58d5',
    auctionId: '77987c3a-9be9-4e43-985a-26fc91d84724',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0
  }
];

const validBidRequests = [
  {
    bidder: 'unicorn',
    params: {
      placementId: 'rectangle-ad-1',
      bidfloorCpm: 0,
      accountId: 12345,
      publisherId: 99999,
      mediaId: 'example'
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    adUnitCode: '/19968336/header-bid-tag-0',
    transactionId: 'fbf94ccf-f377-4201-a662-32c2feb8ab6d',
    sizes: [[300, 250]],
    bidId: '2fb90842443e24',
    bidderRequestId: '123ae4cc3eeb7e',
    auctionId: 'c594a888-6744-46c6-8b0e-d188e40e83ef',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0
  },
  {
    bidder: 'unicorn',
    params: {
      bidfloorCpm: 0,
      accountId: 12345
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    adUnitCode: '/19968336/header-bid-tag-1',
    transactionId: '2d65e313-f8a6-4888-b9ab-50fb3ca744ea',
    sizes: [[300, 250]],
    bidId: '352f86f158d97a',
    bidderRequestId: '123ae4cc3eeb7e',
    auctionId: 'c594a888-6744-46c6-8b0e-d188e40e83ef',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0
  },
  {
    bidder: 'unicorn',
    params: {
      placementId: 'rectangle-ad-2',
      bidfloorCpm: 0,
      accountId: 12345
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    adUnitCode: '/19968336/header-bid-tag-2',
    transactionId: '82f445a8-44bc-40bc-9913-739b40375566',
    sizes: [[300, 250]],
    bidId: '4cde82cc90126b',
    bidderRequestId: '123ae4cc3eeb7e',
    auctionId: 'c594a888-6744-46c6-8b0e-d188e40e83ef',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0
  }
];

const bidderRequest = {
  bidderCode: 'unicorn',
  auctionId: 'c594a888-6744-46c6-8b0e-d188e40e83ef',
  bidderRequestId: '123ae4cc3eeb7e',
  bids: [
    {
      bidder: 'unicorn',
      params: {
        placementId: 'rectangle-ad-1',
        bidfloorCpm: 0,
        accountId: 12345
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      adUnitCode: '/19968336/header-bid-tag-0',
      transactionId: 'fbf94ccf-f377-4201-a662-32c2feb8ab6d',
      sizes: [[300, 250]],
      bidId: '2fb90842443e24',
      bidderRequestId: '123ae4cc3eeb7e',
      auctionId: 'c594a888-6744-46c6-8b0e-d188e40e83ef',
      src: 'client',
      bidRequestsCount: 1,
      bidderRequestsCount: 1,
      bidderWinsCount: 0
    },
    {
      bidder: 'unicorn',
      params: {
        bidfloorCpm: 0,
        accountId: 12345
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      adUnitCode: '/19968336/header-bid-tag-1',
      transactionId: '2d65e313-f8a6-4888-b9ab-50fb3ca744ea',
      sizes: [[300, 250]],
      bidId: '352f86f158d97a',
      bidderRequestId: '123ae4cc3eeb7e',
      auctionId: 'c594a888-6744-46c6-8b0e-d188e40e83ef',
      src: 'client',
      bidRequestsCount: 1,
      bidderRequestsCount: 1,
      bidderWinsCount: 0
    },
    {
      bidder: 'unicorn',
      params: {
        placementId: 'rectangle-ad-2',
        bidfloorCpm: 0,
        accountId: 12345
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      adUnitCode: '/19968336/header-bid-tag-2',
      transactionId: '82f445a8-44bc-40bc-9913-739b40375566',
      sizes: [[300, 250]],
      bidId: '4cde82cc90126b',
      bidderRequestId: '123ae4cc3eeb7e',
      auctionId: 'c594a888-6744-46c6-8b0e-d188e40e83ef',
      src: 'client',
      bidRequestsCount: 1,
      bidderRequestsCount: 1,
      bidderWinsCount: 0
    }
  ],
  auctionStart: 1581064124172,
  timeout: 1000,
  refererInfo: {
    referer: 'https://uni-corn.net/',
    reachedTop: true,
    numIframes: 0,
    stack: ['https://uni-corn.net/']
  },
  start: 1581064124177
};

const openRTBRequest = {
  id: '5ebea288-f13a-4754-be6d-4ade66c68877',
  at: 1,
  imp: [
    {
      id: '216255f234b602',
      banner: {
        w: '300',
        h: '250'
      },
      secure: 1,
      bidfloor: 0,
      tagid: 'rectangle-ad-1'
    },
    {
      id: '31e2b28ced2475',
      banner: {
        w: '300',
        h: '250'
      },
      secure: 1,
      bidfloor: 0,
      tagid: '/19968336/header-bid-tag-1'
    },
    {
      id: '40a333e047a9bd',
      banner: {
        w: '300',
        h: '250'
      },
      secure: 1,
      bidfloor: 0,
      tagid: 'rectangle-ad-2'
    }
  ],
  cur: 'JPY',
  ext: {
    accountId: 12345
  },
  site: {
    id: 'example',
    publisher: {
      id: 99999
    },
    domain: 'uni-corn.net',
    page: 'https://uni-corn.net/',
    ref: 'https://uni-corn.net/'
  },
  device: {
    language: 'ja',
    ua:
      'Mozilla/5.0 (Linux; Android 8.0.0; ONEPLUS A5000) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.93 Mobile Safari/537.36'
  },
  user: {
    id: '69d9e1c2-801e-4901-a665-fad467550fec'
  },
  bcat: [],
  source: {
    ext: {
      stype: 'prebid_uncn',
      bidder: 'unicorn'
    }
  }
};

const serverResponse = {
  body: {
    bidid: '04db8629-179d-4bcd-acce-e54722969006',
    cur: 'JPY',
    ext: {},
    id: '5ebea288-f13a-4754-be6d-4ade66c68877',
    seatbid: [
      {
        bid: [
          {
            adid: 'uqgbp4y0_OoqM1QOt',
            adm: '<div>test</div>',
            adomain: ['test1.co.jp'],
            attr: [],
            bundle: 'com.test1.android',
            cat: ['IAB9'],
            cid: '2196',
            crid: 'ABCDE',
            ext: {
              imptrackers: ['https://uncn.jp/pb/2/view/test1']
            },
            h: 250,
            id: '1',
            impid: '216255f234b602',
            iurl: 'https://assets.ucontent.net/test1.jpg',
            price: 1.0017,
            w: 300
          },
          {
            adid: 'uqgbp4y0_uqjrNT7h_25512',
            adm: '<div>test</div>',
            adomain: ['test1.co.jp'],
            attr: ['6'],
            bundle: 'com.test1.android',
            cat: ['IAB9'],
            cid: '2196',
            crid: 'abcde',
            ext: {
              imptrackers: ['https://uncn.jp/pb/2/view/test1']
            },
            h: 250,
            id: '2',
            impid: '31e2b28ced2475',
            iurl: 'https://assets.ucontent.net/test1.jpg',
            price: 0.9513,
            w: 300
          }
        ],
        group: 0,
        seat: '65'
      },
      {
        bid: [
          {
            adid: 'uoNYC6II_eoySuXNi',
            adm: '<div>test</div>',
            adomain: ['test2.co.jp'],
            attr: [],
            bundle: 'jp.co.test2',
            cat: ['IAB9'],
            cid: '7315',
            crid: 'XYZXYZ',
            ext: {
              imptrackers: ['https://uncn.jp/pb/2/view/test2']
            },
            h: 250,
            id: '3',
            impid: '40a333e047a9bd',
            iurl: 'https://assets.ucontent.net/test2.jpg',
            price: 0.674,
            w: 300
          }
        ],
        group: 0,
        seat: '274'
      }
    ],
    units: 0
  },
  headers: {}
};

const request = {
  method: 'POST',
  url: 'https://ds.uncn.jp/pb/0/bid.json',
  data:
    '{"id":"5ebea288-f13a-4754-be6d-4ade66c68877","at":1,"imp":[{"id":"216255f234b602","banner":{"w":"300","h":"250"},"secure":1,"bidfloor":0,"tagid":"/19968336/header-bid-tag-0"},{"id":"31e2b28ced2475","banner":{"w":"300","h":"250"},"secure":1,"bidfloor":0"tagid":"/19968336/header-bid-tag-1"},{"id":"40a333e047a9bd","banner":{"w":"300","h":"250"},"secure":1,"bidfloor":0,"tagid":"/19968336/header-bid-tag-2"}],"cur":"JPY","site":{"id":"uni-corn.net","publisher":{"id":12345},"domain":"uni-corn.net","page":"https://uni-corn.net/","ref":"https://uni-corn.net/"},"device":{"language":"ja","ua":"Mozilla/5.0 (Linux; Android 8.0.0; ONEPLUS A5000) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.93 Mobile Safari/537.36"},"user":{"id":"69d9e1c2-801e-4901-a665-fad467550fec"},"bcat":[],"source":{"ext":{"stype":"prebid_uncn","bidder":"unicorn"}}}'
};

const interpretedBids = [
  {
    requestId: '216255f234b602',
    cpm: 1.0017,
    width: 300,
    height: 250,
    ad: '<div>test</div>',
    ttl: 1000,
    creativeId: 'ABCDE',
    netRevenue: false,
    currency: 'JPY'
  },
  {
    requestId: '31e2b28ced2475',
    cpm: 0.9513,
    width: 300,
    height: 250,
    ad: '<div>test</div>',
    ttl: 1000,
    creativeId: 'abcde',
    netRevenue: false,
    currency: 'JPY'
  },
  {
    requestId: '40a333e047a9bd',
    cpm: 0.674,
    width: 300,
    height: 250,
    ad: '<div>test</div>',
    ttl: 1000,
    creativeId: 'XYZXYZ',
    netRevenue: false,
    currency: 'JPY'
  }
];

describe('unicornBidAdapterTest', () => {
  describe('isBidRequestValid', () => {
    it('isBidRequestValid', () => {
      expect(spec.isBidRequestValid(bidRequests[0])).to.equal(true);
      expect(spec.isBidRequestValid(bidRequests[1])).to.equal(false);
      expect(spec.isBidRequestValid(bidRequests[2])).to.equal(false);
    });
  });

  describe('buildBidRequest', () => {
    it('buildBidRequest', () => {
      const req = spec.buildRequests(validBidRequests, bidderRequest);
      const removeUntestableAttrs = data => {
        delete data['device'];
        delete data['site']['domain'];
        delete data['site']['page'];
        delete data['id'];
        data['imp'].forEach(imp => {
          delete imp['id'];
        })
        delete data['user']['id'];
        return data;
      };
      const uid = JSON.parse(req.data)['user']['id'];
      const reqData = removeUntestableAttrs(JSON.parse(req.data));
      const openRTBRequestData = removeUntestableAttrs(openRTBRequest);
      assert.deepStrictEqual(reqData, openRTBRequestData);
      const req2 = spec.buildRequests(validBidRequests, bidderRequest);
      const uid2 = JSON.parse(req2.data)['user']['id'];
      assert.deepStrictEqual(uid, uid2);
    });
  });

  describe('interpretResponse', () => {
    it('interpretResponse', () => {
      const bids = spec.interpretResponse(serverResponse, request);
      assert.deepStrictEqual(bids, interpretedBids);
    });
    it('interpretResponseEmptyString', () => {
      const bids = spec.interpretResponse('', request);
      assert.deepStrictEqual(bids, []);
    });
    it('interpretResponseEmptyArray', () => {
      const bids = spec.interpretResponse([], request);
      assert.deepStrictEqual(bids, []);
    });
  });
});
