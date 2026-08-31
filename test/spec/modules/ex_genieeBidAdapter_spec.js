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

    // placementId is passed through to the Exchange, which owns its validation,
    // so the adapter accepts whatever the publisher configured (including
    // nothing at all).
    it('does not validate placementId', () => {
      [undefined, 'sidebar', 'Sidebar', 'top-banner_1', '', 'a'.repeat(41),
        'side bar', 'サイドバー', 123]
        .forEach((placementId) => {
          expect(
            spec.isBidRequestValid(
              makeBid({ params: { partnerId: PARTNER_ID, placementId } })),
                `placementId: ${JSON.stringify(placementId)}`)
            .to.equal(true);
        });
    });

    it('is invalid when mediaTypes is missing entirely', () => {
      expect(spec.isBidRequestValid(makeBid({ mediaTypes: undefined })))
        .to.equal(false);
    });

    it('is invalid when the banner mediaType is absent', () => {
      expect(spec.isBidRequestValid(makeBid({ mediaTypes: {} }))).to.equal(false);
    });

    it('is invalid for a non-banner mediaType (e.g. video)', () => {
      expect(spec.isBidRequestValid(makeBid({
        mediaTypes: { video: { context: 'outstream' } }
      }))).to.equal(false);
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

    it('keeps an auction type supplied by the publisher through ortb2', () => {
      const bids = [makeBid()];
      const bidderRequest = makeBidderRequest(bids, {
        ortb2: { at: 2, site: { page: 'https://example.com/page' } },
      });
      const [request] = spec.buildRequests(bids, bidderRequest);

      expect(request.data.at).to.equal(2);
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

    it('sends placementId as the placement query parameter when it is set',
      () => {
        const bids =
             [makeBid({ params: { partnerId: 456, placementId: 'top-banner_1' } })];
        const [request] = spec.buildRequests(bids, makeBidderRequest(bids));

        expect(request.url)
          .to.equal(`${DEFAULT_ENDPOINT}?id=456&placement=top-banner_1`);
      });

    it('omits the placement query parameter when placementId is absent', () => {
      const bids = [makeBid()];
      const [request] = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(request.url).to.equal(`${DEFAULT_ENDPOINT}?id=${PARTNER_ID}`);
    });

    it('percent-encodes placementId so it cannot break the query string',
      () => {
        const bids = [makeBid({
          params: { partnerId: PARTNER_ID, placementId: 'top banner&id=9' }
        })];
        const [request] = spec.buildRequests(bids, makeBidderRequest(bids));

        expect(request.url)
          .to.equal(`${DEFAULT_ENDPOINT}?id=${
                 PARTNER_ID}&placement=top%20banner%26id%3D9`);
      });

    it('resolves the placement query parameter per bid', () => {
      const bids = [
        makeBid({ params: { partnerId: PARTNER_ID, placementId: 'sidebar' } }),
        makeBid({ bidId: 'bid-id-2', adUnitCode: 'ex-geniee-test-ad-2' }),
      ];
      const requests = spec.buildRequests(bids, makeBidderRequest(bids));

      expect(requests).to.have.lengthOf(2);
      expect(requests[0].url)
        .to.equal(`${DEFAULT_ENDPOINT}?id=${PARTNER_ID}&placement=sidebar`);
      expect(requests[1].url).to.equal(`${DEFAULT_ENDPOINT}?id=${PARTNER_ID}`);
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
    function buildOrtbRequest() {
      const bids = [makeBid()];
      return spec.buildRequests(bids, makeBidderRequest(bids))[0];
    }

    it('returns [] on an empty (204) body', () => {
      expect(spec.interpretResponse({ body: undefined }, buildOrtbRequest()))
        .to.deep.equal([]);
      expect(spec.interpretResponse({ body: {} }, buildOrtbRequest()))
        .to.deep.equal([]);
    });

    it('parses a winning banner bid', () => {
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
