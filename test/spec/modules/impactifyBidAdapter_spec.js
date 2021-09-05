import { expect } from 'chai';
import { spec } from 'modules/impactifyBidAdapter.js';
import * as utils from 'src/utils.js';

const BIDDER_CODE = 'impactify';
const BIDDER_ALIAS = ['imp'];
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_VIDEO_WIDTH = 640;
const DEFAULT_VIDEO_HEIGHT = 480;
const ORIGIN = 'https://sonic.impactify.media';
const LOGGER_URI = 'https://logger.impactify.media';
const AUCTIONURI = '/bidder';
const COOKIESYNCURI = '/static/cookie_sync.html';
const GVLID = 606;

var gdprData = {
  'consentString': 'BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA',
  'gdprApplies': true
};

describe('ImpactifyAdapter', function () {
  describe('isBidRequestValid', function () {
    let validBid = {
      bidder: 'impactify',
      params: {
        appId: '1',
        format: 'screen',
        style: 'inline'
      }
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, validBid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when appId is missing', () => {
      const bid = utils.deepClone(validBid);
      delete bid.params.appId;

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when appId is not a string', () => {
      const bid = utils.deepClone(validBid);

      bid.params.appId = 123;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.appId = false;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.appId = void (0);
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.appId = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when format is missing', () => {
      const bid = utils.deepClone(validBid);
      delete bid.params.format;

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when format is not a string', () => {
      const bid = utils.deepClone(validBid);

      bid.params.format = 123;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.format = false;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.format = void (0);
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.format = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when format is not equals to screen or display', () => {
      const bid = utils.deepClone(validBid);
      if (bid.params.format != 'screen' && bid.params.format != 'display') {
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      }
    });

    it('should return false when style is missing', () => {
      const bid = utils.deepClone(validBid);
      delete bid.params.style;

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when style is not a string', () => {
      const bid = utils.deepClone(validBid);

      bid.params.style = 123;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.style = false;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.style = void (0);
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.style = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });
  describe('buildRequests', function () {
    let videoBidRequests = [
      {
        bidder: 'impactify',
        params: {
          appId: '1',
          format: 'screen',
          style: 'inline'
        },
        mediaTypes: {
          video: {
            context: 'instream'
          }
        },
        adUnitCode: 'adunit-code',
        sizes: [[DEFAULT_VIDEO_WIDTH, DEFAULT_VIDEO_HEIGHT]],
        bidId: '123456789',
        bidderRequestId: '987654321',
        auctionId: '19ab94a9-b0d7-4ed7-9f80-ad0c033cf1b1',
        transactionId: 'f7b2c372-7a7b-11eb-9439-0242ac130002',
        userId: {
          pubcid: '87a0327b-851c-4bb3-a925-0c7be94548f5'
        },
        userIdAsEids: [
          {
            source: 'pubcid.org',
            uids: [
              {
                id: '87a0327b-851c-4bb3-a925-0c7be94548f5',
                atype: 1
              }
            ]
          }
        ]
      }
    ];
    let videoBidderRequest = {
      bidderRequestId: '98845765110',
      auctionId: '165410516454',
      bidderCode: 'impactify',
      bids: [
        {
          ...videoBidRequests[0]
        }
      ],
      refererInfo: {
        referer: 'https://impactify.io'
      }
    };

    it('sends video bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(videoBidRequests, videoBidderRequest);
      expect(request.url).to.equal(ORIGIN + AUCTIONURI);
      expect(request.method).to.equal('POST');
    });
  });
  describe('interpretResponse', function () {
    it('should get correct bid response', function () {
      let response = {
        id: '19ab94a9-b0d7-4ed7-9f80-ad0c033cf1b1',
        seatbid: [
          {
            bid: [
              {
                id: '65820304700829014',
                impid: '462c08f20d428',
                price: 3.40,
                adm: '<script type="text/javascript" src="https://ad.impactify.io/static/ad/tag.js"></script>',
                adid: '97517771',
                iurl: 'https://fra1-ib.adnxs.com/cr?id=97517771',
                cid: '9325',
                crid: '97517771',
                w: 1,
                h: 1,
                hash: 'test',
                expiry: 166192938,
                meta: {'advertiserDomains': ['testdomain.com']},
                ext: {
                  prebid: {
                    'type': 'video'
                  },
                  bidder: {
                    prebid: {
                      type: 'video',
                      video: {
                        duration: 30,
                        primary_category: ''
                      }
                    },
                    bidder: {
                      appnexus: {
                        brand_id: 182979,
                        auction_id: 8657683934873599656,
                        bidder_id: 2,
                        bid_ad_type: 1,
                        creative_info: {
                          video: {
                            duration: 30,
                            mimes: [
                              'video/x-flv',
                              'video/mp4',
                              'video/webm'
                            ]
                          }
                        }
                      }
                    }
                  }
                }
              }
            ],
            seat: 'impactify'
          }
        ],
        cur: DEFAULT_CURRENCY,
        ext: {
          responsetimemillis: {
            impactify: 114
          },
          prebid: {
            auctiontimestamp: 1614587024591
          }
        }
      };
      let bidderRequest = {
        bids: [
          {
            bidId: '462c08f20d428',
            adUnitCode: '/19968336/header-bid-tag-1',
            auctionId: '19ab94a9-b0d7-4ed7-9f80-ad0c033cf1b1',
            bidder: 'impactify',
            sizes: [[DEFAULT_VIDEO_WIDTH, DEFAULT_VIDEO_HEIGHT]],
            mediaTypes: {
              video: {
                context: 'outstream'
              }
            }
          },
        ]
      }
      let expectedResponse = [
        {
          id: '65820304700829014',
          requestId: '462c08f20d428',
          cpm: 3.40,
          currency: DEFAULT_CURRENCY,
          netRevenue: true,
          ad: '<script type="text/javascript" src="https://ad.impactify.io/static/ad/tag.js"></script>',
          width: 1,
          height: 1,
          hash: 'test',
          expiry: 166192938,
          meta: {'advertiserDomains': ['testdomain.com']},
          ttl: 300,
          creativeId: '97517771'
        }
      ];
      let result = spec.interpretResponse({ body: response }, bidderRequest);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });
  });
  describe('getUserSyncs', function () {
    let videoBidRequests = [
      {
        bidder: 'impactify',
        params: {
          appId: '1',
          format: 'screen',
          style: 'inline'
        },
        mediaTypes: {
          video: {
            context: 'instream'
          }
        },
        adUnitCode: 'adunit-code',
        sizes: [[DEFAULT_VIDEO_WIDTH, DEFAULT_VIDEO_HEIGHT]],
        bidId: '123456789',
        bidderRequestId: '987654321',
        auctionId: '19ab94a9-b0d7-4ed7-9f80-ad0c033cf1b1',
        transactionId: 'f7b2c372-7a7b-11eb-9439-0242ac130002'
      }
    ];
    let videoBidderRequest = {
      bidderRequestId: '98845765110',
      auctionId: '165410516454',
      bidderCode: 'impactify',
      bids: [
        {
          ...videoBidRequests[0]
        }
      ],
      refererInfo: {
        referer: 'https://impactify.io'
      }
    };
    let validResponse = {
      id: '19ab94a9-b0d7-4ed7-9f80-ad0c033cf1b1',
      seatbid: [
        {
          bid: [
            {
              id: '65820304700829014',
              impid: '462c08f20d428',
              price: 3.40,
              adm: '<script type="text/javascript" src="https://ad.impactify.io/static/ad/tag.js"></script>',
              adid: '97517771',
              iurl: 'https://fra1-ib.adnxs.com/cr?id=97517771',
              cid: '9325',
              crid: '97517771',
              w: 1,
              h: 1,
              hash: 'test',
              expiry: 166192938,
              meta: {'advertiserDomains': ['testdomain.com']},
              ext: {
                prebid: {
                  'type': 'video'
                },
                bidder: {
                  prebid: {
                    type: 'video',
                    video: {
                      duration: 30,
                      primary_category: ''
                    }
                  },
                  bidder: {
                    appnexus: {
                      brand_id: 182979,
                      auction_id: 8657683934873599656,
                      bidder_id: 2,
                      bid_ad_type: 1,
                      creative_info: {
                        video: {
                          duration: 30,
                          mimes: [
                            'video/x-flv',
                            'video/mp4',
                            'video/webm'
                          ]
                        }
                      }
                    }
                  }
                }
              }
            }
          ],
          seat: 'impactify'
        }
      ],
      cur: DEFAULT_CURRENCY,
      ext: {
        responsetimemillis: {
          impactify: 114
        },
        prebid: {
          auctiontimestamp: 1614587024591
        }
      }
    };
    it('should return empty response if server response is false', function () {
      const result = spec.getUserSyncs('bad', false, gdprData);
      expect(result).to.be.empty;
    });
    it('should return empty response if server response is empty', function () {
      const result = spec.getUserSyncs('bad', [], gdprData);
      expect(result).to.be.empty;
    });
    it('should append the various values if they exist', function() {
      const result = spec.getUserSyncs({iframeEnabled: true}, validResponse, gdprData);
      expect(result[0].url).to.include('gdpr=1');
      expect(result[0].url).to.include('gdpr_consent=BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA');
    });
  });

  describe('On winning bid', function () {
    const bid = {
      ad: '<script type="text/javascript" src="https://ad.impactify.io/static/ad/tag.js"></script>',
      cpm: '2'
    };
    const result = spec.onBidWon(bid);
    assert.ok(result);
  });

  describe('On bid Time out', function () {
    const bid = {
      ad: '<script type="text/javascript" src="https://ad.impactify.io/static/ad/tag.js"></script>',
      cpm: '2'
    };
    const result = spec.onTimeout(bid);
    assert.ok(result);
  });
})
