import { expect } from "chai";
import { spec } from "../../../modules/ferioBidAdapter.js";
import { createFerioBidderSpec } from "../../../libraries/ferioUtils/bidderUtils.js";
import { config } from "../../../src/config.js";
import { BANNER, NATIVE, VIDEO } from "../../../src/mediaTypes.js";
import { isValid } from "../../../src/adapters/bidderFactory.js";
import { stubAuctionIndex } from "../../helpers/indexStub.js";

const BIDDER_CODE = "ferio";
const ALIAS_CODE = "clientABidder";
const ALIAS_PARAM_BIDDER_CODE = "ferioflow";
const FERIO_BID_URL = "https://ferio.bid/pbjs/bid";
const ALIAS_BID_URL = "https://bidder.ferio.cloud/prebid/bid";
const MYFEATURE_CODE = "myfeature";
const MYFEATURE_BID_URL = "https://featuretv.bid/prebid/bid";
const FERIO_ALIASES = [
  {
    code: MYFEATURE_CODE,
    bidUrl: MYFEATURE_BID_URL,
    syncBaseUrl: "https://featuretv.bid/prebid",
    skipPbsAliasing: true,
  },
];

function bidRequest(overrides = {}) {
  return {
    bidder: BIDDER_CODE,
    bidId: "bid-1",
    adUnitCode: "adunit-1",
    transactionId: "tx-1",
    bidRequestsCount: 1,
    mediaTypes: {
      [BANNER]: {
        sizes: [[300, 250]],
      },
    },
    params: {
      publisherId: "pub-123",
      adUnitId: "ad-unit-456",
      tenantId: "tenant-123",
    },
    ...overrides,
  };
}

function bidderRequest(overrides = {}) {
  return {
    bidderCode: BIDDER_CODE,
    auctionId: "auction-1",
    timeout: 800,
    refererInfo: {
      page: "https://example.com/article",
      location: "https://example.com/article",
      domain: "example.com",
      ref: "https://referrer.example.com",
      isAmp: false,
    },
    ortb2: {
      site: {
        page: "https://example.com/article",
      },
      device: {
        ua: "Mozilla/5.0 test",
        language: "en-US",
        w: 1366,
        h: 768,
      },
    },
    ...overrides,
  };
}

function getImp(request, impId) {
  return request.data.imp.find((imp) => imp.id === impId);
}

function buildRequest(bidRequests, requestOverrides = {}, adapterSpec = spec) {
  return adapterSpec.buildRequests(
    bidRequests,
    bidderRequest({ bids: bidRequests, ...requestOverrides })
  )[0];
}

function serverResponse(bids, overrides = {}) {
  return {
    body: {
      id: "response-1",
      seatbid: [
        {
          seat: BIDDER_CODE,
          bid: bids,
        },
      ],
      cur: "USD",
      ...overrides,
    },
  };
}

describe("ferioBidAdapter", function () {
  beforeEach(function () {
    config.resetConfig();
  });

  it("registers the ferio bidder code", function () {
    expect(spec.code).to.equal(BIDDER_CODE);
  });

  describe("createFerioBidderSpec", function () {
    it("creates alias specs with configurable endpoint and bidder params key", function () {
      const aliasSpec = createFerioBidderSpec({
        code: ALIAS_CODE,
        endpoint: "https://bidder.ferio.cloud/prebid",
        paramBidderCode: ALIAS_PARAM_BIDDER_CODE,
      });
      const aliasBid = bidRequest({
        bidder: ALIAS_CODE,
        params: {
          publisherId: "pub-123",
          adUnitId: "ad-unit-456",
        },
      });

      expect(aliasSpec.code).to.equal(ALIAS_CODE);
      expect(aliasSpec.isBidRequestValid(aliasBid)).to.equal(true);

      const request = buildRequest(
        [aliasBid],
        { bidderCode: ALIAS_CODE, bids: [aliasBid] },
        aliasSpec
      );
      const imp = getImp(request, "bid-1");

      expect(request.url).to.equal(ALIAS_BID_URL);
      expect(imp.ext.prebid.bidder[ALIAS_PARAM_BIDDER_CODE]).to.deep.equal({
        publisherId: "pub-123",
        adUnitId: "ad-unit-456",
      });
      expect(imp.ext.prebid.bidder).to.not.have.property(ALIAS_CODE);

      const bids = aliasSpec.interpretResponse(
        serverResponse([], {
          seatbid: [
            {
              seat: "router-seat",
              bid: [
                {
                  id: "seat-banner",
                  impid: "bid-1",
                  price: 1.1,
                  adm: "<div>ad</div>",
                  crid: "creative-banner",
                  w: 300,
                  h: 250,
                  mtype: 1,
                },
              ],
            },
          ],
        }),
        request
      );

      expect(bids).to.have.lengthOf(1);
      expect(bids[0]).to.deep.include({
        requestId: "bid-1",
        bidderCode: ALIAS_CODE,
        adapterCode: ALIAS_CODE,
        mediaType: BANNER,
      });
    });

    it("lets alias specs opt into extra required params", function () {
      const aliasSpec = createFerioBidderSpec({
        code: ALIAS_CODE,
        endpoint: "https://bidder.ferio.cloud/prebid/bid",
        paramBidderCode: ALIAS_PARAM_BIDDER_CODE,
        requiredParams: ["tenantId"],
      });

      expect(
        aliasSpec.isBidRequestValid(
          bidRequest({
            bidder: ALIAS_CODE,
            params: {
              publisherId: "pub-123",
              adUnitId: "ad-unit-456",
            },
          })
        )
      ).to.equal(false);
      expect(
        aliasSpec.isBidRequestValid(
          bidRequest({
            bidder: ALIAS_CODE,
          })
        )
      ).to.equal(true);
    });
  });

  describe("aliases", function () {
    it("registers aliases without leaking endpoint config", function () {
      expect(spec.aliases).to.have.lengthOf(FERIO_ALIASES.length);
      FERIO_ALIASES.forEach(({ code, skipPbsAliasing }) => {
        const alias = spec.aliases.find((alias) => alias.code === code);

        expect(alias).to.exist;
        expect(alias.skipPbsAliasing).to.equal(skipPbsAliasing);
        expect(alias).to.not.have.property("endpoint");
      });
    });

    it("routes alias bid requests to the alias endpoint", function () {
      FERIO_ALIASES.forEach(({ code, bidUrl }) => {
        const aliasBid = bidRequest({ bidder: code });
        const request = buildRequest([aliasBid], {
          bidderCode: code,
          bids: [aliasBid],
        });
        const imp = getImp(request, "bid-1");

        expect(request.url).to.equal(bidUrl);
        expect(imp.ext.prebid.bidder[code]).to.deep.equal({
          publisherId: "pub-123",
          adUnitId: "ad-unit-456",
          tenantId: "tenant-123",
        });
        expect(imp.ext.prebid.bidder).to.not.have.property(BIDDER_CODE);
      });

      const primaryRequest = buildRequest([bidRequest()]);
      expect(primaryRequest.url).to.equal(FERIO_BID_URL);
    });

    it("lets embedded aliases override the bidder params key", function () {
      const aliasSpec = createFerioBidderSpec({
        endpoint: FERIO_BID_URL,
        aliases: [
          {
            code: ALIAS_CODE,
            endpoint: ALIAS_BID_URL,
            paramBidderCode: ALIAS_PARAM_BIDDER_CODE,
          },
        ],
      });
      const aliasBid = bidRequest({ bidder: ALIAS_CODE });
      const request = buildRequest(
        [aliasBid],
        { bidderCode: ALIAS_CODE, bids: [aliasBid] },
        aliasSpec
      );
      const imp = getImp(request, "bid-1");

      expect(request.url).to.equal(ALIAS_BID_URL);
      expect(imp.ext.prebid.bidder[ALIAS_PARAM_BIDDER_CODE]).to.deep.equal({
        publisherId: "pub-123",
        adUnitId: "ad-unit-456",
        tenantId: "tenant-123",
      });
      expect(imp.ext.prebid.bidder).to.not.have.property(ALIAS_CODE);
      expect(imp.ext.prebid.bidder).to.not.have.property(BIDDER_CODE);
    });

    it("attributes alias responses to the alias bidder code", function () {
      FERIO_ALIASES.forEach(({ code }) => {
        const aliasBid = bidRequest({ bidder: code });
        const request = buildRequest([aliasBid], {
          bidderCode: code,
          bids: [aliasBid],
        });

        const bids = spec.interpretResponse(
          serverResponse([
            {
              id: "seat-banner",
              impid: "bid-1",
              price: 1.1,
              adm: "<div>ad</div>",
              crid: "creative-banner",
              w: 300,
              h: 250,
              mtype: 1,
            },
          ]),
          request
        );

        expect(bids).to.have.lengthOf(1);
        expect(bids[0]).to.deep.include({
          requestId: "bid-1",
          bidderCode: code,
          adapterCode: code,
          mediaType: BANNER,
        });
      });
    });

    it("falls back to the primary endpoint for alias and unknown codes without one", function () {
      const aliasSpec = createFerioBidderSpec({
        endpoint: FERIO_BID_URL,
        aliases: [{ code: ALIAS_CODE }],
      });
      const aliasBid = bidRequest({ bidder: ALIAS_CODE });

      const aliasRequest = aliasSpec.buildRequests(
        [aliasBid],
        bidderRequest({ bidderCode: ALIAS_CODE, bids: [aliasBid] })
      )[0];
      expect(aliasRequest.url).to.equal(FERIO_BID_URL);

      const unknownRequest = aliasSpec.buildRequests(
        [aliasBid],
        bidderRequest({ bidderCode: "unregisteredAlias", bids: [aliasBid] })
      )[0];
      expect(unknownRequest.url).to.equal(FERIO_BID_URL);
    });

    it("ignores aliases that duplicate the primary or another alias code", function () {
      const guardedSpec = createFerioBidderSpec({
        endpoint: FERIO_BID_URL,
        aliases: [
          { code: BIDDER_CODE, endpoint: "https://hijack.example/bid" },
          { code: ALIAS_CODE, endpoint: ALIAS_BID_URL },
          { code: ALIAS_CODE, endpoint: "https://hijack.example/bid" },
        ],
      });

      expect(guardedSpec.aliases).to.have.lengthOf(1);
      expect(guardedSpec.aliases[0].code).to.equal(ALIAS_CODE);

      const primaryRequest = buildRequest([bidRequest()], {}, guardedSpec);
      expect(primaryRequest.url).to.equal(FERIO_BID_URL);

      const aliasBid = bidRequest({ bidder: ALIAS_CODE });
      const aliasRequest = buildRequest(
        [aliasBid],
        { bidderCode: ALIAS_CODE },
        guardedSpec
      );
      expect(aliasRequest.url).to.equal(ALIAS_BID_URL);
    });

    it("builds no alias requests or syncs when an explicit alias endpoint is not https", function () {
      ["javascript:alert(1)", "http://insecure.ferio.cloud/bid"].forEach(
        (aliasEndpoint) => {
          const aliasSpec = createFerioBidderSpec({
            endpoint: FERIO_BID_URL,
            aliases: [{ code: ALIAS_CODE, endpoint: aliasEndpoint }],
          });
          const aliasBid = bidRequest({ bidder: ALIAS_CODE });

          const aliasRequests = aliasSpec.buildRequests(
            [aliasBid],
            bidderRequest({ bidderCode: ALIAS_CODE, bids: [aliasBid] })
          );
          expect(aliasRequests).to.deep.equal([]);

          const syncs = aliasSpec.getUserSyncs.call(
            { ...aliasSpec, code: ALIAS_CODE },
            { pixelEnabled: true },
            []
          );
          expect(syncs).to.deep.equal([]);
        }
      );
    });

    it("builds no requests when the primary endpoint is not a valid https URL", function () {
      const invalidSpec = createFerioBidderSpec({ endpoint: "not a url" });

      expect(
        invalidSpec.buildRequests([bidRequest()], bidderRequest())
      ).to.deep.equal([]);
    });

    it("derives alias user sync URLs from the alias endpoint", function () {
      FERIO_ALIASES.forEach(({ code, syncBaseUrl }) => {
        const syncs = spec.getUserSyncs.call(
          { ...spec, code },
          {
            iframeEnabled: true,
            pixelEnabled: true,
          },
          []
        );

        expect(syncs).to.deep.equal([
          {
            type: "image",
            url: `${syncBaseUrl}/sync?us_privacy=&gdpr=0&gdpr_consent=`,
          },
          {
            type: "iframe",
            url: `${syncBaseUrl}/cli/iframe.html?us_privacy=&gdpr=0&gdpr_consent=`,
          },
        ]);
      });
    });

    it("falls back to the primary sync base when called without a spec context", function () {
      const { getUserSyncs } = spec;
      const syncs = getUserSyncs(
        {
          iframeEnabled: false,
          pixelEnabled: true,
        },
        []
      );

      expect(syncs).to.deep.equal([
        {
          type: "image",
          url: "https://ferio.bid/pbjs/sync?us_privacy=&gdpr=0&gdpr_consent=",
        },
      ]);
    });
  });

  describe("isBidRequestValid", function () {
    it("returns true for valid banner, video, and native requests", function () {
      expect(spec.isBidRequestValid(bidRequest())).to.equal(true);
      expect(
        spec.isBidRequestValid(
          bidRequest({
            mediaTypes: {
              [VIDEO]: {
                playerSize: [640, 480],
                context: "instream",
              },
            },
          })
        )
      ).to.equal(true);
      expect(
        spec.isBidRequestValid(
          bidRequest({
            mediaTypes: {
              [NATIVE]: {},
            },
            nativeOrtbRequest: {
              ver: "1.2",
              assets: [{ id: 1, title: { len: 90 } }],
            },
          })
        )
      ).to.equal(true);
    });

    it("requires publisherId, adUnitId, and tenantId", function () {
      [
        {
          adUnitId: "ad-unit-456",
          tenantId: "tenant-123",
        },
        {
          publisherId: "pub-123",
          tenantId: "tenant-123",
        },
        {
          publisherId: "pub-123",
          adUnitId: "ad-unit-456",
        },
        {
          publisherId: "",
          adUnitId: "ad-unit-456",
          tenantId: "tenant-123",
        },
        {
          publisherId: "pub-123",
          adUnitId: "",
          tenantId: "tenant-123",
        },
        {
          publisherId: "pub-123",
          adUnitId: "ad-unit-456",
          tenantId: "",
        },
      ].forEach((params) => {
        expect(spec.isBidRequestValid(bidRequest({ params }))).to.equal(false);
      });
    });

    it("does not accept alternate param names for adUnitId or tenantId", function () {
      expect(
        spec.isBidRequestValid(
          bidRequest({
            params: {
              publisherId: "pub-123",
              tenantId: "tenant-123",
              supplyTagId: "supply-tag-456",
            },
          })
        )
      ).to.equal(false);
      expect(
        spec.isBidRequestValid(
          bidRequest({
            params: {
              publisherId: "pub-123",
              tenantId: "tenant-123",
              placementId: "placement-456",
            },
          })
        )
      ).to.equal(false);
      expect(
        spec.isBidRequestValid(
          bidRequest({
            params: {
              publisherId: "pub-123",
              adUnitId: "ad-unit-456",
              tid: "tenant-123",
            },
          })
        )
      ).to.equal(false);
    });

    it("requires valid media declarations", function () {
      expect(
        spec.isBidRequestValid(
          bidRequest({
            mediaTypes: {},
          })
        )
      ).to.equal(false);
      expect(
        spec.isBidRequestValid(
          bidRequest({
            mediaTypes: {
              [BANNER]: {},
            },
          })
        )
      ).to.equal(false);
      expect(
        spec.isBidRequestValid(
          bidRequest({
            mediaTypes: {
              [VIDEO]: {
                context: "instream",
              },
            },
          })
        )
      ).to.equal(false);
      expect(
        spec.isBidRequestValid(
          bidRequest({
            mediaTypes: {
              [NATIVE]: {},
            },
          })
        )
      ).to.equal(false);
    });
  });

  describe("buildRequests", function () {
    it("uses the Ferio OpenRTB endpoint and request options", function () {
      config.setConfig({
        [BIDDER_CODE]: {
          endpoint: "https://ignored.ferio.cloud",
        },
      });

      const requests = spec.buildRequests([bidRequest()], bidderRequest());

      expect(requests).to.be.an("array").with.lengthOf(1);
      expect(requests[0].url).to.equal(FERIO_BID_URL);
      expect(requests[0].method).to.equal("POST");
      expect(requests[0].options).to.deep.equal({
        contentType: "text/plain",
        withCredentials: true,
      });
      expect(requests[0].data).to.be.an("object");
      expect(requests[0].data.imp).to.be.an("array").with.lengthOf(1);
      expect(requests[0].data.tmax).to.equal(800);
      expect(requests[0].data.site.page).to.equal(
        "https://example.com/article"
      );
    });

    it("emits one OpenRTB request for all bids even when params.host is present", function () {
      const balancerBid = bidRequest({ bidId: "bid-balancer" });
      const tenantABid = bidRequest({
        bidId: "bid-tenant-a",
        params: {
          publisherId: "pub-456",
          adUnitId: "ad-unit-456",
          tenantId: "tenant-456",
          host: "https://tenant-a.ferio.cloud",
        },
      });
      const tenantASecondBid = bidRequest({
        bidId: "bid-tenant-a-2",
        params: {
          publisherId: "pub-789",
          adUnitId: "ad-unit-789",
          tenantId: "tenant-789",
          host: "https://tenant-a.ferio.cloud",
        },
      });

      const requests = spec.buildRequests(
        [balancerBid, tenantABid, tenantASecondBid],
        bidderRequest()
      );

      expect(requests).to.be.an("array").with.lengthOf(1);
      expect(requests[0].url).to.equal(FERIO_BID_URL);
      expect(requests[0].data.imp.map((imp) => imp.id)).to.deep.equal([
        "bid-balancer",
        "bid-tenant-a",
        "bid-tenant-a-2",
      ]);
    });

    it("places bidder params under imp.ext.prebid.bidder.ferio", function () {
      const request = buildRequest([
        bidRequest({
          bidder: ALIAS_CODE,
        }),
      ]);
      const imp = getImp(request, "bid-1");

      expect(imp.ext.prebid.bidder.ferio).to.deep.equal({
        publisherId: "pub-123",
        adUnitId: "ad-unit-456",
        tenantId: "tenant-123",
      });
      expect(imp.ext.prebid.bidder).to.not.have.property(ALIAS_CODE);
    });

    it("builds banner, video, and native impressions", function () {
      const userEids = [
        {
          source: "pubcid.org",
          uids: [{ id: "pubcid", atype: 1 }],
        },
      ];
      const bannerBid = bidRequest({
        bidId: "banner-bid",
      });
      const videoBid = bidRequest({
        bidId: "video-bid",
        mediaTypes: {
          [VIDEO]: {
            playerSize: [[640, 480]],
            context: "instream",
            protocols: [2, 3, 5, 6],
            mimes: ["video/mp4"],
          },
        },
        ortb2Imp: {
          ext: {
            tid: "imp-tid",
          },
        },
      });
      const nativeBid = bidRequest({
        bidId: "native-bid",
        mediaTypes: {
          [NATIVE]: {},
        },
        nativeOrtbRequest: {
          ver: "1.2",
          assets: [{ id: 1, title: { len: 90 } }],
        },
      });

      const request = buildRequest(
        [bannerBid, videoBid, nativeBid],
        {
          ortb2: {
            user: {
              ext: {
                eids: userEids,
              },
            },
          },
        }
      );

      const bannerImp = getImp(request, "banner-bid");
      expect(bannerImp.banner.format).to.deep.equal([{ w: 300, h: 250 }]);

      const videoImp = getImp(request, "video-bid");
      expect(videoImp.ext.tid).to.equal("imp-tid");
      if (FEATURES.VIDEO) {
        expect(videoImp.video).to.deep.include({
          w: 640,
          h: 480,
        });
        expect(videoImp.video.protocols).to.deep.equal([2, 3, 5, 6]);
        expect(videoImp.video.mimes).to.deep.equal(["video/mp4"]);
      }

      const nativeImp = getImp(request, "native-bid");
      if (FEATURES.NATIVE) {
        expect(JSON.parse(nativeImp.native.request)).to.deep.equal({
          ver: "1.2",
          assets: [{ id: 1, title: { len: 90 } }],
        });
        expect(nativeImp.native.ver).to.equal("1.2");
      }

      expect(request.data.user.ext.eids).to.deep.equal(userEids);
    });

    it("passes privacy fields from ortb2 to the OpenRTB request", function () {
      const request = buildRequest(
        [bidRequest()],
        {
          ortb2: {
            regs: {
              ext: {
                gdpr: 1,
                us_privacy: "1YNN",
              },
              gpp: "gpp-string",
              gpp_sid: [8],
            },
            user: {
              ext: {
                consent: "consent-string",
              },
            },
          },
        }
      );

      expect(request.data.regs.ext.gdpr).to.equal(1);
      expect(request.data.user.ext.consent).to.equal("consent-string");
      expect(request.data.regs.ext.us_privacy).to.equal("1YNN");
      expect(request.data.regs.gpp).to.equal("gpp-string");
      expect(request.data.regs.gpp_sid).to.deep.equal([8]);
    });

    it("passes schain from ortb2 to the OpenRTB request", function () {
      const schain = {
        ver: "1.0",
        complete: 1,
        nodes: [{ asi: "exchange.example", sid: "seller-123", hp: 1 }],
      };
      const request = buildRequest(
        [bidRequest()],
        {
          ortb2: {
            source: {
              ext: {
                schain,
              },
            },
          },
        }
      );

      expect(request.data.source.ext.schain).to.deep.equal(schain);
    });

    it("returns an empty request list when there are no valid bid requests", function () {
      expect(spec.buildRequests([], bidderRequest())).to.deep.equal([]);
    });
  });

  describe("interpretResponse", function () {
    it("normalizes router response seats to the requested adapter bidder code", function () {
      const requestBid = bidRequest();
      const request = buildRequest([requestBid]);
      const bids = spec.interpretResponse(
        serverResponse([], {
          seatbid: [
            {
              seat: "4OkkP5Kru1ICV7pVr5sTkA",
              bid: [
                {
                  id: "seat-banner",
                  impid: "bid-1",
                  price: 1.1,
                  adm: "<div>ad</div>",
                  crid: "creative-banner",
                  w: 300,
                  h: 250,
                  mtype: 1,
                },
              ],
            },
          ],
        }),
        request
      );
      const bid = bids[0];

      expect(bids).to.have.lengthOf(1);
      expect(bid).to.deep.include({
        requestId: "bid-1",
        bidderCode: BIDDER_CODE,
        adapterCode: BIDDER_CODE,
        currency: "USD",
        creativeId: "creative-banner",
        ttl: 300,
        netRevenue: true,
        mediaType: BANNER,
        width: 300,
        height: 250,
        ad: "<div>ad</div>",
      });
      expect(
        isValid(
          requestBid.adUnitCode,
          { ...bid },
          {
            index: stubAuctionIndex({ bidRequests: [requestBid] }),
          }
        )
      ).to.equal(true);
    });

    it("parses standard OpenRTB banner, video, and native responses", function () {
      const nativeAd = {
        ver: "1.2",
        assets: [{ id: 1, title: { text: "Native title" } }],
        link: { url: "https://example.com/click" },
      };
      const request = buildRequest([
        bidRequest({
          bidId: "banner-bid",
        }),
        bidRequest({
          bidId: "video-bid",
          mediaTypes: {
            [VIDEO]: {
              playerSize: [[640, 480]],
              context: "instream",
              mimes: ["video/mp4"],
            },
          },
        }),
        bidRequest({
          bidId: "native-bid",
          mediaTypes: {
            [NATIVE]: {},
          },
          nativeOrtbRequest: {
            ver: "1.2",
            assets: [{ id: 1, title: { len: 90 } }],
          },
        }),
      ]);

      const bids = spec.interpretResponse(
        serverResponse([
          {
            id: "seat-banner",
            impid: "banner-bid",
            price: 1.1,
            adm: "<div>ad</div>",
            adomain: ["example.com"],
            crid: "creative-banner",
            w: 300,
            h: 250,
            mtype: 1,
          },
          {
            id: "seat-video",
            impid: "video-bid",
            price: 2.1,
            adm: "<VAST></VAST>",
            nurl: "https://example.com/vast",
            crid: "creative-video",
            mtype: 2,
          },
          {
            id: "seat-native",
            impid: "native-bid",
            price: 3.1,
            adm: JSON.stringify(nativeAd),
            crid: "creative-native",
            mtype: 4,
          },
        ]),
        request
      );

      expect(bids).to.be.an("array").with.lengthOf(3);

      const bannerBid = bids.find((bid) => bid.requestId === "banner-bid");
      expect(bannerBid).to.deep.include({
        requestId: "banner-bid",
        seatBidId: "seat-banner",
        cpm: 1.1,
        currency: "USD",
        creativeId: "creative-banner",
        ttl: 300,
        netRevenue: true,
        mediaType: BANNER,
        width: 300,
        height: 250,
        ad: "<div>ad</div>",
        bidderCode: BIDDER_CODE,
        adapterCode: BIDDER_CODE,
      });
      expect(bannerBid.meta.advertiserDomains).to.deep.equal(["example.com"]);

      const videoBid = bids.find((bid) => bid.requestId === "video-bid");
      expect(videoBid).to.deep.include({
        requestId: "video-bid",
        cpm: 2.1,
        currency: "USD",
        creativeId: "creative-video",
        ttl: 300,
        netRevenue: true,
        mediaType: VIDEO,
      });
      if (FEATURES.VIDEO) {
        expect(videoBid).to.deep.include({
          vastXml: "<VAST></VAST>",
          vastUrl: "https://example.com/vast",
          playerWidth: 640,
          playerHeight: 480,
        });
      }

      const nativeBid = bids.find((bid) => bid.requestId === "native-bid");
      expect(nativeBid).to.deep.include({
        requestId: "native-bid",
        cpm: 3.1,
        currency: "USD",
        creativeId: "creative-native",
        ttl: 300,
        netRevenue: true,
        mediaType: NATIVE,
      });
      if (FEATURES.NATIVE) {
        expect(nativeBid.native.ortb).to.deep.equal(nativeAd);
      }
    });

    it("unwraps IAB native ADM wrapper responses", function () {
      if (!FEATURES.NATIVE) {
        this.skip();
      }

      const nativeAd = {
        ver: "1.2",
        assets: [
          { id: 1, title: { text: "Simple Native Test Ad" } },
          {
            id: 2,
            img: {
              url: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E",
              w: 300,
              h: 250,
            },
          },
        ],
        link: { url: "https://example.com/click" },
        imptrackers: ["https://example.com/imp"],
      };
      const request = buildRequest([
        bidRequest({
          bidId: "native-bid",
          mediaTypes: {
            [NATIVE]: {},
          },
          nativeOrtbRequest: {
            ver: "1.2",
            assets: [
              { id: 1, title: { len: 90 } },
              { id: 2, img: { type: 3, w: 300, h: 250 } },
            ],
          },
        }),
      ]);

      const bids = spec.interpretResponse(
        serverResponse([
          {
            id: "seat-native",
            impid: "native-bid",
            price: 1.1622,
            adm: JSON.stringify({ native: nativeAd }),
            crid: "creative-native",
            mtype: 4,
            ext: {
              prebid: {
                type: NATIVE,
              },
            },
          },
        ]),
        request
      );

      expect(bids).to.be.an("array").with.lengthOf(1);
      expect(bids[0]).to.deep.include({
        requestId: "native-bid",
        cpm: 1.1622,
        creativeId: "creative-native",
        mediaType: NATIVE,
      });
      expect(bids[0].native.ortb).to.deep.equal(nativeAd);
    });

    it("uses bid.ext.prebid.type when mtype is absent", function () {
      const request = buildRequest([
        bidRequest({
          bidId: "video-bid",
          mediaTypes: {
            [VIDEO]: {
              playerSize: [[640, 480]],
              context: "instream",
            },
          },
        }),
      ]);

      const bids = spec.interpretResponse(
        serverResponse([
          {
            id: "seat-video",
            impid: "video-bid",
            price: 2.1,
            adm: "<VAST></VAST>",
            crid: "creative-video",
            ext: {
              prebid: {
                type: VIDEO,
              },
            },
          },
        ]),
        request
      );

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal(VIDEO);
      if (FEATURES.VIDEO) {
        expect(bids[0].vastXml).to.equal("<VAST></VAST>");
      }
    });

    it("falls back to the original request media type for single-format bids", function () {
      const request = buildRequest([
        bidRequest({
          bidId: "video-bid",
          mediaTypes: {
            [VIDEO]: {
              playerSize: [[640, 480]],
              context: "instream",
            },
          },
        }),
      ]);

      const bids = spec.interpretResponse(
        serverResponse([
          {
            id: "seat-video",
            impid: "video-bid",
            price: 2.1,
            adm: "<VAST></VAST>",
            crid: "creative-video",
          },
        ]),
        request
      );

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal(VIDEO);
      if (FEATURES.VIDEO) {
        expect(bids[0].vastXml).to.equal("<VAST></VAST>");
      }
    });

    it("does not leak fallback media type across bids with the same impid", function () {
      const request = buildRequest([
        bidRequest({
          bidId: "banner-bid",
        }),
      ]);

      const bids = spec.interpretResponse(
        serverResponse([
          {
            id: "seat-banner",
            impid: "banner-bid",
            price: 1.1,
            adm: "<div>ad</div>",
            crid: "creative-banner",
          },
          {
            id: "seat-video",
            impid: "banner-bid",
            price: 2.1,
            adm: "<VAST></VAST>",
            crid: "creative-video",
            ext: {
              prebid: {
                type: VIDEO,
              },
            },
          },
        ]),
        request
      );

      expect(bids).to.have.lengthOf(2);
      expect(bids[0].mediaType).to.equal(BANNER);
      expect(bids[1].mediaType).to.equal(VIDEO);
      if (FEATURES.VIDEO) {
        expect(bids[1].vastXml).to.equal("<VAST></VAST>");
      }
    });

    it("skips multi-format responses without an ORTB media type", function () {
      const request = buildRequest([
        bidRequest({
          bidId: "multi-format-bid",
          mediaTypes: {
            [BANNER]: {
              sizes: [[300, 250]],
            },
            [VIDEO]: {
              playerSize: [[640, 480]],
              context: "instream",
            },
          },
        }),
      ]);

      const bids = spec.interpretResponse(
        serverResponse([
          {
            id: "seat-unknown",
            impid: "multi-format-bid",
            price: 1.1,
            adm: "<div>ad</div>",
            crid: "creative-unknown",
          },
        ]),
        request
      );

      expect(bids).to.deep.equal([]);
    });

    it("returns an empty array for missing or malformed response bodies", function () {
      const request = buildRequest([bidRequest()]);

      expect(spec.interpretResponse({}, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: null }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: {} }, request)).to.deep.equal([]);
      expect(
        spec.interpretResponse(
          {
            body: {
              seatbid: [],
            },
          },
          request
        )
      ).to.deep.equal([]);
      expect(
        spec.interpretResponse({
          body: {
            seatbid: [],
          },
        })
      ).to.deep.equal([]);
    });
  });

  describe("getUserSyncs", function () {
    it("returns an empty array when syncs are disabled", function () {
      expect(
        spec.getUserSyncs(
          {
            iframeEnabled: false,
            pixelEnabled: false,
          },
          [
            {
              body: {
                ext: {
                  ferio: {
                    pixels: [["image", "https://ignored.example.com/sync"]],
                  },
                },
              },
            },
          ]
        )
      ).to.deep.equal([]);
    });

    it("returns image syncs derived from the auction endpoint when pixel sync is enabled", function () {
      const syncs = spec.getUserSyncs(
        {
          iframeEnabled: false,
          pixelEnabled: true,
        },
        [
          {
            body: {
              ext: {
                ferio: {
                  pixels: [["image", "https://ignored.example.com/sync"]],
                },
              },
            },
          },
        ]
      );

      expect(syncs).to.deep.equal([
        {
          type: "image",
          url: "https://ferio.bid/pbjs/sync?us_privacy=&gdpr=0&gdpr_consent=",
        },
      ]);
    });

    it("returns iframe syncs derived from the auction endpoint when iframe sync is enabled", function () {
      const syncs = spec.getUserSyncs(
        {
          iframeEnabled: true,
          pixelEnabled: false,
        },
        []
      );

      expect(syncs).to.deep.equal([
        {
          type: "iframe",
          url: "https://ferio.bid/pbjs/cli/iframe.html?us_privacy=&gdpr=0&gdpr_consent=",
        },
      ]);
    });

    it("returns both sync types with encoded privacy parameters when both are enabled", function () {
      const syncs = spec.getUserSyncs(
        {
          iframeEnabled: true,
          pixelEnabled: true,
        },
        [],
        {
          gdprApplies: true,
          consentString: "gdpr consent",
        },
        "1YA-",
        {
          gppString: "gpp consent",
          applicableSections: [8, 9],
        }
      );

      expect(syncs).to.deep.equal([
        {
          type: "image",
          url: "https://ferio.bid/pbjs/sync?us_privacy=1YA-&gdpr=1&gdpr_consent=gdpr%20consent&gpp=gpp%20consent&gpp_sid=8%2C9",
        },
        {
          type: "iframe",
          url: "https://ferio.bid/pbjs/cli/iframe.html?us_privacy=1YA-&gdpr=1&gdpr_consent=gdpr%20consent&gpp=gpp%20consent&gpp_sid=8%2C9",
        },
      ]);
    });

    it("derives alias sync URLs from the alias auction endpoint", function () {
      const aliasSpec = createFerioBidderSpec({
        code: ALIAS_CODE,
        endpoint: "https://bidder.ferio.cloud/prebid",
        paramBidderCode: ALIAS_PARAM_BIDDER_CODE,
      });

      expect(
        aliasSpec.getUserSyncs({
          iframeEnabled: true,
          pixelEnabled: true,
        })
      ).to.deep.equal([
        {
          type: "image",
          url: "https://bidder.ferio.cloud/prebid/sync?us_privacy=&gdpr=0&gdpr_consent=",
        },
        {
          type: "iframe",
          url: "https://bidder.ferio.cloud/prebid/cli/iframe.html?us_privacy=&gdpr=0&gdpr_consent=",
        },
      ]);
    });

    it("filters user syncs to HTTPS URLs", function () {
      const insecureSpec = createFerioBidderSpec({
        code: ALIAS_CODE,
        endpoint: "http://bidder.ferio.cloud/prebid",
        paramBidderCode: ALIAS_PARAM_BIDDER_CODE,
      });

      const syncs = insecureSpec.getUserSyncs(
        {
          iframeEnabled: true,
          pixelEnabled: true,
        },
        [],
        {
          gdprApplies: true,
          consentString: "gdpr consent",
        },
        "1YA-",
        {
          gppString: "gpp consent",
          applicableSections: [8, 9],
        }
      );

      expect(syncs).to.deep.equal([]);
    });
  });
});
