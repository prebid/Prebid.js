import { expect } from 'chai';
import { spec, STORAGE, STORAGE_KEY } from 'modules/impactifyBidAdapter.js';
import * as utils from 'src/utils.js';
import sinon from 'sinon';
import { getGlobal } from '../../../src/prebidGlobal.js';

const BIDDER_CODE = 'impactify';
const BIDDER_ALIAS = ['imp'];
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_VIDEO_WIDTH = 640;
const DEFAULT_VIDEO_HEIGHT = 360;
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
  let getLocalStorageStub;
  let localStorageIsEnabledStub;
  let sandbox;

  beforeEach(function () {
    getGlobal().bidderSettings = {
      impactify: {
        storageAllowed: true
      }
    };
    sinon.stub(document.body, 'appendChild');
    sandbox = sinon.createSandbox();
    getLocalStorageStub = sandbox.stub(STORAGE, 'getDataFromLocalStorage');
    localStorageIsEnabledStub = sandbox.stub(STORAGE, 'localStorageIsEnabled');
  });

  afterEach(function () {
    getGlobal().bidderSettings = {};
    document.body.appendChild.restore();
    sandbox.restore();
  });

  describe('isBidRequestValid', function () {
    const validBids = [
      {
        bidder: 'impactify',
        params: {
          appId: 'example.com',
          format: 'screen',
          style: 'inline'
        }
      },
      {
        bidder: 'impactify',
        params: {
          appId: 'example.com',
          format: 'display',
          style: 'static'
        }
      }
    ];

    const videoBidRequests = [
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
    const videoBidderRequest = {
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

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(validBids[0])).to.equal(true);
      expect(spec.isBidRequestValid(validBids[1])).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      const bid = Object.assign({}, validBids[0]);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      const bid2 = Object.assign({}, validBids[1]);
      delete bid2.params;
      bid2.params = {};
      expect(spec.isBidRequestValid(bid2)).to.equal(false);
    });

    it('should return false when format is not equals to screen or display', () => {
      const bid = utils.deepClone(validBids[0]);
      if (bid.params.format !== 'screen' && bid.params.format !== 'display') {
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      }

      const bid2 = utils.deepClone(validBids[1]);
      if (bid2.params.format !== 'screen' && bid2.params.format !== 'display') {
        expect(spec.isBidRequestValid(bid2)).to.equal(false);
      }
    });

    it('should return false when style is missing', () => {
      const bid = utils.deepClone(validBids[0]);
      delete bid.params.style;

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when style is not a string', () => {
      const bid = utils.deepClone(validBids[0]);

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
    const videoBidRequests = [
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
    const videoBidderRequest = {
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

    it('should pass bidfloor', function () {
      videoBidRequests[0].getFloor = function () {
        return {
          currency: 'USD',
          floor: 1.23,
        }
      }

      const res = spec.buildRequests(videoBidRequests, videoBidderRequest);
      const resData = JSON.parse(res.data)
      expect(resData.imp[0].bidfloor).to.equal(1.23)
    });

    it('sends video bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(videoBidRequests, videoBidderRequest);

      expect(request.url).to.equal(ORIGIN + AUCTIONURI);
      expect(request.method).to.equal('POST');
    });

    it('should set instream context and player size for video imps', function () {
      const request = spec.buildRequests(videoBidRequests, videoBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.imp[0].video.context).to.equal('instream');
      expect(payload.imp[0].video.playerSize).to.deep.equal([DEFAULT_VIDEO_WIDTH, DEFAULT_VIDEO_HEIGHT]);
    });

    it('should pass supported render fields in imp ext', function () {
      videoBidRequests[0].params.render = {
        top: 0,
        bottom: 0,
        align: 'right',
        container: '#my-container',
        expandAd: true,
        location: 'bottom-left',
        onAdEventName: 'on-ad-event',
        onNoAdEventName: 'on-noad-event'
      };

      const request = spec.buildRequests(videoBidRequests, videoBidderRequest);
      const requestData = JSON.parse(request.data);

      expect(requestData.imp[0].ext.impactify.render).to.deep.equal(videoBidRequests[0].params.render);
    });

    it('should ignore unsupported render fields and types', function () {
      videoBidRequests[0].params.render = {
        top: '0',
        bottom: 0,
        align: 'right',
        container: 123,
        expandAd: true,
        location: 'bottom-left',
        onAdEventName: 'on-ad-event',
        onNoAdEventName: false,
        foo: 'bar'
      };

      const request = spec.buildRequests(videoBidRequests, videoBidderRequest);
      const requestData = JSON.parse(request.data);

      expect(requestData.imp[0].ext.impactify.render).to.deep.equal({
        bottom: 0,
        align: 'right',
        expandAd: true,
        location: 'bottom-left',
        onAdEventName: 'on-ad-event'
      });
    });

    it('should include schain, eids, gdpr and usp in ortb request', function () {
      const bid = {
        bidId: '1',
        adUnitCode: 'adunit-code',
        params: {
          appId: 'example.com',
          style: 'inline',
          accountId: 'pub-1'
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        ortb2: {
          source: {
            ext: {
              schain: { ver: '1.0', complete: 1, nodes: [] }
            }
          }
        },
        userIdAsEids: [{ source: 'test.com', uids: [{ id: 'abc', atype: 1 }] }]
      };

      const bidderRequest = {
        bidderRequestId: 'req-1',
        refererInfo: { page: 'https://publisher.com/page' },
        gdprConsent: { gdprApplies: true, consentString: 'consent123' },
        uspConsent: '1YNN'
      };

      const request = JSON.parse(spec.buildRequests([bid], bidderRequest).data);

      expect(request.source.ext.schain).to.deep.equal(bid.ortb2.source.ext.schain);
      expect(request.user.ext.eids).to.deep.equal(bid.userIdAsEids);
      expect(request.user.ext.consent).to.equal('consent123');
      expect(request.regs.ext.gdpr).to.equal(1);
      expect(request.regs.ext.us_privacy).to.equal('1YNN');
    });
  });
  describe('interpretResponse', function () {
    it('should get correct bid response', function () {
      const response = {
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
                meta: { 'advertiserDomains': ['testdomain.com'] },
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
                        auction_id: '8657683934873599656',
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
      const bidderRequest = {
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
      const expectedResponse = [
        {
          id: '65820304700829014',
          requestId: '462c08f20d428',
          cpm: 3.40,
          currency: DEFAULT_CURRENCY,
          netRevenue: true,
          ad: '<script type="text/javascript" src="https://ad.impactify.io/static/ad/tag.js"></script>',
          width: 1,
          height: 1,
          meta: { 'advertiserDomains': ['testdomain.com'] },
          ttl: 300,
          creativeId: '97517771'
        }
      ];
      const result = spec.interpretResponse({ body: response }, bidderRequest);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('should map player responses to video bids', function () {
      const bidRequest = {
        data: JSON.stringify({
          imp: [{
            id: 'imp-1',
            ext: {
              impactify: {
                format: 'player'
              }
            }
          }]
        })
      };

      const serverResponse = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{
              id: 'bid-1',
              impid: 'imp-1',
              price: 2.5,
              ext: {
                vast_url: 'https://example.com/vast.xml'
              },
              adm: '<VAST>fallback</VAST>',
              crid: 'creative-1',
              adomain: ['advertiser.com']
            }]
          }]
        }
      };

      const result = spec.interpretResponse(serverResponse, bidRequest);

      expect(result).to.have.length(1);
      expect(result[0].mediaType).to.equal('video');
      expect(result[0].vastUrl).to.equal('https://example.com/vast.xml');
      expect(result[0].vastXml).to.equal('<VAST>fallback</VAST>');
      expect(result[0]).to.not.have.property('ad');
    });
  });
  describe('getUserSyncs', function () {
    const videoBidRequests = [
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
    const videoBidderRequest = {
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
    const validResponse = {
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
              meta: { 'advertiserDomains': ['testdomain.com'] },
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
                      auction_id: '8657683934873599656',
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
    it('should append the various values if they exist', function () {
      const result = spec.getUserSyncs({ iframeEnabled: true }, validResponse, gdprData);
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
