import { expect } from "chai";
import { spec } from "../../../modules/lunamediahbBidAdapter.js";
import { config } from "../../../src/config.js";
import { BANNER, NATIVE, VIDEO } from "../../../src/mediaTypes.js";

const BIDDER_CODE = "lunamediahb";
const LUNAMEDIAHB_BID_URL = "https://lunamedia.bid/prebid/bid";

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

function buildRequest(bidRequests, requestOverrides = {}) {
  return spec.buildRequests(
    bidRequests,
    bidderRequest({ bids: bidRequests, ...requestOverrides })
  )[0];
}

function getImp(request, impId) {
  return request.data.imp.find((imp) => imp.id === impId);
}

function serverResponse(bids) {
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
    },
  };
}

describe("lunamediahbBidAdapter", function () {
  beforeEach(function () {
    config.resetConfig();
  });

  it("registers the lunamediahb bidder code", function () {
    expect(spec.code).to.equal(BIDDER_CODE);
  });

  it("exposes the Luna Media GVL ID", function () {
    expect(spec.gvlid).to.equal(998);
  });

  it("supports banner, video, and native media types", function () {
    expect(spec.supportedMediaTypes).to.deep.equal([BANNER, VIDEO, NATIVE]);
  });

  describe("isBidRequestValid", function () {
    it("accepts bids with Ferio params", function () {
      expect(spec.isBidRequestValid(bidRequest())).to.equal(true);
    });

    it("rejects old placementId-only bids", function () {
      expect(
        spec.isBidRequestValid(
          bidRequest({
            params: {
              placementId: "legacy-placement",
            },
          })
        )
      ).to.equal(false);
    });

    it("rejects bids missing required Ferio params", function () {
      ["publisherId", "adUnitId", "tenantId"].forEach((paramName) => {
        const params = {
          publisherId: "pub-123",
          adUnitId: "ad-unit-456",
          tenantId: "tenant-123",
        };
        delete params[paramName];

        expect(
          spec.isBidRequestValid(
            bidRequest({
              params,
            })
          )
        ).to.equal(false);
      });
    });
  });

  describe("buildRequests", function () {
    it("builds one POST OpenRTB request to the Lunamedia endpoint", function () {
      const bannerBid = bidRequest({ bidId: "banner-bid" });
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

      const requests = spec.buildRequests(
        [bannerBid, videoBid, nativeBid],
        bidderRequest({ bids: [bannerBid, videoBid, nativeBid] })
      );

      expect(requests).to.be.an("array").with.lengthOf(1);
      expect(requests[0].method).to.equal("POST");
      expect(requests[0].url).to.equal(LUNAMEDIAHB_BID_URL);
      expect(requests[0].options).to.deep.equal({
        contentType: "text/plain",
        withCredentials: true,
      });
      expect(requests[0].data.tmax).to.equal(800);
      expect(requests[0].data.imp.map((imp) => imp.id)).to.deep.equal([
        "banner-bid",
        "video-bid",
        "native-bid",
      ]);
    });

    it("places bidder params under imp.ext.prebid.bidder.lunamediahb", function () {
      const request = buildRequest([bidRequest()]);
      const imp = getImp(request, "bid-1");

      expect(imp.ext.prebid.bidder.lunamediahb).to.deep.equal({
        publisherId: "pub-123",
        adUnitId: "ad-unit-456",
        tenantId: "tenant-123",
      });
    });
  });

  describe("interpretResponse", function () {
    it("interprets an OpenRTB banner response with lunamediahb adapter codes", function () {
      const request = buildRequest([bidRequest()]);
      const bids = spec.interpretResponse(
        serverResponse([
          {
            id: "response-bid-1",
            impid: "bid-1",
            price: 1.1,
            adm: "<div>ad</div>",
            crid: "creative-banner",
            w: 300,
            h: 250,
            mtype: 1,
            adomain: ["advertiser.example"],
          },
        ]),
        request
      );

      expect(bids).to.have.lengthOf(1);
      expect(bids[0]).to.deep.include({
        requestId: "bid-1",
        cpm: 1.1,
        width: 300,
        height: 250,
        ad: "<div>ad</div>",
        creativeId: "creative-banner",
        currency: "USD",
        netRevenue: true,
        ttl: 300,
        mediaType: BANNER,
        bidderCode: BIDDER_CODE,
        adapterCode: BIDDER_CODE,
      });
      expect(bids[0].meta.advertiserDomains).to.deep.equal([
        "advertiser.example",
      ]);
    });
  });

  describe("getUserSyncs", function () {
    it("derives image and iframe sync URLs from the Lunamedia endpoint", function () {
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
          url: "https://lunamedia.bid/prebid/sync?us_privacy=1YA-&gdpr=1&gdpr_consent=gdpr%20consent&gpp=gpp%20consent&gpp_sid=8%2C9",
        },
        {
          type: "iframe",
          url: "https://lunamedia.bid/prebid/cli/iframe.html?us_privacy=1YA-&gdpr=1&gdpr_consent=gdpr%20consent&gpp=gpp%20consent&gpp_sid=8%2C9",
        },
      ]);
    });
  });
});
