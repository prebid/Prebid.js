import { expect } from 'chai';
import { DEFAULT_ENDPOINT, spec } from 'modules/ex_genieeBidAdapter.js';
import { config } from 'src/config.js';

describe('Geniee Exchange bid adapter', () => {
  const PARTNER_ID = 123;

  function makeBid(overrides = {}) {
    return {
      bidId: 'bid-id-1',
      bidder: 'ex_geniee',
      adUnitCode: 'ex-geniee-test-ad',
      params: { partnerId: PARTNER_ID, ...(overrides.params || {}) },
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      ...overrides,
    };
  }

  const BIDDER_REQUEST_ID = 'bidder-req-1';

  function makeBidderRequest(bids, overrides = {}) {
    return {
      bidderCode: 'ex_geniee',
      bidderRequestId: BIDDER_REQUEST_ID,
      bids,
      refererInfo: { page: 'https://example.com/page' },
      ...overrides,
      // In real auctions core's FPD enrichment always provides ortb2.site for
      // web pages; keep it in the fixture (shallow-merged so tests can extend
      // or null it out).
      ortb2: {
        site: { page: 'https://example.com/page' },
        ...(overrides.ortb2 || {})
      },
    };
  }

  describe('spec', () => {
    // The bidder code is the adapter's public contract: it is what publishers
    // put in adUnit.bids[].bidder and in userSync.filterSettings, and it must
    // stay in sync with the module filename (metadata/compileMetadata.mjs
    // derives one from the other). The fixtures above are not an anchor for it
    // (the adapter never reads bid.bidder / bidderCode), so assert it
    // directly.
    it('exposes the ex_geniee bidder code', () => {
      expect(spec.code).to.equal('ex_geniee');
    });
  });

  describe('isBidRequestValid', () => {
    it('is valid when partnerId is a positive integer number', () => {
      expect(spec.isBidRequestValid(makeBid())).to.equal(true);
      expect(spec.isBidRequestValid(makeBid({ params: { partnerId: 4 } })))
        .to.equal(true);
    });

    it('is invalid when partnerId is missing', () => {
      expect(spec.isBidRequestValid(makeBid({ params: { partnerId: undefined } })))
        .to.equal(false);
    });

    it('is invalid when partnerId is a string, even a positive-integer one',
      () => {
        ['123', '4', '', '0', '-1', '1.5', 'rel-123', '4 ', ' 4', '4\n', '4\t',
          '4 5']
          .forEach((partnerId) => {
            expect(
              spec.isBidRequestValid(
                makeBid({ params: { partnerId: partnerId } })),
                   `partnerId: ${JSON.stringify(partnerId)}`)
              .to.equal(false);
          });
      });

    it('is invalid when partnerId is a number but not an integer >= 1', () => {
      [0, -1, 1.5, NaN, Infinity].forEach((partnerId) => {
        expect(
          spec.isBidRequestValid(makeBid({ params: { partnerId: partnerId } })),
            `partnerId: ${partnerId}`)
          .to.equal(false);
      });
    });

    it('is invalid for an unsupported currency', () => {
      expect(spec.isBidRequestValid(makeBid({
        params: { partnerId: PARTNER_ID, currency: 'EUR' }
      }))).to.equal(false);
    });

    it('is valid for an allowed currency', () => {
      expect(spec.isBidRequestValid(makeBid({
        params: { partnerId: PARTNER_ID, currency: 'USD' }
      }))).to.equal(true);
    });

    describe('with an adServerCurrency configured', () => {
      afterEach(() => {
        config.resetConfig();
      });

      it('is invalid when params.currency is absent and adServerCurrency is not supported',
        () => {
          config.setConfig({ currency: { adServerCurrency: 'EUR' } });
          expect(spec.isBidRequestValid(makeBid())).to.equal(false);
        });

      it('is valid when params.currency is absent and adServerCurrency is supported',
        () => {
          config.setConfig({ currency: { adServerCurrency: 'JPY' } });
          expect(spec.isBidRequestValid(makeBid())).to.equal(true);
        });

      it('ignores adServerCurrency when params.currency is set', () => {
        config.setConfig({ currency: { adServerCurrency: 'EUR' } });
        expect(spec.isBidRequestValid(makeBid({
          params: { partnerId: PARTNER_ID, currency: 'USD' }
        }))).to.equal(true);
      });
    });

    // The adapter only checks that placementId, when set, is the non-empty
    // string that will become imp.tagid; the Exchange owns the format rules
    // (charset, length), so strings that violate them still pass here.
    it('is valid when placementId is absent or a non-empty string', () => {
      [undefined, null, 'sidebar', 'Sidebar', 'top-banner_1', 'a'.repeat(41),
        'side bar', 'サイドバー']
        .forEach((placementId) => {
          expect(
            spec.isBidRequestValid(
              makeBid({ params: { partnerId: PARTNER_ID, placementId } })),
                `placementId: ${JSON.stringify(placementId)}`)
            .to.equal(true);
        });
    });

    it('is invalid when placementId is set but not a non-empty string', () => {
      ['', 123, 0, true, {}, ['sidebar']]
        .forEach((placementId) => {
          expect(
            spec.isBidRequestValid(
              makeBid({ params: { partnerId: PARTNER_ID, placementId } })),
                `placementId: ${JSON.stringify(placementId)}`)
            .to.equal(false);
        });
    });

    it('is invalid when mediaTypes is missing entirely', () => {
      expect(spec.isBidRequestValid(makeBid({ mediaTypes: undefined })))
        .to.equal(false);
    });

    it('is invalid when mediaTypes declares neither banner nor video', () => {
      expect(spec.isBidRequestValid(makeBid({ mediaTypes: {} }))).to.equal(false);
    });

    it('is invalid for a native-only ad unit', () => {
      expect(spec.isBidRequestValid(makeBid({
        mediaTypes: { native: { title: { required: true } } }
      }))).to.equal(false);
    });

    describe('with mediaTypes.video', () => {
      const MIMES = ['video/mp4'];

      if (FEATURES.VIDEO) {
        it('is valid for an instream video with mimes', () => {
          expect(spec.isBidRequestValid(makeBid({
            mediaTypes: { video: { context: 'instream', mimes: MIMES } }
          }))).to.equal(true);
        });

        // core syncs only the ad-unit-level ortb2Imp into mediaTypes, not the
        // bidder-level one
        it('is valid when mimes is set only in the bidder-level ortb2Imp.video',
          () => {
            const bid = makeBid({
              mediaTypes: { video: { context: 'instream' } },
              ortb2Imp: { video: { mimes: MIMES } },
            });
            expect(spec.isBidRequestValid(bid)).to.equal(true);
          });

        // whether an outstream bid can be rendered is left to core
        it('is valid for an outstream video without a renderer', () => {
          expect(spec.isBidRequestValid(makeBid({
            mediaTypes: { video: { context: 'outstream', mimes: MIMES } }
          }))).to.equal(true);
        });
      } else {
        it('is invalid for a video-only ad unit when the build does not include video',
          () => {
            expect(spec.isBidRequestValid(makeBid({
              mediaTypes: { video: { context: 'instream', mimes: MIMES } }
            }))).to.equal(false);
          });
      }

      it('is invalid for a video-only ad unit without mimes', () => {
        [undefined, []].forEach((mimes) => {
          const bid =
              makeBid({ mediaTypes: { video: { context: 'instream', mimes } } });
          expect(spec.isBidRequestValid(bid), `mimes: ${JSON.stringify(mimes)}`)
            .to.equal(false);
        });
      });

      it('is valid on the banner part when the video part of a multiformat ad unit cannot be sent',
        () => {
          const bid = makeBid({
            mediaTypes: {
              banner: { sizes: [[300, 250]] },
              video: { context: 'instream' },
            },
          });
          expect(spec.isBidRequestValid(bid)).to.equal(true);
        });
    });
  });

  describe('buildRequests', () => {
    it('builds a POST request with an OpenRTB payload', () => {
      const bids = [makeBid()];
      const requests = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(requests).to.be.an('array').with.lengthOf(1);
      const request = requests[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(`${DEFAULT_ENDPOINT}?id=${PARTNER_ID}`);
      expect(request.data).to.be.an('object');
      expect(request.data.imp).to.be.an('array').with.lengthOf(1);
    });

    if (FEATURES.VIDEO) {
      describe('with mediaTypes.video', () => {
        const MIMES = ['video/mp4'];

        function buildImp(mediaTypes, overrides = {}) {
          const bids = [makeBid({ mediaTypes, ...overrides })];
          const requests = spec.buildRequests(bids, makeBidderRequest(bids));
          expect(requests).to.have.lengthOf(1);
          return requests[0].data.imp[0];
        }

        it('sends a video-only ad unit as imp.video with w/h taken from playerSize',
          () => {
            const imp = buildImp({
              video: { context: 'instream', mimes: MIMES, playerSize: [[640, 480]] },
            });

            expect(imp.video.mimes).to.deep.equal(MIMES);
            expect(imp.video.w).to.equal(640);
            expect(imp.video.h).to.equal(480);
            expect(imp.banner, 'imp.banner').to.equal(undefined);
          });

        it('sends a multiformat (banner + video) ad unit as one imp carrying both',
          () => {
            const imp = buildImp({
              banner: { sizes: [[300, 250]] },
              video: { context: 'instream', mimes: MIMES, playerSize: [[640, 480]] },
            });

            expect(imp.banner.w).to.equal(300);
            expect(imp.banner.h).to.equal(250);
            expect(imp.video.mimes).to.deep.equal(MIMES);
          });

        it('sends only the banner part when the video of a multiformat ad unit has no mimes',
          () => {
            const imp = buildImp({
              banner: { sizes: [[300, 250]] },
              video: { context: 'instream', playerSize: [[640, 480]] },
            });

            expect(imp.banner).to.be.an('object');
            expect(imp.video, 'imp.video').to.equal(undefined);
          });

        it('sends the video part of a multiformat ad unit with an outstream video and no renderer',
          () => {
            const imp = buildImp({
              banner: { sizes: [[300, 250]] },
              video: { context: 'outstream', mimes: MIMES, playerSize: [[640, 480]] },
            });

            expect(imp.banner).to.be.an('object');
            expect(imp.video.mimes).to.deep.equal(MIMES);
          });

        it('sends the video part when mimes is set only in the bidder-level ortb2Imp.video',
          () => {
            const imp = buildImp(
              {
                banner: { sizes: [[300, 250]] },
                video: { context: 'instream', playerSize: [[640, 480]] },
              },
              { ortb2Imp: { video: { mimes: MIMES } } },
            );

            expect(imp.video.mimes).to.deep.equal(MIMES);
          });
      });
    }

    it('drops an ortb2Imp.video that comes without mediaTypes.video', () => {
      const bid = makeBid({ ortb2Imp: { video: { mimes: ['video/mp4'] } } });
      const [request] = spec.buildRequests([bid], makeBidderRequest([bid]));

      expect(request.data.imp[0].banner).to.be.an('object');
      expect(request.data.imp[0].video, 'imp.video').to.equal(undefined);
    });

    describe('imp.bidfloor', () => {
      // Stands in for priceFloors' getFloor: a media type missing from `floors`
      // has no floor.
      function getFloorReturning(floors) {
        return ({ currency, mediaType }) => (floors[mediaType] === undefined
          ? {} : { floor: floors[mediaType], currency });
      }

      function buildImpWithFloors(mediaTypes, floors, params) {
        const bid = makeBid({
          mediaTypes,
          getFloor: getFloorReturning(floors),
          ...(params ? { params } : {}),
        });
        const [request] = spec.buildRequests([bid], makeBidderRequest([bid]));
        return request.data.imp[0];
      }

      const BANNER_ONLY = { banner: { sizes: [[300, 250]] } };
      const MULTIFORMAT = {
        banner: { sizes: [[300, 250]] },
        video: { context: 'instream', mimes: ['video/mp4'], playerSize: [[640, 480]] },
      };

      it('is left unset when the priceFloors module is not in use', () => {
        const bids = [makeBid()];
        const [request] = spec.buildRequests(bids, makeBidderRequest(bids));

        expect(request.data.imp[0].bidfloor, 'imp.bidfloor').to.equal(undefined);
      });

      it('takes the banner floor for a banner-only ad unit', () => {
        const imp = buildImpWithFloors(BANNER_ONLY, { banner: 3 });

        expect(imp.bidfloor).to.equal(3);
        expect(imp.bidfloorcur).to.equal('USD');
      });

      it('takes the banner floor when the video part of a multiformat ad unit is dropped',
        () => {
          const imp = buildImpWithFloors(
            {
              banner: { sizes: [[300, 250]] },
              video: { context: 'instream', playerSize: [[640, 480]] },
            },
            { banner: 3, video: 1 },
          );

          expect(imp.video, 'imp.video').to.equal(undefined);
          expect(imp.bidfloor).to.equal(3);
        });

      it('requests the floor in the request currency', () => {
        const imp = buildImpWithFloors(
          BANNER_ONLY, { banner: 300 }, { partnerId: PARTNER_ID, currency: 'JPY' });

        expect(imp.bidfloor).to.equal(300);
        expect(imp.bidfloorcur).to.equal('JPY');
      });

      it('is left unset when the media type sent has no floor', () => {
        const imp = buildImpWithFloors(BANNER_ONLY, {});

        expect(imp.bidfloor, 'imp.bidfloor').to.equal(undefined);
      });

      // priceFloors' own processor may already have set imp.bidfloor from a '*'
      // rule (e.g. when the per-media-type rule is 0); the ortb2Imp floor
      // stands in for it here.
      it('removes an imp.bidfloor set earlier when the media type sent has no floor',
        () => {
          const bid = makeBid({
            getFloor: getFloorReturning({}),
            ortb2Imp: { bidfloor: 5, bidfloorcur: 'USD' },
          });
          const [request] = spec.buildRequests([bid], makeBidderRequest([bid]));

          expect(request.data.imp[0].bidfloor, 'imp.bidfloor').to.equal(undefined);
          expect(request.data.imp[0].bidfloorcur, 'imp.bidfloorcur')
            .to.equal(undefined);
        });

      // priceFloors' getFloor returns null for a rule whose floor value is null
      it('is left unset when getFloor returns null', () => {
        const bid = makeBid({ getFloor: () => null });
        const [request] = spec.buildRequests([bid], makeBidderRequest([bid]));

        expect(request.data.imp[0].bidfloor, 'imp.bidfloor').to.equal(undefined);
      });

      it('still sends the request when getFloor throws', () => {
        const bid = makeBid({
          getFloor: () => { throw new Error('inverseBidAdjustment failed'); },
        });
        const [request] = spec.buildRequests([bid], makeBidderRequest([bid]));

        expect(request.data.imp[0].banner).to.be.an('object');
        expect(request.data.imp[0].bidfloor, 'imp.bidfloor').to.equal(undefined);
      });

      it('keeps an imp.bidfloor set earlier when getFloor throws', () => {
        const bid = makeBid({
          getFloor: () => { throw new Error('inverseBidAdjustment failed'); },
          ortb2Imp: { bidfloor: 5, bidfloorcur: 'USD' },
        });
        const [request] = spec.buildRequests([bid], makeBidderRequest([bid]));

        expect(request.data.imp[0].bidfloor).to.equal(5);
        expect(request.data.imp[0].bidfloorcur).to.equal('USD');
      });

      if (FEATURES.VIDEO) {
        it('takes the lower floor when the imp carries both banner and video',
          () => {
            expect(buildImpWithFloors(MULTIFORMAT, { banner: 3, video: 1 }).bidfloor)
              .to.equal(1);
            expect(buildImpWithFloors(MULTIFORMAT, { banner: 1, video: 3 }).bidfloor)
              .to.equal(1);
          });

        it('is left unset when one of the media types sent has no floor', () => {
          const imp = buildImpWithFloors(MULTIFORMAT, { banner: 3 });

          expect(imp.bidfloor, 'imp.bidfloor').to.equal(undefined);
        });
      }
    });

    it('does not send imp.native for an ad unit that also declares native', () => {
      const bid = makeBid({
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          native: { title: { required: true } },
        },
        nativeOrtbRequest:
            { ver: '1.2', assets: [{ id: 1, required: 1, title: { len: 80 } }] },
      });
      const [request] = spec.buildRequests([bid], makeBidderRequest([bid]));

      expect(request.data.imp[0].banner).to.be.an('object');
      expect(request.data.imp[0].native, 'imp.native').to.equal(undefined);
    });

    it('does not send imp.audio for an ad unit that also declares audio', () => {
      const bid = makeBid({
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          audio: { mimes: ['audio/mp4'] },
        },
      });
      const [request] = spec.buildRequests([bid], makeBidderRequest([bid]));

      expect(request.data.imp[0].banner).to.be.an('object');
      expect(request.data.imp[0].audio, 'imp.audio').to.equal(undefined);
    });

    it('defaults the auction type to first price, which Prebid.js does not set on its own',
      () => {
        const bids = [makeBid()];
        const [request] = spec.buildRequests(bids, makeBidderRequest(bids));

        expect(request.data.at).to.equal(1);
      });

    it('mirrors user.ext.eids into user.eids, which is where the Exchange reads them',
      () => {
        // Prebid's normalizeEIDs consolidates EIDs into user.ext.eids and
        // deletes user.eids, so this is the shape an adapter actually
        // receives.
        const eids =
             [{ source: 'id5-sync.com', uids: [{ id: 'ID5*abc', atype: 1 }] }];
        const bids = [makeBid()];
        const bidderRequest = makeBidderRequest(bids, {
          ortb2:
               { site: { page: 'https://example.com/page' }, user: { ext: { eids } } },
        });
        const [request] = spec.buildRequests(bids, bidderRequest);

        expect(request.data.user.eids).to.deep.equal(eids);
        // the 2.5 location is left in place for anything else that reads it
        expect(request.data.user.ext.eids).to.deep.equal(eids);
      });

    it('does not add user.eids when there are no EIDs', () => {
      const bids = [makeBid()];
      const [request] = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(request.data.user && request.data.user.eids).to.equal(undefined);
    });

    it('keeps at = 1 when the publisher sets it through ortb2', () => {
      const bids = [makeBid()];
      const bidderRequest = makeBidderRequest(bids, {
        ortb2: { at: 1, site: { page: 'https://example.com/page' } },
      });
      const [request] = spec.buildRequests(bids, bidderRequest);

      expect(request.data.at).to.equal(1);
    });

    it('does not send a request when the publisher forces a non-1 auction type',
      () => {
        [2, 0, 3].forEach((at) => {
          const bids = [makeBid()];
          const bidderRequest = makeBidderRequest(bids, {
            ortb2: { at, site: { page: 'https://example.com/page' } },
          });

          expect(spec.buildRequests(bids, bidderRequest),
            `at: ${at}`).to.deep.equal([]);
        });
      });

    it('sends one request per bid so each payload has exactly one imp', () => {
      const bids = [
        makeBid(),
        makeBid({
          bidId: 'bid-id-2',
          adUnitCode: 'ex-geniee-test-ad-2',
          mediaTypes: { banner: { sizes: [[728, 90]] } }
        }),
      ];
      const requests = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(requests).to.be.an('array').with.lengthOf(2);
      expect(requests[0].data.imp).to.have.lengthOf(1);
      expect(requests[1].data.imp).to.have.lengthOf(1);
      expect(requests[0].data.imp[0].id).to.equal('bid-id-1');
      expect(requests[1].data.imp[0].id).to.equal('bid-id-2');
      expect(requests[0].data.id).to.not.equal(requests[1].data.id);
    });

    it('derives the request id from the bidder request id and the imp id',
      () => {
        const bids = [
          makeBid(),
          makeBid({ bidId: 'bid-id-2', adUnitCode: 'ex-geniee-test-ad-2' }),
        ];
        const requests = spec.buildRequests(bids, makeBidderRequest(bids));

        expect(requests[0].data.id).to.equal(`${BIDDER_REQUEST_ID}-bid-id-1`);
        expect(requests[1].data.id).to.equal(`${BIDDER_REQUEST_ID}-bid-id-2`);
        // the suffix is exactly the single imp the payload carries, so a
        // request can be traced back to its imp without opening the body
        expect(requests[0].data.id)
          .to.equal(`${BIDDER_REQUEST_ID}-${requests[0].data.imp[0].id}`);
      });

    it('mirrors the first banner size into imp.banner.w/h', () => {
      const bids =
          [makeBid({ mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } } })];
      const [request] = spec.buildRequests(bids, makeBidderRequest(bids));

      const banner = request.data.imp[0].banner;
      expect(banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
      expect(banner.w).to.equal(300);
      expect(banner.h).to.equal(250);
    });

    it('sends partnerId as the id query parameter', () => {
      const bids = [makeBid({ params: { partnerId: 456 } })];
      const [request] = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(request.url).to.equal(`${DEFAULT_ENDPOINT}?id=456`);
    });

    it('sends placementId as imp.tagid, not as a query parameter', () => {
      const bids =
           [makeBid({ params: { partnerId: 456, placementId: 'top-banner_1' } })];
      const [request] = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(request.url).to.equal(`${DEFAULT_ENDPOINT}?id=456`);
      expect(request.data.imp[0].tagid).to.equal('top-banner_1');
    });

    it('leaves imp.tagid unset when placementId is absent', () => {
      const bids = [makeBid()];
      const [request] = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(request.url).to.equal(`${DEFAULT_ENDPOINT}?id=${PARTNER_ID}`);
      expect(request.data.imp[0].tagid, 'imp.tagid').to.equal(undefined);
    });

    it('resolves imp.tagid per bid', () => {
      const bids = [
        makeBid({ params: { partnerId: PARTNER_ID, placementId: 'sidebar' } }),
        makeBid({ bidId: 'bid-id-2', adUnitCode: 'ex-geniee-test-ad-2' }),
      ];
      const requests = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(requests).to.have.lengthOf(2);
      expect(requests[0].url).to.equal(`${DEFAULT_ENDPOINT}?id=${PARTNER_ID}`);
      expect(requests[0].data.imp[0].tagid).to.equal('sidebar');
      expect(requests[1].url).to.equal(`${DEFAULT_ENDPOINT}?id=${PARTNER_ID}`);
      expect(requests[1].data.imp[0].tagid, 'imp.tagid').to.equal(undefined);
    });

    it('defaults the currency to USD', () => {
      const bids = [makeBid()];
      const [request] = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(request.data.cur).to.deep.equal(['USD']);
    });

    it('prefers params.currency over the currency module setting', () => {
      const bids =
          [makeBid({ params: { partnerId: PARTNER_ID, currency: 'USD' } })];
      const bidderRequest = makeBidderRequest(bids, {
        ortb2: { ext: { prebid: { adServerCurrency: 'JPY' } } },
      });
      const [request] = spec.buildRequests(bids, bidderRequest);

      expect(request.data.cur).to.deep.equal(['USD']);
    });

    it('falls back to the currency module setting when params.currency is absent',
      () => {
        const bids = [makeBid()];
        const bidderRequest = makeBidderRequest(bids, {
          ortb2: { ext: { prebid: { adServerCurrency: 'JPY' } } },
        });
        const [request] = spec.buildRequests(bids, bidderRequest);

        expect(request.data.cur).to.deep.equal(['JPY']);
      });

    it('does not send a request when adServerCurrency is not supported by the Exchange',
      () => {
        const bids = [makeBid()];
        const bidderRequest = makeBidderRequest(bids, {
          ortb2: { ext: { prebid: { adServerCurrency: 'EUR' } } },
        });

        expect(spec.buildRequests(bids, bidderRequest)).to.deep.equal([]);
      });

    it('resolves the currency per bid', () => {
      const bids = [
        makeBid({ params: { partnerId: PARTNER_ID, currency: 'JPY' } }),
        makeBid({ bidId: 'bid-id-2', adUnitCode: 'ex-geniee-test-ad-2' }),
      ];
      const requests = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(requests).to.have.lengthOf(2);
      expect(requests[0].data.cur).to.deep.equal(['JPY']);
      expect(requests[1].data.cur).to.deep.equal(['USD']);
    });

    it('sends credentials so client-side cookies reach the Exchange', () => {
      const bids = [makeBid()];
      const [request] = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(request.options.withCredentials).to.equal(true);
    });

    it('does not send a request when the payload has neither site nor app',
      () => {
        const bids = [makeBid()];
        const bidderRequest = makeBidderRequest(bids, { ortb2: { site: null } });

        expect(spec.buildRequests(bids, bidderRequest)).to.deep.equal([]);
      });

    it('sends a request for app inventory (ortb2.app instead of site)', () => {
      const bids = [makeBid()];
      const bidderRequest = makeBidderRequest(
        bids, { ortb2: { site: null, app: { bundle: 'com.example.app' } } });

      const requests = spec.buildRequests(bids, bidderRequest);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.app.bundle).to.equal('com.example.app');
      expect(requests[0].data.site == null).to.equal(true);
    });

    it('does not send a request when site is present without site.page', () => {
      const bids = [makeBid()];
      const bidderRequest =
          makeBidderRequest(bids, { ortb2: { site: { domain: 'example.com' } } });

      expect(spec.buildRequests(bids, bidderRequest)).to.deep.equal([]);
    });

    it('does not send a request when site.page is an empty string', () => {
      const bids = [makeBid()];
      const bidderRequest =
          makeBidderRequest(bids, { ortb2: { site: { page: '' } } });

      expect(spec.buildRequests(bids, bidderRequest)).to.deep.equal([]);
    });

    it('does not send a request when app is present without app.bundle', () => {
      const bids = [makeBid()];
      const bidderRequest = makeBidderRequest(
        bids, { ortb2: { site: null, app: { name: 'Some App' } } });

      expect(spec.buildRequests(bids, bidderRequest)).to.deep.equal([]);
    });

    it('does not send a request when GDPR applies', () => {
      const bids = [makeBid()];
      const request = spec.buildRequests(
        bids, makeBidderRequest(bids, { gdprConsent: { gdprApplies: true } }));

      expect(request).to.deep.equal([]);
    });
  });

  describe('interpretResponse', () => {
    function buildOrtbRequest(mediaTypes) {
      const bids = [makeBid(mediaTypes ? { mediaTypes } : {})];
      return spec.buildRequests(bids, makeBidderRequest(bids))[0];
    }

    function responseWithBid(request, bid) {
      return {
        body: {
          id: request.data.id,
          cur: 'JPY',
          seatbid: [{
            bid: [{
              impid: request.data.imp[0].id,
              price: 100,
              crid: 'creative-1',
              ...bid,
            }],
          }],
        },
      };
    }

    it('returns [] on an empty (204) body', () => {
      expect(spec.interpretResponse({ body: undefined }, buildOrtbRequest()))
        .to.deep.equal([]);
      expect(spec.interpretResponse({ body: {} }, buildOrtbRequest()))
        .to.deep.equal([]);
    });

    it('parses a winning banner bid (mtype 1)', () => {
      const request = buildOrtbRequest();
      const serverResponse = {
        body: {
          id: request.data.id,
          cur: 'JPY',
          seatbid: [{
            bid: [{
              impid: request.data.imp[0].id,
              price: 100,
              adm: '<div>creative</div>',
              w: 300,
              h: 250,
              crid: 'creative-1',
              mtype: 1,
            }],
          }],
        },
      };

      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].cpm).to.equal(100);
      expect(bids[0].ad).to.equal('<div>creative</div>');
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].creativeId).to.equal('creative-1');
      expect(bids[0].currency).to.equal('JPY');
      expect(bids[0].netRevenue).to.equal(true);
      expect(bids[0].ttl).to.equal(3600);
      expect(bids[0].mediaType).to.equal('banner');
    });

    // The Exchange always returns mtype, so the adapter does not infer the
    // media type.
    it('drops a bid without mtype', () => {
      const request = buildOrtbRequest();
      const serverResponse = responseWithBid(
        request, { adm: '<div>creative</div>', w: 300, h: 250 });

      expect(spec.interpretResponse(serverResponse, request)).to.deep.equal([]);
    });

    if (FEATURES.VIDEO) {
      it('parses a winning video bid (mtype 2) with adm as vastXml', () => {
        const vastXml = '<VAST version="3.0"><Ad id="1"></Ad></VAST>';
        const request = buildOrtbRequest({
          banner: { sizes: [[300, 250]] },
          video: { context: 'instream', mimes: ['video/mp4'], playerSize: [[640, 480]] },
        });
        const bids = spec.interpretResponse(
          responseWithBid(request, { adm: vastXml, mtype: 2 }), request);

        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal('video');
        expect(bids[0].vastXml).to.equal(vastXml);
        expect(bids[0].playerWidth).to.equal(640);
        expect(bids[0].playerHeight).to.equal(480);
        expect(bids[0].cpm).to.equal(100);
        expect(bids[0].creativeId).to.equal('creative-1');
      });

      describe('width/height of a video bid', () => {
        const VAST_XML = '<VAST version="3.0"><Ad id="1"></Ad></VAST>';

        function buildVideoOrtbRequest() {
          return buildOrtbRequest({
            video: { context: 'instream', mimes: ['video/mp4'], playerSize: [[640, 480]] },
          });
        }

        it('falls back to the requested player size when the Exchange returns no w/h',
          () => {
            const request = buildVideoOrtbRequest();
            const [bid] = spec.interpretResponse(
              responseWithBid(request, { adm: VAST_XML, mtype: 2 }), request);

            expect(bid.width).to.equal(640);
            expect(bid.height).to.equal(480);
          });

        it('uses the player size for both when the Exchange returns only one of w/h',
          () => {
            const request = buildVideoOrtbRequest();
            const [bid] = spec.interpretResponse(
              responseWithBid(request, { adm: VAST_XML, mtype: 2, w: 320 }),
              request);

            expect(bid.width).to.equal(640);
            expect(bid.height).to.equal(480);
          });

        it('keeps the w/h the Exchange returns', () => {
          const request = buildVideoOrtbRequest();
          const [bid] = spec.interpretResponse(
            responseWithBid(request, { adm: VAST_XML, mtype: 2, w: 320, h: 180 }),
            request);

          expect(bid.width).to.equal(320);
          expect(bid.height).to.equal(180);
        });
      });
    }

    it('does not fill width/height of a banner bid that comes without w/h', () => {
      const request = buildOrtbRequest();
      const [bid] = spec.interpretResponse(
        responseWithBid(request, { adm: '<div>creative</div>', mtype: 1 }),
        request);

      expect(bid.width, 'width').to.equal(undefined);
      expect(bid.height, 'height').to.equal(undefined);
    });
  });

  describe('getUserSyncs', () => {
    const IFRAME_URL =
        'https://cs.example.jp/yie/ld/cshtml?id=123&loc=https%3A%2F%2Fpub.example%2Fp&ua=UA';

    function responseWithSync(iframe) {
      return { body: { seatbid: [], ext: { usersync: { iframe } } } };
    }

    it('registers an iframe sync from ext.usersync.iframe', () => {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true }, [responseWithSync(IFRAME_URL)]);
      expect(syncs).to.deep.equal([{ type: 'iframe', url: IFRAME_URL }]);
    });

    it('returns undefined when iframe syncs are disabled', () => {
      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, [
        responseWithSync(IFRAME_URL)
      ])).to.be.undefined;
    });

    it('returns undefined when there is no ext.usersync.iframe', () => {
      expect(spec.getUserSyncs({ iframeEnabled: true }, [{ body: { seatbid: [] } }]))
        .to.be.undefined;
      expect(spec.getUserSyncs({ iframeEnabled: true }, [
        { body: { seatbid: [], ext: { usersync: {} } } }
      ])).to.be.undefined;
      expect(spec.getUserSyncs({ iframeEnabled: true }, [{ body: undefined }]))
        .to.be.undefined;
    });

    it('returns undefined when serverResponses is missing or empty', () => {
      expect(spec.getUserSyncs({ iframeEnabled: true }, [])).to.be.undefined;
      expect(spec.getUserSyncs({ iframeEnabled: true }, undefined))
        .to.be.undefined;
    });

    it('de-duplicates identical iframe URLs across responses', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [
        responseWithSync(IFRAME_URL),
        responseWithSync(IFRAME_URL),
      ]);
      expect(syncs).to.deep.equal([{ type: 'iframe', url: IFRAME_URL }]);
    });

    it('registers distinct iframe URLs from multiple responses', () => {
      const other =
          'https://cs.example.jp/yie/ld/cshtml?id=456&loc=https%3A%2F%2Fpub.example%2Fp&ua=UA';
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [
        responseWithSync(IFRAME_URL),
        responseWithSync(other),
      ]);
      expect(syncs).to.deep.equal([
        { type: 'iframe', url: IFRAME_URL },
        { type: 'iframe', url: other },
      ]);
    });
  });
});
