import {expect} from 'chai';
import {spec} from 'modules/vibrantmediaBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from 'src/mediaTypes.js';
import {INSTREAM, OUTSTREAM} from 'src/video.js';

const EXPECTED_PREBID_SERVER_URL = 'https://prebid.intellitxt.com/prebid';

const BANNER_AD =
  '<!DOCTYPE html><html lang="en"><head><title>Test Banner Ad Unit</title></head><body>Hello!</body></html>';
const VIDEO_AD = '<!DOCTYPE html><html lang="en"><head><title>Test Video Ad Unit</title></head>' +
  '<script type="text/javascript" src="https://www.example.com/myvideo.mp3"></script></body></html>';

const VALID_BANNER_BID_PARAMS = Object.freeze({
  member: '1234',
  invCode: 'ABCD',
  placementId: '10433394'
});

const VALID_VIDEO_BID_PARAMS = Object.freeze({
  member: '1234',
  invCode: 'ABCD',
  placementId: '10433394',
  video: {
    skippable: false,
    playback_method: 'auto_play_sound_off'
  }
});

const VALID_NATIVE_BID_PARAMS = VALID_BANNER_BID_PARAMS;

const DEFAULT_BID_SIZES = [[300, 250], [600, 240]];

const VALID_CONSENT_STRING = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';

const getValidBidderRequest = (bidRequests) => {
  return Object.freeze({
    bidderCode: 'vibrantmedia',
    auctionId: '1d1a030790a475',
    bidderRequestId: '22edbae2733bf6',
    timeout: 3000,
    gdprConsent: {
      consentString: VALID_CONSENT_STRING,
      vendorData: {},
      gdprApplies: true,
    },
    bids: bidRequests,
  });
};

describe('VibrantMediaBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('constants', function () {
    expect(spec.code).to.equal('vibrantmedia');
    expect(spec.supportedMediaTypes).to.deep.equal([BANNER, NATIVE, VIDEO]);
  });

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

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
      transactionId: '13579acef87623',
      placementId: '7623587623857',
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475'
    };
  });

  describe('isBidRequestValid', function () {
    describe('with banner bid requests', function () {
      beforeEach(function () {
        bidRequest.mediaTypes.banner = {
          sizes: DEFAULT_BID_SIZES,
        };
      });

      it('should return true for a valid banner bid request', function () {
        bidRequest.params = VALID_BANNER_BID_PARAMS;
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
          sizes: DEFAULT_BID_SIZES,
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
          sizes: DEFAULT_BID_SIZES,
          minduration: 1,
          maxduration: 60,
          skip: 0,
          skipafter: 5,
          playbackmethod: [2],
          protocols: [1, 2, 3]
        };

        it('should return true for a valid video bid request', function () {
          bidRequest.params = VALID_VIDEO_BID_PARAMS;
          bidRequest.mediaTypes.video = validVideoMediaTypes;

          expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
        });

        it('should return false for an instream video bid request', function () {
          bidRequest.params = VALID_VIDEO_BID_PARAMS;
          bidRequest.mediaTypes.video = {
            context: INSTREAM,
            sizes: DEFAULT_BID_SIZES,
          };

          expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
        });

        it('should return false for a video bid request with an unknown context', function () {
          bidRequest.params = VALID_VIDEO_BID_PARAMS;
          bidRequest.mediaTypes.video = {
            context: 'fake',
            sizes: DEFAULT_BID_SIZES,
          };

          expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
        });

        it('should return false for a video bid request with no context', function () {
          bidRequest.params = VALID_VIDEO_BID_PARAMS;
          bidRequest.mediaTypes.video = {
            sizes: DEFAULT_BID_SIZES,
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
          playerSize: DEFAULT_BID_SIZES,
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
          bidRequest.params = VALID_VIDEO_BID_PARAMS;
          bidRequest.mediaTypes.video = validVideoMediaTypes;

          expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
        });

        it('should return false for an instream video bid request', function () {
          bidRequest.params = VALID_VIDEO_BID_PARAMS;
          bidRequest.mediaTypes.video = {
            context: INSTREAM,
            playerSize: DEFAULT_BID_SIZES,
          };

          expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
        });

        it('should return false for a video bid request with an unknown context', function () {
          bidRequest.params = VALID_VIDEO_BID_PARAMS;
          bidRequest.mediaTypes.video = {
            context: 'fake',
            playerSize: DEFAULT_BID_SIZES,
          };

          expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
        });

        it('should return false for a video bid request with no context', function () {
          bidRequest.params = VALID_VIDEO_BID_PARAMS;
          bidRequest.mediaTypes.video = {
            playerSize: DEFAULT_BID_SIZES,
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
        bidRequest.params = VALID_NATIVE_BID_PARAMS;
        bidRequest.mediaTypes.native.image.sizes = [300, 250];

        expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
      });

      it('should return true for a valid native bid request with multiple sizes', function () {
        bidRequest.params = VALID_NATIVE_BID_PARAMS;
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
        bidRequest.params = VALID_NATIVE_BID_PARAMS;
        delete bidRequest.mediaTypes.native.image;

        expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
      });
    });
  });

  describe('buildRequests', function () {
    let bidRequests;

    beforeEach(function () {
      bidRequests = [bidRequest];

      bidRequests[0].params = VALID_BANNER_BID_PARAMS;
      bidRequests[0].mediaTypes.banner = {
        sizes: DEFAULT_BID_SIZES,
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
    });

    it('should add GDPR consent to the server request, where present', function () {
      const bidderRequest = {
        bidderCode: 'vibrantmedia',
        auctionId: '1d1a030790a475',
        bidderRequestId: '22edbae2733bf6',
        timeout: 3000,
        gdprConsent: {
          consentString: VALID_CONSENT_STRING,
          gdprApplies: true,
        },
        bids: bidRequests,
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      // TODO: Check that we should not be implementing withCredentials
      // expect(request.options).to.deep.equal({withCredentials: true});

      const payload = JSON.parse(request.data);
      expect(payload.gdpr).to.exist;
      expect(payload.gdpr.consentString).to.exist.and.to.equal(VALID_CONSENT_STRING);
      expect(payload.gdpr.gdprApplies).to.exist.and.to.be.true;
    });

    it('should add USP consent to the server request, where present', function () {
      const bidderRequest = {
        bidderCode: 'vibrantmedia',
        auctionId: '1d1a030790a475',
        bidderRequestId: '22edbae2733bf6',
        timeout: 3000,
        uspConsent: {
          cmpApi: 'iab',
          timeout: 10000,
          consentData: {
            testDatum: true
          }
        },
        bids: bidRequests
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      // TODO: Check that we should not be implementing withCredentials
      // expect(request.options).to.deep.equal({withCredentials: true});

      const payload = JSON.parse(request.data);
      expect(payload.usp).to.exist;
      expect(payload.usp.cmpApi).to.exist.and.to.equal('iab');
      expect(payload.usp.timeout).to.exist.and.to.equal(10000);
      expect(payload.usp.consentData).to.exist.and.to.deep.equal({
        testDatum: true
      });
    });

    it('should add GDPR and USP consent to the server request, where both present', function () {
      const bidderRequest = {
        bidderCode: 'vibrantmedia',
        auctionId: '1d1a030790a475',
        bidderRequestId: '22edbae2733bf6',
        timeout: 3000,
        gdprConsent: {
          consentString: VALID_CONSENT_STRING,
          gdprApplies: true,
        },
        uspConsent: {
          cmpApi: 'iab',
          timeout: 10000,
          consentData: {
            testDatum: true
          }
        },
        bids: bidRequests,
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      // TODO: Check that we should not be implementing withCredentials
      // expect(request.options).to.deep.equal({withCredentials: true});

      const payload = JSON.parse(request.data);

      expect(payload.gdpr).to.exist;
      expect(payload.gdpr.consentString).to.exist.and.to.equal(VALID_CONSENT_STRING);
      expect(payload.gdpr.gdprApplies).to.exist.and.to.be.true;

      expect(payload.usp).to.exist;
      expect(payload.usp.cmpApi).to.exist.and.to.equal('iab');
      expect(payload.usp.timeout).to.exist.and.to.equal(10000);
      expect(payload.usp.consentData).to.exist.and.to.deep.equal({
        testDatum: true
      });
    });

    it('should add window dimensions to the server request', function () {
      const request = spec.buildRequests(bidRequests, {});
      const payload = JSON.parse(request.data);

      expect(payload.window).to.exist;
      expect(payload.window.width).to.equal(window.innerWidth);
      expect(payload.window.height).to.equal(window.innerHeight);
    });

    it('should add the top-level sizes to the bid request, if present', function () {
      bidRequest.params = VALID_BANNER_BID_PARAMS;
      bidRequest.sizes = DEFAULT_BID_SIZES;
      bidRequest.mediaTypes = {
        banner: {},
      };

      const request = spec.buildRequests(bidRequests, {}, true);
      const payload = JSON.parse(request.data);

      expect(payload.biddata).to.exist;
      expect(payload.biddata.length).to.equal(1);
      expect(payload.biddata[0]).to.exist;
      expect(payload.biddata[0].code).to.equal(bidRequest.adUnitCode);
      expect(payload.biddata[0].id).to.equal(bidRequest.placementId);
      expect(payload.biddata[0].bidder).to.equal(bidRequest.bidder);
      expect(payload.biddata[0].sizes).to.deep.equal(DEFAULT_BID_SIZES);
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

      bidRequest.params = VALID_BANNER_BID_PARAMS;
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
      expect(payload.biddata[0].id).to.equal(bidRequest.placementId);
      expect(payload.biddata[0].bidder).to.equal(bidRequest.bidder);
      expect(payload.biddata[0].bids.length).to.equal(1);
      expect(payload.biddata[0].bids[0]).to.deep.equal(testBid);
      expect(payload.biddata[0].mediaTypes).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.deep.equal({});
    });

    it('should add the correct bid data to the server request for one bid request', function () {
      bidRequest.params = VALID_BANNER_BID_PARAMS;
      bidRequest.mediaTypes = {
        banner: {
          sizes: DEFAULT_BID_SIZES,
        },
      };

      const request = spec.buildRequests(bidRequests, {}, true);
      const payload = JSON.parse(request.data);

      expect(payload.biddata).to.exist;
      expect(payload.biddata.length).to.equal(1);
      expect(payload.biddata[0]).to.exist;
      expect(payload.biddata[0].code).to.equal(bidRequest.adUnitCode);
      expect(payload.biddata[0].id).to.equal(bidRequest.placementId);
      expect(payload.biddata[0].bidder).to.equal(bidRequest.bidder);
      expect(payload.biddata[0].sizes).to.be.undefined;
      expect(payload.biddata[0].mediaTypes).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.deep.equal({
        sizes: DEFAULT_BID_SIZES,
      });
    });

    it('should add the correct bid data to the server request for multiple bid requests', function () {
      bidRequest.params = VALID_BANNER_BID_PARAMS;
      bidRequest.mediaTypes = {
        banner: {
          sizes: DEFAULT_BID_SIZES,
        },
      };
      const bid2 = {
        bidder: 'vibrantmedia',
        params: VALID_VIDEO_BID_PARAMS,
        mediaTypes: {
          video: {
            context: OUTSTREAM,
            sizes: DEFAULT_BID_SIZES,
          }
        },
        adUnitCode: 'video-div',
        bidId: '30b31c1838de1f',
        placementId: '135797531abcdef',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
      };
      const bid3 = {
        bidder: 'vibrantmedia',
        params: VALID_NATIVE_BID_PARAMS,
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
        bidId: '30b31c1838de14',
        placementId: '918273645abcdef',
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
      expect(payload.biddata[0].id).to.equal(bidRequest.placementId);
      expect(payload.biddata[0].bidder).to.equal(bidRequest.bidder);
      expect(payload.biddata[0].mediaTypes).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.deep.equal({
        sizes: DEFAULT_BID_SIZES,
      });
      expect(payload.biddata[1]).to.exist;
      expect(payload.biddata[1].code).to.equal(bid2.adUnitCode);
      expect(payload.biddata[1].id).to.equal(bid2.placementId);
      expect(payload.biddata[1].bidder).to.equal(bid2.bidder);
      expect(payload.biddata[1].mediaTypes).to.exist;
      expect(payload.biddata[1].mediaTypes[VIDEO]).to.exist;
      expect(payload.biddata[1].mediaTypes[VIDEO]).to.deep.equal({
        context: OUTSTREAM,
        sizes: DEFAULT_BID_SIZES,
      });
      expect(payload.biddata[2]).to.exist;
      expect(payload.biddata[2].code).to.equal(bid3.adUnitCode);
      expect(payload.biddata[2].id).to.equal(bid3.placementId);
      expect(payload.biddata[2].bidder).to.equal(bid3.bidder);
      expect(payload.biddata[2].mediaTypes[NATIVE]).to.exist;
      expect(payload.biddata[2].mediaTypes[NATIVE]).to.deep.equal(bid3.mediaTypes.native);
    });

    it('should add the correct bid data to the bid request where a bid has multiple media types', function () {
      bidRequest.params = VALID_VIDEO_BID_PARAMS;
      bidRequest.mediaTypes = {
        banner: {
          sizes: DEFAULT_BID_SIZES,
        },
        video: {
          context: OUTSTREAM,
          sizes: DEFAULT_BID_SIZES,
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
        params: VALID_VIDEO_BID_PARAMS,
        mediaTypes: {
          video: {
            context: OUTSTREAM,
            sizes: DEFAULT_BID_SIZES,
          }
        },
        adUnitCode: 'video-div',
        bidId: '30b31c1838de1a',
        bidderRequestId: '22edbae2733bf6',
        placementId: '293857832abfef',
        auctionId: '1d1a030790a475',
      };

      bidRequests.push(bid2);

      const request = spec.buildRequests(bidRequests, {}, true);
      const payload = JSON.parse(request.data);

      expect(payload.biddata).to.exist;
      expect(payload.biddata.length).to.equal(2);
      expect(payload.biddata[0]).to.exist;
      expect(payload.biddata[0].code).to.equal(bidRequest.adUnitCode);
      expect(payload.biddata[0].id).to.equal(bidRequest.placementId);
      expect(payload.biddata[0].bidder).to.equal(bidRequest.bidder);
      expect(payload.biddata[0].mediaTypes).to.exist;
      expect(Object.keys(payload.biddata[0].mediaTypes).length).to.equal(3);
      expect(payload.biddata[0].mediaTypes[BANNER]).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.deep.equal({
        sizes: DEFAULT_BID_SIZES,
      });
      expect(payload.biddata[0].mediaTypes[VIDEO]).to.exist;
      expect(payload.biddata[0].mediaTypes[VIDEO]).to.deep.equal({
        context: OUTSTREAM,
        sizes: DEFAULT_BID_SIZES,
      });
      expect(payload.biddata[0].code).to.equal(bidRequest.adUnitCode);
      expect(payload.biddata[0].id).to.equal(bidRequest.placementId);
      expect(payload.biddata[0].bidder).to.equal(bidRequest.bidder);
      expect(payload.biddata[0].mediaTypes[NATIVE]).to.exist;
      expect(payload.biddata[0].mediaTypes[NATIVE]).to.deep.equal(bidRequest.mediaTypes.native);
      expect(payload.biddata[1]).to.exist;
      expect(payload.biddata[1].code).to.equal(bid2.adUnitCode);
      expect(payload.biddata[1].id).to.equal(bid2.placementId);
      expect(payload.biddata[1].bidder).to.equal(bid2.bidder);
      expect(payload.biddata[1].mediaTypes).to.exist;
      expect(Object.keys(payload.biddata[1].mediaTypes).length).to.equal(1);
      expect(payload.biddata[1].mediaTypes[VIDEO]).to.exist;
      expect(payload.biddata[1].mediaTypes[VIDEO]).to.deep.equal({
        context: OUTSTREAM,
        sizes: DEFAULT_BID_SIZES,
      });
    });
  });

  describe('interpretResponse', function () {
    it('returns a valid Prebid API response object for a banner Prebid Server response', function () {
      const prebidServerResponse = {
        body: [{
          mediaType: 'banner',
          requestId: '12345',
          cpm: 1,
          currency: 'USD',
          width: 640,
          height: 240,
          ad: BANNER_AD,
          ttl: 300,
          creativeId: '86f4aef9-2f17-421d-84db-5c9814bf4a79',
          netRevenue: false,
          meta: Object.freeze({
            advertiser: '105600',
            width: 300,
            height: 250,
            isCustom: '1',
            progressBar: false,
            mpuSrc: '//images.intellitxt.com/a/105600/Genpact/genpact.jpg',
            clickURL: '{{click}}'
          })
        }]
      };

      const interpretedResponse = spec.interpretResponse(prebidServerResponse, {});

      expect(interpretedResponse).to.be.a('array');
      expect(interpretedResponse.length).to.equal(1);

      const interpretedBid = interpretedResponse[0];

      expect(interpretedBid.mediaType).to.equal('banner');
      expect(interpretedBid.requestId).to.equal('12345');
      expect(interpretedBid.cpm).to.equal(1);
      expect(interpretedBid.currency).to.equal('USD');
      expect(interpretedBid.width).to.equal(640);
      expect(interpretedBid.height).to.equal(240);
      expect(interpretedBid.ad).to.equal(BANNER_AD);
      expect(interpretedBid.ttl).to.equal(300);
      expect(interpretedBid.creativeId).to.equal('86f4aef9-2f17-421d-84db-5c9814bf4a79');
      expect(interpretedBid.netRevenue).to.be.false;
      expect(interpretedBid.meta).to.deep.equal(prebidServerResponse.body[0].meta);
      expect(interpretedBid.renderer).to.be.undefined;
      expect(interpretedBid.adResponse).to.deep.equal(prebidServerResponse);
    });

    it('returns a valid Prebid API response object for a video Prebid Server response', function () {
      const prebidServerResponse = Object.freeze({
        body: [{
          mediaType: 'video',
          requestId: '67890',
          cpm: 2,
          currency: 'USD',
          width: 600,
          height: 300,
          ad: VIDEO_AD,
          ttl: 300,
          creativeId: '248e8e0c-2f17-421d-84db-5c9814bf4a79',
          netRevenue: false,
          meta: {
            advertiser: '105600',
            width: 300,
            height: 250,
            isCustom: '1',
            progressBar: false,
            mpuSrc: '//images.intellitxt.com/a/105600/Genpact/genpact.jpg',
            clickURL: '{{click}}'
          },
          vastUrl: 'https://www.example.com/myVastVideo'
        }]
      });

      const interpretedResponse = spec.interpretResponse(prebidServerResponse, {});

      expect(interpretedResponse).to.be.a('array');
      expect(interpretedResponse.length).to.equal(1);

      const interpretedBid = interpretedResponse[0];

      expect(interpretedBid.mediaType).to.equal('video');
      expect(interpretedBid.requestId).to.equal('67890');
      expect(interpretedBid.cpm).to.equal(2);
      expect(interpretedBid.currency).to.equal('USD');
      expect(interpretedBid.width).to.equal(600);
      expect(interpretedBid.height).to.equal(300);
      expect(interpretedBid.ad).to.equal(VIDEO_AD);
      expect(interpretedBid.ttl).to.equal(300);
      expect(interpretedBid.creativeId).to.equal('248e8e0c-2f17-421d-84db-5c9814bf4a79');
      expect(interpretedBid.netRevenue).to.be.false;
      expect(interpretedBid.meta).to.deep.equal(prebidServerResponse.body[0].meta);
      expect(interpretedBid.renderer).to.be.undefined;
      expect(interpretedBid.adResponse).to.deep.equal(prebidServerResponse);
    });

    it('returns a valid Prebid API response object for a native Prebid Server response', function () {
      const prebidServerResponse = Object.freeze({
        body: [{
          mediaType: 'native',
          requestId: '13579',
          cpm: 3,
          currency: 'USD',
          width: 240,
          height: 300,
          ad: 'https://www.example.com/native-display.html',
          ttl: 300,
          creativeId: 'd28e8e0c-2f17-421d-84db-5c9814bf4a81',
          netRevenue: false,
          meta: {},
          title: 'Test native ad bid for 13579',
          sponsoredBy: 'Vibrant Media Ltd',
          clickUrl: 'https://www.example.com/native-ct.html',
          image: {
            url: 'https://www.example.com/native-display.html',
            width: 240,
            height: 300
          }
        }]
      });

      const interpretedResponse = spec.interpretResponse(prebidServerResponse, {});

      expect(interpretedResponse).to.be.a('array');
      expect(interpretedResponse.length).to.equal(1);

      const interpretedBid = interpretedResponse[0];

      expect(interpretedBid.mediaType).to.equal('native');
      expect(interpretedBid.requestId).to.equal('13579');
      expect(interpretedBid.cpm).to.equal(3);
      expect(interpretedBid.currency).to.equal('USD');
      expect(interpretedBid.width).to.equal(240);
      expect(interpretedBid.height).to.equal(300);
      expect(interpretedBid.ad).to.equal('https://www.example.com/native-display.html');
      expect(interpretedBid.ttl).to.equal(300);
      expect(interpretedBid.creativeId).to.equal('d28e8e0c-2f17-421d-84db-5c9814bf4a81');
      expect(interpretedBid.netRevenue).to.be.false;
      expect(interpretedBid.meta).to.deep.equal(prebidServerResponse.body[0].meta);
      expect(interpretedBid.renderer).to.be.undefined;
      expect(interpretedBid.adResponse).to.deep.equal(prebidServerResponse);
    });

    it('returns a valid Prebid API response object for a multi-bid Prebid Server response', function () {
      const prebidServerResponse = Object.freeze({
        body: [
          {
            mediaType: 'banner',
            requestId: '12345',
            cpm: 3,
            currency: 'USD',
            width: 640,
            height: 240,
            ad: BANNER_AD,
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
          },
          {
            mediaType: 'video',
            requestId: '67890',
            cpm: 4,
            currency: 'USD',
            width: 300,
            height: 300,
            ad: VIDEO_AD,
            ttl: 300,
            creativeId: 'd28e8e0c-2f17-421d-84db-5c9814bf4a79',
            netRevenue: false,
            meta: {
              advertiser: '105600',
              width: 300,
              height: 250,
              isCustom: '1',
              progressBar: false,
              mpuSrc: '//images.intellitxt.com/a/105600/Genpact/genpact.jpg',
              clickURL: '{{click}}'
            },
            vastUrl: 'https://www.example.com/myVastVideo'
          },
          {
            mediaType: 'native',
            requestId: '13579',
            cpm: 5,
            currency: 'USD',
            width: 640,
            height: 240,
            ad: 'https://www.example.com/native-display.html',
            ttl: 300,
            creativeId: '888e8e0c-2f17-421d-84db-5c9814bf4a81',
            netRevenue: false,
            meta: {},
            title: 'Test native ad bid for 13579',
            sponsoredBy: 'Vibrant Media Ltd',
            clickUrl: 'https://www.example.com/native-ct.html',
            image: {
              url: 'https://www.example.com/native-display.html',
              width: 640,
              height: 240
            }
          }
        ]
      });

      const interpretedResponse = spec.interpretResponse(prebidServerResponse, {});

      expect(interpretedResponse).to.be.a('array');
      expect(interpretedResponse.length).to.equal(3);

      const interpretedBannerBid = interpretedResponse[0];

      expect(interpretedBannerBid.mediaType).to.equal('banner');
      expect(interpretedBannerBid.requestId).to.equal('12345');
      expect(interpretedBannerBid.cpm).to.equal(3);
      expect(interpretedBannerBid.currency).to.equal('USD');
      expect(interpretedBannerBid.width).to.equal(640);
      expect(interpretedBannerBid.height).to.equal(240);
      expect(interpretedBannerBid.ad).to.equal(BANNER_AD);
      expect(interpretedBannerBid.ttl).to.equal(300);
      expect(interpretedBannerBid.creativeId).to.equal('86f4aef9-2f17-421d-84db-5c9814bf4a79');
      expect(interpretedBannerBid.netRevenue).to.be.false;
      expect(interpretedBannerBid.meta).to.deep.equal(prebidServerResponse.body[0].meta);
      expect(interpretedBannerBid.renderer).to.be.undefined;
      expect(interpretedBannerBid.adResponse).to.deep.equal(prebidServerResponse);

      const interpretedVideoBid = interpretedResponse[1];

      expect(interpretedVideoBid.mediaType).to.equal('video');
      expect(interpretedVideoBid.requestId).to.equal('67890');
      expect(interpretedVideoBid.cpm).to.equal(4);
      expect(interpretedVideoBid.currency).to.equal('USD');
      expect(interpretedVideoBid.width).to.equal(300);
      expect(interpretedVideoBid.height).to.equal(300);
      expect(interpretedVideoBid.ad).to.equal(VIDEO_AD);
      expect(interpretedVideoBid.ttl).to.equal(300);
      expect(interpretedVideoBid.creativeId).to.equal('d28e8e0c-2f17-421d-84db-5c9814bf4a79');
      expect(interpretedVideoBid.netRevenue).to.be.false;
      expect(interpretedVideoBid.meta).to.deep.equal(prebidServerResponse.body[1].meta);
      expect(interpretedVideoBid.renderer).to.be.undefined;
      expect(interpretedVideoBid.adResponse).to.deep.equal(prebidServerResponse);

      const interpretedNativeBid = interpretedResponse[2];

      expect(interpretedNativeBid.mediaType).to.equal('native');
      expect(interpretedNativeBid.requestId).to.equal('13579');
      expect(interpretedNativeBid.cpm).to.equal(5);
      expect(interpretedNativeBid.currency).to.equal('USD');
      expect(interpretedNativeBid.width).to.equal(640);
      expect(interpretedNativeBid.height).to.equal(240);
      expect(interpretedNativeBid.ad).to.equal('https://www.example.com/native-display.html');
      expect(interpretedNativeBid.ttl).to.equal(300);
      expect(interpretedNativeBid.creativeId).to.equal('888e8e0c-2f17-421d-84db-5c9814bf4a81');
      expect(interpretedNativeBid.netRevenue).to.be.false;
      expect(interpretedNativeBid.meta).to.deep.equal(prebidServerResponse.body[2].meta);
      expect(interpretedNativeBid.renderer).to.be.undefined;
      expect(interpretedNativeBid.adResponse).to.deep.equal(prebidServerResponse);
    });
  });

  describe('Flow tests', function () {
    describe('For successive API calls to the public functions', function () {
      it('should succeed with one media type per bid', function () {
        const bannerBid = {
          bidder: 'vibrantmedia',
          params: VALID_BANNER_BID_PARAMS,
          mediaTypes: {
            banner: {
              sizes: DEFAULT_BID_SIZES,
            },
          },
          adUnitCode: 'banner-div',
          bidId: '30b31c1838de11',
          bidderRequestId: '22edbae2733bf6',
          placementId: '293857832abfef',
          auctionId: '1d1a030790a475',
        };
        const videoBid = {
          bidder: 'vibrantmedia',
          params: VALID_VIDEO_BID_PARAMS,
          mediaTypes: {
            video: {
              context: OUTSTREAM,
              sizes: DEFAULT_BID_SIZES,
            },
          },
          adUnitCode: 'video-div',
          bidId: '30b31c1838de15',
          bidderRequestId: '22edbae2733bf6',
          placementId: '293857832abfef',
          auctionId: '1d1a030790a475',
        };
        const nativeBid = {
          bidder: 'vibrantmedia',
          params: VALID_NATIVE_BID_PARAMS,
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
          bidId: '30b31c1838de12',
          bidderRequestId: '22edbae2733bf6',
          placementId: '293857832abfef',
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
        expect(payload.biddata[0].id).to.equal(bannerBid.placementId);
        expect(payload.biddata[0].bidder).to.equal(bannerBid.bidder);
        expect(payload.biddata[0].mediaTypes[BANNER]).to.exist;
        expect(payload.biddata[0].mediaTypes[BANNER]).to.deep.equal({
          sizes: DEFAULT_BID_SIZES,
        });
        expect(payload.biddata[1]).to.exist;
        expect(payload.biddata[1].code).to.equal(videoBid.adUnitCode);
        expect(payload.biddata[1].id).to.equal(videoBid.placementId);
        expect(payload.biddata[1].bidder).to.equal(videoBid.bidder);
        expect(payload.biddata[1].mediaTypes[VIDEO]).to.exist;
        expect(payload.biddata[1].mediaTypes[VIDEO]).to.deep.equal({
          context: OUTSTREAM,
          sizes: DEFAULT_BID_SIZES
        });
        expect(payload.biddata[2]).to.exist;
        expect(payload.biddata[2].code).to.equal(nativeBid.adUnitCode);
        expect(payload.biddata[2].id).to.equal(nativeBid.placementId);
        expect(payload.biddata[2].bidder).to.equal(nativeBid.bidder);
        expect(payload.biddata[2].mediaTypes[NATIVE]).to.exist;
        expect(payload.biddata[2].mediaTypes[NATIVE]).to.deep.equal(nativeBid.mediaTypes.native);

        // From here, the API would call the Prebid Server and call interpretResponse, which is covered by tests elsewhere
      });

      it('should succeed with multiple media types for a single bid', function () {
        const bid = {
          bidder: 'vibrantmedia',
          params: VALID_VIDEO_BID_PARAMS,
          mediaTypes: {
            banner: {
              sizes: DEFAULT_BID_SIZES
            },
            video: {
              context: OUTSTREAM,
              sizes: DEFAULT_BID_SIZES
            },
            native: {
              sizes: DEFAULT_BID_SIZES
            }
          },
          adUnitCode: 'test-div',
          bidId: '30b31c1838de13',
          bidderRequestId: '22edbae2733bf6',
          placementId: '293857832abfef',
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
        expect(payload.biddata[0].id).to.equal(bid.placementId);
        expect(payload.biddata[0].bidder).to.equal(bid.bidder);
        expect(payload.biddata[0].mediaTypes[BANNER]).to.exist;
        expect(payload.biddata[0].mediaTypes[BANNER]).to.deep.equal({
          sizes: DEFAULT_BID_SIZES,
        });
        expect(payload.biddata[0].mediaTypes[VIDEO]).to.exist;
        expect(payload.biddata[0].mediaTypes[VIDEO]).to.deep.equal({
          context: OUTSTREAM,
          sizes: DEFAULT_BID_SIZES,
        });
        expect(payload.biddata[0].mediaTypes[NATIVE]).to.exist;
        expect(payload.biddata[0].mediaTypes[NATIVE]).to.deep.equal({
          sizes: DEFAULT_BID_SIZES,
        });

        // From here, the API would call the Prebid Server and call interpretResponse, which is covered by tests elsewhere
      });
    });
  });
});
