import {spec} from '../../../modules/rhythmoneBidAdapter.js';
import * as utils from '../../../src/utils.js';
import * as sinon from 'sinon';

var r1adapter = spec;

describe('rhythmone adapter tests', function () {
  beforeEach(function() {
    this.defaultBidderRequest = {
      'refererInfo': {
        'referer': 'Reference Page',
        'stack': [
          'aodomain.dvl',
          'page.dvl'
        ]
      }
    };
  });

  describe('Verify 1.0 POST Banner Bid Request', function () {
    it('buildRequests works', function () {
      var bidRequestList = [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'myplacement',
            'zone': 'myzone',
            'path': 'mypath'
          },
          'mediaType': 'banner',
          'adUnitCode': 'div-gpt-ad-1438287399331-0',
          'sizes': [[300, 250]],
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);

      expect(bidRequest.url).to.have.string('https://tag.1rx.io/rmp/myplacement/0/mypath?z=myzone&hbv=');
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
      expect(openrtbRequest.imp[0].ext.bidder.zone).to.equal('myzone');
      expect(openrtbRequest.imp[0].ext.bidder.path).to.equal('mypath');
    });

    it('interpretResponse works', function() {
      var bidList = {
        'body': [
          {
            'impid': 'div-gpt-ad-1438287399331-0',
            'w': 300,
            'h': 250,
            'adm': '<div>My Compelling Ad</div>',
            'price': 1,
            'crid': 'cr-cfy24'
          }
        ]
      };

      var bannerBids = r1adapter.interpretResponse(bidList);

      expect(bannerBids.length).to.equal(1);
      const bid = bannerBids[0];
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.creativeId).to.equal('cr-cfy24');
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.cpm).to.equal(1.0);
      expect(bid.ttl).to.equal(350);
    });
  });

  describe('Verify POST Video Bid Request', function() {
    it('buildRequests works', function () {
      var bidRequestList = [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'myplacement',
            'zone': 'myzone',
            'path': 'mypath'
          },
          'mediaTypes': {
            'video': {
              'playerSize': [640, 480],
              'context': 'instream'
            }
          },
          'adUnitCode': 'div-gpt-ad-1438287399331-1',
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

      var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);

      expect(bidRequest.url).to.have.string('https://tag.1rx.io/rmp/myplacement/0/mypath?z=myzone&hbv=');
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

    it('interpretResponse works', function() {
      var bidList = {
        'body': [
          {
            'impid': 'div-gpt-ad-1438287399331-1',
            'price': 1,
            'nurl': 'https://testdomain/rmp/placementid/0/path?reqId=1636037',
            'adomain': [
              'test.com'
            ],
            'cid': '467415',
            'crid': 'cr-vid',
            'w': 800,
            'h': 600
          }
        ]
      };

      var videoBids = r1adapter.interpretResponse(bidList);

      expect(videoBids.length).to.equal(1);
      const bid = videoBids[0];
      expect(bid.width).to.equal(800);
      expect(bid.height).to.equal(600);
      expect(bid.vastUrl).to.equal('https://testdomain/rmp/placementid/0/path?reqId=1636037');
      expect(bid.mediaType).to.equal('video');
      expect(bid.creativeId).to.equal('cr-vid');
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.cpm).to.equal(1.0);
      expect(bid.ttl).to.equal(600);
    });
  });

  describe('Verify Multi-Format ads and Multiple Size Bid Request', function() {
    it('buildRequests works', function () {
      var bidRequestList = [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'myplacement',
            'zone': 'myzone',
            'path': 'mypath',
          },
          'mediaTypes': {
            'banner': {
              'sizes': [
                [300, 250],
                [300, 600]
              ]
            },
            'video': {
              'playerSize': [[640, 480]],
              'context': 'instream'
            }
          },
          'adUnitCode': 'div-gpt-ad-1438287399331-5',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);

      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.site).to.not.equal(null);
      expect(openrtbRequest.site.ref).to.equal('Reference Page');
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
      expect(openrtbRequest.imp[0].banner).to.not.equal(null);
      expect(openrtbRequest.imp[0].banner.format[0].w).to.equal(300);
      expect(openrtbRequest.imp[0].banner.format[0].h).to.equal(250);
      expect(openrtbRequest.imp[0].banner.format[1].w).to.equal(300);
      expect(openrtbRequest.imp[0].banner.format[1].h).to.equal(600);
      expect(openrtbRequest.imp[0].ext.bidder.zone).to.equal('myzone');
      expect(openrtbRequest.imp[0].ext.bidder.path).to.equal('mypath');
    });

    it('interpretResponse works', function() {
      var bidList = {
        'body': {
          'id': '1e810245dd1779',
          'seatbid': [
            {
              'bid': [
                {
                  'impid': 'div-gpt-ad-1438287399331-5',
                  'price': 1,
                  'nurl': 'https://testdomain/rmp/placementid/0/path?reqId=1636037',
                  'adomain': [
                    'test.com'
                  ],
                  'cid': '467415',
                  'crid': 'cr-vid',
                  'w': 800,
                  'h': 600
                }
              ]
            }
          ]
        }
      };

      var forRMPMultiFormatResponse = r1adapter.interpretResponse(bidList);

      expect(forRMPMultiFormatResponse.length).to.equal(1);
      const bid = forRMPMultiFormatResponse[0];
      expect(bid.width).to.equal(800);
      expect(bid.height).to.equal(600);
      expect(bid.vastUrl).to.equal('https://testdomain/rmp/placementid/0/path?reqId=1636037');
      expect(bid.mediaType).to.equal('video');
      expect(bid.creativeId).to.equal('cr-vid');
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.cpm).to.equal(1.0);
      expect(bid.ttl).to.equal(600);
    });
  });

  describe('misc buildRequests', function() {
    it('should send GDPR Consent data to RhythmOne tag', function () {
      var bidRequestList = [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'myplacement',
            'zone': 'myzone',
            'path': 'mypath'
          },
          'mediaTypes': {
            'banner': {
              'sizes': [[300, 250]]
            }
          },
          'adUnitCode': 'div-gpt-ad-1438287399331-3',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var consentString = 'testConsentString';
      var gdprBidderRequest = this.defaultBidderRequest;
      gdprBidderRequest.gdprConsent = {
        'gdprApplies': true,
        'consentString': consentString
      };

      var bidRequest = r1adapter.buildRequests(bidRequestList, gdprBidderRequest);

      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.user.ext.consent).to.equal(consentString);
      expect(openrtbRequest.regs.ext.gdpr).to.equal(true);
    });

    it('prefer 2.0 sizes', function () {
      var bidRequestList = [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'myplacement',
            'zone': 'myzone',
            'path': 'mypath'
          },
          'mediaTypes': {
            'banner': {
              'sizes': [[300, 600]]
            }
          },
          'adUnitCode': 'div-gpt-ad-1438287399331-0',
          'sizes': [[300, 250]],
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);

      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.imp[0].banner.format[0].w).to.equal(300);
      expect(openrtbRequest.imp[0].banner.format[0].h).to.equal(600);
    });

    it('does not return request for invalid banner size configuration', function () {
      var bidRequestList = [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'myplacement',
            'zone': 'myzone',
            'path': 'mypath'
          },
          'mediaTypes': {
            'banner': {
              'sizes': [[300]]
            }
          },
          'adUnitCode': 'div-gpt-ad-1438287399331-0',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);
      expect(bidRequest.method).to.be.undefined;
    });

    it('does not return request for missing banner size configuration', function () {
      var bidRequestList = [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'myplacement',
            'zone': 'myzone',
            'path': 'mypath'
          },
          'mediaTypes': {
            'banner': {}
          },
          'adUnitCode': 'div-gpt-ad-1438287399331-0',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);
      expect(bidRequest.method).to.be.undefined;
    });

    it('reject bad sizes', function () {
      var bidRequestList = [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'myplacement',
            'zone': 'myzone',
            'path': 'mypath'
          },
          'mediaTypes': {
            'banner': {'sizes': [['400', '500'], ['4n0', '5g0']]}
          },
          'adUnitCode': 'div-gpt-ad-1438287399331-0',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);
      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.imp[0].banner.format.length).to.equal(1);
    });

    it('dnt is correctly set to 1', function () {
      var bidRequestList = [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'myplacement',
          },
          'mediaTypes': {
            'banner': {
              'sizes': [[300, 600]]
            }
          },
          'adUnitCode': 'div-gpt-ad-1438287399331-0',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var dntStub = sinon.stub(utils, 'getDNT').returns(1);

      var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);

      dntStub.restore();

      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.device.dnt).to.equal(1);
    });

    it('sets floor', function () {
      var bidRequestList = [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'myplacement',
            'floor': 100.0
          },
          'mediaTypes': {
            'banner': {
              'sizes': [[300, 600]]
            }
          },
          'adUnitCode': 'div-gpt-ad-1438287399331-0',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);

      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.imp[0].bidfloor).to.equal(100.0);
    });

    it('supports string video sizes', function () {
      var bidRequestList = [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'myplacement',
          },
          'mediaTypes': {
            'video': {
              'context': 'instream',
              'playerSize': ['600', '300']
            }
          },
          'adUnitCode': 'div-gpt-ad-1438287399331-1',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);

      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.imp[0].video.w).to.equal(600);
      expect(openrtbRequest.imp[0].video.h).to.equal(300);
    });

    it('rejects bad video sizes', function () {
      var bidRequestList = [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'myplacement',
          },
          'mediaTypes': {
            'video': {
              'context': 'instream',
              'playerSize': ['badWidth', 'badHeight']
            }
          },
          'adUnitCode': 'div-gpt-ad-1438287399331-1',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);

      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.imp[0].video.w).to.be.undefined;
      expect(openrtbRequest.imp[0].video.h).to.be.undefined;
    });

    it('supports missing video size', function () {
      var bidRequestList = [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'myplacement',
          },
          'mediaTypes': {
            'video': {
              'context': 'instream'
            }
          },
          'adUnitCode': 'div-gpt-ad-1438287399331-1',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);

      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.imp[0].video.w).to.be.undefined;
      expect(openrtbRequest.imp[0].video.h).to.be.undefined;
    });

    it('uses default zone and path', function () {
      var bidRequestList = [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'myplacement'
          },
          'mediaTypes': {
            'banner': {
              'sizes': [
                [300, 600]
              ]
            }
          },
          'adUnitCode': 'div-gpt-ad-1438287399331-0',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);

      const openrtbRequest = JSON.parse(bidRequest.data);
      expect(openrtbRequest.imp[0].ext.bidder.zone).to.equal('1r');
      expect(openrtbRequest.imp[0].ext.bidder.path).to.equal('mvo');
    });

    it('should return empty when required params not found', function () {
      var bidRequestList = [
        {
          'bidder': 'rhythmone',
          'params': {
            'zone': 'myzone',
            'path': 'mypath'
          },
          'mediaTypes': {
            'banner': {
              'sizes': [
                [300, 250]
              ]
            }
          },
          'adUnitCode': 'div-gpt-ad-1438287399331-3',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);

      expect(bidRequest).to.be.empty;
    });

    it('should return empty site data when refererInfo is missing', function() {
      delete this.defaultBidderRequest.refererInfo;
      var bidRequestList = [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'myplacement',
            'zone': 'myzone',
            'path': 'mypath'
          },
          'mediaType': 'banner',
          'adUnitCode': 'div-gpt-ad-1438287399331-0',
          'sizes': [[300, 250]],
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757',
          'bidRequestsCount': 1,
          'bidId': '51ef8751f9aead'
        }
      ];

      var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);
      const openrtbRequest = JSON.parse(bidRequest.data);

      expect(openrtbRequest.site.domain).to.equal('');
      expect(openrtbRequest.site.page).to.equal('');
      expect(openrtbRequest.site.ref).to.equal('');
    });
  });

  it('should return empty site.domain and site.page when refererInfo.stack is empty', function() {
    this.defaultBidderRequest.refererInfo.stack = [];
    var bidRequestList = [
      {
        'bidder': 'rhythmone',
        'params': {
          'placementId': 'myplacement',
          'zone': 'myzone',
          'path': 'mypath'
        },
        'mediaType': 'banner',
        'adUnitCode': 'div-gpt-ad-1438287399331-0',
        'sizes': [[300, 250]],
        'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
        'bidderRequestId': '418b37f85e772c',
        'auctionId': '18fd8b8b0bd757',
        'bidRequestsCount': 1,
        'bidId': '51ef8751f9aead'
      }
    ];

    var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);
    const openrtbRequest = JSON.parse(bidRequest.data);

    expect(openrtbRequest.site.domain).to.equal('');
    expect(openrtbRequest.site.page).to.equal('');
    expect(openrtbRequest.site.ref).to.equal('Reference Page');
  });

  it('should secure correctly', function() {
    this.defaultBidderRequest.refererInfo.stack[0] = ['https://securesite.dvl'];
    var bidRequestList = [
      {
        'bidder': 'rhythmone',
        'params': {
          'placementId': 'myplacement',
          'zone': 'myzone',
          'path': 'mypath'
        },
        'mediaType': 'banner',
        'adUnitCode': 'div-gpt-ad-1438287399331-0',
        'sizes': [[300, 250]],
        'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
        'bidderRequestId': '418b37f85e772c',
        'auctionId': '18fd8b8b0bd757',
        'bidRequestsCount': 1,
        'bidId': '51ef8751f9aead'
      }
    ];

    var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);
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
        'bidder': 'rhythmone',
        'params': {
          'placementId': 'myplacement',
          'zone': 'myzone',
          'path': 'mypath'
        },
        'mediaType': 'banner',
        'adUnitCode': 'div-gpt-ad-1438287399331-0',
        'sizes': [[300, 250]],
        'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
        'bidderRequestId': '418b37f85e772c',
        'auctionId': '18fd8b8b0bd757',
        'bidRequestsCount': 1,
        'bidId': '51ef8751f9aead',
        'schain': schain
      }
    ];

    var bidRequest = r1adapter.buildRequests(bidRequestList, this.defaultBidderRequest);
    const openrtbRequest = JSON.parse(bidRequest.data);

    expect(openrtbRequest.source.ext.schain).to.deep.equal(schain);
  });

  describe('misc interpretResponse', function () {
    it('No bid response', function() {
      var noBidResponse = r1adapter.interpretResponse({
        'body': ''
      });
      expect(noBidResponse.length).to.equal(0);
    });
  });

  describe('isBidRequestValid', function () {
    var bid = {
      'bidder': 'rhythmone',
      'params': {
        'placementId': 'myplacement',
        'path': 'mypath',
        'zone': 'myzone'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 250]]
        }
      },
      'adUnitCode': 'bannerDiv'
    };

    it('should return true when required params found', function () {
      expect(r1adapter.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when placementId missing', function () {
      delete bid.params.placementId;
      expect(r1adapter.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('getUserSyncs', function () {
    it('returns an empty string', function () {
      expect(r1adapter.getUserSyncs()).to.deep.equal([]);
    });
  });
});
