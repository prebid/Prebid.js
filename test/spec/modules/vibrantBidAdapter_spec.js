import {expect} from 'chai';
import {spec} from 'modules/vibrantBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from 'src/mediaTypes.js';
import {INSTREAM, OUTSTREAM} from 'src/video.js';

const EXPECTED_PREBID_SERVER_URL = 'https://prebid.intellitxt.com';

describe('VibrantBidAdapter', function () {
  const adapter = newBidder(spec);

  const validBannerBidParams = Object.freeze({
    member: '1234',
    invCode: 'ABCD',
    placementId: '10433394'
  });

  const validVideoBidParams = Object.freeze({
    member: '1234',
    invCode: 'ABCD',
    placementId: '10433394',
    video: {
      skippable: false,
      playback_method: 'auto_play_sound_off'
    }
  });

  const validNativeBidParams = validBannerBidParams;

  const defaultBidRequestSizes = [[300, 250], [600, 240]];

  const validConsentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';

  const getValidBidderRequest = (bidRequests) => {
    return Object.freeze({
      bidderCode: 'vibrantmedia',
      auctionId: '1d1a030790a475',
      bidderRequestId: '22edbae2733bf6',
      timeout: 3000,
      gdprConsent: {
        consentString: validConsentString,
        vendorData: {},
        gdprApplies: true,
      },
      bids: bidRequests,
    });
  };

  describe('constants', function () {
    expect(spec.code).to.equal('vibrantmedia');
    expect(spec.supportedMediaTypes).to.deep.equal([BANNER, NATIVE, VIDEO]);
  });

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('transformBidParams', function () {
    it('transforms bid params correctly', function () {
      expect(spec.transformBidParams(validVideoBidParams)).to.deep.equal(validVideoBidParams);
    });
  })

  let bidRequest;

  beforeEach(function () {
    bidRequest = {
      bidder: 'vibrantmedia',
      params: {
        // Filled in by individual tests
      },
      mediaTypes: {
        // Filled in by individual tests
      },
      adUnitCode: 'test-div',
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
    };
  });

  describe('isBidRequestValid', function () {
    describe('with banner bid requests', function () {
      beforeEach(function () {
        bidRequest.mediaTypes.banner = {
          sizes: defaultBidRequestSizes,
        };
      });

      it('should return true for a valid banner bid request', function () {
        bidRequest.params = validBannerBidParams;
        expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
      });

      it('should return true for a valid banner bid request with a member id and inventory code', function () {
        bidRequest.params = {
          member: '1234',
          invCode: 'ABCD',
        };
        expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
      });

      it('should return true for a valid banner bid request with a placement id', function () {
        bidRequest.params = {
          placementId: '10433394',
        };
        expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
      });

      it('should return false for a valid banner bid request but with a member id and no inventory code', function () {
        bidRequest.params = {
          member: '1234',
        };
        expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
      });

      it('should return false for a valid banner bid request but with no member id and an inventory code', function () {
        bidRequest.params = {
          invCode: 'ABCD',
        };
        expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
      });

      it('should return false for a valid banner bid request but with no supported media types', function () {
        bidRequest.params = {
          placementId: '10433394',
        };
        delete bidRequest.mediaTypes.banner;
        bidRequest.mediaTypes.unsupported = {
          sizes: defaultBidRequestSizes,
        }
        expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
      });

      it('should return false for a valid banner bid request but with no params', function () {
        bidRequest.params = {};
        expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
      });
    });

    describe('with video bid requests', function () {
      describe('with sizes attribute', function () {
        const validVideoMediaTypes = {
          context: OUTSTREAM,
          sizes: defaultBidRequestSizes,
          minduration: 1,
          maxduration: 60,
          skip: 0,
          skipafter: 5,
          playbackmethod: [2],
          protocols: [1, 2, 3]
        };

        it('should return true for a valid video bid request', function () {
          bidRequest.params = validVideoBidParams;
          bidRequest.mediaTypes.video = validVideoMediaTypes;

          expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
        });

        it('should return false for an instream video bid request', function () {
          bidRequest.params = validVideoBidParams;
          bidRequest.mediaTypes.video = {
            context: INSTREAM,
            sizes: defaultBidRequestSizes,
          };

          expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
        });

        it('should return false for a video bid request with an unknown context', function () {
          bidRequest.params = validVideoBidParams;
          bidRequest.mediaTypes.video = {
            context: 'fake',
            sizes: defaultBidRequestSizes,
          };

          expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
        });

        it('should return false for a video bid request with no context', function () {
          bidRequest.params = validVideoBidParams;
          bidRequest.mediaTypes.video = {
            sizes: defaultBidRequestSizes,
          };

          expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
        });

        it('should return true for a valid video bid request with a member id and inventory code', function () {
          bidRequest.params = {
            member: '1234',
            invCode: 'ABCD',
          };
          bidRequest.mediaTypes.video = validVideoMediaTypes;

          expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
        });

        it('should return true for a valid video bid request with a placement id', function () {
          bidRequest.params = {
            placementId: '10433394',
          };
          bidRequest.mediaTypes.video = validVideoMediaTypes;

          expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
        });

        it('should return false for a valid video bid request but with a member id and no inventory code', function () {
          bidRequest.params = {
            member: '1234',
          };
          bidRequest.mediaTypes.video = validVideoMediaTypes;

          expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
        });

        it('should return false for a valid video bid request but with no member id and an inventory code', function () {
          bidRequest.params = {
            invCode: 'ABCD',
          };
          bidRequest.mediaTypes.video = validVideoMediaTypes;

          expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
        });

        it('should return false for a valid video bid request but with no params', function () {
          bidRequest.params = {};
          bidRequest.mediaTypes.video = validVideoMediaTypes;

          expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
        });
      });

      describe('with playerSize attribute', function () {
        const validVideoMediaTypes = {
          context: OUTSTREAM,
          playerSize: defaultBidRequestSizes,
          minduration: 1,
          maxduration: 60,
          skip: 0,
          skipafter: 5,
          playbackmethod: [2],
          protocols: [1, 2, 3]
        };

        beforeEach(function () {
          bidRequest.mediaTypes.video = {
            // Filled in by individual tests
          };
        });

        it('should return true for a valid video bid request', function () {
          bidRequest.params = validVideoBidParams;
          bidRequest.mediaTypes.video = validVideoMediaTypes;

          expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
        });

        it('should return false for an instream video bid request', function () {
          bidRequest.params = validVideoBidParams;
          bidRequest.mediaTypes.video = {
            context: INSTREAM,
            playerSize: defaultBidRequestSizes,
          };

          expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
        });

        it('should return false for a video bid request with an unknown context', function () {
          bidRequest.params = validVideoBidParams;
          bidRequest.mediaTypes.video = {
            context: 'fake',
            playerSize: defaultBidRequestSizes,
          };

          expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
        });

        it('should return false for a video bid request with no context', function () {
          bidRequest.params = validVideoBidParams;
          bidRequest.mediaTypes.video = {
            playerSize: defaultBidRequestSizes,
          };

          expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
        });

        it('should return true for a valid video bid request with a member id and inventory code', function () {
          bidRequest.params = {
            member: '1234',
            invCode: 'ABCD',
          };
          bidRequest.mediaTypes.video = validVideoMediaTypes;

          expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
        });

        it('should return true for a valid video bid request with a placement id', function () {
          bidRequest.params = {
            placementId: '10433394',
          };
          bidRequest.mediaTypes.video = validVideoMediaTypes;

          expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
        });

        it('should return false for a valid video bid request but with a member id and no inventory code', function () {
          bidRequest.params = {
            member: '1234',
          };
          bidRequest.mediaTypes.video = validVideoMediaTypes;

          expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
        });

        it('should return false for a valid video bid request but with no member id and an inventory code', function () {
          bidRequest.params = {
            invCode: 'ABCD',
          };
          bidRequest.mediaTypes.video = validVideoMediaTypes;

          expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
        });

        it('should return false for a valid video bid request but with no params', function () {
          bidRequest.params = {};
          bidRequest.mediaTypes.video = validVideoMediaTypes;

          expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
        });
      });
    });

    describe('with native bid requests', function () {
      beforeEach(function () {
        bidRequest.mediaTypes.native = {
          image: {
            required: true,
            // Sizes is filled in by individual tests
          },
          title: {
            required: true
          },
          sponsoredBy: {
            required: true
          },
          clickUrl: {
            required: true
          }
        };
      });

      it('should return true for a valid native bid request with a single size', function () {
        bidRequest.params = validNativeBidParams;
        bidRequest.mediaTypes.native.image.sizes = [300, 250];

        expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
      });

      it('should return true for a valid native bid request with multiple sizes', function () {
        bidRequest.params = validNativeBidParams;
        bidRequest.mediaTypes.native.image.sizes = [[300, 250], [300, 600]];

        expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
      });

      it('should return true for a valid native bid request with a member id and inventory code', function () {
        bidRequest.params = {
          member: '1234',
          invCode: 'ABCD',
        };
        bidRequest.mediaTypes.native.image.sizes = [300, 250];

        expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
      });

      it('should return true for a valid native bid request with a placement id', function () {
        bidRequest.params = {
          placementId: '10433394',
        };
        bidRequest.mediaTypes.native.image.sizes = [300, 250];

        expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
      });

      it('should return false for a valid native bid request but with a member id and no inventory code', function () {
        bidRequest.params = {
          member: '1234',
        };
        bidRequest.mediaTypes.native.image.sizes = [300, 250];

        expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
      });

      it('should return false for a valid native bid request but with no member id and an inventory code', function () {
        bidRequest.params = {
          invCode: 'ABCD',
        };
        bidRequest.mediaTypes.native.image.sizes = [300, 250];

        expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
      });

      it('should return false for a valid native bid request but with no params', function () {
        bidRequest.params = {};
        bidRequest.mediaTypes.native.image.sizes = [300, 250];

        expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
      });

      it('should return false for a native bid request with no image property', function () {
        bidRequest.params = validNativeBidParams;
        delete bidRequest.mediaTypes.native.image;

        expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
      });
    });
  });

  describe('buildRequests', function () {
    let bidRequests;

    beforeEach(function () {
      bidRequests = [bidRequest];

      bidRequests[0].params = validBannerBidParams;
      bidRequests[0].mediaTypes.banner = {
        sizes: defaultBidRequestSizes,
      };
    });

    it('should use HTTP POST', function () {
      const request = spec.buildRequests(bidRequests, {});
      expect(request.method).to.equal('POST');
    });

    it('should use the correct prebid server URL', function () {
      const request = spec.buildRequests(bidRequests, {});
      expect(request.url).to.equal(EXPECTED_PREBID_SERVER_URL);
    });

    it('should add the page URL to the server request', function () {
      const request = spec.buildRequests(bidRequests, {});
      const payload = JSON.parse(request.data);

      expect(payload.url).to.exist;
      expect(payload.url).to.be.a('string');
    })

    it('should add GDPR consent to the server request', function () {
      const bidderRequest = {
        bidderCode: 'vibrantmedia',
        auctionId: '1d1a030790a475',
        bidderRequestId: '22edbae2733bf6',
        timeout: 3000,
        gdprConsent: {
          consentString: validConsentString,
          gdprApplies: true,
        },
        bids: bidRequests,
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      // TODO: Check that we should not be implementing withCredentials
      // expect(request.options).to.deep.equal({withCredentials: true});

      const payload = JSON.parse(request.data);
      expect(payload.gdpr).to.exist;
      expect(payload.gdpr.consentString).to.exist.and.to.equal(validConsentString);
      expect(payload.gdpr.gdprApplies).to.exist.and.to.be.true;
    });

    it('should add window dimensions to the server request', function () {
      const request = spec.buildRequests(bidRequests, {});
      const payload = JSON.parse(request.data);

      expect(payload.window).to.exist;
      expect(payload.window.width).to.equal(window.innerWidth);
      expect(payload.window.height).to.equal(window.innerHeight);
    });

    it('should add the top-level sizes to the bid request, if present', function () {
      bidRequest.params = validBannerBidParams;
      bidRequest.sizes = defaultBidRequestSizes;
      bidRequest.mediaTypes = {
        banner: {},
      };

      const request = spec.buildRequests(bidRequests, {}, true);
      const payload = JSON.parse(request.data);

      expect(payload.biddata).to.exist;
      expect(payload.biddata.length).to.equal(1);
      expect(payload.biddata[0]).to.exist;
      expect(payload.biddata[0].code).to.equal(bidRequest.adUnitCode);
      expect(payload.biddata[0].id).to.equal(bidRequest.bidId);
      expect(payload.biddata[0].bidder).to.equal(bidRequest.bidder);
      expect(payload.biddata[0].sizes).to.deep.equal(defaultBidRequestSizes);
      expect(payload.biddata[0].mediaTypes).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.deep.equal({});
    });

    it('should add the list of bids to the bid request, if present', function () {
      const testBid = {
        bidder: 'testBidder',
        params: {
          placement: '12345'
        }
      };

      bidRequest.params = validBannerBidParams;
      bidRequest.bids = [testBid];
      bidRequest.mediaTypes = {
        banner: {},
      };

      // These will be present in the list of bids instead
      delete bidRequest.bidId;
      delete bidRequest.transactionId;
      delete bidRequest.bidder;

      const request = spec.buildRequests(bidRequests, {}, true);
      const payload = JSON.parse(request.data);

      expect(payload.biddata).to.exist;
      expect(payload.biddata.length).to.equal(1);
      expect(payload.biddata[0]).to.exist;
      expect(payload.biddata[0].code).to.equal(bidRequest.adUnitCode);
      expect(payload.biddata[0].id).to.equal(bidRequest.bidId);
      expect(payload.biddata[0].bidder).to.equal(bidRequest.bidder);
      expect(payload.biddata[0].bids.length).to.equal(1);
      expect(payload.biddata[0].bids[0]).to.deep.equal(testBid);
      expect(payload.biddata[0].mediaTypes).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.deep.equal({});
    });

    it('should add the correct bid data to the server request for one bid request', function () {
      bidRequest.params = validBannerBidParams;
      bidRequest.mediaTypes = {
        banner: {
          sizes: defaultBidRequestSizes,
        },
      };

      const request = spec.buildRequests(bidRequests, {}, true);
      const payload = JSON.parse(request.data);

      expect(payload.biddata).to.exist;
      expect(payload.biddata.length).to.equal(1);
      expect(payload.biddata[0]).to.exist;
      expect(payload.biddata[0].code).to.equal(bidRequest.adUnitCode);
      expect(payload.biddata[0].id).to.equal(bidRequest.bidId);
      expect(payload.biddata[0].bidder).to.equal(bidRequest.bidder);
      expect(payload.biddata[0].sizes).to.be.undefined;
      expect(payload.biddata[0].mediaTypes).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.deep.equal({
        sizes: defaultBidRequestSizes,
      });
    });

    it('should add the correct bid data to the server request for multiple bid requests', function () {
      bidRequest.params = validBannerBidParams;
      bidRequest.mediaTypes = {
        banner: {
          sizes: defaultBidRequestSizes,
        },
      };
      const bid2 = {
        bidder: 'vibrantmedia',
        params: validVideoBidParams,
        mediaTypes: {
          video: {
            context: OUTSTREAM,
            sizes: defaultBidRequestSizes,
          }
        },
        adUnitCode: 'video-div',
        bidId: '30b31c1838de1f',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
      };
      const bid3 = {
        bidder: 'vibrantmedia',
        params: validNativeBidParams,
        mediaTypes: {
          native: {
            image: {
              required: true,
              sizes: [300, 250]
            },
            title: {
              required: true
            },
            sponsoredBy: {
              required: true
            },
            clickUrl: {
              required: true
            }
          }
        },
        adUnitCode: 'native-div',
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
      };

      bidRequests.push(bid2, bid3);

      const request = spec.buildRequests(bidRequests, {}, true);
      const payload = JSON.parse(request.data);

      expect(payload.biddata).to.exist;
      expect(payload.biddata.length).to.equal(3);
      expect(payload.biddata[0]).to.exist;
      expect(payload.biddata[0].code).to.equal(bidRequest.adUnitCode);
      expect(payload.biddata[0].id).to.equal(bidRequest.bidId);
      expect(payload.biddata[0].bidder).to.equal(bidRequest.bidder);
      expect(payload.biddata[0].mediaTypes).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.deep.equal({
        sizes: defaultBidRequestSizes,
      });
      expect(payload.biddata[1]).to.exist;
      expect(payload.biddata[1].code).to.equal(bid2.adUnitCode);
      expect(payload.biddata[1].id).to.equal(bid2.bidId);
      expect(payload.biddata[1].bidder).to.equal(bid2.bidder);
      expect(payload.biddata[1].mediaTypes).to.exist;
      expect(payload.biddata[1].mediaTypes[VIDEO]).to.exist;
      expect(payload.biddata[1].mediaTypes[VIDEO]).to.deep.equal({
        context: OUTSTREAM,
        sizes: defaultBidRequestSizes,
      });
      expect(payload.biddata[2]).to.exist;
      expect(payload.biddata[2].code).to.equal(bid3.adUnitCode);
      expect(payload.biddata[2].id).to.equal(bid3.bidId);
      expect(payload.biddata[2].bidder).to.equal(bid3.bidder);
      expect(payload.biddata[2].mediaTypes[NATIVE]).to.exist;
      expect(payload.biddata[2].mediaTypes[NATIVE]).to.deep.equal(bid3.mediaTypes.native);
    });

    it('should add the correct bid data to the bid request where a bid has multiple media types', function () {
      bidRequest.params = validVideoBidParams;
      bidRequest.mediaTypes = {
        banner: {
          sizes: defaultBidRequestSizes,
        },
        video: {
          context: OUTSTREAM,
          sizes: defaultBidRequestSizes,
        },
        native: {
          image: {
            required: true,
            sizes: [300, 250]
          },
          title: {
            required: true
          },
          sponsoredBy: {
            required: true
          },
          clickUrl: {
            required: true
          }
        }
      };
      bidRequest.adUnitCode = 'mixed-div';

      const bid2 = {
        bidder: 'vibrantmedia',
        params: validVideoBidParams,
        mediaTypes: {
          video: {
            context: OUTSTREAM,
            sizes: defaultBidRequestSizes,
          }
        },
        adUnitCode: 'video-div',
        bidId: '30b31c1838de1f',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
      };

      bidRequests.push(bid2);

      const request = spec.buildRequests(bidRequests, {}, true);
      const payload = JSON.parse(request.data);

      expect(payload.biddata).to.exist;
      expect(payload.biddata.length).to.equal(2);
      expect(payload.biddata[0]).to.exist;
      expect(payload.biddata[0].code).to.equal(bidRequest.adUnitCode);
      expect(payload.biddata[0].id).to.equal(bidRequest.bidId);
      expect(payload.biddata[0].bidder).to.equal(bidRequest.bidder);
      expect(payload.biddata[0].mediaTypes).to.exist;
      expect(Object.keys(payload.biddata[0].mediaTypes).length).to.equal(3);
      expect(payload.biddata[0].mediaTypes[BANNER]).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.deep.equal({
        sizes: defaultBidRequestSizes,
      });
      expect(payload.biddata[0].mediaTypes[VIDEO]).to.exist;
      expect(payload.biddata[0].mediaTypes[VIDEO]).to.deep.equal({
        context: OUTSTREAM,
        sizes: defaultBidRequestSizes,
      });
      expect(payload.biddata[0].code).to.equal(bidRequest.adUnitCode);
      expect(payload.biddata[0].id).to.equal(bidRequest.bidId);
      expect(payload.biddata[0].bidder).to.equal(bidRequest.bidder);
      expect(payload.biddata[0].mediaTypes[NATIVE]).to.exist;
      expect(payload.biddata[0].mediaTypes[NATIVE]).to.deep.equal(bidRequest.mediaTypes.native);
      expect(payload.biddata[1]).to.exist;
      expect(payload.biddata[1].code).to.equal(bid2.adUnitCode);
      expect(payload.biddata[1].id).to.equal(bid2.bidId);
      expect(payload.biddata[1].bidder).to.equal(bid2.bidder);
      expect(payload.biddata[1].mediaTypes).to.exist;
      expect(Object.keys(payload.biddata[1].mediaTypes).length).to.equal(1);
      expect(payload.biddata[1].mediaTypes[VIDEO]).to.exist;
      expect(payload.biddata[1].mediaTypes[VIDEO]).to.deep.equal({
        context: OUTSTREAM,
        sizes: defaultBidRequestSizes,
      });
    });
  });

  describe('interpretResponse', function () {
    it('returns a valid Prebid API response object for a banner Prebid Server response', function () {
      const prebidServerResponse = Object.freeze({
        body: Object.freeze({
          bids: [Object.freeze({
            mediaType: 'banner',
            requestId: '12345',
            cpm: 0.12,
            currency: 'USD',
            width: 640,
            height: 240,
            ad: '<!DOCTYPE html><html><head><title>Test Banner Ad Unit</title></head><body>Hello!</body></html>',
            ttl: 300,
            creativeId: '86f4aef9-2f17-421d-84db-5c9814bf4a79',
            netRevenue: false,
            meta: {
              advertiser: '105600',
              width: 300,
              height: 250,
              isCustom: '1',
              progressBar: false,
              mpuSrc: '//images.intellitxt.com/a/105600/Genpact/genpact.jpg',
              clickURL: '{{click}}'
            }
          })],
        }),
      });

      const interpretedResponse = spec.interpretResponse(prebidServerResponse, {});

      expect(interpretedResponse).to.be.a('array');
      expect(interpretedResponse.length).to.equal(1);

      const interpretedBid = interpretedResponse[0];

      expect(interpretedBid.mediaType).to.equal(prebidServerResponse.body.bids[0].mediaType);
      expect(interpretedBid.requestId).to.equal(prebidServerResponse.body.bids[0].requestId);
      expect(interpretedBid.cpm).to.equal(prebidServerResponse.body.bids[0].cpm);
      expect(interpretedBid.currency).to.equal(prebidServerResponse.body.bids[0].currency);
      expect(interpretedBid.width).to.equal(prebidServerResponse.body.bids[0].width);
      expect(interpretedBid.height).to.equal(prebidServerResponse.body.bids[0].height);
      expect(interpretedBid.ad).to.equal(prebidServerResponse.body.bids[0].ad);
      expect(interpretedBid.ttl).to.equal(prebidServerResponse.body.bids[0].ttl);
      expect(interpretedBid.creativeId).to.equal(prebidServerResponse.body.bids[0].creativeId);
      expect(interpretedBid.netRevenue).to.equal(prebidServerResponse.body.bids[0].netRevenue);
      expect(interpretedBid.meta).to.deep.equal(prebidServerResponse.body.bids[0].meta);
      expect(interpretedBid.renderer).to.be.undefined;
      expect(interpretedBid.adResponse).to.deep.equal(prebidServerResponse.body);
    });

    it('returns a valid Prebid API response object for a video Prebid Server response', function () {
      const validPrebidServerResponse = Object.freeze({
        body: {
          bids: [{
            'video': {
              '12345': [{
                'ads': [{
                  'width': defaultBidRequestSizes[0][0],
                  'height': defaultBidRequestSizes[0][1],
                  'clickUrl': 'test.example.com/abc',
                  'displayUrl': 'test.example.com/abc',
                  'creative': {
                    'implementationType': 'internal',
                    'creativeTypeId': 1,
                    'value': 'd28e8e0c-2f17-421d-84db-5c9814bf4a79',
                    'diyValues': null,
                    'instreamValues': null,
                    'setValues': {}
                  },
                  'bidPrice': 0.30
                }],
                'vibrantParameters': {
                  'setId': 371480,
                  'product': 11,
                  'category': 1419,
                  'keywordId': 'abc',
                  'keyword': 'test',
                  'adProviderId': 1,
                  'hookId': '28de95fa-4919-46a0-8b3a-c49b4de95e24'
                },
                'differentSettings': {},
                'priority': 0,
                'setType': 0
              }]
            }
          }]
        }
      });

      const expectedServerTranslation = [{
        cpm: void 0,
        creativeId: void 0,
        currency: 'USD',
        dealId: void 0,
        meta: {
          advertiserDomains: []
        },
        netRevenue: true,
        requestId: void 0,
        ttl: 300,
      }];

      expect(spec.interpretResponse(validPrebidServerResponse, {})).to.deep.equal(expectedServerTranslation);
    });

    it('returns a valid Prebid API response object for a native Prebid Server response', function () {
      const validPrebidServerResponse = Object.freeze({
        body: {
          bids: [{
            'native': {
              '12345': [{
                'ads': [{
                  'width': defaultBidRequestSizes[0][0],
                  'height': defaultBidRequestSizes[0][1],
                  'clickUrl': 'test.example.com/abc',
                  'displayUrl': 'test.example.com/abc',
                  'creative': {
                    'implementationType': 'internal',
                    'creativeTypeId': 1,
                    'value': 'd28e8e0c-2f17-421d-84db-5c9814bf4a79',
                    'diyValues': null,
                    'instreamValues': null,
                    'setValues': {}
                  },
                  'bidPrice': 0.30
                }],
                'vibrantParameters': {
                  'setId': 371480,
                  'product': 11,
                  'category': 1419,
                  'keywordId': 'abc',
                  'keyword': 'test',
                  'adProviderId': 1,
                  'hookId': '28de95fa-4919-46a0-8b3a-c49b4de95e24'
                },
                'differentSettings': {},
                'priority': 0,
                'setType': 0
              }]
            }
          }]
        }
      });

      const expectedServerTranslation = [{
        cpm: void 0,
        creativeId: void 0,
        currency: 'USD',
        dealId: void 0,
        meta: {
          advertiserDomains: []
        },
        netRevenue: true,
        requestId: void 0,
        ttl: 300,
      }];

      expect(spec.interpretResponse(validPrebidServerResponse, {})).to.deep.equal(expectedServerTranslation);
    });

    it('returns a valid Prebid API response object for a multi-bid Prebid Server response', function () {
      const validPrebidServerResponse = Object.freeze({
        body: {
          bids: [
            {
              'outstream': {
                '12345': [{
                  'ads': [{
                    'width': defaultBidRequestSizes[0][0],
                    'height': defaultBidRequestSizes[0][1],
                    'clickUrl': 'test.example.com/abc',
                    'displayUrl': 'test.example.com/abc',
                    'creative': {
                      'implementationType': 'internal',
                      'creativeTypeId': 1,
                      'value': 'd28e8e0c-2f17-421d-84db-5c9814bf4a79',
                      'diyValues': null,
                      'instreamValues': null,
                      'setValues': {}
                    },
                    'bidPrice': 0.30
                  }],
                  'vibrantParameters': {
                    'setId': 371480,
                    'product': 11,
                    'category': 1419,
                    'keywordId': 'abc',
                    'keyword': 'test',
                    'adProviderId': 1,
                    'hookId': '28de95fa-4919-46a0-8b3a-c49b4de95e24'
                  },
                  'differentSettings': {},
                  'priority': 0,
                  'setType': 0
                }]
              }
            },
            {
              'native': {
                '12345': [{
                  'ads': [{
                    'width': defaultBidRequestSizes[0][0],
                    'height': defaultBidRequestSizes[0][1],
                    'clickUrl': 'test.example.com/abc',
                    'displayUrl': 'test.example.com/abc',
                    'creative': {
                      'implementationType': 'internal',
                      'creativeTypeId': 1,
                      'value': 'd28e8e0c-2f17-421d-84db-5c9814bf4a79',
                      'diyValues': null,
                      'instreamValues': null,
                      'setValues': {}
                    },
                    'bidPrice': 0.30
                  }],
                  'vibrantParameters': {
                    'setId': 371480,
                    'product': 11,
                    'category': 1419,
                    'keywordId': 'abc',
                    'keyword': 'test',
                    'adProviderId': 1,
                    'hookId': '28de95fa-4919-46a0-8b3a-c49b4de95e24'
                  },
                  'differentSettings': {},
                  'priority': 0,
                  'setType': 0
                }]
              }
            }
          ]
        }
      });

      const expectedServerTranslation = [
        {
          cpm: void 0,
          creativeId: void 0,
          currency: 'USD',
          dealId: void 0,
          meta: {
            advertiserDomains: []
          },
          netRevenue: true,
          requestId: void 0,
          ttl: 300,
        },
        {
          cpm: void 0,
          creativeId: void 0,
          currency: 'USD',
          dealId: void 0,
          meta: {
            advertiserDomains: []
          },
          netRevenue: true,
          requestId: void 0,
          ttl: 300,
        }
      ];

      expect(spec.interpretResponse(validPrebidServerResponse, {})).to.deep.equal(expectedServerTranslation);
    });
  });

  describe('Flow tests', function () {
    describe('For successive API calls to the public functions', function () {
      it('should succeed with one media type per bid', function () {
        const transformedBannerBidParams = spec.transformBidParams(validBannerBidParams);
        const transformedVideoBidParams = spec.transformBidParams(validVideoBidParams);
        const transformedNativeBidParams = spec.transformBidParams(validNativeBidParams);

        const bannerBid = {
          bidder: 'vibrantmedia',
          params: transformedBannerBidParams,
          mediaTypes: {
            banner: {
              sizes: defaultBidRequestSizes,
            },
          },
          adUnitCode: 'banner-div',
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
        };
        const videoBid = {
          bidder: 'vibrantmedia',
          params: transformedVideoBidParams,
          mediaTypes: {
            video: {
              context: OUTSTREAM,
              sizes: defaultBidRequestSizes,
            },
          },
          adUnitCode: 'video-div',
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
        };
        const nativeBid = {
          bidder: 'vibrantmedia',
          params: transformedNativeBidParams,
          mediaTypes: {
            native: {
              image: {
                required: true,
                sizes: [300, 250]
              },
              title: {
                required: true
              },
              sponsoredBy: {
                required: true
              },
              clickUrl: {
                required: true
              }
            }
          },
          adUnitCode: 'native-div',
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
        };

        expect(spec.isBidRequestValid(bannerBid)).to.be.true;
        expect(spec.isBidRequestValid(videoBid)).to.be.true;
        expect(spec.isBidRequestValid(nativeBid)).to.be.true;

        const bidRequests = [bannerBid, videoBid, nativeBid];
        const validBidderRequest = getValidBidderRequest(bidRequests);
        const serverRequest = spec.buildRequests(bidRequests, validBidderRequest);
        expect(serverRequest.method).to.equal('POST');
        expect(serverRequest.url).to.equal(EXPECTED_PREBID_SERVER_URL);

        const payload = JSON.parse(serverRequest.data);
        expect(payload.biddata).to.exist;
        expect(payload.biddata.length).to.equal(3);
        expect(payload.biddata[0]).to.exist;
        expect(payload.biddata[0].code).to.equal(bannerBid.adUnitCode);
        expect(payload.biddata[0].id).to.equal(bannerBid.bidId);
        expect(payload.biddata[0].bidder).to.equal(bannerBid.bidder);
        expect(payload.biddata[0].mediaTypes[BANNER]).to.exist;
        expect(payload.biddata[0].mediaTypes[BANNER]).to.deep.equal({
          sizes: defaultBidRequestSizes,
        });
        expect(payload.biddata[1]).to.exist;
        expect(payload.biddata[1].code).to.equal(videoBid.adUnitCode);
        expect(payload.biddata[1].id).to.equal(videoBid.bidId);
        expect(payload.biddata[1].bidder).to.equal(videoBid.bidder);
        expect(payload.biddata[1].mediaTypes[VIDEO]).to.exist;
        expect(payload.biddata[1].mediaTypes[VIDEO]).to.deep.equal({
          context: OUTSTREAM,
          sizes: defaultBidRequestSizes
        });
        expect(payload.biddata[2]).to.exist;
        expect(payload.biddata[2].code).to.equal(nativeBid.adUnitCode);
        expect(payload.biddata[2].id).to.equal(nativeBid.bidId);
        expect(payload.biddata[2].bidder).to.equal(nativeBid.bidder);
        expect(payload.biddata[2].mediaTypes[NATIVE]).to.exist;
        expect(payload.biddata[2].mediaTypes[NATIVE]).to.deep.equal(nativeBid.mediaTypes.native);

        // From here, the API would call the Prebid Server and call interpretResponse, which is covered by tests elsewhere
      });

      it('should succeed with multiple media types for a single bid', function () {
        const bidParams = spec.transformBidParams(validVideoBidParams);
        const bid = {
          bidder: 'vibrantmedia',
          params: bidParams,
          mediaTypes: {
            banner: {
              sizes: defaultBidRequestSizes
            },
            video: {
              context: OUTSTREAM,
              sizes: defaultBidRequestSizes
            },
            native: {
              sizes: defaultBidRequestSizes
            }
          },
          adUnitCode: 'test-div',
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
        };

        expect(spec.isBidRequestValid(bid)).to.be.true;

        const bidRequests = [bid];
        const validBidderRequest = getValidBidderRequest(bidRequests);
        const serverRequest = spec.buildRequests(bidRequests, validBidderRequest);
        expect(serverRequest.method).to.equal('POST');
        expect(serverRequest.url).to.equal(EXPECTED_PREBID_SERVER_URL);

        const payload = JSON.parse(serverRequest.data);
        expect(payload.biddata).to.exist;
        expect(payload.biddata.length).to.equal(1);
        expect(payload.biddata[0]).to.exist;
        expect(payload.biddata[0].code).to.equal(bid.adUnitCode);
        expect(payload.biddata[0].id).to.equal(bid.bidId);
        expect(payload.biddata[0].bidder).to.equal(bid.bidder);
        expect(payload.biddata[0].mediaTypes[BANNER]).to.exist;
        expect(payload.biddata[0].mediaTypes[BANNER]).to.deep.equal({
          sizes: defaultBidRequestSizes,
        });
        expect(payload.biddata[0].mediaTypes[VIDEO]).to.exist;
        expect(payload.biddata[0].mediaTypes[VIDEO]).to.deep.equal({
          context: OUTSTREAM,
          sizes: defaultBidRequestSizes,
        });
        expect(payload.biddata[0].mediaTypes[NATIVE]).to.exist;
        expect(payload.biddata[0].mediaTypes[NATIVE]).to.deep.equal({
          sizes: defaultBidRequestSizes,
        });

        // From here, the API would call the Prebid Server and call interpretResponse, which is covered by tests elsewhere
      });
    });
  });
});
