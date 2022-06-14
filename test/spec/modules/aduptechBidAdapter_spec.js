import { expect } from 'chai';
import {
  BIDDER_CODE,
  ENDPOINT_METHOD,
  internal,
  spec
} from '../../../modules/aduptechBidAdapter.js';
import { config } from '../../../src/config.js';
import * as utils from '../../../src/utils.js';
import { BANNER, NATIVE } from '../../../src/mediaTypes.js'
import { newBidder } from '../../../src/adapters/bidderFactory.js';

describe('AduptechBidAdapter', () => {
  describe('internal', () => {
    describe('extractGdpr', () => {
      it('should handle empty bidderRequest', () => {
        expect(internal.extractGdpr(null)).to.be.null;
        expect(internal.extractGdpr({})).to.be.null;
      });

      it('should extract bidderRequest.gdprConsent', () => {
        const bidderRequest = {
          gdprConsent: {
            consentString: 'consentString',
            gdprApplies: false
          }
        };

        expect(internal.extractGdpr(bidderRequest)).to.deep.equal({
          consentString: bidderRequest.gdprConsent.consentString,
          consentRequired: bidderRequest.gdprConsent.gdprApplies
        });
      });

      it('should handle missing bidderRequest.gdprConsent.gdprApplies', () => {
        const bidderRequest = {
          gdprConsent: {
            consentString: 'consentString'
          }
        };

        expect(internal.extractGdpr(bidderRequest)).to.deep.equal({
          consentString: bidderRequest.gdprConsent.consentString,
          consentRequired: true
        });
      });

      it('should handle invalid bidderRequest.gdprConsent.gdprApplies', () => {
        const bidderRequest = {
          gdprConsent: {
            consentString: 'consentString',
            gdprApplies: 'foobar'
          }
        };

        expect(internal.extractGdpr(bidderRequest)).to.deep.equal({
          consentString: bidderRequest.gdprConsent.consentString,
          consentRequired: true
        });
      });
    });

    describe('extractPageUrl', () => {
      let origPageUrl;

      beforeEach(() => {
        // remember original pageUrl in config
        origPageUrl = config.getConfig('pageUrl');

        // unset pageUrl in config
        config.setConfig({ pageUrl: null });
      });

      afterEach(() => {
        // set original pageUrl to config
        config.setConfig({ pageUrl: origPageUrl });
      });

      it('should handle empty or missing data', () => {
        expect(internal.extractPageUrl(null)).to.equal(utils.getWindowSelf().location.href);
        expect(internal.extractPageUrl({})).to.equal(utils.getWindowSelf().location.href);
        expect(internal.extractPageUrl({ refererInfo: {} })).to.equal(utils.getWindowSelf().location.href);
        expect(internal.extractPageUrl({ refererInfo: { canonicalUrl: null } })).to.equal(utils.getWindowSelf().location.href);
        expect(internal.extractPageUrl({ refererInfo: { canonicalUrl: '' } })).to.equal(utils.getWindowSelf().location.href);
      });

      it('should use bidderRequest.refererInfo.page', () => {
        const bidderRequest = {
          refererInfo: {
            page: 'http://canonical.url'
          }
        };

        expect(internal.extractPageUrl(bidderRequest)).to.equal(bidderRequest.refererInfo.page);
      });
    });

    describe('extractReferrer', () => {
      it('should handle empty or missing data', () => {
        expect(internal.extractReferrer(null)).to.equal(utils.getWindowSelf().document.referrer);
        expect(internal.extractReferrer({})).to.equal(utils.getWindowSelf().document.referrer);
        expect(internal.extractReferrer({ refererInfo: {} })).to.equal(utils.getWindowSelf().document.referrer);
        expect(internal.extractReferrer({ refererInfo: { referer: null } })).to.equal(utils.getWindowSelf().document.referrer);
        expect(internal.extractReferrer({ refererInfo: { referer: '' } })).to.equal(utils.getWindowSelf().document.referrer);
      });

      it('hould use bidderRequest.refererInfo.ref', () => {
        const bidderRequest = {
          refererInfo: {
            ref: 'foobar'
          }
        };

        expect(internal.extractReferrer(bidderRequest)).to.equal(bidderRequest.refererInfo.ref);
      });
    });

    describe('extractParams', () => {
      it('should handle empty bidRequest', () => {
        expect(internal.extractParams(null)).to.be.null;
        expect(internal.extractParams({})).to.be.null;
      });

      it('should extract bidRequest.params', () => {
        const bidRequest = {
          params: {
            foo: '123',
            bar: 456
          }
        };
        expect(internal.extractParams(bidRequest)).to.deep.equal(bidRequest.params);
      });
    });

    describe('extractBannerConfig', () => {
      it('should handle empty bidRequest', () => {
        expect(internal.extractBannerConfig(null)).to.be.null;
        expect(internal.extractBannerConfig({})).to.be.null;
      });

      it('should extract bidRequest.mediaTypes.banner', () => {
        const bidRequest = {
          mediaTypes: {
            banner: {
              sizes: [[12, 34], [56, 78]]
            }
          }
        };
        expect(internal.extractBannerConfig(bidRequest)).to.deep.equal(bidRequest.mediaTypes.banner);
      });

      it('should extract bidRequest.sizes (backward compatibility)', () => {
        const bidRequest = {
          sizes: [[12, 34], [56, 78]]
        };

        expect(internal.extractBannerConfig(bidRequest)).to.deep.equal({sizes: bidRequest.sizes});
      });
    });

    describe('extractNativeConfig', () => {
      it('should handle empty bidRequest', () => {
        expect(internal.extractNativeConfig(null)).to.be.null;
        expect(internal.extractNativeConfig({})).to.be.null;
      });

      it('should extract bidRequest.mediaTypes.native', () => {
        const bidRequest = {
          mediaTypes: {
            native: {
              image: {
                required: true
              },
              title: {
                required: true
              }
            }
          }
        };

        expect(internal.extractNativeConfig(bidRequest)).to.deep.equal(bidRequest.mediaTypes.native);
      });
    });

    describe('groupBidRequestsByPublisher', () => {
      it('should handle empty bidRequests', () => {
        expect(internal.groupBidRequestsByPublisher(null)).to.deep.equal({});
        expect(internal.groupBidRequestsByPublisher([])).to.deep.equal({})
      });

      it('should group given bidRequests by params.publisher', () => {
        const bidRequests = [
          {
            mediaTypes: {
              banner: {
                sizes: [[100, 100]]
              }
            },
            params: {
              publisher: 'publisher1',
              placement: '1111'
            }
          },
          {
            mediaTypes: {
              banner: {
                sizes: [[200, 200]]
              }
            },
            params: {
              publisher: 'publisher2',
              placement: '2222'
            }
          },
          {
            mediaTypes: {
              banner: {
                sizes: [[300, 300]]
              }
            },
            params: {
              publisher: 'publisher3',
              placement: '3333'
            }
          },
          {
            mediaTypes: {
              banner: {
                sizes: [[400, 400]]
              }
            },
            params: {
              publisher: 'publisher1',
              placement: '4444'
            }
          }
        ];

        expect(internal.groupBidRequestsByPublisher(bidRequests)).to.deep.equal({
          publisher1: [
            bidRequests[0],
            bidRequests[3]
          ],
          publisher2: [
            bidRequests[1],
          ],
          publisher3: [
            bidRequests[2],
          ],
        });
      });
    });

    describe('buildEndpointUrl', () => {
      it('should build endpoint url based on given publisher code', () => {
        expect(internal.buildEndpointUrl(1234)).to.be.equal('https://rtb.d.adup-tech.com/prebid/1234_bid');
        expect(internal.buildEndpointUrl('foobar')).to.be.equal('https://rtb.d.adup-tech.com/prebid/foobar_bid');
        expect(internal.buildEndpointUrl('foo bar')).to.be.equal('https://rtb.d.adup-tech.com/prebid/foo%20bar_bid');
      });
    });
  });

  describe('spec', () => {
    let adapter;

    beforeEach(() => {
      adapter = newBidder(spec);
    });

    describe('code', () => {
      it('should be correct', () => {
        expect(adapter.getSpec().code).to.equal(BIDDER_CODE);
      });
    });

    describe('supportedMediaTypes', () => {
      it('should be correct', () => {
        expect(adapter.getSpec().supportedMediaTypes).to.deep.equal([BANNER, NATIVE]);
      });
    });

    describe('inherited functions', () => {
      it('should exist and be a function', () => {
        expect(adapter.callBids).to.exist.and.to.be.a('function');
      });
    });

    describe('isBidRequestValid', () => {
      it('should be false on empty bid', () => {
        expect(spec.isBidRequestValid(null)).to.be.false;
        expect(spec.isBidRequestValid({})).to.be.false;
      });

      it('should be false if mediaTypes.banner and mediaTypes.native is missing', () => {
        expect(spec.isBidRequestValid({
          params: {
            publisher: 'test',
            placement: '1234'
          }
        })).to.be.false;
      });

      it('should be false if params missing', () => {
        expect(spec.isBidRequestValid({
          mediaTypes: {
            banner: {
              sizes: [[100, 200]]
            }
          },
        })).to.be.false;
      });

      it('should be false if params is invalid', () => {
        expect(spec.isBidRequestValid({
          mediaTypes: {
            banner: {
              sizes: [[100, 200]]
            }
          },
          params: 'bar'
        })).to.be.false;
      });

      it('should be false if params is empty', () => {
        expect(spec.isBidRequestValid({
          mediaTypes: {
            banner: {
              sizes: [[100, 200]]
            }
          },
          params: {}
        })).to.be.false;
      });

      it('should be false if params.publisher is missing', () => {
        expect(spec.isBidRequestValid({
          mediaTypes: {
            banner: {
              sizes: [[100, 200]]
            }
          },
          params: {
            placement: '1234'
          }
        })).to.be.false;
      });

      it('should be false if params.placement is missing', () => {
        expect(spec.isBidRequestValid({
          mediaTypes: {
            banner: {
              sizes: [[100, 200]]
            }
          },
          params: {
            publisher: 'test'
          }
        })).to.be.false;
      });

      it('should be true if mediaTypes.banner is given', () => {
        expect(spec.isBidRequestValid({
          mediaTypes: {
            banner: {
              sizes: [[100, 200]]
            }
          },
          params: {
            publisher: 'test',
            placement: '1234'
          }
        })).to.be.true;
      });

      it('should be true if mediaTypes.native is given', () => {
        expect(spec.isBidRequestValid({
          mediaTypes: {
            native: {
              image: {
                required: true
              },
              title: {
                required: true
              },
              clickUrl: {
                required: true
              },
              body: {
                required: true
              }
            }
          },
          params: {
            publisher: 'test',
            placement: '1234'
          }
        })).to.be.true;
      });
    });

    describe('buildRequests', () => {
      it('should handle empty validBidRequests', () => {
        expect(spec.buildRequests(null)).to.deep.equal([]);
        expect(spec.buildRequests([])).to.deep.equal([]);
      });

      it('should build one request per publisher', () => {
        const bidderRequest = {
          auctionId: 'auctionId123',
          refererInfo: {
            page: 'http://crazy.canonical.url',
            ref: 'http://crazy.referer.url'
          },
          gdprConsent: {
            consentString: 'consentString123',
            gdprApplies: true
          }
        };

        const validBidRequests = [
          {
            bidId: 'bidId1',
            adUnitCode: 'adUnitCode1',
            transactionId: 'transactionId1',
            mediaTypes: {
              banner: {
                sizes: [[100, 200], [300, 400]]
              }
            },
            params: {
              publisher: 'publisher1',
              placement: 'placement1'
            }
          },
          {
            bidId: 'bidId2',
            adUnitCode: 'adUnitCode2',
            transactionId: 'transactionId2',
            mediaTypes: {
              banner: {
                sizes: [[100, 200]]
              }
            },
            params: {
              publisher: 'publisher1',
              placement: 'placement2'
            }
          },
          {
            bidId: 'bidId3',
            adUnitCode: 'adUnitCode3',
            transactionId: 'transactionId3',
            mediaTypes: {
              native: {
                image: {
                  required: true
                },
                title: {
                  required: true
                },
                clickUrl: {
                  required: true
                },
                body: {
                  required: true
                }
              }
            },
            params: {
              publisher: 'publisher2',
              placement: 'placement3'
            }
          }
        ];

        expect(spec.buildRequests(validBidRequests, bidderRequest)).to.deep.equal([
          {
            url: internal.buildEndpointUrl(validBidRequests[0].params.publisher),
            method: ENDPOINT_METHOD,
            data: {
              auctionId: bidderRequest.auctionId,
              pageUrl: bidderRequest.refererInfo.page,
              referrer: bidderRequest.refererInfo.ref,
              gdpr: {
                consentString: bidderRequest.gdprConsent.consentString,
                consentRequired: bidderRequest.gdprConsent.gdprApplies
              },
              imp: [
                {
                  bidId: validBidRequests[0].bidId,
                  transactionId: validBidRequests[0].transactionId,
                  adUnitCode: validBidRequests[0].adUnitCode,
                  params: validBidRequests[0].params,
                  banner: validBidRequests[0].mediaTypes.banner
                },
                {
                  bidId: validBidRequests[1].bidId,
                  transactionId: validBidRequests[1].transactionId,
                  adUnitCode: validBidRequests[1].adUnitCode,
                  params: validBidRequests[1].params,
                  banner: validBidRequests[1].mediaTypes.banner
                }
              ]
            }
          },
          {
            url: internal.buildEndpointUrl(validBidRequests[2].params.publisher),
            method: ENDPOINT_METHOD,
            data: {
              auctionId: bidderRequest.auctionId,
              pageUrl: bidderRequest.refererInfo.page,
              referrer: bidderRequest.refererInfo.ref,
              gdpr: {
                consentString: bidderRequest.gdprConsent.consentString,
                consentRequired: bidderRequest.gdprConsent.gdprApplies
              },
              imp: [
                {
                  bidId: validBidRequests[2].bidId,
                  transactionId: validBidRequests[2].transactionId,
                  adUnitCode: validBidRequests[2].adUnitCode,
                  params: validBidRequests[2].params,
                  native: validBidRequests[2].mediaTypes.native
                }
              ]
            }
          }
        ]);
      });

      it('should build a request with floorPrices', () => {
        const bidderRequest = {
          auctionId: 'auctionId123',
          refererInfo: {
            page: 'http://crazy.canonical.url',
            ref: 'http://crazy.referer.url'
          },
          gdprConsent: {
            consentString: 'consentString123',
            gdprApplies: true
          }
        };

        const getFloorResponse = {
          currency: 'USD',
          floor: '1.23'
        };

        const validBidRequests = [
          {
            bidId: 'bidId1',
            adUnitCode: 'adUnitCode1',
            transactionId: 'transactionId1',
            mediaTypes: {
              banner: {
                sizes: [[100, 200], [300, 400]]
              }
            },
            params: {
              publisher: 'publisher1',
              placement: 'placement1'
            },
            getFloor: () => {
              return getFloorResponse
            }
          }
        ];

        expect(spec.buildRequests(validBidRequests, bidderRequest)).to.deep.equal([
          {
            url: internal.buildEndpointUrl(validBidRequests[0].params.publisher),
            method: ENDPOINT_METHOD,
            data: {
              auctionId: bidderRequest.auctionId,
              pageUrl: bidderRequest.refererInfo.page,
              referrer: bidderRequest.refererInfo.ref,
              gdpr: {
                consentString: bidderRequest.gdprConsent.consentString,
                consentRequired: bidderRequest.gdprConsent.gdprApplies
              },
              imp: [
                {
                  bidId: validBidRequests[0].bidId,
                  transactionId: validBidRequests[0].transactionId,
                  adUnitCode: validBidRequests[0].adUnitCode,
                  params: validBidRequests[0].params,
                  banner: validBidRequests[0].mediaTypes.banner,
                  floorPrice: getFloorResponse.floor
                }
              ]
            }
          }
        ]);
      });
    });

    describe('interpretResponse', () => {
      it('should handle empty serverResponse', () => {
        expect(spec.interpretResponse(null)).to.deep.equal([]);
        expect(spec.interpretResponse({})).to.deep.equal([]);
        expect(spec.interpretResponse({ body: {} })).to.deep.equal([]);
        expect(spec.interpretResponse({ body: { bids: [] } })).to.deep.equal([]);
      });

      it('should correctly interpret the server response', () => {
        const serverResponse = {
          body: {
            bids: [
              {
                bid: {
                  bidId: 'bidId1',
                  price: 0.12,
                  net: true,
                  currency: 'EUR',
                  ttl: 123
                },
                creative: {
                  id: 'creativeId1',
                  advertiserDomains: ['advertiser1.com', 'advertiser2.org'],
                  width: 100,
                  height: 200,
                  html: '<div>Hello World</div>'
                }
              },
              {
                bid: {
                  bidId: 'bidId2',
                  price: 0.99,
                  net: false,
                  currency: 'USD',
                  ttl: 465
                },
                creative: {
                  id: 'creativeId2',
                  advertiserDomains: ['advertiser3.com'],
                  native: {
                    title: 'Ad title',
                    body: 'Ad description',
                    displayUrl: 'Ad display url',
                    clickUrl: 'http://click.url/ad.html',
                    image: {
                      url: 'https://image.url/ad.png',
                      width: 123,
                      height: 456
                    },
                    sponsoredBy: 'Ad sponsored by',
                    impressionTrackers: [
                      'https://impression.tracking.url/1',
                      'https://impression.tracking.url/2',
                    ],
                    privacyLink: 'https://example.com/privacy',
                    privacyIcon: 'https://example.com/icon.png'
                  }
                }
              },
              null, // should be skipped
              {} // should be skipped
            ]
          }
        };

        expect(spec.interpretResponse(serverResponse)).to.deep.equal([
          {
            requestId: serverResponse.body.bids[0].bid.bidId,
            cpm: serverResponse.body.bids[0].bid.price,
            netRevenue: serverResponse.body.bids[0].bid.net,
            currency: serverResponse.body.bids[0].bid.currency,
            ttl: serverResponse.body.bids[0].bid.ttl,
            creativeId: serverResponse.body.bids[0].creative.id,
            meta: {
              advertiserDomains: serverResponse.body.bids[0].creative.advertiserDomains
            },
            mediaType: BANNER,
            width: serverResponse.body.bids[0].creative.width,
            height: serverResponse.body.bids[0].creative.height,
            ad: serverResponse.body.bids[0].creative.html
          },
          {
            requestId: serverResponse.body.bids[1].bid.bidId,
            cpm: serverResponse.body.bids[1].bid.price,
            netRevenue: serverResponse.body.bids[1].bid.net,
            currency: serverResponse.body.bids[1].bid.currency,
            ttl: serverResponse.body.bids[1].bid.ttl,
            creativeId: serverResponse.body.bids[1].creative.id,
            meta: {
              advertiserDomains: serverResponse.body.bids[1].creative.advertiserDomains
            },
            mediaType: NATIVE,
            native: serverResponse.body.bids[1].creative.native
          }
        ]);
      });
    });
  });
});
