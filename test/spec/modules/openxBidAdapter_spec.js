import {expect} from 'chai';
import {spec, resetBoPixel} from 'modules/openxBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';
import {userSync} from 'src/userSync';
import {config} from 'src/config';
import * as utils from 'src/utils';

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
      pixels: 'http://testpixels.net',
      ad: [DEFAULT_TEST_ARJ_AD_UNIT]
    }
  };

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

    describe('when request is for a video ad', function () {
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
        expect(spec.isBidRequestValid(videoBidWithMediaTypes)).to.equal(true);
      });

      it('should return false when required params are not passed', function () {
        let videoBidWithMediaTypes = Object.assign({}, videoBidWithMediaTypes);
        videoBidWithMediaTypes.params = {};
        expect(spec.isBidRequestValid(videoBidWithMediaTypes)).to.equal(false);
      });

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
  });

  describe('buildRequests for banner ads', function () {
    const bidRequestsWithMediaType = [{
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
    const bidRequestsWithMediaTypes = [{
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
    const bidRequestsWithPlatform = [{
      'bidder': 'openx',
      'params': {
        'unit': '11',
        'platform': '1cabba9e-cafe-3665-beef-f00f00f00f00',
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
        'platform': '1cabba9e-cafe-3665-beef-f00f00f00f00',
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
    const bidRequestsWithPlatformAndDelDomain = [{
      'bidder': 'openx',
      'params': {
        'unit': '11',
        'delDomain': 'test-del-domain',
        'platform': '1cabba9e-cafe-3665-beef-f00f00f00f00',
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
        'platform': '1cabba9e-cafe-3665-beef-f00f00f00f00',
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

    it('should send bid request to openx url via GET, with mediaType specified as banner', function () {
      const request = spec.buildRequests(bidRequestsWithMediaType);
      expect(request[0].url).to.equal('//' + bidRequestsWithMediaType[0].params.delDomain + URLBASE);
      expect(request[0].data.ph).to.be.undefined;
      expect(request[0].method).to.equal('GET');
    });

    it('should send bid request to openx url via GET, with mediaTypes specified with banner type', function () {
      const request = spec.buildRequests(bidRequestsWithMediaTypes);
      expect(request[0].url).to.equal('//' + bidRequestsWithMediaTypes[0].params.delDomain + URLBASE);
      expect(request[0].data.ph).to.be.undefined;
      expect(request[0].method).to.equal('GET');
    });

    it('should send bid request to openx platform url via GET, if platform is present', function () {
      const request = spec.buildRequests(bidRequestsWithPlatform);
      expect(request[0].url).to.equal(`//u.openx.net${URLBASE}`);
      expect(request[0].data.ph).to.equal(bidRequestsWithPlatform[0].params.platform);
      expect(request[0].method).to.equal('GET');
    });

    it('should send bid request to openx platform url via GET, if both params present', function () {
      const request = spec.buildRequests(bidRequestsWithPlatformAndDelDomain);
      expect(request[0].url).to.equal(`//u.openx.net${URLBASE}`);
      expect(request[0].data.ph).to.equal(bidRequestsWithPlatform[0].params.platform);
      expect(request[0].method).to.equal('GET');
    });

    it('should send the adunit codes', function () {
      const request = spec.buildRequests(bidRequestsWithMediaTypes);
      expect(request[0].data.divIds).to.equal(`${encodeURIComponent(bidRequestsWithMediaTypes[0].adUnitCode)},${encodeURIComponent(bidRequestsWithMediaTypes[1].adUnitCode)}`);
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
      const request = spec.buildRequests(bidRequestsWithUnitIds);
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
      const request = spec.buildRequests(bidRequestsWithoutUnitIds);
      expect(request[0].data).to.not.have.any.keys('auid');
    });

    describe('when there is a legacy request with no media type', function () {
      const deprecatedBidRequestsFormatWithNoMediaType = [{
        'bidder': 'openx',
        'params': {
          'unit': '12345678',
          'delDomain': 'test-del-domain'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475'
      }];

      let requestData;

      beforeEach(function () {
        requestData = spec.buildRequests(deprecatedBidRequestsFormatWithNoMediaType)[0].data;
      });

      it('should have an ad unit id', function () {
        expect(requestData.auid).to.equal('12345678');
      });

      it('should have ad sizes', function () {
        expect(requestData.aus).to.equal('300x250,300x600');
      });
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

      const request = spec.buildRequests([bidRequest]);
      const dataParams = request[0].data;

      expect(dataParams.tps).to.exist;
      expect(dataParams.tps).to.equal(btoa('test1=testval1.&test2=testval2_,testval3'));
    });

    it('should send out custom floors on bids that have customFloors specified', function () {
      const bidRequest = Object.assign({},
        bidRequestsWithMediaTypes[0],
        {
          params: {
            'unit': '12345678',
            'delDomain': 'test-del-domain',
            'customFloor': 1.5
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const dataParams = request[0].data;

      expect(dataParams.aumfs).to.exist;
      expect(dataParams.aumfs).to.equal('1500');
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

      const request = spec.buildRequests([bidRequest]);
      const dataParams = request[0].data;

      expect(dataParams.bc).to.exist;
      expect(dataParams.bc).to.equal('hb_override');
    });

    it('should not send any consent management properties', function () {
      const request = spec.buildRequests(bidRequestsWithMediaTypes);
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

      describe('when GDPR applies', function () {
        beforeEach(function () {
          bidderRequest = {
            gdprConsent: {
              consentString: 'test-gdpr-consent-string',
              gdprApplies: true
            }
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
            }
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
            }
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
      const request = spec.buildRequests(bidRequestsWithoutCoppa);
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
      const request = spec.buildRequests(bidRequestsWithCoppa);
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
      const request = spec.buildRequests(bidRequestsWithoutDnt);
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
      const request = spec.buildRequests(bidRequestsWithDnt);
      expect(request[0].data.ns).to.equal(1);
    });

    describe('publisher common id query param', function() {
      it('should not send a pubcid query param when there is no crumbs.pubcid defined in the bid requests', function () {
        const request = spec.buildRequests(bidRequestsWithMediaType);
        expect(request[0].data).to.not.have.any.keys('pubcid');
      });

      it('should send a pubcid query param when crumbs.pubcid is defined in the bid requests', function () {
        const bidRequestsWithPubcid = [{
          bidder: 'openx',
          params: {
            unit: '11',
            delDomain: 'test-del-domain'
          },
          crumbs: {
            pubcid: 'c4a4c843-2368-4b5e-b3b1-6ee4702b9ad6'
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
        const request = spec.buildRequests(bidRequestsWithPubcid);
        expect(request[0].data.pubcid).to.equal('c4a4c843-2368-4b5e-b3b1-6ee4702b9ad6');
      });
    })
  });

  describe('buildRequests for video', function () {
    const bidRequestsWithMediaTypes = [{
      'bidder': 'openx',
      'mediaTypes': {
        video: {
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
    }];

    const bidRequestsWithMediaType = [{
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

    it('should send bid request to openx url via GET, with mediaType as video', function () {
      const request = spec.buildRequests(bidRequestsWithMediaType);
      expect(request[0].url).to.equal('//' + bidRequestsWithMediaType[0].params.delDomain + URLBASEVIDEO);
      expect(request[0].method).to.equal('GET');
    });

    it('should send bid request to openx url via GET, with mediaTypes having video parameter', function () {
      const request = spec.buildRequests(bidRequestsWithMediaTypes);
      expect(request[0].url).to.equal('//' + bidRequestsWithMediaTypes[0].params.delDomain + URLBASEVIDEO);
      expect(request[0].method).to.equal('GET');
    });

    it('should have the correct parameters', function () {
      const request = spec.buildRequests(bidRequestsWithMediaTypes);
      const dataParams = request[0].data;

      expect(dataParams.auid).to.equal('12345678');
      expect(dataParams.vht).to.equal(480);
      expect(dataParams.vwd).to.equal(640);
    });

    it('should send a bc parameter', function () {
      const request = spec.buildRequests(bidRequestsWithMediaTypes);
      const dataParams = request[0].data;

      expect(dataParams.bc).to.have.string('hb_pb');
    });

    describe('when using the video param', function () {
      let videoBidRequest;

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
        }
      });

      it('should not allow you to set a url', function () {
        videoBidRequest.params.video = {
          url: 'test-url'
        };
        const request = spec.buildRequests([videoBidRequest]);

        expect(request[0].data.url).to.be.undefined;
      });

      it('should not allow you to override the javascript url', function () {
        let myUrl = 'my-url';
        videoBidRequest.params.video = {
          ju: myUrl
        };
        const request = spec.buildRequests([videoBidRequest]);

        expect(request[0].data.ju).to.not.equal(myUrl);
      });

      describe('when using the openRtb param', function () {
        it('should covert the param to a JSON string', function () {
          let myOpenRTBObject = {};
          videoBidRequest.params.video = {
            openrtb: myOpenRTBObject
          };
          const request = spec.buildRequests([videoBidRequest]);

          expect(request[0].data.openrtb).to.equal(JSON.stringify(myOpenRTBObject));
        });

        it("should use the bidRequest's playerSize when it is available", function () {
          const width = 200;
          const height = 100;
          const myOpenRTBObject = {v: height, w: width};
          videoBidRequest.params.video = {
            openrtb: myOpenRTBObject
          };
          const request = spec.buildRequests([videoBidRequest]);
          const openRtbRequestParams = JSON.parse(request[0].data.openrtb);

          expect(openRtbRequestParams.w).to.not.equal(width);
          expect(openRtbRequestParams.v).to.not.equal(height);
        });

        it('should use the the openRTB\'s sizing when the bidRequest\'s playerSize is not available', function () {
          const width = 200;
          const height = 100;
          const myOpenRTBObject = {v: height, w: width};
          videoBidRequest.params.video = {
            openrtb: myOpenRTBObject
          };
          videoBidRequest.mediaTypes.video.playerSize = undefined;

          const request = spec.buildRequests([videoBidRequest]);
          const openRtbRequestParams = JSON.parse(request[0].data.openrtb);

          expect(openRtbRequestParams.w).to.equal(width);
          expect(openRtbRequestParams.v).to.equal(height);
        });
      });
    });
  });

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
          impression: 'http://openx-d.openx.net/v/1.0/ri?ts=ts'
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
          url: '//openx-d.openx.net/v/1.0/arj',
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

      it('should register a beacon', function () {
        resetBoPixel();
        spec.interpretResponse({body: bidResponse}, bidRequest);
        sinon.assert.calledWith(userSync.registerSync, 'image', 'openx', sinon.match(new RegExp(`\/\/openx-d\.openx\.net.*\/bo\?.*ts=${adUnitOverride.ts}`)));
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
          url: '//openx-d.openx.net/v/1.0/arj',
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
          url: '//openx-d.openx.net/v/1.0/arj',
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
              'pixels': 'http://testpixels.net',
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
        url: '//openx-d.openx.net/v/1.0/arj',
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
      url: '//openx-d.openx.net/v/1.0/avjp',
      data: {},
      payload: {'bid': bidsWithMediaTypes[0], 'startTime': new Date()}
    };
    const bidRequestsWithMediaType = {
      method: 'GET',
      url: '//openx-d.openx.net/v/1.0/avjp',
      data: {},
      payload: {'bid': bidsWithMediaType[0], 'startTime': new Date()}
    };
    const bidResponse = {
      'pub_rev': '1',
      'width': '640',
      'height': '480',
      'adid': '5678',
      'vastUrl': 'http://testvast.com/vastpath?colo=http://test-colo.com&ph=test-ph&ts=test-ts',
      'pixels': 'http://testpixels.net'
    };

    it('should return correct bid response with MediaTypes', function () {
      const expectedResponse = [
        {
          'requestId': '30b31c1838de1e',
          'bidderCode': 'openx',
          'cpm': 1,
          'width': '640',
          'height': '480',
          'mediaType': 'video',
          'creativeId': '5678',
          'vastUrl': 'http://testvast.com',
          'ttl': 300,
          'netRevenue': true,
          'currency': 'USD'
        }
      ];

      const result = spec.interpretResponse({body: bidResponse}, bidRequestsWithMediaTypes);
      expect(JSON.stringify(Object.keys(result[0]).sort())).to.eql(JSON.stringify(Object.keys(expectedResponse[0]).sort()));
    });

    it('should return correct bid response with MediaType', function () {
      const expectedResponse = [
        {
          'requestId': '30b31c1838de1e',
          'bidderCode': 'openx',
          'cpm': 1,
          'width': '640',
          'height': '480',
          'mediaType': 'video',
          'creativeId': '5678',
          'vastUrl': 'http://testvast.com',
          'ttl': 300,
          'netRevenue': true,
          'currency': 'USD'
        }
      ];

      const result = spec.interpretResponse({body: bidResponse}, bidRequestsWithMediaType);
      expect(JSON.stringify(Object.keys(result[0]).sort())).to.eql(JSON.stringify(Object.keys(expectedResponse[0]).sort()));
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

    it('should register a beacon', function () {
      resetBoPixel();
      spec.interpretResponse({body: bidResponse}, bidRequestsWithMediaTypes);
      sinon.assert.calledWith(userSync.registerSync, 'image', 'openx', sinon.match(/^\/\/test-colo\.com/))
      sinon.assert.calledWith(userSync.registerSync, 'image', 'openx', sinon.match(/ph=test-ph/));
      sinon.assert.calledWith(userSync.registerSync, 'image', 'openx', sinon.match(/ts=test-ts/));
    });
  });

  describe('user sync', function () {
    const syncUrl = 'http://testpixels.net';

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
      expect(syncs).to.deep.equal([{type: 'iframe', url: '//u.openx.net/w/1.0/pd'}]);
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
      mockedArjResponse.ads.ad = adUnits.map((adUnit, index) => {
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
});
