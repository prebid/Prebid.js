import {expect} from 'chai';
import {spec, USER_ID_CODE_TO_QUERY_ARG} from 'modules/openxBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from 'src/mediaTypes.js';
import {userSync} from 'src/userSync.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';

const URLBASE = '/w/1.0/arj';
const URLBASEVIDEO = '/v/1.0/avjp';

describe('OpenxAdapter', function () {
  const adapter = newBidder(spec);

  /**
   *  Type Definitions
   */

  /**
   * @typedef {{
   *  impression: string,
   *  inview: string,
   *  click: string
   * }}
   */
  let OxArjTracking;
  /**
   * @typedef {{
   *   ads: {
   *     version: number,
   *     count: number,
   *     pixels: string,
   *     ad: Array<OxArjAdUnit>
   *   }
   * }}
   */
  let OxArjResponse;
  /**
   * @typedef {{
   *   adunitid: number,
   *   adid:number,
   *   type: string,
   *   htmlz: string,
   *   framed: number,
   *   is_fallback: number,
   *   ts: string,
   *   cpipc: number,
   *   pub_rev: string,
   *   tbd: ?string,
   *   adv_id: string,
   *   deal_id: string,
   *   auct_win_is_deal: number,
   *   brand_id: string,
   *   currency: string,
   *   idx: string,
   *   creative: Array<OxArjCreative>
   * }}
   */
  let OxArjAdUnit;
  /**
   * @typedef {{
   *  id: string,
   *  width: string,
   *  height: string,
   *  target: string,
   *  mime: string,
   *  media: string,
   *  tracking: OxArjTracking
   * }}
   */
  let OxArjCreative;

  // HELPER METHODS
  /**
   * @type {OxArjCreative}
   */
  const DEFAULT_TEST_ARJ_CREATIVE = {
    id: '0',
    width: 'test-width',
    height: 'test-height',
    target: 'test-target',
    mime: 'test-mime',
    media: 'test-media',
    tracking: {
      impression: 'test-impression',
      inview: 'test-inview',
      click: 'test-click'
    }
  };

  /**
   * @type {OxArjAdUnit}
   */
  const DEFAULT_TEST_ARJ_AD_UNIT = {
    adunitid: 0,
    type: 'test-type',
    html: 'test-html',
    framed: 0,
    is_fallback: 0,
    ts: 'test-ts',
    tbd: 'NaN',
    deal_id: undefined,
    auct_win_is_deal: undefined,
    cpipc: 0,
    pub_rev: 'test-pub_rev',
    adv_id: 'test-adv_id',
    brand_id: 'test-brand_id',
    currency: 'test-currency',
    idx: '0',
    creative: [DEFAULT_TEST_ARJ_CREATIVE]
  };

  /**
   * @type {OxArjResponse}
   */
  const DEFAULT_ARJ_RESPONSE = {
    ads: {
      version: 0,
      count: 1,
      pixels: 'https://testpixels.net',
      ad: [DEFAULT_TEST_ARJ_AD_UNIT]
    }
  };

  // Sample bid requests

  const BANNER_BID_REQUESTS_WITH_MEDIA_TYPES = [{
    bidder: 'openx',
    params: {
      unit: '11',
      delDomain: 'test-del-domain'
    },
    adUnitCode: '/adunit-code/test-path',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]]
      }
    },
    bidId: 'test-bid-id-1',
    bidderRequestId: 'test-bid-request-1',
    auctionId: 'test-auction-1',
    ortb2Imp: { ext: { data: { pbadslot: '/12345/my-gpt-tag-0' } } },
  }, {
    bidder: 'openx',
    params: {
      unit: '22',
      delDomain: 'test-del-domain'
    },
    adUnitCode: 'adunit-code',
    mediaTypes: {
      banner: {
        sizes: [[728, 90]]
      }
    },
    bidId: 'test-bid-id-2',
    bidderRequestId: 'test-bid-request-2',
    auctionId: 'test-auction-2',
    ortb2Imp: { ext: { data: { pbadslot: '/12345/my-gpt-tag-1' } } },
  }];

  const VIDEO_BID_REQUESTS_WITH_MEDIA_TYPES = [{
    bidder: 'openx',
    mediaTypes: {
      video: {
        playerSize: [640, 480]
      }
    },
    params: {
      unit: '12345678',
      delDomain: 'test-del-domain'
    },
    adUnitCode: 'adunit-code',

    bidId: '30b31c1838de1e',
    bidderRequestId: '22edbae2733bf6',
    auctionId: '1d1a030790a475',
    transactionId: '4008d88a-8137-410b-aa35-fbfdabcb478e',
    ortb2Imp: { ext: { data: { pbadslot: '/12345/my-gpt-tag-0' } } },
  }];

  const MULTI_FORMAT_BID_REQUESTS = [{
    bidder: 'openx',
    params: {
      unit: '12345678',
      delDomain: 'test-del-domain'
    },
    adUnitCode: 'adunit-code',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      },
      video: {
        playerSize: [300, 250]
      }
    },
    bidId: '30b31c1838de1e',
    bidderRequestId: '22edbae2733bf6',
    auctionId: '1d1a030790a475',
    transactionId: '4008d88a-8137-410b-aa35-fbfdabcb478e',
    ortb2Imp: { ext: { data: { pbadslot: '/12345/my-gpt-tag-0' } } },
  }];

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    describe('when request is for a banner ad', function () {
      let bannerBid;
      beforeEach(function () {
        bannerBid = {
          bidder: 'openx',
          params: {},
          adUnitCode: 'adunit-code',
          mediaTypes: {banner: {}},
          sizes: [[300, 250], [300, 600]],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475'
        };
      });

      it('should return false when there is no delivery domain', function () {
        bannerBid.params = {'unit': '12345678'};
        expect(spec.isBidRequestValid(bannerBid)).to.equal(false);
      });

      describe('when there is a delivery domain', function () {
        beforeEach(function () {
          bannerBid.params = {delDomain: 'test-delivery-domain'}
        });

        it('should return false when there is no ad unit id and size', function () {
          expect(spec.isBidRequestValid(bannerBid)).to.equal(false);
        });

        it('should return true if there is an adunit id ', function () {
          bannerBid.params.unit = '12345678';
          expect(spec.isBidRequestValid(bannerBid)).to.equal(true);
        });

        it('should return true if there is no adunit id and sizes are defined', function () {
          bannerBid.mediaTypes.banner.sizes = [720, 90];
          expect(spec.isBidRequestValid(bannerBid)).to.equal(true);
        });

        it('should return false if no sizes are defined ', function () {
          expect(spec.isBidRequestValid(bannerBid)).to.equal(false);
        });

        it('should return false if sizes empty ', function () {
          bannerBid.mediaTypes.banner.sizes = [];
          expect(spec.isBidRequestValid(bannerBid)).to.equal(false);
        });
      });
    });

    describe('when request is for a multiformat ad', function () {
      describe('and request config uses mediaTypes video and banner', () => {
        it('should return true multisize when required params found', function () {
          expect(spec.isBidRequestValid(MULTI_FORMAT_BID_REQUESTS[0])).to.equal(true);
        });
      });
    });

    describe('when request is for a video ad', function () {
      describe('and request config uses mediaTypes', () => {
        const videoBidWithMediaTypes = {
          bidder: 'openx',
          params: {
            unit: '12345678',
            delDomain: 'test-del-domain'
          },
          adUnitCode: 'adunit-code',
          mediaTypes: {
            video: {
              playerSize: [640, 480]
            }
          },
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          transactionId: '4008d88a-8137-410b-aa35-fbfdabcb478e'
        };
        it('should return true when required params found', function () {
          expect(spec.isBidRequestValid(videoBidWithMediaTypes)).to.equal(true);
        });

        it('should return false when required params are not passed', function () {
          let videoBidWithMediaTypes = Object.assign({}, videoBidWithMediaTypes);
          videoBidWithMediaTypes.params = {};
          expect(spec.isBidRequestValid(videoBidWithMediaTypes)).to.equal(false);
        });
      });
      describe('and request config uses both delDomain and platform', () => {
        const videoBidWithDelDomainAndPlatform = {
          bidder: 'openx',
          params: {
            unit: '12345678',
            delDomain: 'test-del-domain',
            platform: '1cabba9e-cafe-3665-beef-f00f00f00f00'
          },
          adUnitCode: 'adunit-code',
          mediaTypes: {
            video: {
              playerSize: [640, 480]
            }
          },
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          transactionId: '4008d88a-8137-410b-aa35-fbfdabcb478e'
        };
        it('should return true when required params found', function () {
          expect(spec.isBidRequestValid(videoBidWithDelDomainAndPlatform)).to.equal(true);
        });

        it('should return false when required params are not passed', function () {
          let videoBidWithMediaTypes = Object.assign({}, videoBidWithDelDomainAndPlatform);
          videoBidWithMediaTypes.params = {};
          expect(spec.isBidRequestValid(videoBidWithMediaTypes)).to.equal(false);
        });
      });
      describe('and request config uses mediaType', () => {
        const videoBidWithMediaType = {
          'bidder': 'openx',
          'params': {
            'unit': '12345678',
            'delDomain': 'test-del-domain'
          },
          'adUnitCode': 'adunit-code',
          'mediaType': 'video',
          'sizes': [640, 480],
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
          'transactionId': '4008d88a-8137-410b-aa35-fbfdabcb478e'
        };
        it('should return true when required params found', function () {
          expect(spec.isBidRequestValid(videoBidWithMediaType)).to.equal(true);
        });

        it('should return false when required params are not passed', function () {
          let videoBidWithMediaType = Object.assign({}, videoBidWithMediaType);
          delete videoBidWithMediaType.params;
          videoBidWithMediaType.params = {};
          expect(spec.isBidRequestValid(videoBidWithMediaType)).to.equal(false);
        });
      });

      describe('and request config uses test', () => {
        const videoBidWithTest = {
          bidder: 'openx',
          params: {
            unit: '12345678',
            delDomain: 'test-del-domain',
            test: true
          },
          adUnitCode: 'adunit-code',
          mediaTypes: {
            video: {
              playerSize: [640, 480]
            }
          },
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          transactionId: '4008d88a-8137-410b-aa35-fbfdabcb478e'
        };

        let mockBidderRequest = {refererInfo: {}};

        it('should return true when required params found', function () {
          expect(spec.isBidRequestValid(videoBidWithTest)).to.equal(true);
        });

        it('should send video bid request to openx url via GET, with vtest=1 video parameter', function () {
          const request = spec.buildRequests([videoBidWithTest], mockBidderRequest);
          expect(request[0].data.vtest).to.equal(1);
        });
      });
    });
  });

  describe('buildRequests for banner ads', function () {
    const bidRequestsWithMediaTypes = BANNER_BID_REQUESTS_WITH_MEDIA_TYPES;

    const bidRequestsWithPlatform = [{
      'bidder': 'openx',
      'params': {
        'unit': '11',
        'platform': '1cabba9e-cafe-3665-beef-f00f00f00f00'
      },
      'adUnitCode': '/adunit-code/test-path',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      },
      'bidId': 'test-bid-id-1',
      'bidderRequestId': 'test-bid-request-1',
      'auctionId': 'test-auction-1'
    }, {
      'bidder': 'openx',
      'params': {
        'unit': '11',
        'platform': '1cabba9e-cafe-3665-beef-f00f00f00f00'
      },
      'adUnitCode': '/adunit-code/test-path',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      },
      'bidId': 'test-bid-id-1',
      'bidderRequestId': 'test-bid-request-1',
      'auctionId': 'test-auction-1'
    }];

    const mockBidderRequest = {refererInfo: {}};

    it('should send bid request to openx url via GET, with mediaTypes specified with banner type', function () {
      const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
      expect(request[0].url).to.equal('https://' + bidRequestsWithMediaTypes[0].params.delDomain + URLBASE);
      expect(request[0].data.ph).to.be.undefined;
      expect(request[0].method).to.equal('GET');
    });

    it('should send bid request to openx platform url via GET, if platform is present', function () {
      const request = spec.buildRequests(bidRequestsWithPlatform, mockBidderRequest);
      expect(request[0].url).to.equal(`https://u.openx.net${URLBASE}`);
      expect(request[0].data.ph).to.equal(bidRequestsWithPlatform[0].params.platform);
      expect(request[0].method).to.equal('GET');
    });

    it('should send bid request to openx platform url via GET, if both params present', function () {
      const bidRequestsWithPlatformAndDelDomain = [{
        'bidder': 'openx',
        'params': {
          'unit': '11',
          'delDomain': 'test-del-domain',
          'platform': '1cabba9e-cafe-3665-beef-f00f00f00f00'
        },
        'adUnitCode': '/adunit-code/test-path',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        'bidId': 'test-bid-id-1',
        'bidderRequestId': 'test-bid-request-1',
        'auctionId': 'test-auction-1'
      }, {
        'bidder': 'openx',
        'params': {
          'unit': '11',
          'delDomain': 'test-del-domain',
          'platform': '1cabba9e-cafe-3665-beef-f00f00f00f00'
        },
        'adUnitCode': '/adunit-code/test-path',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        'bidId': 'test-bid-id-1',
        'bidderRequestId': 'test-bid-request-1',
        'auctionId': 'test-auction-1'
      }];

      const request = spec.buildRequests(bidRequestsWithPlatformAndDelDomain, mockBidderRequest);
      expect(request[0].url).to.equal(`https://u.openx.net${URLBASE}`);
      expect(request[0].data.ph).to.equal(bidRequestsWithPlatform[0].params.platform);
      expect(request[0].method).to.equal('GET');
    });

    it('should send the adunit codes', function () {
      const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
      expect(request[0].data.divids).to.equal(`${encodeURIComponent(bidRequestsWithMediaTypes[0].adUnitCode)},${encodeURIComponent(bidRequestsWithMediaTypes[1].adUnitCode)}`);
    });

    it('should send the gpids', function () {
      const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
      expect(request[0].data.aucs).to.equal(`${encodeURIComponent('/12345/my-gpt-tag-0')},${encodeURIComponent('/12345/my-gpt-tag-1')}`);
    });

    it('should send ad unit ids when any are defined', function () {
      const bidRequestsWithUnitIds = [{
        'bidder': 'openx',
        'params': {
          'delDomain': 'test-del-domain'
        },
        'adUnitCode': 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        'bidId': 'test-bid-id-1',
        'bidderRequestId': 'test-bid-request-1',
        'auctionId': 'test-auction-1'
      }, {
        'bidder': 'openx',
        'params': {
          'unit': '22',
          'delDomain': 'test-del-domain'
        },
        'adUnitCode': 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[728, 90]]
          }
        },
        'bidId': 'test-bid-id-2',
        'bidderRequestId': 'test-bid-request-2',
        'auctionId': 'test-auction-2'
      }];
      const request = spec.buildRequests(bidRequestsWithUnitIds, mockBidderRequest);
      expect(request[0].data.auid).to.equal(`,${bidRequestsWithUnitIds[1].params.unit}`);
    });

    it('should not send any ad unit ids when none are defined', function () {
      const bidRequestsWithoutUnitIds = [{
        'bidder': 'openx',
        'params': {
          'delDomain': 'test-del-domain'
        },
        'adUnitCode': 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        'bidId': 'test-bid-id-1',
        'bidderRequestId': 'test-bid-request-1',
        'auctionId': 'test-auction-1'
      }, {
        'bidder': 'openx',
        'params': {
          'delDomain': 'test-del-domain'
        },
        'adUnitCode': 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[728, 90]]
          }
        },
        'bidId': 'test-bid-id-2',
        'bidderRequestId': 'test-bid-request-2',
        'auctionId': 'test-auction-2'
      }];
      const request = spec.buildRequests(bidRequestsWithoutUnitIds, mockBidderRequest);
      expect(request[0].data).to.not.have.any.keys('auid');
    });

    it('should send out custom params on bids that have customParams specified', function () {
      const bidRequest = Object.assign({},
        bidRequestsWithMediaTypes[0],
        {
          params: {
            'unit': '12345678',
            'delDomain': 'test-del-domain',
            'customParams': {'Test1': 'testval1+', 'test2': ['testval2/', 'testval3']}
          }
        }
      );

      const request = spec.buildRequests([bidRequest], mockBidderRequest);
      const dataParams = request[0].data;

      expect(dataParams.tps).to.exist;
      expect(dataParams.tps).to.equal(btoa('test1=testval1.&test2=testval2_,testval3'));
    });

    it('should send out custom bc parameter, if override is present', function () {
      const bidRequest = Object.assign({},
        bidRequestsWithMediaTypes[0],
        {
          params: {
            'unit': '12345678',
            'delDomain': 'test-del-domain',
            'bc': 'hb_override'
          }
        }
      );

      const request = spec.buildRequests([bidRequest], mockBidderRequest);
      const dataParams = request[0].data;

      expect(dataParams.bc).to.exist;
      expect(dataParams.bc).to.equal('hb_override');
    });

    it('should not send any consent management properties', function () {
      const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
      expect(request[0].data.gdpr).to.equal(undefined);
      expect(request[0].data.gdpr_consent).to.equal(undefined);
      expect(request[0].data.x_gdpr_f).to.equal(undefined);
    });

    describe('when there is a consent management framework', function () {
      let bidRequests;
      let mockConfig;
      let bidderRequest;
      const IAB_CONSENT_FRAMEWORK_CODE = 1;

      beforeEach(function () {
        bidRequests = [{
          bidder: 'openx',
          params: {
            unit: '12345678-banner',
            delDomain: 'test-del-domain'
          },
          adUnitCode: 'adunit-code',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600]]
            }
          },
          bidId: 'test-bid-id',
          bidderRequestId: 'test-bidder-request-id',
          auctionId: 'test-auction-id'
        }, {
          'bidder': 'openx',
          'mediaTypes': {
            video: {
              playerSize: [640, 480]
            }
          },
          'params': {
            'unit': '12345678-video',
            'delDomain': 'test-del-domain'
          },
          'adUnitCode': 'adunit-code',

          bidId: 'test-bid-id',
          bidderRequestId: 'test-bidder-request-id',
          auctionId: 'test-auction-id',
          transactionId: '4008d88a-8137-410b-aa35-fbfdabcb478e'
        }];
      });

      afterEach(function () {
        config.getConfig.restore();
      });

      describe('when us_privacy applies', function () {
        beforeEach(function () {
          bidderRequest = {
            uspConsent: '1YYN',
            refererInfo: {}
          };

          sinon.stub(config, 'getConfig').callsFake((key) => {
            return utils.deepAccess(mockConfig, key);
          });
        });

        it('should send a signal to specify that GDPR applies to this request', function () {
          const request = spec.buildRequests(bidRequests, bidderRequest);
          expect(request[0].data.us_privacy).to.equal('1YYN');
          expect(request[1].data.us_privacy).to.equal('1YYN');
        });
      });

      describe('when us_privacy does not applies', function () {
        beforeEach(function () {
          bidderRequest = {
            refererInfo: {}
          };

          sinon.stub(config, 'getConfig').callsFake((key) => {
            return utils.deepAccess(mockConfig, key);
          });
        });

        it('should not send the consent string, when consent string is undefined', function () {
          delete bidderRequest.uspConsent;
          const request = spec.buildRequests(bidRequests, bidderRequest);
          expect(request[0].data).to.not.have.property('us_privacy');
          expect(request[1].data).to.not.have.property('us_privacy');
        });
      });

      describe('when GDPR applies', function () {
        beforeEach(function () {
          bidderRequest = {
            gdprConsent: {
              consentString: 'test-gdpr-consent-string',
              gdprApplies: true
            },
            refererInfo: {}
          };

          mockConfig = {
            consentManagement: {
              cmpApi: 'iab',
              timeout: 1111,
              allowAuctionWithoutConsent: 'cancel'
            }
          };

          sinon.stub(config, 'getConfig').callsFake((key) => {
            return utils.deepAccess(mockConfig, key);
          });
        });

        it('should send a signal to specify that GDPR applies to this request', function () {
          const request = spec.buildRequests(bidRequests, bidderRequest);
          expect(request[0].data.gdpr).to.equal(1);
          expect(request[1].data.gdpr).to.equal(1);
        });

        it('should send the consent string', function () {
          const request = spec.buildRequests(bidRequests, bidderRequest);
          expect(request[0].data.gdpr_consent).to.equal(bidderRequest.gdprConsent.consentString);
          expect(request[1].data.gdpr_consent).to.equal(bidderRequest.gdprConsent.consentString);
        });

        it('should send the consent management framework code', function () {
          const request = spec.buildRequests(bidRequests, bidderRequest);
          expect(request[0].data.x_gdpr_f).to.equal(IAB_CONSENT_FRAMEWORK_CODE);
          expect(request[1].data.x_gdpr_f).to.equal(IAB_CONSENT_FRAMEWORK_CODE);
        });
      });

      describe('when GDPR does not apply', function () {
        beforeEach(function () {
          bidderRequest = {
            gdprConsent: {
              consentString: 'test-gdpr-consent-string',
              gdprApplies: false
            },
            refererInfo: {}
          };

          mockConfig = {
            consentManagement: {
              cmpApi: 'iab',
              timeout: 1111,
              allowAuctionWithoutConsent: 'cancel'
            }
          };

          sinon.stub(config, 'getConfig').callsFake((key) => {
            return utils.deepAccess(mockConfig, key);
          });
        });

        it('should not send a signal to specify that GDPR does not apply to this request', function () {
          const request = spec.buildRequests(bidRequests, bidderRequest);
          expect(request[0].data.gdpr).to.equal(0);
          expect(request[1].data.gdpr).to.equal(0);
        });

        it('should send the consent string', function () {
          const request = spec.buildRequests(bidRequests, bidderRequest);
          expect(request[0].data.gdpr_consent).to.equal(bidderRequest.gdprConsent.consentString);
          expect(request[1].data.gdpr_consent).to.equal(bidderRequest.gdprConsent.consentString);
        });

        it('should send the consent management framework code', function () {
          const request = spec.buildRequests(bidRequests, bidderRequest);
          expect(request[0].data.x_gdpr_f).to.equal(IAB_CONSENT_FRAMEWORK_CODE);
          expect(request[1].data.x_gdpr_f).to.equal(IAB_CONSENT_FRAMEWORK_CODE);
        });
      });

      describe('when GDPR consent has undefined data', function () {
        beforeEach(function () {
          bidderRequest = {
            gdprConsent: {
              consentString: 'test-gdpr-consent-string',
              gdprApplies: true
            },
            refererInfo: {}
          };

          mockConfig = {
            consentManagement: {
              cmpApi: 'iab',
              timeout: 1111,
              allowAuctionWithoutConsent: 'cancel'
            }
          };

          sinon.stub(config, 'getConfig').callsFake((key) => {
            return utils.deepAccess(mockConfig, key);
          });
        });

        it('should not send a signal to specify whether GDPR applies to this request, when GDPR application is undefined', function () {
          delete bidderRequest.gdprConsent.gdprApplies;
          const request = spec.buildRequests(bidRequests, bidderRequest);
          expect(request[0].data).to.not.have.property('gdpr');
          expect(request[1].data).to.not.have.property('gdpr');
        });

        it('should not send the consent string, when consent string is undefined', function () {
          delete bidderRequest.gdprConsent.consentString;
          const request = spec.buildRequests(bidRequests, bidderRequest);
          expect(request[0].data).to.not.have.property('gdpr_consent');
          expect(request[1].data).to.not.have.property('gdpr_consent');
        });

        it('should not send the consent management framework code, when format is undefined', function () {
          delete mockConfig.consentManagement.cmpApi;
          const request = spec.buildRequests(bidRequests, bidderRequest);
          expect(request[0].data).to.not.have.property('x_gdpr_f');
          expect(request[1].data).to.not.have.property('x_gdpr_f');
        });
      });
    });

    it('should not send a coppa query param when there are no coppa param settings in the bid requests', function () {
      const bidRequestsWithoutCoppa = [{
        bidder: 'openx',
        params: {
          unit: '11',
          delDomain: 'test-del-domain',
          coppa: false
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        bidId: 'test-bid-id-1',
        bidderRequestId: 'test-bid-request-1',
        auctionId: 'test-auction-1'
      }, {
        bidder: 'openx',
        params: {
          unit: '22',
          delDomain: 'test-del-domain'
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[728, 90]]
          }
        },
        bidId: 'test-bid-id-2',
        bidderRequestId: 'test-bid-request-2',
        auctionId: 'test-auction-2'
      }];
      const request = spec.buildRequests(bidRequestsWithoutCoppa, mockBidderRequest);
      expect(request[0].data).to.not.have.any.keys('tfcd');
    });

    it('should send a coppa flag there is when there is coppa param settings in the bid requests', function () {
      const bidRequestsWithCoppa = [{
        bidder: 'openx',
        params: {
          unit: '11',
          delDomain: 'test-del-domain',
          coppa: false
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        bidId: 'test-bid-id-1',
        bidderRequestId: 'test-bid-request-1',
        auctionId: 'test-auction-1'
      }, {
        bidder: 'openx',
        params: {
          unit: '22',
          delDomain: 'test-del-domain',
          coppa: true
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[728, 90]]
          }
        },
        bidId: 'test-bid-id-2',
        bidderRequestId: 'test-bid-request-2',
        auctionId: 'test-auction-2'
      }];
      const request = spec.buildRequests(bidRequestsWithCoppa, mockBidderRequest);
      expect(request[0].data.tfcd).to.equal(1);
    });

    it('should not send a "no segmentation" flag there no DoNotTrack setting that is set to true', function () {
      const bidRequestsWithoutDnt = [{
        bidder: 'openx',
        params: {
          unit: '11',
          delDomain: 'test-del-domain',
          doNotTrack: false
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        bidId: 'test-bid-id-1',
        bidderRequestId: 'test-bid-request-1',
        auctionId: 'test-auction-1'
      }, {
        bidder: 'openx',
        params: {
          unit: '22',
          delDomain: 'test-del-domain'
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[728, 90]]
          }
        },
        bidId: 'test-bid-id-2',
        bidderRequestId: 'test-bid-request-2',
        auctionId: 'test-auction-2'
      }];
      const request = spec.buildRequests(bidRequestsWithoutDnt, mockBidderRequest);
      expect(request[0].data).to.not.have.any.keys('ns');
    });

    it('should send a "no segmentation" flag there is any DoNotTrack setting that is set to true', function () {
      const bidRequestsWithDnt = [{
        bidder: 'openx',
        params: {
          unit: '11',
          delDomain: 'test-del-domain',
          doNotTrack: false
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        bidId: 'test-bid-id-1',
        bidderRequestId: 'test-bid-request-1',
        auctionId: 'test-auction-1'
      }, {
        bidder: 'openx',
        params: {
          unit: '22',
          delDomain: 'test-del-domain',
          doNotTrack: true
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[728, 90]]
          }
        },
        bidId: 'test-bid-id-2',
        bidderRequestId: 'test-bid-request-2',
        auctionId: 'test-auction-2'
      }];
      const request = spec.buildRequests(bidRequestsWithDnt, mockBidderRequest);
      expect(request[0].data.ns).to.equal(1);
    });

    describe('when schain is provided', function () {
      let bidRequests;
      let schainConfig;
      const supplyChainNodePropertyOrder = ['asi', 'sid', 'hp', 'rid', 'name', 'domain'];

      beforeEach(function () {
        schainConfig = {
          'ver': '1.0',
          'complete': 1,
          'nodes': [
            {
              'asi': 'exchange1.com',
              'sid': '1234',
              'hp': 1,
              'rid': 'bid-request-1',
              'name': 'publisher',
              'domain': 'publisher.com'
              // omitted ext
            },
            {
              'asi': 'exchange2.com',
              'sid': 'abcd',
              'hp': 1,
              'rid': 'bid-request-2',
              // name field missing
              'domain': 'intermediary.com'
            },
            {
              'asi': 'exchange3.com',
              'sid': '4321',
              'hp': 1,
              // request id
              // name field missing
              'domain': 'intermediary-2.com'
            }
          ]
        };

        bidRequests = [{
          'bidder': 'openx',
          'params': {
            'unit': '11',
            'delDomain': 'test-del-domain'
          },
          'adUnitCode': '/adunit-code/test-path',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600]]
            }
          },
          'bidId': 'test-bid-id-1',
          'bidderRequestId': 'test-bid-request-1',
          'auctionId': 'test-auction-1',
          'schain': schainConfig
        }];
      });

      it('should send a schain parameter with the proper delimiter symbols', function () {
        const request = spec.buildRequests(bidRequests, mockBidderRequest);
        const dataParams = request[0].data;
        const numNodes = schainConfig.nodes.length;

        // each node will have a ! to denote beginning of a new node
        expect(dataParams.schain.match(/!/g).length).to.equal(numNodes);

        // 1 comma in the front for version
        // 5 commas per node
        expect(dataParams.schain.match(/,/g).length).to.equal(numNodes * 5 + 1);
      });

      it('should send a schain with the right version', function () {
        const request = spec.buildRequests(bidRequests, mockBidderRequest);
        const dataParams = request[0].data;
        let serializedSupplyChain = dataParams.schain.split('!');
        let version = serializedSupplyChain.shift().split(',')[0];

        expect(version).to.equal(bidRequests[0].schain.ver);
      });

      it('should send a schain with the right complete value', function () {
        const request = spec.buildRequests(bidRequests, mockBidderRequest);
        const dataParams = request[0].data;
        let serializedSupplyChain = dataParams.schain.split('!');
        let isComplete = serializedSupplyChain.shift().split(',')[1];

        expect(isComplete).to.equal(String(bidRequests[0].schain.complete));
      });

      it('should send all available params in the right order', function () {
        const request = spec.buildRequests(bidRequests, mockBidderRequest);
        const dataParams = request[0].data;
        let serializedSupplyChain = dataParams.schain.split('!');
        serializedSupplyChain.shift();

        serializedSupplyChain.forEach((serializedNode, nodeIndex) => {
          let nodeProperties = serializedNode.split(',');

          nodeProperties.forEach((nodeProperty, propertyIndex) => {
            let node = schainConfig.nodes[nodeIndex];
            let key = supplyChainNodePropertyOrder[propertyIndex];

            expect(nodeProperty).to.equal(node[key] ? String(node[key]) : '',
              `expected node '${nodeIndex}' property '${nodeProperty}' to key '${key}' to be the same value`)
          });
        });
      });
    });

    describe('when there are userid providers', function () {
      const EXAMPLE_DATA_BY_ATTR = {
        britepoolid: '1111-britepoolid',
        criteoId: '1111-criteoId',
        fabrickId: '1111-fabrickid',
        haloId: '1111-haloid',
        id5id: {uid: '1111-id5id'},
        idl_env: '1111-idl_env',
        IDP: '1111-zeotap-idplusid',
        idxId: '1111-idxid',
        intentIqId: '1111-intentiqid',
        lipb: {lipbid: '1111-lipb'},
        lotamePanoramaId: '1111-lotameid',
        merkleId: {id: '1111-merkleid'},
        netId: 'fH5A3n2O8_CZZyPoJVD-eabc6ECb7jhxCicsds7qSg',
        parrableId: { eid: 'eidVersion.encryptionKeyReference.encryptedValue' },
        pubcid: '1111-pubcid',
        quantcastId: '1111-quantcastid',
        tapadId: '111-tapadid',
        tdid: '1111-tdid',
        uid2: {id: '1111-uid2'},
        flocId: {id: '12144', version: 'chrome.1.1'},
        novatiq: {snowflake: '1111-novatiqid'},
        admixerId: '1111-admixerid',
        deepintentId: '1111-deepintentid',
        dmdId: '111-dmdid',
        nextrollId: '1111-nextrollid',
        mwOpenLinkId: '1111-mwopenlinkid',
        dapId: '1111-dapId',
        amxId: '1111-amxid',
        kpuid: '1111-kpuid',
        publinkId: '1111-publinkid',
        naveggId: '1111-naveggid',
        imuid: '1111-imuid',
        adtelligentId: '1111-adtelligentid'
      };

      // generates the same set of tests for each id provider
      utils._each(USER_ID_CODE_TO_QUERY_ARG, (userIdQueryArg, userIdProviderKey) => {
        describe(`with userId attribute: ${userIdProviderKey}`, function () {
          it(`should not send a ${userIdQueryArg} query param when there is no userId.${userIdProviderKey} defined in the bid requests`, function () {
            const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
            expect(request[0].data).to.not.have.any.keys(userIdQueryArg);
          });

          it(`should send a ${userIdQueryArg} query param when userId.${userIdProviderKey} is defined in the bid requests`, function () {
            const bidRequestsWithUserId = [{
              bidder: 'openx',
              params: {
                unit: '11',
                delDomain: 'test-del-domain'
              },
              userId: {
              },
              adUnitCode: 'adunit-code',
              mediaTypes: {
                banner: {
                  sizes: [[300, 250], [300, 600]]
                }
              },
              bidId: 'test-bid-id-1',
              bidderRequestId: 'test-bid-request-1',
              auctionId: 'test-auction-1'
            }];
            // enrich bid request with userId key/value
            bidRequestsWithUserId[0].userId[userIdProviderKey] = EXAMPLE_DATA_BY_ATTR[userIdProviderKey];

            const request = spec.buildRequests(bidRequestsWithUserId, mockBidderRequest);

            let userIdValue;
            // handle cases where userId key refers to an object
            switch (userIdProviderKey) {
              case 'merkleId':
                userIdValue = EXAMPLE_DATA_BY_ATTR.merkleId.id;
                break;
              case 'flocId':
                userIdValue = EXAMPLE_DATA_BY_ATTR.flocId.id;
                break;
              case 'uid2':
                userIdValue = EXAMPLE_DATA_BY_ATTR.uid2.id;
                break;
              case 'lipb':
                userIdValue = EXAMPLE_DATA_BY_ATTR.lipb.lipbid;
                break;
              case 'parrableId':
                userIdValue = EXAMPLE_DATA_BY_ATTR.parrableId.eid;
                break;
              case 'id5id':
                userIdValue = EXAMPLE_DATA_BY_ATTR.id5id.uid;
                break;
              case 'novatiq':
                userIdValue = EXAMPLE_DATA_BY_ATTR.novatiq.snowflake;
                break;
              default:
                userIdValue = EXAMPLE_DATA_BY_ATTR[userIdProviderKey];
            }

            expect(request[0].data[USER_ID_CODE_TO_QUERY_ARG[userIdProviderKey]]).to.equal(userIdValue);
          });
        });
      });
    });

    describe('floors', function () {
      it('should send out custom floors on bids that have customFloors specified', function () {
        const bidRequest = Object.assign({},
          bidRequestsWithMediaTypes[0],
          {
            params: {
              'unit': '12345678',
              'delDomain': 'test-del-domain',
              'customFloor': 1.500001
            }
          }
        );

        const request = spec.buildRequests([bidRequest], mockBidderRequest);
        const dataParams = request[0].data;

        expect(dataParams.aumfs).to.exist;
        expect(dataParams.aumfs).to.equal('1500');
      });

      context('with floors module', function () {
        let adServerCurrencyStub;

        beforeEach(function () {
          adServerCurrencyStub = sinon
            .stub(config, 'getConfig')
            .withArgs('currency.adServerCurrency')
        });

        afterEach(function () {
          config.getConfig.restore();
        });

        it('should send out floors on bids', function () {
          const bidRequest1 = Object.assign({},
            bidRequestsWithMediaTypes[0],
            {
              getFloor: () => {
                return {
                  currency: 'AUS',
                  floor: 9.99
                }
              }
            }
          );

          const bidRequest2 = Object.assign({},
            bidRequestsWithMediaTypes[1],
            {
              getFloor: () => {
                return {
                  currency: 'AUS',
                  floor: 18.881
                }
              }
            }
          );

          const request = spec.buildRequests([bidRequest1, bidRequest2], mockBidderRequest);
          const dataParams = request[0].data;

          expect(dataParams.aumfs).to.exist;
          expect(dataParams.aumfs).to.equal('9990,18881');
        });

        it('should send out floors on bids in the default currency', function () {
          const bidRequest1 = Object.assign({},
            bidRequestsWithMediaTypes[0],
            {
              getFloor: () => {
                return {};
              }
            }
          );

          let getFloorSpy = sinon.spy(bidRequest1, 'getFloor');

          spec.buildRequests([bidRequest1], mockBidderRequest);
          expect(getFloorSpy.args[0][0].mediaType).to.equal(BANNER);
          expect(getFloorSpy.args[0][0].currency).to.equal('USD');
        });

        it('should send out floors on bids in the ad server currency if defined', function () {
          adServerCurrencyStub.returns('bitcoin');

          const bidRequest1 = Object.assign({},
            bidRequestsWithMediaTypes[0],
            {
              getFloor: () => {
                return {};
              }
            }
          );

          let getFloorSpy = sinon.spy(bidRequest1, 'getFloor');

          spec.buildRequests([bidRequest1], mockBidderRequest);
          expect(getFloorSpy.args[0][0].mediaType).to.equal(BANNER);
          expect(getFloorSpy.args[0][0].currency).to.equal('bitcoin');
        });
      })
    })
  });

  describe('buildRequests for video', function () {
    const bidRequestsWithMediaTypes = VIDEO_BID_REQUESTS_WITH_MEDIA_TYPES;
    const mockBidderRequest = {refererInfo: {}};

    it('should send bid request to openx url via GET, with mediaTypes having video parameter', function () {
      const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
      expect(request[0].url).to.equal('https://' + bidRequestsWithMediaTypes[0].params.delDomain + URLBASEVIDEO);
      expect(request[0].method).to.equal('GET');
    });
    it('should have the correct parameters', function () {
      const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
      const dataParams = request[0].data;

      expect(dataParams.auid).to.equal('12345678');
      expect(dataParams.vht).to.equal(480);
      expect(dataParams.vwd).to.equal(640);
      expect(dataParams.aucs).to.equal(encodeURIComponent('/12345/my-gpt-tag-0'));
    });

    it('shouldn\'t have the test parameter', function () {
      const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
      expect(request[0].data.vtest).to.be.undefined;
    });

    it('should send a bc parameter', function () {
      const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
      const dataParams = request[0].data;

      expect(dataParams.bc).to.have.string('hb_pb');
    });

    describe('when using the video param', function () {
      let videoBidRequest;
      let mockBidderRequest = {refererInfo: {}};

      beforeEach(function () {
        videoBidRequest = {
          'bidder': 'openx',
          'mediaTypes': {
            video: {
              context: 'instream',
              playerSize: [640, 480]
            }
          },
          'params': {
            'unit': '12345678',
            'delDomain': 'test-del-domain'
          },
          'adUnitCode': 'adunit-code',
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
          'transactionId': '4008d88a-8137-410b-aa35-fbfdabcb478e'
        };
        mockBidderRequest = {refererInfo: {}};
      });

      it('should not allow you to set a url', function () {
        videoBidRequest.params.video = {
          url: 'test-url'
        };
        const request = spec.buildRequests([videoBidRequest], mockBidderRequest);

        expect(request[0].data.url).to.be.undefined;
      });

      it('should not allow you to override the javascript url', function () {
        let myUrl = 'my-url';
        videoBidRequest.params.video = {
          ju: myUrl
        };
        const request = spec.buildRequests([videoBidRequest], mockBidderRequest);

        expect(request[0].data.ju).to.not.equal(myUrl);
      });

      describe('when using the openrtb video params', function () {
        it('should parse legacy params.video.openrtb', function () {
          let myOpenRTBObject = {mimes: ['application/javascript']};
          videoBidRequest.params.video = {
            openrtb: myOpenRTBObject
          };
          const expected = {imp: [{video: {w: 640, h: 480, mimes: ['application/javascript']}}]}
          const request = spec.buildRequests([videoBidRequest], mockBidderRequest);

          expect(request[0].data.openrtb).to.equal(JSON.stringify(expected));
        });

        it('should parse legacy params.openrtb', function () {
          let myOpenRTBObject = {mimes: ['application/javascript']};
          videoBidRequest.params.openrtb = myOpenRTBObject;
          const expected = {imp: [{video: {w: 640, h: 480, mimes: ['application/javascript']}}]}
          const request = spec.buildRequests([videoBidRequest], mockBidderRequest);

          expect(request[0].data.openrtb).to.equal(JSON.stringify(expected));
        });

        it('should parse legacy params.video', function () {
          let myOpenRTBObject = {mimes: ['application/javascript']};
          videoBidRequest.params.video = myOpenRTBObject;
          const expected = {imp: [{video: {w: 640, h: 480, mimes: ['application/javascript']}}]}
          const request = spec.buildRequests([videoBidRequest], mockBidderRequest);

          expect(request[0].data.openrtb).to.equal(JSON.stringify(expected));
        });

        it('should parse legacy params.video as full openrtb', function () {
          let myOpenRTBObject = {imp: [{video: {mimes: ['application/javascript']}}]};
          videoBidRequest.params.video = myOpenRTBObject;
          const expected = {imp: [{video: {w: 640, h: 480, mimes: ['application/javascript']}}]}
          const request = spec.buildRequests([videoBidRequest], mockBidderRequest);

          expect(request[0].data.openrtb).to.equal(JSON.stringify(expected));
        });

        it('should parse legacy video.openrtb', function () {
          let myOpenRTBObject = {mimes: ['application/javascript']};
          videoBidRequest.params.video = {
            openrtb: myOpenRTBObject
          };
          const expected = {imp: [{video: {w: 640, h: 480, mimes: ['application/javascript']}}]}
          const request = spec.buildRequests([videoBidRequest], mockBidderRequest);

          expect(request[0].data.openrtb).to.equal(JSON.stringify(expected));
        });

        it('should omit filtered values for legacy', function () {
          let myOpenRTBObject = {mimes: ['application/javascript'], dont: 'use'};
          videoBidRequest.params.video = {
            openrtb: myOpenRTBObject
          };
          const expected = {imp: [{video: {w: 640, h: 480, mimes: ['application/javascript']}}]}
          const request = spec.buildRequests([videoBidRequest], mockBidderRequest);

          expect(request[0].data.openrtb).to.equal(JSON.stringify(expected));
        });

        it('should parse mediatypes.video', function () {
          videoBidRequest.mediaTypes.video.mimes = ['application/javascript']
          videoBidRequest.mediaTypes.video.minduration = 15
          const request = spec.buildRequests([videoBidRequest], mockBidderRequest);
          const openRtbRequestParams = JSON.parse(request[0].data.openrtb);
          expect(openRtbRequestParams.imp[0].video.mimes).to.eql(['application/javascript']);
          expect(openRtbRequestParams.imp[0].video.minduration).to.equal(15);
        });

        it('should filter mediatypes.video', function () {
          videoBidRequest.mediaTypes.video.mimes = ['application/javascript']
          videoBidRequest.mediaTypes.video.minnothing = 15
          const request = spec.buildRequests([videoBidRequest], mockBidderRequest);
          const openRtbRequestParams = JSON.parse(request[0].data.openrtb);
          expect(openRtbRequestParams.imp[0].video.mimes).to.eql(['application/javascript']);
          expect(openRtbRequestParams.imp[0].video.minnothing).to.equal(undefined);
        });

        it("should use the bidRequest's playerSize", function () {
          const width = 200;
          const height = 100;
          const myOpenRTBObject = {v: height, w: width};
          videoBidRequest.params.video = {
            openrtb: myOpenRTBObject
          };
          const request = spec.buildRequests([videoBidRequest], mockBidderRequest);
          const openRtbRequestParams = JSON.parse(request[0].data.openrtb);

          expect(openRtbRequestParams.imp[0].video.w).to.equal(640);
          expect(openRtbRequestParams.imp[0].video.h).to.equal(480);
        });
      });
    });

    describe('floors', function () {
      it('should send out custom floors on bids that have customFloors specified', function () {
        const bidRequest = Object.assign({},
          bidRequestsWithMediaTypes[0],
          {
            params: {
              'unit': '12345678',
              'delDomain': 'test-del-domain',
              'customFloor': 1.500001
            }
          }
        );

        const request = spec.buildRequests([bidRequest], mockBidderRequest);
        const dataParams = request[0].data;

        expect(dataParams.aumfs).to.exist;
        expect(dataParams.aumfs).to.equal('1500');
      });

      context('with floors module', function () {
        let adServerCurrencyStub;
        function makeBidWithFloorInfo(floorInfo) {
          return Object.assign(utils.deepClone(bidRequestsWithMediaTypes[0]),
            {
              getFloor: () => {
                return floorInfo;
              }
            });
        }

        beforeEach(function () {
          adServerCurrencyStub = sinon
            .stub(config, 'getConfig')
            .withArgs('currency.adServerCurrency')
        });

        afterEach(function () {
          config.getConfig.restore();
        });

        it('should send out floors on bids', function () {
          const floors = [9.99, 18.881];
          const bidRequests = floors.map(floor => {
            return makeBidWithFloorInfo({
              currency: 'AUS',
              floor: floor
            });
          });
          const request = spec.buildRequests(bidRequests, mockBidderRequest);

          expect(request[0].data.aumfs).to.exist;
          expect(request[0].data.aumfs).to.equal('9990');
          expect(request[1].data.aumfs).to.exist;
          expect(request[1].data.aumfs).to.equal('18881');
        });

        it('should send out floors on bids in the default currency', function () {
          const bidRequest1 = makeBidWithFloorInfo({});

          let getFloorSpy = sinon.spy(bidRequest1, 'getFloor');

          spec.buildRequests([bidRequest1], mockBidderRequest);
          expect(getFloorSpy.args[0][0].mediaType).to.equal(VIDEO);
          expect(getFloorSpy.args[0][0].currency).to.equal('USD');
        });

        it('should send out floors on bids in the ad server currency if defined', function () {
          adServerCurrencyStub.returns('bitcoin');

          const bidRequest1 = makeBidWithFloorInfo({});

          let getFloorSpy = sinon.spy(bidRequest1, 'getFloor');

          spec.buildRequests([bidRequest1], mockBidderRequest);
          expect(getFloorSpy.args[0][0].mediaType).to.equal(VIDEO);
          expect(getFloorSpy.args[0][0].currency).to.equal('bitcoin');
        });
      })
    })
  });

  describe('buildRequest for multi-format ad', function () {
    const multiformatBid = MULTI_FORMAT_BID_REQUESTS[0];
    let mockBidderRequest = {refererInfo: {}};

    it('should default to a banner request', function () {
      const request = spec.buildRequests([multiformatBid], mockBidderRequest);
      const dataParams = request[0].data;

      expect(dataParams.divids).to.have.string(multiformatBid.adUnitCode);
    });
  });

  describe('buildRequests for all kinds of ads', function () {
    utils._each({
      banner: BANNER_BID_REQUESTS_WITH_MEDIA_TYPES[0],
      video: VIDEO_BID_REQUESTS_WITH_MEDIA_TYPES[0],
      multi: MULTI_FORMAT_BID_REQUESTS[0]
    }, (bidRequest, name) => {
      describe('with segments', function () {
        const TESTS = [
          {
            name: 'should send proprietary segment data from ortb2.user.data',
            config: {
              ortb2: {
                user: {
                  data: [
                    {name: 'dmp1', ext: {segtax: 4}, segment: [{id: 'foo'}, {id: 'bar'}]},
                    {name: 'dmp2', segment: [{id: 'baz'}]},
                  ]
                }
              }
            },
            expect: {sm: 'dmp1/4:foo|bar,dmp2:baz'},
          },
          {
            name: 'should send proprietary segment data from ortb2.site.content.data',
            config: {
              ortb2: {
                site: {
                  content: {
                    data: [
                      {name: 'dmp1', ext: {segtax: 4}, segment: [{id: 'foo'}, {id: 'bar'}]},
                      {name: 'dmp2', segment: [{id: 'baz'}]},
                    ]
                  }
                }
              }
            },
            expect: {scsm: 'dmp1/4:foo|bar,dmp2:baz'},
          },
          {
            name: 'should send proprietary segment data from both ortb2.site.content.data and ortb2.user.data',
            config: {
              ortb2: {
                user: {
                  data: [
                    {name: 'dmp1', ext: {segtax: 4}, segment: [{id: 'foo'}, {id: 'bar'}]},
                    {name: 'dmp2', segment: [{id: 'baz'}]},
                  ]
                },
                site: {
                  content: {
                    data: [
                      {name: 'dmp3', ext: {segtax: 5}, segment: [{id: 'foo2'}, {id: 'bar2'}]},
                      {name: 'dmp4', segment: [{id: 'baz2'}]},
                    ]
                  }
                }
              }
            },
            expect: {
              sm: 'dmp1/4:foo|bar,dmp2:baz',
              scsm: 'dmp3/5:foo2|bar2,dmp4:baz2'
            },
          },
          {
            name: 'should combine same provider segment data from ortb2.user.data',
            config: {
              ortb2: {
                user: {
                  data: [
                    {name: 'dmp1', ext: {segtax: 4}, segment: [{id: 'foo'}, {id: 'bar'}]},
                    {name: 'dmp1', ext: {}, segment: [{id: 'baz'}]},
                  ]
                }
              }
            },
            expect: {sm: 'dmp1/4:foo|bar,dmp1:baz'},
          },
          {
            name: 'should combine same provider segment data from ortb2.site.content.data',
            config: {
              ortb2: {
                site: {
                  content: {
                    data: [
                      {name: 'dmp1', ext: {segtax: 4}, segment: [{id: 'foo'}, {id: 'bar'}]},
                      {name: 'dmp1', ext: {}, segment: [{id: 'baz'}]},
                    ]
                  }
                }
              }
            },
            expect: {scsm: 'dmp1/4:foo|bar,dmp1:baz'},
          },
          {
            name: 'should not send any segment data if first party config is incomplete',
            config: {
              ortb2: {
                user: {
                  data: [
                    {name: 'provider-with-no-segments'},
                    {segment: [{id: 'segments-with-no-provider'}]},
                    {},
                  ]
                }
              }
            }
          },
          {
            name: 'should send first party data segments and liveintent segments from request',
            config: {
              ortb2: {
                user: {
                  data: [
                    {name: 'dmp1', segment: [{id: 'foo'}, {id: 'bar'}]},
                    {name: 'dmp2', segment: [{id: 'baz'}]},
                  ]
                },
                site: {
                  content: {
                    data: [
                      {name: 'dmp3', ext: {segtax: 5}, segment: [{id: 'foo2'}, {id: 'bar2'}]},
                      {name: 'dmp4', segment: [{id: 'baz2'}]},
                    ]
                  }
                }
              }
            },
            request: {
              userId: {
                lipb: {
                  lipbid: 'aaa',
                  segments: ['l1', 'l2']
                },
              },
            },
            expect: {
              sm: 'dmp1:foo|bar,dmp2:baz,liveintent:l1|l2',
              scsm: 'dmp3/5:foo2|bar2,dmp4:baz2'
            },
          },
          {
            name: 'should send just liveintent segment from request if no first party config',
            config: {},
            request: {
              userId: {
                lipb: {
                  lipbid: 'aaa',
                  segments: ['l1', 'l2']
                },
              },
            },
            expect: {sm: 'liveintent:l1|l2'},
          },
          {
            name: 'should send nothing if lipb section does not contain segments',
            config: {},
            request: {
              userId: {
                lipb: {
                  lipbid: 'aaa',
                },
              },
            },
          },
        ];
        utils._each(TESTS, (t) => {
          context('in ortb2.user.data', function () {
            let bidRequests;
            beforeEach(function () {
              let fpdConfig = t.config
              sinon
                .stub(config, 'getConfig')
                .withArgs(sinon.match(/^ortb2\.user\.data$|^ortb2\.site\.content\.data$/))
                .callsFake((key) => {
                  return utils.deepAccess(fpdConfig, key);
                });
              bidRequests = [{...bidRequest, ...t.request}];
            });

            afterEach(function () {
              config.getConfig.restore();
            });

            const mockBidderRequest = {refererInfo: {}};
            it(`${t.name} for type ${name}`, function () {
              const request = spec.buildRequests(bidRequests, mockBidderRequest)
              expect(request.length).to.equal(1);
              if (t.expect) {
                for (const key in t.expect) {
                  expect(request[0].data[key]).to.exist;
                  expect(request[0].data[key]).to.equal(t.expect[key]);
                }
              } else {
                expect(request[0].data.sm).to.not.exist;
                expect(request[0].data.scsm).to.not.exist;
              }
            });
          });
        });
      });
    });
  })

  describe('interpretResponse for banner ads', function () {
    beforeEach(function () {
      sinon.spy(userSync, 'registerSync');
    });

    afterEach(function () {
      userSync.registerSync.restore();
    });

    describe('when there is a standard response', function () {
      const creativeOverride = {
        id: 234,
        width: '300',
        height: '250',
        tracking: {
          impression: 'https://openx-d.openx.net/v/1.0/ri?ts=ts'
        }
      };

      const adUnitOverride = {
        ts: 'test-1234567890-ts',
        idx: '0',
        currency: 'USD',
        pub_rev: '10000',
        html: '<div>OpenX Ad</div>'
      };
      let adUnit;
      let bidResponse;

      let bid;
      let bidRequest;
      let bidRequestConfigs;

      beforeEach(function () {
        bidRequestConfigs = [{
          'bidder': 'openx',
          'params': {
            'unit': '12345678',
            'delDomain': 'test-del-domain'
          },
          'adUnitCode': 'adunit-code',
          'mediaType': 'banner',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475'
        }];

        bidRequest = {
          method: 'GET',
          url: 'https://openx-d.openx.net/v/1.0/arj',
          data: {},
          payload: {'bids': bidRequestConfigs, 'startTime': new Date()}
        };

        adUnit = mockAdUnit(adUnitOverride, creativeOverride);
        bidResponse = mockArjResponse(undefined, [adUnit]);
        bid = spec.interpretResponse({body: bidResponse}, bidRequest)[0];
      });

      it('should return a price', function () {
        expect(bid.cpm).to.equal(parseInt(adUnitOverride.pub_rev, 10) / 1000);
      });

      it('should return a request id', function () {
        expect(bid.requestId).to.equal(bidRequest.payload.bids[0].bidId);
      });

      it('should return width and height for the creative', function () {
        expect(bid.width).to.equal(creativeOverride.width);
        expect(bid.height).to.equal(creativeOverride.height);
      });

      it('should return a creativeId', function () {
        expect(bid.creativeId).to.equal(creativeOverride.id);
      });

      it('should return an ad', function () {
        expect(bid.ad).to.equal(adUnitOverride.html);
      });

      it('should have a time-to-live of 5 minutes', function () {
        expect(bid.ttl).to.equal(300);
      });

      it('should always return net revenue', function () {
        expect(bid.netRevenue).to.equal(true);
      });

      it('should return a currency', function () {
        expect(bid.currency).to.equal(adUnitOverride.currency);
      });

      it('should return a transaction state', function () {
        expect(bid.ts).to.equal(adUnitOverride.ts);
      });

      it('should return a brand ID', function () {
        expect(bid.meta.brandId).to.equal(DEFAULT_TEST_ARJ_AD_UNIT.brand_id);
      });

      it('should return an adomain', function () {
        expect(bid.meta.advertiserDomains).to.deep.equal([]);
      });

      it('should return a dsp ID', function () {
        expect(bid.meta.dspid).to.equal(DEFAULT_TEST_ARJ_AD_UNIT.adv_id);
      });
    });

    describe('when there is a deal', function () {
      const adUnitOverride = {
        deal_id: 'ox-1000'
      };
      let adUnit;
      let bidResponse;

      let bid;
      let bidRequestConfigs;
      let bidRequest;

      beforeEach(function () {
        bidRequestConfigs = [{
          'bidder': 'openx',
          'params': {
            'unit': '12345678',
            'delDomain': 'test-del-domain'
          },
          'adUnitCode': 'adunit-code',
          'mediaType': 'banner',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475'
        }];

        bidRequest = {
          method: 'GET',
          url: 'https://openx-d.openx.net/v/1.0/arj',
          data: {},
          payload: {'bids': bidRequestConfigs, 'startTime': new Date()}
        };
        adUnit = mockAdUnit(adUnitOverride);
        bidResponse = mockArjResponse(null, [adUnit]);
        bid = spec.interpretResponse({body: bidResponse}, bidRequest)[0];
        mockArjResponse();
      });

      it('should return a deal id', function () {
        expect(bid.dealId).to.equal(adUnitOverride.deal_id);
      });
    });

    describe('when there is no bids in the response', function () {
      let bidRequest;
      let bidRequestConfigs;

      beforeEach(function () {
        bidRequestConfigs = [{
          'bidder': 'openx',
          'params': {
            'unit': '12345678',
            'delDomain': 'test-del-domain'
          },
          'adUnitCode': 'adunit-code',
          'mediaType': 'banner',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475'
        }];

        bidRequest = {
          method: 'GET',
          url: 'https://openx-d.openx.net/v/1.0/arj',
          data: {},
          payload: {'bids': bidRequestConfigs, 'startTime': new Date()}
        };
      });

      it('handles nobid responses', function () {
        const bidResponse = {
          'ads':
            {
              'version': 1,
              'count': 1,
              'pixels': 'https://testpixels.net',
              'ad': []
            }
        };

        const result = spec.interpretResponse({body: bidResponse}, bidRequest);
        expect(result.length).to.equal(0);
      });
    });

    describe('when adunits return out of order', function () {
      const bidRequests = [{
        bidder: 'openx',
        params: {
          unit: '12345678',
          delDomain: 'test-del-domain'
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[100, 111]]
          }
        },
        bidId: 'test-bid-request-id-1',
        bidderRequestId: 'test-request-1',
        auctionId: 'test-auction-id-1'
      }, {
        bidder: 'openx',
        params: {
          unit: '12345678',
          delDomain: 'test-del-domain'
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[200, 222]]
          }
        },
        bidId: 'test-bid-request-id-2',
        bidderRequestId: 'test-request-1',
        auctionId: 'test-auction-id-1'
      }, {
        bidder: 'openx',
        params: {
          unit: '12345678',
          delDomain: 'test-del-domain'
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[300, 333]]
          }
        },
        'bidId': 'test-bid-request-id-3',
        'bidderRequestId': 'test-request-1',
        'auctionId': 'test-auction-id-1'
      }];
      const bidRequest = {
        method: 'GET',
        url: 'https://openx-d.openx.net/v/1.0/arj',
        data: {},
        payload: {'bids': bidRequests, 'startTime': new Date()}
      };

      let outOfOrderAdunits = [
        mockAdUnit({
          idx: '1'
        }, {
          width: bidRequests[1].mediaTypes.banner.sizes[0][0],
          height: bidRequests[1].mediaTypes.banner.sizes[0][1]
        }),
        mockAdUnit({
          idx: '2'
        }, {
          width: bidRequests[2].mediaTypes.banner.sizes[0][0],
          height: bidRequests[2].mediaTypes.banner.sizes[0][1]
        }),
        mockAdUnit({
          idx: '0'
        }, {
          width: bidRequests[0].mediaTypes.banner.sizes[0][0],
          height: bidRequests[0].mediaTypes.banner.sizes[0][1]
        })
      ];

      let bidResponse = mockArjResponse(undefined, outOfOrderAdunits);

      it('should return map adunits back to the proper request', function () {
        const bids = spec.interpretResponse({body: bidResponse}, bidRequest);
        expect(bids[0].requestId).to.equal(bidRequests[1].bidId);
        expect(bids[0].width).to.equal(bidRequests[1].mediaTypes.banner.sizes[0][0]);
        expect(bids[0].height).to.equal(bidRequests[1].mediaTypes.banner.sizes[0][1]);
        expect(bids[1].requestId).to.equal(bidRequests[2].bidId);
        expect(bids[1].width).to.equal(bidRequests[2].mediaTypes.banner.sizes[0][0]);
        expect(bids[1].height).to.equal(bidRequests[2].mediaTypes.banner.sizes[0][1]);
        expect(bids[2].requestId).to.equal(bidRequests[0].bidId);
        expect(bids[2].width).to.equal(bidRequests[0].mediaTypes.banner.sizes[0][0]);
        expect(bids[2].height).to.equal(bidRequests[0].mediaTypes.banner.sizes[0][1]);
      });
    });
  });

  describe('interpretResponse for video ads', function () {
    beforeEach(function () {
      sinon.spy(userSync, 'registerSync');
    });

    afterEach(function () {
      userSync.registerSync.restore();
    });

    const bidsWithMediaTypes = [{
      'bidder': 'openx',
      'mediaTypes': {video: {}},
      'params': {
        'unit': '12345678',
        'delDomain': 'test-del-domain'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [640, 480],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'transactionId': '4008d88a-8137-410b-aa35-fbfdabcb478e'
    }];
    const bidsWithMediaType = [{
      'bidder': 'openx',
      'mediaType': 'video',
      'params': {
        'unit': '12345678',
        'delDomain': 'test-del-domain'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [640, 480],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'transactionId': '4008d88a-8137-410b-aa35-fbfdabcb478e'
    }];
    const bidRequestsWithMediaTypes = {
      method: 'GET',
      url: 'https://openx-d.openx.net/v/1.0/avjp',
      data: {},
      payload: {'bid': bidsWithMediaTypes[0], 'startTime': new Date()}
    };
    const bidRequestsWithMediaType = {
      method: 'GET',
      url: 'https://openx-d.openx.net/v/1.0/avjp',
      data: {},
      payload: {'bid': bidsWithMediaType[0], 'startTime': new Date()}
    };
    const bidResponse = {
      'pub_rev': '1000',
      'width': '640',
      'height': '480',
      'adid': '5678',
      'currency': 'AUD',
      'vastUrl': 'https://testvast.com',
      'pixels': 'https://testpixels.net'
    };

    it('should return correct bid response with MediaTypes', function () {
      const expectedResponse = {
        'requestId': '30b31c1838de1e',
        'cpm': 1,
        'width': 640,
        'height': 480,
        'mediaType': 'video',
        'creativeId': '5678',
        'vastUrl': 'https://testvast.com',
        'ttl': 300,
        'netRevenue': true,
        'currency': 'AUD'
      };

      const result = spec.interpretResponse({body: bidResponse}, bidRequestsWithMediaTypes);
      expect(result[0]).to.eql(expectedResponse);
    });

    it('should return correct bid response with MediaType', function () {
      const expectedResponse = [
        {
          'requestId': '30b31c1838de1e',
          'cpm': 1,
          'width': '640',
          'height': '480',
          'mediaType': 'video',
          'creativeId': '5678',
          'vastUrl': 'https://testvast.com',
          'ttl': 300,
          'netRevenue': true,
          'currency': 'USD'
        }
      ];

      const result = spec.interpretResponse({body: bidResponse}, bidRequestsWithMediaType);
      expect(JSON.stringify(Object.keys(result[0]).sort())).to.eql(JSON.stringify(Object.keys(expectedResponse[0]).sort()));
    });

    it('should return correct bid response with MediaType and deal_id', function () {
      const bidResponseOverride = { 'deal_id': 'OX-mydeal' };
      const bidResponseWithDealId = Object.assign({}, bidResponse, bidResponseOverride);
      const result = spec.interpretResponse({body: bidResponseWithDealId}, bidRequestsWithMediaType);
      expect(result[0].dealId).to.equal(bidResponseOverride.deal_id);
    });

    it('should handle nobid responses for bidRequests with MediaTypes', function () {
      const bidResponse = {'vastUrl': '', 'pub_rev': '', 'width': '', 'height': '', 'adid': '', 'pixels': ''};
      const result = spec.interpretResponse({body: bidResponse}, bidRequestsWithMediaTypes);
      expect(result.length).to.equal(0);
    });

    it('should handle nobid responses for bidRequests with MediaType', function () {
      const bidResponse = {'vastUrl': '', 'pub_rev': '', 'width': '', 'height': '', 'adid': '', 'pixels': ''};
      const result = spec.interpretResponse({body: bidResponse}, bidRequestsWithMediaType);
      expect(result.length).to.equal(0);
    });
  });

  describe('user sync', function () {
    const syncUrl = 'https://testpixels.net';

    describe('iframe sync', function () {
      it('should register the pixel iframe from banner ad response', function () {
        let syncs = spec.getUserSyncs(
          {iframeEnabled: true},
          [{body: {ads: {pixels: syncUrl}}}]
        );
        expect(syncs).to.deep.equal([{type: 'iframe', url: syncUrl}]);
      });

      it('should register the pixel iframe from video ad response', function () {
        let syncs = spec.getUserSyncs(
          {iframeEnabled: true},
          [{body: {pixels: syncUrl}}]
        );
        expect(syncs).to.deep.equal([{type: 'iframe', url: syncUrl}]);
      });

      it('should register the default iframe if no pixels available', function () {
        let syncs = spec.getUserSyncs(
          {iframeEnabled: true},
          []
        );
        expect(syncs).to.deep.equal([{type: 'iframe', url: 'https://u.openx.net/w/1.0/pd'}]);
      });
    });

    describe('pixel sync', function () {
      it('should register the image pixel from banner ad response', function () {
        let syncs = spec.getUserSyncs(
          {pixelEnabled: true},
          [{body: {ads: {pixels: syncUrl}}}]
        );
        expect(syncs).to.deep.equal([{type: 'image', url: syncUrl}]);
      });

      it('should register the image pixel from video ad response', function () {
        let syncs = spec.getUserSyncs(
          {pixelEnabled: true},
          [{body: {pixels: syncUrl}}]
        );
        expect(syncs).to.deep.equal([{type: 'image', url: syncUrl}]);
      });

      it('should register the default image pixel if no pixels available', function () {
        let syncs = spec.getUserSyncs(
          {pixelEnabled: true},
          []
        );
        expect(syncs).to.deep.equal([{type: 'image', url: 'https://u.openx.net/w/1.0/pd'}]);
      });
    });

    it('should prioritize iframe over image for user sync', function () {
      let syncs = spec.getUserSyncs(
        {iframeEnabled: true, pixelEnabled: true},
        [{body: {ads: {pixels: syncUrl}}}]
      );
      expect(syncs).to.deep.equal([{type: 'iframe', url: syncUrl}]);
    });

    describe('when gdpr applies', function () {
      let gdprConsent;
      let gdprPixelUrl;
      beforeEach(() => {
        gdprConsent = {
          consentString: 'test-gdpr-consent-string',
          gdprApplies: true
        };

        gdprPixelUrl = 'https://testpixels.net?gdpr=1&gdpr_consent=gdpr-pixel-consent'
      });

      it('when there is a response, it should have the gdpr query params', () => {
        let [{url}] = spec.getUserSyncs(
          {iframeEnabled: true, pixelEnabled: true},
          [{body: {ads: {pixels: gdprPixelUrl}}}],
          gdprConsent
        );

        expect(url).to.have.string('gdpr_consent=gdpr-pixel-consent');
        expect(url).to.have.string('gdpr=1');
      });

      it('when there is no response, it should append gdpr query params', () => {
        let [{url}] = spec.getUserSyncs(
          {iframeEnabled: true, pixelEnabled: true},
          [],
          gdprConsent
        );
        expect(url).to.have.string('gdpr_consent=test-gdpr-consent-string');
        expect(url).to.have.string('gdpr=1');
      });

      it('should not send signals if no consent object is available', function () {
        let [{url}] = spec.getUserSyncs(
          {iframeEnabled: true, pixelEnabled: true},
          [],
        );
        expect(url).to.not.have.string('gdpr_consent=');
        expect(url).to.not.have.string('gdpr=');
      });
    });

    describe('when ccpa applies', function () {
      let usPrivacyConsent;
      let uspPixelUrl;
      beforeEach(() => {
        usPrivacyConsent = 'TEST';
        uspPixelUrl = 'https://testpixels.net?us_privacy=AAAA'
      });
      it('when there is a response, it should send the us privacy string from the response, ', () => {
        let [{url}] = spec.getUserSyncs(
          {iframeEnabled: true, pixelEnabled: true},
          [{body: {ads: {pixels: uspPixelUrl}}}],
          undefined,
          usPrivacyConsent
        );

        expect(url).to.have.string('us_privacy=AAAA');
      });
      it('when there is no response, it send have the us privacy string', () => {
        let [{url}] = spec.getUserSyncs(
          {iframeEnabled: true, pixelEnabled: true},
          [],
          undefined,
          usPrivacyConsent
        );
        expect(url).to.have.string(`us_privacy=${usPrivacyConsent}`);
      });

      it('should not send signals if no consent string is available', function () {
        let [{url}] = spec.getUserSyncs(
          {iframeEnabled: true, pixelEnabled: true},
          [],
        );
        expect(url).to.not.have.string('us_privacy=');
      });
    });
  });

  /**
   * Makes sure the override object does not introduce
   * new fields against the contract
   *
   * This does a shallow check in order to make key checking simple
   * with respect to what a helper handles.  For helpers that have
   * nested fields, either check your design on maybe breaking it up
   * to smaller, manageable pieces
   *
   * OR just call this on your nth level field if necessary.
   *
   * @param {Object} override Object with keys that overrides the default
   * @param {Object} contract Original object contains the default fields
   * @param {string} typeName Name of the type we're checking for error messages
   * @throws {AssertionError}
   */
  function overrideKeyCheck(override, contract, typeName) {
    expect(contract).to.include.all.keys(Object.keys(override));
  }

  /**
   * Creates a mock ArjResponse
   * @param {OxArjResponse=} response
   * @param {Array<OxArjAdUnit>=} adUnits
   * @throws {AssertionError}
   * @return {OxArjResponse}
   */
  function mockArjResponse(response, adUnits = []) {
    let mockedArjResponse = utils.deepClone(DEFAULT_ARJ_RESPONSE);

    if (response) {
      overrideKeyCheck(response, DEFAULT_ARJ_RESPONSE, 'OxArjResponse');
      overrideKeyCheck(response.ads, DEFAULT_ARJ_RESPONSE.ads, 'OxArjResponse');
      Object.assign(mockedArjResponse, response);
    }

    if (adUnits.length) {
      mockedArjResponse.ads.count = adUnits.length;
      mockedArjResponse.ads.ad = adUnits.map((adUnit) => {
        overrideKeyCheck(adUnit, DEFAULT_TEST_ARJ_AD_UNIT, 'OxArjAdUnit');
        return Object.assign(utils.deepClone(DEFAULT_TEST_ARJ_AD_UNIT), adUnit);
      });
    }

    return mockedArjResponse;
  }

  /**
   * Creates a mock ArjAdUnit
   * @param {OxArjAdUnit=} adUnit
   * @param {OxArjCreative=} creative
   * @throws {AssertionError}
   * @return {OxArjAdUnit}
   */
  function mockAdUnit(adUnit, creative) {
    overrideKeyCheck(adUnit, DEFAULT_TEST_ARJ_AD_UNIT, 'OxArjAdUnit');

    let mockedAdUnit = Object.assign(utils.deepClone(DEFAULT_TEST_ARJ_AD_UNIT), adUnit);

    if (creative) {
      overrideKeyCheck(creative, DEFAULT_TEST_ARJ_CREATIVE);
      if (creative.tracking) {
        overrideKeyCheck(creative.tracking, DEFAULT_TEST_ARJ_CREATIVE.tracking, 'OxArjCreative');
      }
      Object.assign(mockedAdUnit.creative[0], creative);
    }

    return mockedAdUnit;
  }
})
;
