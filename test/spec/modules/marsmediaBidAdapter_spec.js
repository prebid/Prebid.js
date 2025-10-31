import { spec } from 'modules/marsmediaBidAdapter.js';
import * as utils from 'src/utils.js';
import * as dnt from 'libraries/dnt/index.js';
import { config } from 'src/config.js';
import { internal, resetWinDimensions } from '../../../src/utils.js';

var marsAdapter = spec;

describe('marsmedia adapter tests', function () {
  let element, win;
  let sandbox;

  beforeEach(function() {
    element = {
      x: 0,
      y: 0,

      width: 0,
      height: 0,

      getBoundingClientRect: () => {
        return {
          width: element.width,
          height: element.height,

          left: element.x,
          top: element.y,
          right: element.x + element.width,
          bottom: element.y + element.height
        };
      }
    };
    win = {
      document: {
        visibilityState: 'visible'
      },
      location: {
        href: 'http://location'
      },
      innerWidth: 800,
      innerHeight: 600
    };
    this.defaultBidderRequest = {
      'refererInfo': {
        'ref': 'Reference Page',
        'stack': [
          'aodomain.dvl',
          'page.dvl'
        ]
      }
    };

    this.defaultBidRequestList = [
      {
        'bidder': 'marsmedia',
        'params': {
          'zoneId': 9999
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[300, 250]]
          }
        },
        'adUnitCode': 'Unit-Code',
        'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
        'bidderRequestId': '418b37f85e772c',
        'auctionId': '18fd8b8b0bd757',
        'bidRequestsCount': 1,
        'bidId': '51ef8751f9aead'
      }
    ];

    sandbox = sinon.createSandbox();
    sandbox.stub(document, 'getElementById').withArgs('Unit-Code').returns(element);
    sandbox.stub(utils, 'getWindowTop').returns(win);
    sandbox.stub(utils, 'getWindowSelf').returns(win);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('Verify 1.0 POST Banner Bid Request', function () {
    it('buildRequests works', function () {
      var bidRequest = marsAdapter.buildRequests(this.defaultBidRequestList, this.defaultBidderRequest);

      expect(bidRequest.url).to.have.string('https://hb.go2speed.media/bidder/?bid=3mhdom&zoneId=9999&hbv=');
      expect(bidRequest.method).to.equal('POST');
      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.site).to.not.equal(null);
      expect(openrtbRequest.site.ref).to.equal('Reference Page');
      expect(openrtbRequest.device).to.not.equal(null);
      expect(openrtbRequest.device.ua).to.equal(navigator.userAgent);
      expect(openrtbRequest.device.dnt).to.equal(0);
      expect(openrtbRequest.imp[0].banner).to.not.equal(null);
      expect(openrtbRequest.imp[0].banner.format[0].w).to.equal(300);
      expect(openrtbRequest.imp[0].banner.format[0].h).to.equal(250);
      expect(openrtbRequest.imp[0].ext.bidder.zoneId).to.equal(9999);
    });

    /* it('interpretResponse works', function() {
      var bidList = {
        'body': [
          {
            'impid': 'Unit-Code',
            'w': 300,
            'h': 250,
            'adm': '<div>My Compelling Ad</div>',
            'price': 1,
            'crid': 'cr-cfy24',
            'nurl': '<!-- NURL -->'
          }
        ]
      };

      var bannerBids = marsAdapter.interpretResponse(bidList);

      expect(bannerBids.length).to.equal(1);
      const bid = bannerBids[0];
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.creativeId).to.equal('cr-cfy24');
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.cpm).to.equal(1.0);
      expect(bid.ttl).to.equal(350);
    }); */
  });

  describe('Verify POST Video Bid Request', function() {
    it('buildRequests works', function () {
      var bidRequestList = [
        {
          'bidder': 'marsmedia',
          'params': {
            'zoneId': 9999
          },
          'mediaTypes': {
            'video': {
              'playerSize': [640, 480],
              'context': 'instream'
            }
          },
          'adUnitCode': 'Unit-Code',
          'sizes': [
            [300, 250]
          ],
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = marsAdapter.buildRequests(bidRequestList, this.defaultBidderRequest);

      expect(bidRequest.url).to.have.string('https://hb.go2speed.media/bidder/?bid=3mhdom&zoneId=9999&hbv=');
      expect(bidRequest.method).to.equal('POST');
      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.site).to.not.equal(null);
      expect(openrtbRequest.device).to.not.equal(null);
      expect(openrtbRequest.device.ua).to.equal(navigator.userAgent);
      expect(openrtbRequest.device).to.have.property('dnt');
      expect(openrtbRequest.imp[0].video).to.not.equal(null);
      expect(openrtbRequest.imp[0].video.w).to.equal(640);
      expect(openrtbRequest.imp[0].video.h).to.equal(480);
      expect(openrtbRequest.imp[0].video.mimes[0]).to.equal('video/mp4');
      expect(openrtbRequest.imp[0].video.protocols).to.eql([2, 3, 5, 6]);
      expect(openrtbRequest.imp[0].video.startdelay).to.equal(0);
      expect(openrtbRequest.imp[0].video.skip).to.equal(0);
      expect(openrtbRequest.imp[0].video.playbackmethod).to.eql([1, 2, 3, 4]);
      expect(openrtbRequest.imp[0].video.delivery[0]).to.equal(1);
      expect(openrtbRequest.imp[0].video.api).to.eql([1, 2, 5]);
    });

    it('interpretResponse with vast url works', function() {
      var bidList = {
        'body': [
          {
            'impid': 'Unit-Code',
            'price': 1,
            'adm': 'https://example.com/',
            'adomain': [
              'test.com'
            ],
            'cid': '467415',
            'crid': 'cr-vid',
            'w': 800,
            'h': 600,
            'nurl': '<!-- NURL -->'
          }
        ]
      };

      var videoBids = marsAdapter.interpretResponse(bidList);

      expect(videoBids.length).to.equal(1);
      const bid = videoBids[0];
      expect(bid.width).to.equal(800);
      expect(bid.height).to.equal(600);
      expect(bid.vastUrl).to.equal('https://example.com/');
      expect(bid.mediaType).to.equal('video');
      expect(bid.creativeId).to.equal('cr-vid');
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.cpm).to.equal(1.0);
      expect(bid.ttl).to.equal(600);
    });

    it('interpretResponse with xml works', function() {
      var bidList = {
        'body': [
          {
            'impid': 'Unit-Code',
            'price': 1,
            'adm': '<?xml><VAST></VAST>',
            'adomain': [
              'test.com'
            ],
            'cid': '467415',
            'crid': 'cr-vid',
            'w': 800,
            'h': 600,
            'nurl': '<!-- NURL -->'
          }
        ]
      };

      var videoBids = marsAdapter.interpretResponse(bidList);

      expect(videoBids.length).to.equal(1);
      const bid = videoBids[0];
      expect(bid.width).to.equal(800);
      expect(bid.height).to.equal(600);
      expect(bid.vastXml).to.equal('<?xml><VAST></VAST>');
      expect(bid.mediaType).to.equal('video');
      expect(bid.creativeId).to.equal('cr-vid');
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.cpm).to.equal(1.0);
      expect(bid.ttl).to.equal(600);
    });
  });

  describe('misc buildRequests', function() {
    it('should send GDPR Consent data to Marsmedia tag', function () {
      var consentString = 'testConsentString';
      var gdprBidderRequest = this.defaultBidderRequest;
      gdprBidderRequest.gdprConsent = {
        'gdprApplies': true,
        'consentString': consentString
      };

      var bidRequest = marsAdapter.buildRequests(this.defaultBidRequestList, gdprBidderRequest);

      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.user.ext.consent).to.equal(consentString);
      expect(openrtbRequest.regs.ext.gdpr).to.equal(true);
    });

    it('should have CCPA Consent if defined', function () {
      const ccpaBidderRequest = this.defaultBidderRequest;
      ccpaBidderRequest.uspConsent = '1YYN';
      const bidRequest = marsAdapter.buildRequests(this.defaultBidRequestList, ccpaBidderRequest);
      const openrtbRequest = JSON.parse(bidRequest.data);

      expect(openrtbRequest.regs.ext.us_privacy).to.equal('1YYN');
    });

    it('should submit coppa if set in config', function () {
      sinon.stub(config, 'getConfig')
        .withArgs('coppa')
        .returns(true);
      const request = marsAdapter.buildRequests(this.defaultBidRequestList, this.defaultBidderRequest);
      const requestparse = JSON.parse(request.data);
      expect(requestparse.regs.coppa).to.equal(1);
      config.getConfig.restore();
    });

    it('should process floors module if available', function() {
      const floorBidderRequest = this.defaultBidRequestList;
      const floorInfo = {
        currency: 'USD',
        floor: 1.20
      };
      floorBidderRequest[0].getFloor = () => floorInfo;
      const request = marsAdapter.buildRequests(floorBidderRequest, this.defaultBidderRequest);
      const requestparse = JSON.parse(request.data);
      expect(requestparse.imp[0].bidfloor).to.equal(1.20);
    });

    it('should have 0 bidfloor value', function() {
      const request = marsAdapter.buildRequests(this.defaultBidRequestList, this.defaultBidderRequest);
      const requestparse = JSON.parse(request.data);
      expect(requestparse.imp[0].bidfloor).to.equal(0);
    });

    it('prefer 2.0 sizes', function () {
      var bidRequestList = [
        {
          'bidder': 'marsmedia',
          'params': {
            'zoneId': 9999
          },
          'mediaTypes': {
            'banner': {
              'sizes': [[300, 600]]
            }
          },
          'adUnitCode': 'Unit-Code',
          'sizes': [[300, 250]],
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = marsAdapter.buildRequests(bidRequestList, this.defaultBidderRequest);

      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.imp[0].banner.format[0].w).to.equal(300);
      expect(openrtbRequest.imp[0].banner.format[0].h).to.equal(600);
    });

    it('does not return request for invalid banner size configuration', function () {
      var bidRequestList = [
        {
          'bidder': 'marsmedia',
          'params': {
            'zoneId': 9999
          },
          'mediaTypes': {
            'banner': {
              'sizes': [[300]]
            }
          },
          'adUnitCode': 'Unit-Code',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = marsAdapter.buildRequests(bidRequestList, this.defaultBidderRequest);
      expect(bidRequest.method).to.be.undefined;
    });

    it('does not return request for missing banner size configuration', function () {
      var bidRequestList = [
        {
          'bidder': 'marsmedia',
          'params': {
            'zoneId': 9999
          },
          'mediaTypes': {
            'banner': {}
          },
          'adUnitCode': 'Unit-Code',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = marsAdapter.buildRequests(bidRequestList, this.defaultBidderRequest);
      expect(bidRequest.method).to.be.undefined;
    });

    it('reject bad sizes', function () {
      var bidRequestList = [
        {
          'bidder': 'marsmedia',
          'params': {
            'zoneId': 9999
          },
          'mediaTypes': {
            'banner': {'sizes': [['400', '500'], ['4n0', '5g0']]}
          },
          'adUnitCode': 'Unit-Code',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = marsAdapter.buildRequests(bidRequestList, this.defaultBidderRequest);
      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.imp[0].banner.format.length).to.equal(1);
    });

    it('dnt is correctly set to 1', function () {
      var dntStub = sinon.stub(dnt, 'getDNT').returns(1);

      var bidRequest = marsAdapter.buildRequests(this.defaultBidRequestList, this.defaultBidderRequest);

      dntStub.restore();

      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.device.dnt).to.equal(1);
    });

    it('supports string video sizes', function () {
      var bidRequestList = [
        {
          'bidder': 'marsmedia',
          'params': {
            'zoneId': 9999
          },
          'mediaTypes': {
            'video': {
              'context': 'instream',
              'playerSize': ['600', '300']
            }
          },
          'adUnitCode': 'Unit-Code',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = marsAdapter.buildRequests(bidRequestList, this.defaultBidderRequest);

      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.imp[0].video.w).to.equal(600);
      expect(openrtbRequest.imp[0].video.h).to.equal(300);
    });

    it('rejects bad video sizes', function () {
      var bidRequestList = [
        {
          'bidder': 'marsmedia',
          'params': {
            'zoneId': 9999
          },
          'mediaTypes': {
            'video': {
              'context': 'instream',
              'playerSize': ['badWidth', 'badHeight']
            }
          },
          'adUnitCode': 'Unit-Code',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = marsAdapter.buildRequests(bidRequestList, this.defaultBidderRequest);

      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.imp[0].video.w).to.be.undefined;
      expect(openrtbRequest.imp[0].video.h).to.be.undefined;
    });

    it('supports missing video size', function () {
      var bidRequestList = [
        {
          'bidder': 'marsmedia',
          'params': {
            'zoneId': 9999
          },
          'mediaTypes': {
            'video': {
              'context': 'instream'
            }
          },
          'adUnitCode': 'Unit-Code',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = marsAdapter.buildRequests(bidRequestList, this.defaultBidderRequest);

      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.imp[0].video.w).to.be.undefined;
      expect(openrtbRequest.imp[0].video.h).to.be.undefined;
    });

    it('should return empty site data when refererInfo is missing', function() {
      delete this.defaultBidderRequest.refererInfo;
      var bidRequest = marsAdapter.buildRequests(this.defaultBidRequestList, this.defaultBidderRequest);
      const openrtbRequest = JSON.parse(bidRequest.data);

      expect(openrtbRequest.site.domain).to.equal('');
      expect(openrtbRequest.site.page).to.equal('');
      expect(openrtbRequest.site.ref).to.equal('');
    });

    context('when element is fully in view', function() {
      it('returns 100', function() {
        Object.assign(element, { width: 600, height: 400 });
        const request = marsAdapter.buildRequests(this.defaultBidRequestList, this.defaultBidderRequest);
        const openrtbRequest = JSON.parse(request.data);
        expect(openrtbRequest.imp[0].ext.viewability).to.equal(100);
      });
    });

    context('when element is out of view', function() {
      it('returns 0', function() {
        Object.assign(element, { x: -300, y: 0, width: 207, height: 320 });
        const request = marsAdapter.buildRequests(this.defaultBidRequestList, this.defaultBidderRequest);
        const openrtbRequest = JSON.parse(request.data);
        expect(openrtbRequest.imp[0].ext.viewability).to.equal(0);
      });
    });

    context('when element is partially in view', function() {
      it('returns percentage', function() {
        sandbox.stub(internal, 'getWindowTop').returns(win);
        resetWinDimensions();
        Object.assign(element, { width: 800, height: 800 });
        const request = marsAdapter.buildRequests(this.defaultBidRequestList, this.defaultBidderRequest);
        const openrtbRequest = JSON.parse(request.data);
        expect(openrtbRequest.imp[0].ext.viewability).to.equal(75);
        internal.getWindowTop.restore();
      });
    });

    context('when nested iframes', function() {
      it('returns \'na\'', function() {
        Object.assign(element, { width: 600, height: 400 });

        utils.getWindowTop.restore();
        utils.getWindowSelf.restore();
        sandbox.stub(utils, 'getWindowTop').returns(win);
        sandbox.stub(utils, 'getWindowSelf').returns({});

        const request = marsAdapter.buildRequests(this.defaultBidRequestList, this.defaultBidderRequest);
        const openrtbRequest = JSON.parse(request.data);
        expect(openrtbRequest.imp[0].ext.viewability).to.equal('na');
      });
    });

    context('when tab is inactive', function() {
      it('returns 0', function() {
        Object.assign(element, { width: 600, height: 400 });

        utils.getWindowTop.restore();
        win.document.visibilityState = 'hidden';
        sandbox.stub(utils, 'getWindowTop').returns(win);

        const request = marsAdapter.buildRequests(this.defaultBidRequestList, this.defaultBidderRequest);
        const openrtbRequest = JSON.parse(request.data);
        expect(openrtbRequest.imp[0].ext.viewability).to.equal(0);
      });
    });
  });

  it('should return empty site.domain and site.page when refererInfo.stack is empty', function() {
    this.defaultBidderRequest.refererInfo.stack = [];
    var bidRequest = marsAdapter.buildRequests(this.defaultBidRequestList, this.defaultBidderRequest);
    const openrtbRequest = JSON.parse(bidRequest.data);

    expect(openrtbRequest.site.domain).to.equal('');
    expect(openrtbRequest.site.page).to.equal('');
    expect(openrtbRequest.site.ref).to.equal('Reference Page');
  });

  it('should secure correctly', function() {
    this.defaultBidderRequest.refererInfo.stack[0] = ['https://securesite.dvl'];
    var bidRequest = marsAdapter.buildRequests(this.defaultBidRequestList, this.defaultBidderRequest);
    const openrtbRequest = JSON.parse(bidRequest.data);

    expect(openrtbRequest.imp[0].secure).to.equal(1);
  });

  it('should pass schain', function() {
    var schain = {
      'ver': '1.0',
      'complete': 1,
      'nodes': [{
        'asi': 'indirectseller.com',
        'sid': '00001',
        'hp': 1
      }, {
        'asi': 'indirectseller-2.com',
        'sid': '00002',
        'hp': 1
      }]
    };
    var bidRequestList = [
      {
        'bidder': 'marsmedia',
        'params': {
          'zoneId': 9999
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[300, 250]]
          }
        },
        'adUnitCode': 'Unit-Code',
        'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
        'bidderRequestId': '418b37f85e772c',
        'auctionId': '18fd8b8b0bd757',
        'bidRequestsCount': 1,
        'bidId': '51ef8751f9aead',
        'ortb2': {
          'source': {
            'ext': {
              'schain': schain
            }
          }
        }
      }
    ];

    var bidRequest = marsAdapter.buildRequests(bidRequestList, this.defaultBidderRequest);
    const openrtbRequest = JSON.parse(bidRequest.data);

    expect(openrtbRequest.source.ext.schain).to.deep.equal(schain);
  });

  describe('misc interpretResponse', function () {
    it('No bid response', function() {
      var noBidResponse = marsAdapter.interpretResponse({
        'body': ''
      });
      expect(noBidResponse.length).to.equal(0);
    });
  });

  describe('isBidRequestValid', function () {
    var bid = {
      'bidder': 'marsmedia',
      'params': {
        'zoneId': 9999
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 250]]
        }
      },
      'adUnitCode': 'Unit-Code'
    };

    it('should return true when required params found', function () {
      expect(marsAdapter.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when placementId missing', function () {
      delete bid.params.zoneId;
      expect(marsAdapter.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('getUserSyncs', function () {
    it('returns an empty string', function () {
      expect(marsAdapter.getUserSyncs()).to.deep.equal([]);
    });
  });

  describe('on bidWon', function () {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });
    it('exists and is a function', () => {
      expect(spec.onBidWon).to.exist.and.to.be.a('function');
    });
    it('should return nothing', function () {
      var response = spec.onBidWon({});
      expect(response).to.be.an('undefined')
      expect(utils.triggerPixel.called).to.equal(true);
    });
  });

  describe('on Timeout', function () {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });
    it('exists and is a function', () => {
      expect(spec.onTimeout).to.exist.and.to.be.a('function');
    });
    it('should return nothing', function () {
      var response = spec.onTimeout({});
      expect(response).to.be.an('undefined')
      expect(utils.triggerPixel.called).to.equal(true);
    });
  });

  describe('on Set Targeting', function () {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });
    it('exists and is a function', () => {
      expect(spec.onSetTargeting).to.exist.and.to.be.a('function');
    });
    it('should return nothing', function () {
      var response = spec.onSetTargeting({});
      expect(response).to.be.an('undefined')
      expect(utils.triggerPixel.called).to.equal(true);
    });
  });
});
