import { assert, expect } from 'chai';
import * as utils from 'src/utils.js';
import { spec } from 'modules/unicornBidAdapter.js';
import 'lodash';
import { getGlobal } from '../../../src/prebidGlobal.js';
import * as percentInViewLib from 'libraries/percentInView/percentInView.js';
import * as winDimensionsLib from 'src/utils/winDimensions.js';
import { clearSlotInfoCache } from 'libraries/gptUtils/gptUtils.js';

const bidRequests = [
  {
    bidder: 'unicorn',
    params: {
      accountId: 12345
    },
    mediaTypes: {
      banner: {
        sizes: [
          [
            300, 250
          ],
          [
            336, 280
          ]
        ]
      }
    },
    adUnitCode: '/19968336/header-bid-tag-0',
    transactionId: 'ea0aa332-a6e1-4474-8180-83720e6b87bc',
    sizes: [
      [
        300, 250
      ],
      [
        336, 280
      ]
    ],
    bidId: '226416e6e6bf41',
    bidderRequestId: '1f41cbdcbe58d5',
    auctionId: '77987c3a-9be9-4e43-985a-26fc91d84724',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0
  }, {
    bidder: 'unicorn',
    params: {
      accountId: 12345
    },
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250]
        ]
      }
    },
    transactionId: 'cf801303-cf98-4b4a-9e0a-c27b93bce6d8',
    sizes: [
      [300, 250]
    ],
    bidId: '37cdc0b5d0363b',
    bidderRequestId: '1f41cbdcbe58d5',
    auctionId: '77987c3a-9be9-4e43-985a-26fc91d84724',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0
  }, {
    bidder: 'unicorn',
    params: {
    },
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250]
        ]
      }
    },
    adUnitCode: '/19968336/header-bid-tag-2',
    transactionId: 'ba7f114c-3676-4a08-a26d-1ee293d521ed',
    sizes: [
      [300, 250]
    ],
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
      accountId: 12345,
      publisherId: 99999,
      mediaId: 'example'
    },
    mediaTypes: {
      banner: {
        sizes: [
          [
            300, 250
          ],
          [
            336, 280
          ]
        ]
      }
    },
    adUnitCode: '/19968336/header-bid-tag-0',
    transactionId: 'fbf94ccf-f377-4201-a662-32c2feb8ab6d',
    sizes: [
      [
        300, 250
      ],
      [
        336, 280
      ]
    ],
    bidId: '2fb90842443e24',
    bidderRequestId: '123ae4cc3eeb7e',
    auctionId: 'c594a888-6744-46c6-8b0e-d188e40e83ef',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0
  }, {
    bidder: 'unicorn',
    params: {
      accountId: 12345
    },
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250]
        ]
      }
    },
    adUnitCode: '/19968336/header-bid-tag-1',
    transactionId: '2d65e313-f8a6-4888-b9ab-50fb3ca744ea',
    sizes: [
      [300, 250]
    ],
    bidId: '352f86f158d97a',
    bidderRequestId: '123ae4cc3eeb7e',
    auctionId: 'c594a888-6744-46c6-8b0e-d188e40e83ef',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0
  }, {
    bidder: 'unicorn',
    params: {
      placementId: 'rectangle-ad-2',
      accountId: 12345
    },
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250]
        ]
      }
    },
    adUnitCode: '/19968336/header-bid-tag-2',
    transactionId: '82f445a8-44bc-40bc-9913-739b40375566',
    sizes: [
      [300, 250]
    ],
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
        accountId: 12345
      },
      mediaTypes: {
        banner: {
          sizes: [
            [
              300, 250
            ],
            [
              336, 280
            ]
          ]
        }
      },
      adUnitCode: '/19968336/header-bid-tag-0',
      transactionId: 'fbf94ccf-f377-4201-a662-32c2feb8ab6d',
      sizes: [
        [
          300, 250
        ],
        [
          336, 280
        ]
      ],
      bidId: '2fb90842443e24',
      bidderRequestId: '123ae4cc3eeb7e',
      auctionId: 'c594a888-6744-46c6-8b0e-d188e40e83ef',
      src: 'client',
      bidRequestsCount: 1,
      bidderRequestsCount: 1,
      bidderWinsCount: 0
    }, {
      bidder: 'unicorn',
      params: {
        accountId: 12345
      },
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250]
          ]
        }
      },
      adUnitCode: '/19968336/header-bid-tag-1',
      transactionId: '2d65e313-f8a6-4888-b9ab-50fb3ca744ea',
      sizes: [
        [300, 250]
      ],
      bidId: '352f86f158d97a',
      bidderRequestId: '123ae4cc3eeb7e',
      auctionId: 'c594a888-6744-46c6-8b0e-d188e40e83ef',
      src: 'client',
      bidRequestsCount: 1,
      bidderRequestsCount: 1,
      bidderWinsCount: 0
    }, {
      bidder: 'unicorn',
      params: {
        placementId: 'rectangle-ad-2',
        accountId: 12345
      },
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250]
          ]
        }
      },
      adUnitCode: '/19968336/header-bid-tag-2',
      transactionId: '82f445a8-44bc-40bc-9913-739b40375566',
      sizes: [
        [300, 250]
      ],
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
    ref: 'https://uni-corn.net/',
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
        w: 300,
        h: 250,
        format: [
          {
            w: 300,
            h: 250
          }, {
            w: 336,
            h: 280
          }
        ]
      },
      secure: 1,
      bidfloor: 0,
      tagid: 'rectangle-ad-1'
    }, {
      id: '31e2b28ced2475',
      banner: {
        w: 300,
        h: 250,
        format: [
          {
            w: 300,
            h: 250
          }
        ]
      },
      secure: 1,
      bidfloor: 0,
      tagid: '/19968336/header-bid-tag-1'
    }, {
      id: '40a333e047a9bd',
      banner: {
        w: 300,
        h: 250,
        format: [
          {
            w: 300,
            h: 250
          }
        ]
      },
      secure: 1,
      bidfloor: 0,
      tagid: 'rectangle-ad-2'
    }
  ],
  cur: ['JPY'],
  ext: {
    accountId: 12345
  },
  site: {
    id: 'example',
    publisher: {
      id: '99999'
    },
    domain: 'uni-corn.net',
    page: 'https://uni-corn.net/',
    ref: 'https://uni-corn.net/'
  },
  device: {
    language: 'ja',
    ua: 'Mozilla/5.0 (Linux; Android 8.0.0; ONEPLUS A5000) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.93 Mobile Safari/537.36'
  },
  user: {
    id: '69d9e1c2-801e-4901-a665-fad467550fec'
  },
  bcat: [],
  source: {
    ext: {
      stype: 'prebid_uncn',
      bidder: 'unicorn',
      prebid_version: '1.1'
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
          }, {
            adid: 'uqgbp4y0_uqjrNT7h_25512',
            adm: '<div>test</div>',
            adomain: null,
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
      }, {
        bid: [
          {
            adid: 'uoNYC6II_eoySuXNi',
            adm: '<div>test</div>',
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
  data: '{"id":"5ebea288-f13a-4754-be6d-4ade66c68877","at":1,"imp":[{"id":"216255f234b602","banner":{"w":300,"h":250},"format":[{"w":300,"h":250},{"w":336,"h":280}],"secure":1,"bidfloor":0,"tagid":"/19968336/header-bid-tag-0"},{"id":"31e2b28ced2475","banner":{"w":"300","h":"250"},"format":[{"w":"300","h":"250"}],"secure":1,"bidfloor":0"tagid":"/19968336/header-bid-tag-1"},{"id":"40a333e047a9bd","banner":{"w":300,"h":250},"format":[{"w":300,"h":250}],"secure":1,"bidfloor":0,"tagid":"/19968336/header-bid-tag-2"}],"cur":"JPY","site":{"id":"uni-corn.net","publisher":{"id":12345},"domain":"uni-corn.net","page":"https://uni-corn.net/","ref":"https://uni-corn.net/"},"device":{"language":"ja","ua":"Mozilla/5.0 (Linux; Android 8.0.0; ONEPLUS A5000) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.93 Mobile Safari/537.36"},"user":{"id":"69d9e1c2-801e-4901-a665-fad467550fec"},"bcat":[],"source":{"ext":{"stype":"prebid_uncn","bidder":"unicorn","prebid_version":"1.1"}}}'
};

const interpretedBids = [
  {
    requestId: '216255f234b602',
    cpm: 1.0017,
    width: 300,
    height: 250,
    meta: {
      advertiserDomains: [
        'test1.co.jp'
      ]
    },
    ad: '<div>test</div>',
    ttl: 1000,
    creativeId: 'ABCDE',
    netRevenue: true,
    currency: 'JPY'
  }, {
    requestId: '31e2b28ced2475',
    cpm: 0.9513,
    width: 300,
    height: 250,
    ad: '<div>test</div>',
    ttl: 1000,
    creativeId: 'abcde',
    netRevenue: true,
    currency: 'JPY'
  }, {
    requestId: '40a333e047a9bd',
    cpm: 0.674,
    width: 300,
    height: 250,
    ad: '<div>test</div>',
    ttl: 1000,
    creativeId: 'XYZXYZ',
    netRevenue: true,
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
    const removeUntestableAttrs = data => {
      delete data['device'];
      delete data['site']['domain'];
      delete data['site']['page'];
      delete data['id'];
      data['imp'].forEach(imp => {
        delete imp['id'];
      });
      delete data['user']['id'];
      return data;
    };
    before(function () {
      getGlobal().bidderSettings = {
        unicorn: {
          storageAllowed: true
        }
      };
    });
    after(function () {
      getGlobal().bidderSettings = {};
    });
    it('buildBidRequest', () => {
      const req = spec.buildRequests(validBidRequests, bidderRequest);
      const uid = JSON.parse(req.data)['user']['id'];
      const reqData = removeUntestableAttrs(JSON.parse(req.data));
      const openRTBRequestData = removeUntestableAttrs(openRTBRequest);
      assert.deepStrictEqual(reqData, openRTBRequestData);
      const req2 = spec.buildRequests(validBidRequests, bidderRequest);
      const uid2 = JSON.parse(req2.data)['user']['id'];
      assert.deepStrictEqual(uid, uid2);
    });
    it('test if contains ID5', () => {
      const _validBidRequests = utils.deepClone(validBidRequests);
      _validBidRequests[0].userId = {
        id5id: {
          uid: 'id5_XXXXX'
        }
      };
      const req = spec.buildRequests(_validBidRequests, bidderRequest);
      const reqData = removeUntestableAttrs(JSON.parse(req.data));
      const openRTBRequestData = removeUntestableAttrs(utils.deepClone(openRTBRequest));
      openRTBRequestData.user.eids = [
        {
          source: 'id5-sync.com',
          uids: [
            {
              id: 'id5_XXXXX'
            }
          ]
        }
      ];
      assert.deepStrictEqual(reqData, openRTBRequestData);
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

  describe('adslot measurement', () => {
    const VH = 800;
    const createdEls = [];
    let sandbox;
    let origGoogletag;
    let winDimensionsStub;

    function makeSlotEl(id, rect, { position, parent } = {}) {
      const el = document.createElement('div');
      el.id = id;
      if (position) el.style.position = position;
      (parent || document.body).appendChild(el);
      el.getBoundingClientRect = () => ({
        top: rect.top,
        left: rect.left,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
        width: rect.width,
        height: rect.height
      });
      createdEls.push(el);
      return el;
    }

    function bidReq(adUnitCode, overrides = {}) {
      return Object.assign({
        bidder: 'unicorn',
        params: { accountId: 12345 },
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        adUnitCode,
        sizes: [[300, 250]],
        bidId: 'bid-adslot',
        bidderRequestId: 'bidder-req-adslot',
        transactionId: 'tx-adslot',
        auctionId: 'auction-adslot',
        src: 'client'
      }, overrides);
    }

    const bReq = {
      bidderCode: 'unicorn',
      auctionId: 'auction-adslot',
      bidderRequestId: 'bidder-req-adslot',
      refererInfo: {
        ref: 'https://uni-corn.net/',
        reachedTop: true,
        numIframes: 0,
        stack: ['https://uni-corn.net/']
      }
    };

    function buildImp(br) {
      const req = spec.buildRequests([br], bReq);
      return JSON.parse(req.data).imp[0];
    }

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(percentInViewLib, 'getViewportOffset').returns({ x: 0, y: 0 });
      winDimensionsStub = sandbox.stub(winDimensionsLib, 'getWinDimensions').returns({
        document: {
          documentElement: { scrollLeft: 0, scrollTop: 0, clientHeight: VH },
          body: { scrollLeft: 0, scrollTop: 0 }
        }
      });
      origGoogletag = window.googletag;
    });

    afterEach(() => {
      sandbox.restore();
      window.googletag = origGoogletag;
      clearSlotInfoCache();
      createdEls.splice(0).forEach(el => el.remove());
    });

    it('adds imp.ext.adslot and imp.banner.pos for a resolvable, above-the-fold slot', () => {
      sandbox.stub(percentInViewLib, 'getViewability').returns(75);
      makeSlotEl('adslot-1', { top: 100, left: 10, width: 300, height: 250 });
      const imp = buildImp(bidReq('adslot-1'));

      expect(imp.ext.adslot).to.deep.equal({
        ver: 1, ratio: 0.75, fixed: false, sticky: false, w: 300, h: 250, x: 10, y: 100
      });
      expect(imp.banner.pos).to.equal(1);
    });

    it('uses document-relative y, not viewport-relative rect.top, for the fold check', () => {
      sandbox.stub(percentInViewLib, 'getViewability').returns(0);
      // rect.top alone looks "above the fold", but a large scroll offset
      // means the slot's real page position is well past one viewport height.
      winDimensionsStub.returns({
        document: {
          documentElement: { scrollLeft: 0, scrollTop: 5000, clientHeight: VH },
          body: { scrollLeft: 0, scrollTop: 0 }
        }
      });
      makeSlotEl('adslot-2', { top: 50, left: 0, width: 300, height: 250 });
      const imp = buildImp(bidReq('adslot-2'));

      expect(imp.ext.adslot.y).to.equal(5050);
      expect(imp.banner.pos).to.equal(3);
    });

    it('applies the ad unit size override when the slot measures 0x0 (unrendered GPT slot)', () => {
      sandbox.stub(percentInViewLib, 'getViewability').returns(40);
      makeSlotEl('adslot-3', { top: 0, left: 0, width: 0, height: 0 });
      const imp = buildImp(bidReq('adslot-3'));

      expect(imp.ext.adslot.w).to.equal(300);
      expect(imp.ext.adslot.h).to.equal(250);
      expect(imp.ext.adslot.ratio).to.equal(0.4);
    });

    it('detects a fixed ancestor wrapper, not only the slot element itself', () => {
      sandbox.stub(percentInViewLib, 'getViewability').returns(100);
      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      document.body.appendChild(wrapper);
      createdEls.push(wrapper);
      makeSlotEl('adslot-4', { top: 0, left: 0, width: 300, height: 250 }, { parent: wrapper });
      const imp = buildImp(bidReq('adslot-4'));

      expect(imp.ext.adslot.fixed).to.equal(true);
      expect(imp.ext.adslot.sticky).to.equal(false);
    });

    it('keeps fixed and sticky as distinct flags', () => {
      sandbox.stub(percentInViewLib, 'getViewability').returns(100);
      const wrapper = document.createElement('div');
      wrapper.style.position = 'sticky';
      document.body.appendChild(wrapper);
      createdEls.push(wrapper);
      makeSlotEl('adslot-5', { top: 0, left: 0, width: 300, height: 250 }, { parent: wrapper });
      const imp = buildImp(bidReq('adslot-5'));

      expect(imp.ext.adslot.sticky).to.equal(true);
      expect(imp.ext.adslot.fixed).to.equal(false);
    });

    it('prefers a publisher-declared ortb2Imp.banner.pos over the measured value', () => {
      sandbox.stub(percentInViewLib, 'getViewability').returns(0);
      makeSlotEl('adslot-6', { top: 5000, left: 0, width: 300, height: 250 });
      const br = bidReq('adslot-6', { ortb2Imp: { banner: { pos: 7 } } });
      const imp = buildImp(br);

      expect(imp.banner.pos).to.equal(7);
    });

    it('resolves the slot element via GPT slot mapping when adUnitCode differs from the div id', () => {
      sandbox.stub(percentInViewLib, 'getViewability').returns(50);
      makeSlotEl('gpt-mapped-div', { top: 0, left: 0, width: 300, height: 250 });
      window.googletag = {
        pubads: () => ({
          getSlots: () => [{
            getAdUnitPath: () => '/1234/gpt-ad-unit-code',
            getSlotElementId: () => 'gpt-mapped-div'
          }]
        })
      };
      const imp = buildImp(bidReq('/1234/gpt-ad-unit-code'));

      expect(imp.ext.adslot).to.not.equal(undefined);
      expect(imp.ext.adslot.w).to.equal(300);
    });

    it('omits ext.adslot and banner.pos when the slot element cannot be resolved', () => {
      const imp = buildImp(bidReq('adslot-does-not-exist'));

      expect(imp.ext).to.equal(undefined);
      expect(imp.banner.pos).to.equal(undefined);
    });

    it('sends both imp.ext.adslot and imp.ext.gpid when a slot resolves and gpid is set', () => {
      sandbox.stub(percentInViewLib, 'getViewability').returns(60);
      makeSlotEl('adslot-7', { top: 0, left: 0, width: 300, height: 250 });
      const imp = buildImp(bidReq('adslot-7', { ortb2Imp: { ext: { gpid: '/1234/home#slot-7' } } }));

      expect(imp.ext.adslot).to.not.equal(undefined);
      expect(imp.ext.gpid).to.equal('/1234/home#slot-7');
    });
  });

  describe('imp.ext.gpid', () => {
    const bReq = {
      bidderCode: 'unicorn',
      auctionId: 'auction-gpid',
      bidderRequestId: 'bidder-req-gpid',
      refererInfo: {
        ref: 'https://uni-corn.net/',
        reachedTop: true,
        numIframes: 0,
        stack: ['https://uni-corn.net/']
      }
    };

    // No matching DOM element for adUnitCode, so measureAdslot resolves nothing
    // and imp.ext carries gpid only — isolating the gpid behavior.
    function bidReq(overrides = {}) {
      return Object.assign({
        bidder: 'unicorn',
        params: { accountId: 12345 },
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        adUnitCode: 'gpid-adunit-no-dom',
        sizes: [[300, 250]],
        bidId: 'bid-gpid',
        bidderRequestId: 'bidder-req-gpid',
        transactionId: 'tx-gpid',
        auctionId: 'auction-gpid',
        src: 'client'
      }, overrides);
    }

    function buildImp(br) {
      return JSON.parse(spec.buildRequests([br], bReq).data).imp[0];
    }

    it('forwards ortb2Imp.ext.gpid to imp.ext.gpid', () => {
      const imp = buildImp(bidReq({ ortb2Imp: { ext: { gpid: '/1234/home#slot-1' } } }));

      expect(imp.ext.gpid).to.equal('/1234/home#slot-1');
    });

    it('omits imp.ext when neither gpid nor a resolvable slot is present', () => {
      const imp = buildImp(bidReq());

      expect(imp.ext).to.equal(undefined);
    });
  });
});
