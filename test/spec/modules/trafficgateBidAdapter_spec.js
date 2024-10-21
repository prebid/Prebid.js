import {expect} from 'chai';
import {spec} from 'modules/trafficgateBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from 'src/mediaTypes.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
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

const BidRequestBuilder = function BidRequestBuilder(options) {
  const defaults = {
    request: {
      auctionId: '4fd1ca2d-846c-4211-b9e5-321dfe1709c9',
      adUnitCode: 'adunit-code',
      bidder: 'trafficgate'
    },
    params: {
      placementId: '98765',
      host: 'example'
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
    bidderCode: 'trafficgate',
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

describe('TrafficgateOpenxRtbAdapter', function () {
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
          bidder: 'trafficgate',
          params: {},
          adUnitCode: 'adunit-code',
          mediaTypes: {banner: {}},
          sizes: [[300, 250], [300, 600]],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475'
        };
      });

      it('should return false when there is placementId only', function () {
        bannerBid.params = {'placementId': '98765'};
        expect(spec.isBidRequestValid(bannerBid)).to.equal(false);
      });

      describe('should return false when there is a host only', function () {
        beforeEach(function () {
          bannerBid.params = {host: 'test-delivery-domain'}
        });

        it('should return false when there is no placementId and size', function () {
          expect(spec.isBidRequestValid(bannerBid)).to.equal(false);
        });

        it('should return false if there is an placementId without sizes', function () {
          bannerBid.params.placementId = '98765';
          expect(spec.isBidRequestValid(bannerBid)).to.equal(false);
        });

        it('should return false if there is no placementId and sizes are defined', function () {
          bannerBid.mediaTypes.banner.sizes = [720, 90];
          expect(spec.isBidRequestValid(bannerBid)).to.equal(false);
        });

        it('should return false if no sizes are defined ', function () {
          expect(spec.isBidRequestValid(bannerBid)).to.equal(false);
        });

        it('should return false if sizes empty ', function () {
          bannerBid.mediaTypes.banner.sizes = [];
          expect(spec.isBidRequestValid(bannerBid)).to.equal(false);
        });

        it('should return true if there is placementId and sizes are defined', function () {
          bannerBid.params.placementId = '98765';
          bannerBid.mediaTypes.banner.sizes = [720, 90];
          expect(spec.isBidRequestValid(bannerBid)).to.equal(true);
        });
      });
    });

    describe('when request is for a multiformat ad', function () {
      describe('and request config uses mediaTypes video and banner', () => {
        const multiformatBid = {
          bidder: 'trafficgate',
          params: {
            placementId: '98765',
            host: 'example'
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
          bidder: 'trafficgate',
          params: {
            placementId: '98765',
            host: 'example'
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
        it('should return false when isBannerBid', function () {
          expect(spec.isBannerBid(videoBidWithMediaTypes)).to.equal(false);
        });

        it('should return true when required params found', function () {
          expect(spec.isBidRequestValid(videoBidWithMediaTypes)).to.equal(true);
        });

        it('should return false when required params are not passed', function () {
          let videoBidWithMediaTypes = Object.assign({}, videoBidWithMediaTypes);
          videoBidWithMediaTypes.params = {};
          expect(spec.isBidRequestValid(videoBidWithMediaTypes)).to.equal(false);
        });
      });
      describe('and request config uses both host and platform', () => {
        const videoBidWithHostAndPlacement = {
          bidder: 'trafficgate',
          params: {
            placementId: '98765',
            host: 'example'
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
        it('should return false when isBannerBid', function () {
          expect(spec.isBannerBid(videoBidWithHostAndPlacement)).to.equal(false);
        });

        it('should return true when required params found', function () {
          expect(spec.isBidRequestValid(videoBidWithHostAndPlacement)).to.equal(true);
        });

        it('should return false when required params are not passed', function () {
          let videoBidWithMediaTypes = Object.assign({}, videoBidWithHostAndPlacement);
          videoBidWithMediaTypes.params = {};
          expect(spec.isBidRequestValid(videoBidWithMediaTypes)).to.equal(false);
        });
      });
      describe('and request config uses mediaType', () => {
        const videoBidWithMediaType = {
          'bidder': 'trafficgate',
          'params': {
            'placementId': '98765',
            'host': 'example'
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
        bidder: 'trafficgate',
        params: {
          placementId: '11',
          host: 'example',
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
        bidder: 'trafficgate',
        params: {
          placementId: '22',
          host: 'example',
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

      it('should send bid request to trafficgate url via POST', function () {
        const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
        expect(request[0].url).to.equal('https://example.bc-plugin.com/prebidjs');
        expect(request[0].method).to.equal('POST');
      });

      it('should send delivery domain, if available', function () {
        const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
        expect(request[0].data.imp[0].ext.bidder.host).to.equal(bidRequestsWithMediaTypes[0].params.host);
        expect(request[1].data.imp[0].ext.bidder.host).to.equal(bidRequestsWithMediaTypes[1].params.host);
      });

      it('should send placementId', function () {
        const request = spec.buildRequests(bidRequestsWithMediaTypes, mockBidderRequest);
        expect(request[0].data.imp[0].ext.bidder.placementId).to.equal(bidRequestsWithMediaTypes[0].params.placementId);
        expect(request[1].data.imp[0].ext.bidder.placementId).to.equal(bidRequestsWithMediaTypes[1].params.placementId);
      });

      describe('floors', function () {
        it('should send out custom floors on bids that have customFloors, no currency as account currency is used', function () {
          const bidRequest = Object.assign({},
            bidRequestsWithMediaTypes[0],
            {
              params: {
                placementId: '98765',
                host: 'example',
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
            bidder: 'trafficgate',
            params: {
              placementId: '98765-banner',
              host: 'example'
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
            bidder: 'trafficgate',
            mediaTypes: {
              video: {
                playerSize: [640, 480]
              }
            },
            params: {
              placementId: '98765-video',
              host: 'example'
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
            bidder: 'trafficgate',
            params: {
              placementId: '98765-banner',
              host: 'example'
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
            bidder: 'trafficgate',
            mediaTypes: {
              video: {
                playerSize: [640, 480]
              }
            },
            params: {
              placementId: '98765-video',
              host: 'example'
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
            bidder: 'trafficgate',
            params: {
              placementId: '11',
              host: 'example'
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
            bidder: 'trafficgate',
            params: {
              placementId: '11',
              host: 'example'
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
          bidder: 'trafficgate',
          params: {
            placementId: '98765',
            host: 'example'
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
          bidder: 'trafficgate',
          params: {
            placementId: '98765',
            host: 'example'
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
          bidder: 'trafficgate',
          params: {
            placementId: '98765',
            host: 'example'
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
      bidder: 'trafficgate',
      params: {
        placementId: '98765',
        host: 'example'
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
          price: 3.5,
          w: 300,
          h: 250,
          crid: 'test-creative-id',
          dealid: 'test-deal-id',
          adm: 'test-ad-markup',
          adomain: ['brand.com'],
          ext: {
            networkId: 123,
            advertiserDomains: ['domain.com'],
          }
        }]
      }],
      cur: 'USD'
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

      it('should return a networkId', function () {
        expect(bid.meta.networkId).to.equal(bidResponse.seatbid[0].bid[0].ext.networkId);
      });

      it('should return adomain', function () {
        expect(bid.meta.advertiserDomains).to.equal(bidResponse.seatbid[0].bid[0].ext.advertiserDomains);
      });
    });

    context('when the response is a banner', function() {
      beforeEach(function () {
        bidRequestConfigs = [{
          bidder: 'trafficgate',
          params: {
            placementId: '98765',
            host: 'example'
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
            bidder: 'trafficgate',
            params: {
              placementId: '98765',
              host: 'example'
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
  });
});
