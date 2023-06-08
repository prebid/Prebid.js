import {expect} from 'chai';
import {spec, REQUEST_URL, SYNC_URL, DEFAULT_PH} from 'modules/openxOrtbBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from 'src/mediaTypes.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
// load modules that register ORTB processors
import 'src/prebid.js'
import 'modules/currency.js';
import 'modules/userId/index.js';
import 'modules/multibid/index.js';
import 'modules/priceFloors.js';
import 'modules/consentManagement.js';
import 'modules/consentManagementUsp.js';
import 'modules/schain.js';
import {deepClone} from 'src/utils.js';
import {syncAddFPDToBidderRequest} from '../../helpers/fpd.js';
import {hook} from '../../../src/hook.js';

const DEFAULT_SYNC = SYNC_URL + '?ph=' + DEFAULT_PH;

const BidRequestBuilder = function BidRequestBuilder(options) {
  const defaults = {
    request: {
      auctionId: '4fd1ca2d-846c-4211-b9e5-321dfe1709c9',
      adUnitCode: 'adunit-code',
      bidder: 'openx'
    },
    params: {
      unit: '12345678',
      delDomain: 'test-del-domain'
    },
    sizes: [[300, 250], [300, 600]],
  };

  const request = {
    ...defaults.request,
    ...options
  };

  this.withParams = (options) => {
    request.params = {
      ...defaults.params,
      ...options
    };
    return this;
  };

  this.build = () => request;
};

const BidderRequestBuilder = function BidderRequestBuilder(options) {
  const defaults = {
    bidderCode: 'openx',
    auctionId: '4fd1ca2d-846c-4211-b9e5-321dfe1709c9',
    bidderRequestId: '7g36s867Tr4xF90X',
    timeout: 3000,
    refererInfo: {
      numIframes: 0,
      reachedTop: true,
      referer: 'http://test.io/index.html?pbjs_debug=true'
    }
  };

  const request = {
    ...defaults,
    ...options
  };

  this.build = () => request;
};

describe('OpenxRtbAdapter', function () {
  before(() => {
    hook.ready();
  });

  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid()', function () {
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
        const multiformatBid = {
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
          transactionId: '4008d88a-8137-410b-aa35-fbfdabcb478e'
        };
        it('should return true multisize when required params found', function () {
          expect(spec.isBidRequestValid(multiformatBid)).to.equal(true);
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
    });
  });

  describe('buildRequests()', function () {
    let bidRequestsWithMediaTypes;
    let bidRequestsWithPlatform;
    let mockBidderRequest;

    beforeEach(function () {
      mockBidderRequest = {refererInfo: {}};

      bidRequestsWithMediaTypes = [{
        bidder: 'openx',
        params: {
          unit: '11',
          delDomain: 'test-del-domain',
          platform: '1cabba9e-cafe-3665-beef-f00f00f00f00',
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
        transactionId: 'test-transactionId-1',
        ortb2Imp: {
          ext: {
            ae: 2
          }
        }
      }, {
        bidder: 'openx',
        params: {
          unit: '22',
          delDomain: 'test-del-domain',
          platform: '1cabba9e-cafe-3665-beef-f00f00f00f00',
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          video: {
            playerSize: [640, 480]
          }
        },
        bidId: 'test-bid-id-2',
        bidderRequestId: 'test-bid-request-2',
        auctionId: 'test-auction-2',
        transactionId: 'test-transactionId-2'
      }];
    });

    context('common requests checks', function() {
      it('should be able to handle multiformat requests', () => {
        const multiformat = utils.deepClone(bidRequestsWithMediaTypes[0]);
        multiformat.mediaTypes.video = {
          context: 'outstream',
          playerSize: [640, 480]
        }
        const requests = spec.buildRequests([multiformat], mockBidderRequest);
        const outgoingFormats = requests.flatMap(rq => rq.data.imp.flatMap(imp => ['banner', 'video'].filter(k => imp[k] != null)));
        const expected = FEATURES.VIDEO ? ['banner', 'video'] : ['banner']
        expect(outgoingFormats).to.have.members(expected);
      })

      it('should send bid request to openx url via POST', function () {
        const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
        expect(request[0].url).to.equal(REQUEST_URL);
        expect(request[0].method).to.equal('POST');
      });

      it('should send delivery domain, if available', function () {
        const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
        expect(request[0].data.ext.delDomain).to.equal(bidRequestsWithMediaTypes[0].params.delDomain);
        expect(request[0].data.ext.platformId).to.be.undefined;
      });

      it('should send platform id, if available', function () {
        bidRequestsWithMediaTypes[0].params.platform = '1cabba9e-cafe-3665-beef-f00f00f00f00';
        bidRequestsWithMediaTypes[1].params.platform = '1cabba9e-cafe-3665-beef-f00f00f00f00';

        const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
        expect(request[0].data.ext.platform).to.equal(bidRequestsWithMediaTypes[0].params.platform);
        expect(request[1].data.ext.platform).to.equal(bidRequestsWithMediaTypes[0].params.platform);
      });

      it('should send openx adunit codes', function () {
        const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
        expect(request[0].data.imp[0].tagid).to.equal(bidRequestsWithMediaTypes[0].params.unit);
        expect(request[1].data.imp[0].tagid).to.equal(bidRequestsWithMediaTypes[1].params.unit);
      });

      it('should send out custom params on bids that have customParams specified', function () {
        const bidRequest = Object.assign({},
          bidRequestsWithMediaTypes[0],
          {
            params: {
              unit: '12345678',
              delDomain: 'test-del-domain',
              customParams: {'Test1': 'testval1+', 'test2': ['testval2/', 'testval3']}
            }
          }
        );

        mockBidderRequest.bids = [bidRequest];
        const request = spec.buildRequests([bidRequest], mockBidderRequest);
        expect(request[0].data.imp[0].ext.customParams).to.equal(bidRequest.params.customParams);
      })

      describe('floors', function () {
        it('should send out custom floors on bids that have customFloors, no currency as account currency is used', function () {
          const bidRequest = Object.assign({},
            bidRequestsWithMediaTypes[0],
            {
              params: {
                unit: '12345678',
                delDomain: 'test-del-domain',
                customFloor: 1.500
              }
            }
          );

          const request = spec.buildRequests([bidRequest], mockBidderRequest);
          expect(request[0].data.imp[0].bidfloor).to.equal(bidRequest.params.customFloor);
          expect(request[0].data.imp[0].bidfloorcur).to.equal(undefined);
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

          it('should send out floors on bids in USD', function () {
            const bidRequest = Object.assign({},
              bidRequestsWithMediaTypes[0],
              {
                getFloor: () => {
                  return {
                    currency: 'USD',
                    floor: 9.99
                  }
                }
              }
            );

            const request = spec.buildRequests([bidRequest], mockBidderRequest);
            expect(request[0].data.imp[0].bidfloor).to.equal(9.99);
            expect(request[0].data.imp[0].bidfloorcur).to.equal('USD');
          });

          it('should send not send floors', function () {
            adServerCurrencyStub.returns('EUR');
            const bidRequest = Object.assign({},
              bidRequestsWithMediaTypes[0],
              {
                getFloor: () => {
                  return {
                    currency: 'BTC',
                    floor: 9.99
                  }
                }
              }
            );

            const request = spec.buildRequests([bidRequest], mockBidderRequest);
            expect(request[0].data.imp[0].bidfloor).to.equal(undefined)
            expect(request[0].data.imp[0].bidfloorcur).to.equal(undefined)
          });
        })
      })

      describe('FPD', function() {
        let bidRequests;
        const mockBidderRequest = {refererInfo: {}};

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
            auctionId: 'test-auction-id',
            transactionId: 'test-transaction-id-1'
          }, {
            bidder: 'openx',
            mediaTypes: {
              video: {
                playerSize: [640, 480]
              }
            },
            params: {
              unit: '12345678-video',
              delDomain: 'test-del-domain'
            },
            'adUnitCode': 'adunit-code',

            bidId: 'test-bid-id',
            bidderRequestId: 'test-bidder-request-id',
            auctionId: 'test-auction-id',
            transactionId: 'test-transaction-id-2'
          }];
        });

        it('ortb2.site should be merged in the request', function() {
          const request = spec.buildRequests(bidRequests, {
            ...mockBidderRequest,
            'ortb2': {
              site: {
                domain: 'page.example.com',
                cat: ['IAB2'],
                sectioncat: ['IAB2-2']
              }
            }
          });
          let data = request[0].data;
          expect(data.site.domain).to.equal('page.example.com');
          expect(data.site.cat).to.deep.equal(['IAB2']);
          expect(data.site.sectioncat).to.deep.equal(['IAB2-2']);
        });

        it('ortb2.user should be merged in the request', function() {
          const request = spec.buildRequests(bidRequests, {
            ...mockBidderRequest,
            'ortb2': {
              user: {
                yob: 1985
              }
            }
          });
          let data = request[0].data;
          expect(data.user.yob).to.equal(1985);
        });

        describe('ortb2Imp', function() {
          describe('ortb2Imp.ext.data.pbadslot', function() {
            beforeEach(function () {
              if (bidRequests[0].hasOwnProperty('ortb2Imp')) {
                delete bidRequests[0].ortb2Imp;
              }
            });

            it('should not send if imp[].ext.data object is invalid', function() {
              bidRequests[0].ortb2Imp = {
                ext: {}
              };
              const request = spec.buildRequests(bidRequests, mockBidderRequest);
              let data = request[0].data;
              expect(data.imp[0].ext).to.not.have.property('data');
            });

            it('should not send if imp[].ext.data.pbadslot is undefined', function() {
              bidRequests[0].ortb2Imp = {
                ext: {
                  data: {
                  }
                }
              };
              const request = spec.buildRequests(bidRequests, mockBidderRequest);
              let data = request[0].data;
              if (data.imp[0].ext.data) {
                expect(data.imp[0].ext.data).to.not.have.property('pbadslot');
              } else {
                expect(data.imp[0].ext).to.not.have.property('data');
              }
            });

            it('should send if imp[].ext.data.pbadslot is string', function() {
              bidRequests[0].ortb2Imp = {
                ext: {
                  data: {
                    pbadslot: 'abcd'
                  }
                }
              };
              const request = spec.buildRequests(bidRequests, mockBidderRequest);
              let data = request[0].data;
              expect(data.imp[0].ext.data).to.have.property('pbadslot');
              expect(data.imp[0].ext.data.pbadslot).to.equal('abcd');
            });
          });

          describe('ortb2Imp.ext.data.adserver', function() {
            beforeEach(function () {
              if (bidRequests[0].hasOwnProperty('ortb2Imp')) {
                delete bidRequests[0].ortb2Imp;
              }
            });

            it('should not send if imp[].ext.data object is invalid', function() {
              bidRequests[0].ortb2Imp = {
                ext: {}
              };
              const request = spec.buildRequests(bidRequests, mockBidderRequest);
              let data = request[0].data;
              expect(data.imp[0].ext).to.not.have.property('data');
            });

            it('should not send if imp[].ext.data.adserver is undefined', function() {
              bidRequests[0].ortb2Imp = {
                ext: {
                  data: {
                  }
                }
              };
              const request = spec.buildRequests(bidRequests, mockBidderRequest);
              let data = request[0].data;
              if (data.imp[0].ext.data) {
                expect(data.imp[0].ext.data).to.not.have.property('adserver');
              } else {
                expect(data.imp[0].ext).to.not.have.property('data');
              }
            });

            it('should send', function() {
              let adSlotValue = 'abc';
              bidRequests[0].ortb2Imp = {
                ext: {
                  data: {
                    adserver: {
                      name: 'GAM',
                      adslot: adSlotValue
                    }
                  }
                }
              };
              const request = spec.buildRequests(bidRequests, mockBidderRequest);
              let data = request[0].data;
              expect(data.imp[0].ext.data.adserver.name).to.equal('GAM');
              expect(data.imp[0].ext.data.adserver.adslot).to.equal(adSlotValue);
            });
          });

          describe('ortb2Imp.ext.data.other', function() {
            beforeEach(function () {
              if (bidRequests[0].hasOwnProperty('ortb2Imp')) {
                delete bidRequests[0].ortb2Imp;
              }
            });

            it('should not send if imp[].ext.data object is invalid', function() {
              bidRequests[0].ortb2Imp = {
                ext: {}
              };
              const request = spec.buildRequests(bidRequests, mockBidderRequest);
              let data = request[0].data;
              expect(data.imp[0].ext).to.not.have.property('data');
            });

            it('should not send if imp[].ext.data.other is undefined', function() {
              bidRequests[0].ortb2Imp = {
                ext: {
                  data: {
                  }
                }
              };
              const request = spec.buildRequests(bidRequests, mockBidderRequest);
              let data = request[0].data;
              if (data.imp[0].ext.data) {
                expect(data.imp[0].ext.data).to.not.have.property('other');
              } else {
                expect(data.imp[0].ext).to.not.have.property('data');
              }
            });

            it('ortb2Imp.ext.data.other', function() {
              bidRequests[0].ortb2Imp = {
                ext: {
                  data: {
                    other: 1234
                  }
                }
              };
              const request = spec.buildRequests(bidRequests, mockBidderRequest);
              let data = request[0].data;
              expect(data.imp[0].ext.data.other).to.equal(1234);
            });
          });
        });

        describe('with user agent client hints', function () {
          it('should add device.sua if available', function () {
            const bidderRequestWithUserAgentClientHints = { refererInfo: {},
              ortb2: {
                device: {
                  sua: {
                    source: 2,
                    platform: {
                      brand: 'macOS',
                      version: [ '12', '4', '0' ]
                    },
                    browsers: [
                      {
                        brand: 'Chromium',
                        version: [ '106', '0', '5249', '119' ]
                      },
                      {
                        brand: 'Google Chrome',
                        version: [ '106', '0', '5249', '119' ]
                      },
                      {
                        brand: 'Not;A=Brand',
                        version: [ '99', '0', '0', '0' ]
                      }],
                    mobile: 0,
                    model: 'Pro',
                    bitness: '64',
                    architecture: 'x86'
                  }
                }
              }};

            let request = spec.buildRequests(bidRequests, bidderRequestWithUserAgentClientHints);
            expect(request[0].data.device.sua).to.exist;
            expect(request[0].data.device.sua).to.deep.equal(bidderRequestWithUserAgentClientHints.ortb2.device.sua);
            const bidderRequestWithoutUserAgentClientHints = {refererInfo: {}, ortb2: {}};
            request = spec.buildRequests(bidRequests, bidderRequestWithoutUserAgentClientHints);
            expect(request[0].data.device?.sua).to.not.exist;
          });
        });
      });

      context('when there is a consent management framework', function () {
        let bidRequests;
        let mockConfig;
        let bidderRequest;

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
            auctionId: 'test-auction-id',
            transactionId: 'test-transaction-id-1'
          }, {
            bidder: 'openx',
            mediaTypes: {
              video: {
                playerSize: [640, 480]
              }
            },
            params: {
              unit: '12345678-video',
              delDomain: 'test-del-domain'
            },
            'adUnitCode': 'adunit-code',

            bidId: 'test-bid-id',
            bidderRequestId: 'test-bidder-request-id',
            auctionId: 'test-auction-id',
            transactionId: 'test-transaction-id-2'
          }];
        });

        describe('us_privacy', function () {
          beforeEach(function () {
            bidderRequest = {
              uspConsent: '1YYN',
              refererInfo: {}
            };

            sinon.stub(config, 'getConfig').callsFake((key) => {
              return utils.deepAccess(mockConfig, key);
            });
          });

          afterEach(function () {
            config.getConfig.restore();
          });

          it('should send a signal to specify that US Privacy applies to this request', function () {
            const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
            expect(request[0].data.regs.ext.us_privacy).to.equal('1YYN');
            expect(request[1].data.regs.ext.us_privacy).to.equal('1YYN');
          });

          it('should not send the regs object, when consent string is undefined', function () {
            delete bidderRequest.uspConsent;
            const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
            expect(request[0].data.regs?.us_privacy).to.not.exist;
          });
        });

        describe('GDPR', function () {
          beforeEach(function () {
            bidderRequest = {
              gdprConsent: {
                consentString: 'test-gdpr-consent-string',
                addtlConsent: 'test-addtl-consent-string',
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

          afterEach(function () {
            config.getConfig.restore();
          });

          it('should send a signal to specify that GDPR applies to this request', function () {
            bidderRequest.bids = bidRequests;
            const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
            expect(request[0].data.regs.ext.gdpr).to.equal(1);
            expect(request[1].data.regs.ext.gdpr).to.equal(1);
          });

          it('should send the consent string', function () {
            bidderRequest.bids = bidRequests;
            const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
            expect(request[0].data.user.ext.consent).to.equal(bidderRequest.gdprConsent.consentString);
            expect(request[1].data.user.ext.consent).to.equal(bidderRequest.gdprConsent.consentString);
          });

          it('should send the addtlConsent string', function () {
            bidderRequest.bids = bidRequests;
            const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
            expect(request[0].data.user.ext.ConsentedProvidersSettings.consented_providers).to.equal(bidderRequest.gdprConsent.addtlConsent);
            expect(request[1].data.user.ext.ConsentedProvidersSettings.consented_providers).to.equal(bidderRequest.gdprConsent.addtlConsent);
          });

          it('should send a signal to specify that GDPR does not apply to this request', function () {
            bidderRequest.gdprConsent.gdprApplies = false;
            bidderRequest.bids = bidRequests;
            const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
            expect(request[0].data.regs.ext.gdpr).to.equal(0);
            expect(request[1].data.regs.ext.gdpr).to.equal(0);
          });

          it('when GDPR application is undefined, should not send a signal to specify whether GDPR applies to this request, ' +
            'but can send consent data, ', function () {
            delete bidderRequest.gdprConsent.gdprApplies;
            bidderRequest.bids = bidRequests;
            const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
            expect(request[0].data.regs?.ext?.gdpr).to.not.be.ok;
            expect(request[0].data.user.ext.consent).to.equal(bidderRequest.gdprConsent.consentString);
            expect(request[1].data.user.ext.consent).to.equal(bidderRequest.gdprConsent.consentString);
          });

          it('when consent string is undefined, should not send the consent string, ', function () {
            delete bidderRequest.gdprConsent.consentString;
            bidderRequest.bids = bidRequests;
            const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
            expect(request[0].data.imp[0].ext.consent).to.equal(undefined);
            expect(request[1].data.imp[0].ext.consent).to.equal(undefined);
          });
        });
      });

      context('coppa', function() {
        it('when there are no coppa param settings, should not send a coppa flag', function () {
          const request = spec.buildRequests(bidRequestsWithMediaTypes, syncAddFPDToBidderRequest(mockBidderRequest));
          expect(request[0].data.regs?.coppa).to.be.not.ok;
        });

        it('should send a coppa flag there is when there is coppa param settings in the bid requests', function () {
          let mockConfig = {
            coppa: true
          };

          sinon.stub(config, 'getConfig').callsFake((key) => {
            return utils.deepAccess(mockConfig, key);
          });

          const request = spec.buildRequests(bidRequestsWithMediaTypes, syncAddFPDToBidderRequest(mockBidderRequest));
          expect(request[0].data.regs.coppa).to.equal(1);
        });

        it('should send a coppa flag there is when there is coppa param settings in the bid params', function () {
          const request = spec.buildRequests(bidRequestsWithMediaTypes, syncAddFPDToBidderRequest(mockBidderRequest));
          request.params = {coppa: true};
          expect(request[0].data.regs.coppa).to.equal(1);
        });

        after(function () {
          config.getConfig.restore()
        });
      });

      context('do not track (DNT)', function() {
        let doNotTrackStub;

        beforeEach(function () {
          doNotTrackStub = sinon.stub(utils, 'getDNT');
        });
        afterEach(function() {
          doNotTrackStub.restore();
        });

        it('when there is a do not track, should send a dnt', function () {
          doNotTrackStub.returns(1);

          const request = spec.buildRequests(bidRequestsWithMediaTypes, syncAddFPDToBidderRequest(mockBidderRequest));
          expect(request[0].data.device.dnt).to.equal(1);
        });

        it('when there is not do not track, don\'t send dnt', function () {
          doNotTrackStub.returns(0);

          const request = spec.buildRequests(bidRequestsWithMediaTypes, syncAddFPDToBidderRequest(mockBidderRequest));
          expect(request[0].data.device.dnt).to.equal(0);
        });

        it('when there is no defined do not track, don\'t send dnt', function () {
          doNotTrackStub.returns(null);

          const request = spec.buildRequests(bidRequestsWithMediaTypes, syncAddFPDToBidderRequest(mockBidderRequest));
          expect(request[0].data.device.dnt).to.equal(0);
        });
      });

      context('supply chain (schain)', function () {
        let bidRequests;
        let schainConfig;
        const supplyChainNodePropertyOrder = ['asi', 'sid', 'hp', 'rid', 'name', 'domain'];

        beforeEach(function () {
          schainConfig = {
            ver: '1.0',
            complete: 1,
            nodes: [
              {
                asi: 'exchange1.com',
                sid: '1234',
                hp: 1,
                rid: 'bid-request-1',
                name: 'publisher',
                domain: 'publisher.com'
                // omitted ext
              },
              {
                asi: 'exchange2.com',
                sid: 'abcd',
                hp: 1,
                rid: 'bid-request-2',
                // name field missing
                domain: 'intermediary.com'
              },
              {
                asi: 'exchange3.com',
                sid: '4321',
                hp: 1,
                // request id
                // name field missing
                domain: 'intermediary-2.com'
              }
            ]
          };

          bidRequests = [{
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
            schain: schainConfig
          }];
        });

        it('should send a supply chain object', function () {
          const request = spec.buildRequests(bidRequests, mockBidderRequest);
          expect(request[0].data.source.ext.schain).to.equal(schainConfig);
        });

        it('should send the supply chain object with the right version', function () {
          const request = spec.buildRequests(bidRequests, mockBidderRequest);
          expect(request[0].data.source.ext.schain.ver).to.equal(schainConfig.ver);
        });

        it('should send the supply chain object with the right complete value', function () {
          const request = spec.buildRequests(bidRequests, mockBidderRequest);
          expect(request[0].data.source.ext.schain.complete).to.equal(schainConfig.complete);
        });
      });

      context('when there are userid providers', function () {
        const userIdAsEids = [
          {
            source: 'adserver.org',
            uids: [{
              id: 'some-random-id-value',
              atype: 1,
              ext: {
                rtiPartner: 'TDID'
              }
            }]
          },
          {
            source: 'id5-sync.com',
            uids: [{
              id: 'some-random-id-value',
              atype: 1
            }]
          },
          {
            source: 'sharedid.org',
            uids: [{
              id: 'some-random-id-value',
              atype: 1,
              ext: {
                third: 'some-random-id-value'
              }
            }]
          }
        ];

        it(`should send the user id under the extended ids`, function () {
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
            auctionId: 'test-auction-1',
            userIdAsEids: userIdAsEids
          }];
          // enrich bid request with userId key/value

          const request = spec.buildRequests(bidRequestsWithUserId, mockBidderRequest);
          expect(request[0].data.user.ext.eids).to.equal(userIdAsEids);
        });

        it(`when no user ids are available, it should not send any extended ids`, function () {
          const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
          expect(request[0].data).to.not.have.any.keys('user');
        });
      });

      context('FLEDGE', function() {
        it('when FLEDGE is enabled, should send whatever is set in ortb2imp.ext.ae in all bid requests', function () {
          const request = spec.buildRequests(bidRequestsWithMediaTypes, {
            ...mockBidderRequest,
            fledgeEnabled: true
          });
          expect(request[0].data.imp[0].ext.ae).to.equal(2);
        });
      });
    });

    context('banner', function () {
      it('should send bid request with a mediaTypes specified with banner type', function () {
        const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
        expect(request[0].data.imp[0]).to.have.any.keys(BANNER);
      });
    });

    if (FEATURES.VIDEO) {
      context('video', function () {
        it('should send bid request with a mediaTypes specified with video type', function () {
          const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
          expect(request[1].data.imp[0]).to.have.any.keys(VIDEO);
        });

        it('Update imp.video with OpenRTB options from mimeTypes and params', function() {
          const bid01 = new BidRequestBuilder({
            adUnitCode: 'adunit-code-01',
            mediaTypes: {
              banner: { sizes: [[300, 250]] },
              video: {
                context: 'outstream',
                playerSize: [[300, 250]],
                mimes: ['video/mp4'],
                protocols: [8]
              }
            },
          }).withParams({
            // options in video, will merge
            video: {
              skip: 1,
              skipafter: 4,
              minduration: 10,
              maxduration: 30
            }
          }).build();

          const bidderRequest = new BidderRequestBuilder().build();
          const expected = {
            mimes: ['video/mp4'],
            skip: 1,
            skipafter: 4,
            minduration: 10,
            maxduration: 30,
            placement: 4,
            protocols: [8],
            w: 300,
            h: 250
          };
          const requests = spec.buildRequests([bid01], bidderRequest);
          expect(requests).to.have.lengthOf(2);
          expect(requests[1].data.imp[0].video).to.deep.equal(expected);
        });
      });
    }
  });

  describe('interpretResponse()', function () {
    let bidRequestConfigs;
    let bidRequest;
    let bidResponse;
    let bid;

    context('when there is an nbr response', function () {
      let bids;
      beforeEach(function () {
        bidRequestConfigs = [{
          bidder: 'openx',
          params: {
            unit: '12345678',
            delDomain: 'test-del-domain'
          },
          adUnitCode: 'adunit-code',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600]],
            },
          },
          bidId: 'test-bid-id',
          bidderRequestId: 'test-bidder-request-id',
          auctionId: 'test-auction-id'
        }];

        bidRequest = spec.buildRequests(bidRequestConfigs, {refererInfo: {}})[0];

        bidResponse = {nbr: 0}; // Unknown error
        bids = spec.interpretResponse({body: bidResponse}, bidRequest);
      });

      it('should not return any bids', function () {
        expect(bids.length).to.equal(0);
      });
    });

    context('when no seatbid in response', function () {
      let bids;
      beforeEach(function () {
        bidRequestConfigs = [{
          bidder: 'openx',
          params: {
            unit: '12345678',
            delDomain: 'test-del-domain'
          },
          adUnitCode: 'adunit-code',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600]],
            },
          },
          bidId: 'test-bid-id',
          bidderRequestId: 'test-bidder-request-id',
          auctionId: 'test-auction-id'
        }];

        bidRequest = spec.buildRequests(bidRequestConfigs, {refererInfo: {}})[0];

        bidResponse = {ext: {}, id: 'test-bid-id'};
        bids = spec.interpretResponse({body: bidResponse}, bidRequest);
      });

      it('should not return any bids', function () {
        expect(bids.length).to.equal(0);
      });
    });

    context('when there is no response', function () {
      let bids;
      beforeEach(function () {
        bidRequestConfigs = [{
          bidder: 'openx',
          params: {
            unit: '12345678',
            delDomain: 'test-del-domain'
          },
          adUnitCode: 'adunit-code',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600]],
            },
          },
          bidId: 'test-bid-id',
          bidderRequestId: 'test-bidder-request-id',
          auctionId: 'test-auction-id'
        }];

        bidRequest = spec.buildRequests(bidRequestConfigs, {refererInfo: {}})[0];

        bidResponse = ''; // Unknown error
        bids = spec.interpretResponse({body: bidResponse}, bidRequest);
      });

      it('should not return any bids', function () {
        expect(bids.length).to.equal(0);
      });
    });

    const SAMPLE_BID_REQUESTS = [{
      bidder: 'openx',
      params: {
        unit: '12345678',
        delDomain: 'test-del-domain'
      },
      adUnitCode: 'adunit-code',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]],
        },
      },
      bidId: 'test-bid-id',
      bidderRequestId: 'test-bidder-request-id',
      auctionId: 'test-auction-id'
    }];

    const SAMPLE_BID_RESPONSE = {
      seatbid: [{
        bid: [{
          impid: 'test-bid-id',
          price: 2,
          w: 300,
          h: 250,
          crid: 'test-creative-id',
          dealid: 'test-deal-id',
          adm: 'test-ad-markup',
          adomain: ['brand.com'],
          ext: {
            dsp_id: '123',
            buyer_id: '456',
            brand_id: '789',
            paf: {
              content_id: 'paf_content_id'
            }
          }
        }]
      }],
      cur: 'AUS',
      ext: {
        paf: {
          transmission: {version: '12'}
        }
      }
    };

    context('when there is a response, the common response properties', function () {
      beforeEach(function () {
        bidRequestConfigs = deepClone(SAMPLE_BID_REQUESTS);
        bidRequest = spec.buildRequests(bidRequestConfigs, {refererInfo: {}})[0];
        bidResponse = deepClone(SAMPLE_BID_RESPONSE);

        bid = spec.interpretResponse({body: bidResponse}, bidRequest)[0];
      });

      it('should return a price', function () {
        expect(bid.cpm).to.equal(bidResponse.seatbid[0].bid[0].price);
      });

      it('should return a request id', function () {
        expect(bid.requestId).to.equal(bidResponse.seatbid[0].bid[0].impid);
      });

      it('should return width and height for the creative', function () {
        expect(bid.width).to.equal(bidResponse.seatbid[0].bid[0].w);
        expect(bid.height).to.equal(bidResponse.seatbid[0].bid[0].h);
      });

      it('should return a creativeId', function () {
        expect(bid.creativeId).to.equal(bidResponse.seatbid[0].bid[0].crid);
      });

      it('should return an ad', function () {
        expect(bid.ad).to.equal(bidResponse.seatbid[0].bid[0].adm);
      });

      it('should return a deal id if it exists', function () {
        expect(bid.dealId).to.equal(bidResponse.seatbid[0].bid[0].dealid);
      });

      it('should have a time-to-live of 5 minutes', function () {
        expect(bid.ttl).to.equal(300);
      });

      it('should always return net revenue', function () {
        expect(bid.netRevenue).to.equal(true);
      });

      it('should return a currency', function () {
        expect(bid.currency).to.equal(bidResponse.cur);
      });

      it('should return a brand ID', function () {
        expect(bid.meta.brandId).to.equal(bidResponse.seatbid[0].bid[0].ext.brand_id);
      });

      it('should return a dsp ID', function () {
        expect(bid.meta.networkId).to.equal(bidResponse.seatbid[0].bid[0].ext.dsp_id);
      });

      it('should return a buyer ID', function () {
        expect(bid.meta.advertiserId).to.equal(bidResponse.seatbid[0].bid[0].ext.buyer_id);
      });

      it('should return adomain', function () {
        expect(bid.meta.advertiserDomains).to.equal(bidResponse.seatbid[0].bid[0].adomain);
      });

      it('should return paf fields', function () {
        const paf = {
          transmission: {version: '12'},
          content_id: 'paf_content_id'
        }
        expect(bid.meta.paf).to.deep.equal(paf);
      });
    });

    context('when there is more than one response', () => {
      let bids;
      beforeEach(function () {
        bidRequestConfigs = deepClone(SAMPLE_BID_REQUESTS);
        bidRequest = spec.buildRequests(bidRequestConfigs, {refererInfo: {}})[0];
        bidResponse = deepClone(SAMPLE_BID_RESPONSE);
        bidResponse.seatbid[0].bid.push(deepClone(bidResponse.seatbid[0].bid[0]));
        bidResponse.seatbid[0].bid[1].ext.paf.content_id = 'second_paf'

        bids = spec.interpretResponse({body: bidResponse}, bidRequest);
      });

      it('should not confuse paf content_id', () => {
        expect(bids.map(b => b.meta.paf.content_id)).to.eql(['paf_content_id', 'second_paf']);
      });
    })

    context('when the response is a banner', function() {
      beforeEach(function () {
        bidRequestConfigs = [{
          bidder: 'openx',
          params: {
            unit: '12345678',
            delDomain: 'test-del-domain'
          },
          adUnitCode: 'adunit-code',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600]],
            },
          },
          bidId: 'test-bid-id',
          bidderRequestId: 'test-bidder-request-id',
          auctionId: 'test-auction-id'
        }];

        bidRequest = spec.buildRequests(bidRequestConfigs, {refererInfo: {}})[0];

        bidResponse = {
          seatbid: [{
            bid: [{
              impid: 'test-bid-id',
              price: 2,
              w: 300,
              h: 250,
              crid: 'test-creative-id',
              dealid: 'test-deal-id',
              adm: 'test-ad-markup'
            }]
          }],
          cur: 'AUS'
        };

        bid = spec.interpretResponse({body: bidResponse}, bidRequest)[0];
      });

      it('should return the proper mediaType', function () {
        it('should return a creativeId', function () {
          expect(bid.mediaType).to.equal(Object.keys(bidRequestConfigs[0].mediaTypes)[0]);
        });
      });
    });

    if (FEATURES.VIDEO) {
      context('when the response is a video', function() {
        beforeEach(function () {
          bidRequestConfigs = [{
            bidder: 'openx',
            params: {
              unit: '12345678',
              delDomain: 'test-del-domain'
            },
            adUnitCode: 'adunit-code',
            mediaTypes: {
              video: {
                playerSize: [[640, 360], [854, 480]],
              },
            },
            bidId: 'test-bid-id',
            bidderRequestId: 'test-bidder-request-id',
            auctionId: 'test-auction-id'
          }];

          bidRequest = spec.buildRequests(bidRequestConfigs, {refererInfo: {}})[0];

          bidResponse = {
            seatbid: [{
              bid: [{
                impid: 'test-bid-id',
                price: 2,
                w: 854,
                h: 480,
                crid: 'test-creative-id',
                dealid: 'test-deal-id',
                adm: 'test-ad-markup',
              }]
            }],
            cur: 'AUS'
          };
        });

        it('should return the proper mediaType', function () {
          bid = spec.interpretResponse({body: bidResponse}, bidRequest)[0];
          expect(bid.mediaType).to.equal(Object.keys(bidRequestConfigs[0].mediaTypes)[0]);
        });

        it('should return the proper mediaType', function () {
          const winUrl = 'https//my.win.url';
          bidResponse.seatbid[0].bid[0].nurl = winUrl
          bid = spec.interpretResponse({body: bidResponse}, bidRequest)[0];

          expect(bid.vastUrl).to.equal(winUrl);
        });
      });
    }

    context('when the response contains FLEDGE interest groups config', function() {
      let response;

      beforeEach(function () {
        sinon.stub(config, 'getConfig')
          .withArgs('fledgeEnabled')
          .returns(true);

        bidRequestConfigs = [{
          bidder: 'openx',
          params: {
            unit: '12345678',
            delDomain: 'test-del-domain'
          },
          adUnitCode: 'adunit-code',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600]],
            },
          },
          bidId: 'test-bid-id',
          bidderRequestId: 'test-bidder-request-id',
          auctionId: 'test-auction-id'
        }];

        bidRequest = spec.buildRequests(bidRequestConfigs, {refererInfo: {}})[0];

        bidResponse = {
          seatbid: [{
            bid: [{
              impid: 'test-bid-id',
              price: 2,
              w: 300,
              h: 250,
              crid: 'test-creative-id',
              dealid: 'test-deal-id',
              adm: 'test-ad-markup'
            }]
          }],
          cur: 'AUS',
          ext: {
            fledge_auction_configs: {
              'test-bid-id': {
                seller: 'codinginadtech.com',
                interestGroupBuyers: ['somedomain.com'],
                sellerTimeout: 0,
                perBuyerSignals: {
                  'somedomain.com': {
                    base_bid_micros: 0.1,
                    disallowed_advertiser_ids: [
                      '1234',
                      '2345'
                    ],
                    multiplier: 1.3,
                    use_bid_multiplier: true,
                    win_reporting_id: '1234567asdf'
                  }
                }
              }
            }
          }
        };

        response = spec.interpretResponse({body: bidResponse}, bidRequest);
      });

      afterEach(function () {
        config.getConfig.restore();
      });

      it('should return FLEDGE auction_configs alongside bids', function () {
        expect(response).to.have.property('bids');
        expect(response).to.have.property('fledgeAuctionConfigs');
        expect(response.fledgeAuctionConfigs.length).to.equal(1);
        expect(response.fledgeAuctionConfigs[0].bidId).to.equal('test-bid-id');
      });
    });
  });

  describe('user sync', function () {
    it('should register the default image pixel if no pixels available', function () {
      let syncs = spec.getUserSyncs(
        {pixelEnabled: true},
        []
      );
      expect(syncs).to.deep.equal([{type: 'image', url: DEFAULT_SYNC}]);
    });

    it('should register custom syncUrl when exists', function () {
      let syncs = spec.getUserSyncs(
        {pixelEnabled: true},
        [{body: {ext: {delDomain: 'www.url.com'}}}]
      );
      expect(syncs).to.deep.equal([{type: 'image', url: 'https://www.url.com/w/1.0/pd'}]);
    });

    it('should register custom syncUrl when exists', function () {
      let syncs = spec.getUserSyncs(
        {pixelEnabled: true},
        [{body: {ext: {platform: 'abc'}}}]
      );
      expect(syncs).to.deep.equal([{type: 'image', url: SYNC_URL + '?ph=abc'}]);
    });

    it('when iframe sync is allowed, it should register an iframe sync', function () {
      let syncs = spec.getUserSyncs(
        {iframeEnabled: true},
        []
      );
      expect(syncs).to.deep.equal([{type: 'iframe', url: DEFAULT_SYNC}]);
    });

    it('should prioritize iframe over image for user sync', function () {
      let syncs = spec.getUserSyncs(
        {iframeEnabled: true, pixelEnabled: true},
        []
      );
      expect(syncs).to.deep.equal([{type: 'iframe', url: DEFAULT_SYNC}]);
    });

    describe('when gdpr applies', function () {
      let gdprConsent;
      let gdprPixelUrl;
      const consentString = 'gdpr-pixel-consent';
      const gdprApplies = '1';
      beforeEach(() => {
        gdprConsent = {
          consentString,
          gdprApplies: true
        };

        gdprPixelUrl = `${SYNC_URL}&gdpr=${gdprApplies}&gdpr_consent=${consentString}`;
      });

      it('when there is a response, it should have the gdpr query params', () => {
        let [{url}] = spec.getUserSyncs(
          {iframeEnabled: true, pixelEnabled: true},
          [],
          gdprConsent
        );

        expect(url).to.have.string(`gdpr_consent=${consentString}`);
        expect(url).to.have.string(`gdpr=${gdprApplies}`);
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
      const privacyString = 'TEST';
      beforeEach(() => {
        usPrivacyConsent = 'TEST';
        uspPixelUrl = `${DEFAULT_SYNC}&us_privacy=${privacyString}`
      });
      it('should send the us privacy string, ', () => {
        let [{url}] = spec.getUserSyncs(
          {iframeEnabled: true, pixelEnabled: true},
          [],
          undefined,
          usPrivacyConsent
        );
        expect(url).to.have.string(`us_privacy=${privacyString}`);
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
});
