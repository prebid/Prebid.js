import { expect } from "chai";
import { spec, ENDPOINT } from "modules/empowerBidAdapter.js";
import { config } from "src/config.js";
import { setConfig as setCurrencyConfig } from "../../../modules/currency.js";
import * as utils from "src/utils.js";

describe("EmpowerAdapter", function () {
  let baseBidRequest;

  let bannerBidRequest;
  let bannerServerResponse;
  let bannerServerRequest;

  let videoBidRequest;
  let videoServerResponse;
  let videoServerRequest;

  let bidderRequest;

  beforeEach(function () {
    bidderRequest = {
      refererInfo: {
        page: "https://publisher.com/home",
        domain: "publisher.com",
      },
    };

    baseBidRequest = {
      bidder: "empower",
      params: {
        zone: "123456",
      },
      bidId: "2ffb201a808da7",
      bidderRequestId: "678e3fbad375ce",
      auctionId: "c45dd708-a418-42ec-b8a7-b70a6c6fab0a",
      transactionId: "d45dd707-a418-42ec-b8a7-b70a6c6fab0b",
    };

    bannerBidRequest = {
      ...baseBidRequest,
      mediaTypes: {
        banner: {
          sizes: [
            [970, 250],
            [300, 250],
          ],
        },
      },
      sizes: [
        [640, 320],
        [300, 600],
      ],
    };

    bannerServerResponse = {
      id: "678e3fbad375ce",
      cur: "USD",
      seatbid: [
        {
          bid: [
            {
              id: "288f5e3e-f122-4928-b5df-434f5b664788",
              impid: "2ffb201a808da7",
              price: 0.12,
              cid: "12",
              crid: "123",
              adomain: ["empower.net"],
              adm: '<iframe src="http://localhost:8081/url/creative?id=4326&l=40f1d668-69a9-498e-b694-03fb14c1a1a2&b=e4d39f94-533d-4577-a579-585fd4c02b0a&w=640&h=160" style="width:100%" width=160 height=600></iframe>',
              burl: "https://localhost:8081/url/b?d=b604923d-f420-4227-a8af-09b332b33c2d&c=USD&p=${AUCTION_PRICE}&bad=33d141da-dd49-45fc-b29d-1ed38a2168df&gc=0",
              nurl: "https://ng.virgul.com/i_wu?a=fac123456&ext=,ap0.12,acUSD,sp0.1,scUSD",
              w: 640,
              h: 360,
            },
          ],
        },
      ],
    };

    bannerServerRequest = {
      method: "POST",
      url: "https://bid.virgul.com/prebid",
      data: JSON.stringify({
        id: "678e3fbad375ce",
        imp: [
          {
            id: "2ffb201a808da7",
            bidfloor: 5,
            bidfloorcur: "USD",
            tagid: "123456",
            banner: {
              w: 640,
              h: 360,
              format: [
                { w: 640, h: 360 },
                { w: 320, h: 320 },
              ],
            },
          },
        ],
        site: {
          publisher: {
            id: "44bd6161-667e-4a68-8fa4-18b5ae2d8c89",
          },
          id: "1d973061-fe5d-4622-a071-d8a01d72ba7d",
          ref: "",
          page: "http://localhost",
          domain: "localhost",
        },
        app: null,
        device: {
          ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/61.0.3163.100 Safari/537.36",
          language: "en-US",
        },
        isPrebid: true,
      }),
    };

    videoBidRequest = {
      ...baseBidRequest,
      mediaTypes: { video: { playerSize: [[640, 360]] } },
    };

    videoServerResponse = {
      id: "678e3fbad375ce",
      cur: "USD",
      seatbid: [
        {
          bid: [
            {
              id: "288f5e3e-f122-4928-b5df-434f5b664788",
              impid: "2ffb201a808da7",
              price: 0.12,
              cid: "12",
              crid: "123",
              adomain: ["empower.net"],
              adm: "<VAST></VAST>",
              burl: "https://localhost:8081/url/b?d=b604923d-f420-4227-a8af-09b332b33c2d&c=USD&p=${AUCTION_PRICE}&bad=33d141da-dd49-45fc-b29d-1ed38a2168df&gc=0",
              nurl: "https://ng.virgul.com/i_wu?a=fac123456&ext=,ap01.12,acUSD,sp0.1,scUSD",
              w: 640,
              h: 360,
            },
          ],
        },
      ],
    };

    videoServerRequest = {
      method: "POST",
      url: "https://bid.virgul.com/prebid",
      data: JSON.stringify({
        id: "678e3fbad375ce",
        imp: [
          {
            id: "2ffb201a808da7",
            bidfloor: 5,
            bidfloorcur: "USD",
            tagid: "123456",
            video: { playerSize: [[640, 360]] },
          },
        ],
        site: {
          publisher: {
            id: "44bd6161-667e-4a68-8fa4-18b5ae2d8c89",
          },
          id: "1d973061-fe5d-4622-a071-d8a01d72ba7d",
          ref: "",
          page: "http://localhost",
          domain: "localhost",
        },
        app: null,
        device: {
          ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/61.0.3163.100 Safari/537.36",
          language: "en-US",
        },
        isPrebid: true,
      }),
    };
  });

  describe("Banner", function () {
    describe("spec.isBidRequestValid", function () {
      it("should return true when the required params are passed  to banner", function () {
        expect(spec.isBidRequestValid(bannerBidRequest)).to.equal(true);
      });

      it('should return false when the "zone" param is missing for banner', function () {
        bannerBidRequest.params = {
          bidfloor: 5.0,
        };
        expect(spec.isBidRequestValid(bannerBidRequest)).to.equal(false);
      });

      it("should return false when no bid params are passed to banner", function () {
        bannerBidRequest.params = {};
        expect(spec.isBidRequestValid(bannerBidRequest)).to.equal(false);
      });
    });

    describe("spec.buildRequests", function () {
      it("should create a POST request for every bid", function () {
        const request = spec.buildRequests([bannerBidRequest], bidderRequest);
        expect(request.method).to.equal("POST");
        expect(request.url).to.equal(ENDPOINT);
      });

      it("should attach request data to banner", function () {
        config.setConfig({
          currency: {
            adServerCurrency: "EUR",
          },
        });

        const request = spec.buildRequests([bannerBidRequest], bidderRequest);

        const data = JSON.parse(request.data);

        expect(data.source.ext.prebid).to.equal("$prebid.version$");
        expect(data.id).to.equal(bannerBidRequest.bidderRequestId);
        expect(data.imp[0].bidfloor).to.equal(0);
        expect(data.imp[0].bidfloorcur).to.equal("EUR");
        expect(data.imp[0].tagid).to.equal("123456");
        expect(data.imp[0].ext.zone).to.equal(bannerBidRequest.params.zone);
        expect(data.site.page).to.equal(bidderRequest.refererInfo.page);
        expect(data.site.domain).to.equal(bidderRequest.refererInfo.domain);
        expect(data.device).to.deep.contain({
          ua: navigator.userAgent,
          language: navigator.language,
        });
        expect(data.cur).to.deep.equal(["EUR"]);
      });

      describe("spec.interpretResponse", function () {
        it("should return no bids if the response is invalid request", function () {
          const bidResponse = spec.interpretResponse(
            { body: bannerServerResponse },
            {}
          );
          expect(bidResponse.length).to.equal(0);
        });

        it("should return no bids if the response is invalid body json", function () {
          const bidResponse = spec.interpretResponse(
            { body: bannerServerResponse },
            { data: "invalid body " }
          );
          expect(bidResponse.length).to.equal(0);
        });

        it("should return a valid bid a valid body", function () {
          bannerServerRequest.data = JSON.parse(bannerServerRequest.data);
          const bidResponse = spec.interpretResponse(
            { body: bannerServerResponse },
            bannerServerRequest
          );
          expect(bidResponse.length).to.equal(1);
        });

        it("should return no bids if the response is not valid to banner", function () {
          const bidResponse = spec.interpretResponse(
            { body: null },
            bannerServerRequest
          );
          expect(bidResponse.length).to.equal(0);
        });

        it("should return a valid bid response to banner", function () {
          const bidResponse = spec.interpretResponse(
            { body: bannerServerResponse },
            bannerServerRequest
          )[0];

          expect(bidResponse).to.contain({
            requestId: bannerBidRequest.bidId,
            cpm: bannerServerResponse.seatbid[0].bid[0].price,
            creativeId: bannerServerResponse.seatbid[0].bid[0].crid,
            ttl: 300,
            netRevenue: true,
            mediaType: "banner",
            currency: bannerServerResponse.cur,
            ad: bannerServerResponse.seatbid[0].bid[0].adm,
            width: bannerServerResponse.seatbid[0].bid[0].w,
            height: bannerServerResponse.seatbid[0].bid[0].h,
            burl: bannerServerResponse.seatbid[0].bid[0].burl,
            nurl: bannerServerResponse.seatbid[0].bid[0].nurl,
          });
          expect(bidResponse.meta).to.deep.equal({
            advertiserDomains: ["empower.net"],
          });
        });
      });
    });

    describe("Video", function () {
      describe("spec.isBidRequestValid", function () {
        it("should return true when the required params are passed", function () {
          expect(spec.isBidRequestValid(videoBidRequest)).to.equal(true);
        });

        it('should return false when the "zone" param is missing', function () {
          videoBidRequest.params = {
            bidfloor: 5.0,
          };
          expect(spec.isBidRequestValid(videoBidRequest)).to.equal(false);
        });

        it("should return false when no bid params are passed", function () {
          videoBidRequest.params = {};
          expect(spec.isBidRequestValid(videoBidRequest)).to.equal(false);
        });
      });

      describe("spec.buildRequests", function () {
        it("should create a POST request for every bid", function () {
          const request = spec.buildRequests([videoBidRequest], bidderRequest);
          expect(request.method).to.equal("POST");
          expect(request.url).to.equal(ENDPOINT);
        });

        it("should attach request data to video", function () {
          config.setConfig({
            currency: {
              adServerCurrency: "EUR",
            },
          });

          const request = spec.buildRequests([videoBidRequest], bidderRequest);

          const data = JSON.parse(request.data);

          expect(data.source.ext.prebid).to.equal("$prebid.version$");
          expect(data.id).to.equal(videoBidRequest.bidderRequestId);
          expect(data.imp[0].bidfloor).to.equal(0);
          expect(data.imp[0].bidfloorcur).to.equal("EUR");
          expect(data.imp[0].tagid).to.equal("123456");

          expect(data.imp[0].ext.zone).to.equal(videoBidRequest.params.zone);
          expect(data.site.page).to.equal(bidderRequest.refererInfo.page);
          expect(data.site.domain).to.equal(bidderRequest.refererInfo.domain);
          expect(data.device).to.deep.contain({
            ua: navigator.userAgent,
            language: navigator.language,
          });
          expect(data.cur).to.deep.equal(["EUR"]);
        });

        it("should get bid floor from module", function () {
          const floorModuleData = {
            currency: "USD",
            floor: 3.2,
          };
          videoBidRequest.getFloor = function () {
            return floorModuleData;
          };
          const request = spec.buildRequests([videoBidRequest], bidderRequest);

          const data = JSON.parse(request.data);

          expect(data.source.ext.prebid).to.equal("$prebid.version$");
          expect(data.id).to.equal(videoBidRequest.bidderRequestId);
          expect(data.imp[0].bidfloor).to.equal(floorModuleData.floor);
          expect(data.imp[0].bidfloorcur).to.equal(floorModuleData.currency);
        });

        it("should send gdpr data when gdpr does not apply", function () {
          const gdprData = {
            gdprConsent: {
              gdprApplies: false,
              consentString: undefined,
            },
          };
          const request = spec.buildRequests([videoBidRequest], {
            ...bidderRequest,
            ...gdprData,
          });

          const data = JSON.parse(request.data);

          expect(data.user).to.deep.equal({
            ext: {
              consent: "",
            },
          });
          expect(data.regs).to.deep.equal({
            ext: {
              gdpr: false,
            },
          });
        });

        it("should send gdpr data when gdpr applies", function () {
          const tcString = "sometcstring";
          const gdprData = {
            gdprConsent: {
              gdprApplies: true,
              consentString: tcString,
            },
          };
          const request = spec.buildRequests([videoBidRequest], {
            ...bidderRequest,
            ...gdprData,
          });

          const data = JSON.parse(request.data);

          expect(data.user).to.deep.equal({
            ext: {
              consent: tcString,
            },
          });
          expect(data.regs).to.deep.equal({
            ext: {
              gdpr: true,
            },
          });
        });
      });

      describe("spec.interpretResponse", function () {
        it("should return no bids if the response is not valid", function () {
          const bidResponse = spec.interpretResponse(
            { body: null },
            videoServerRequest
          );
          expect(bidResponse.length).to.equal(0);
        });

        it("should return a valid bid response to video", function () {
          const bidResponse = spec.interpretResponse(
            { body: videoServerResponse },
            videoServerRequest
          )[0];

          expect(bidResponse).to.contain({
            requestId: videoBidRequest.bidId,
            cpm: videoServerResponse.seatbid[0].bid[0].price,
            creativeId: videoServerResponse.seatbid[0].bid[0].crid,
            ttl: 300,
            netRevenue: true,
            mediaType: "video",
            currency: videoServerResponse.cur,
            vastXml: videoServerResponse.seatbid[0].bid[0].adm,
          });
          expect(bidResponse.meta).to.deep.equal({
            advertiserDomains: ["empower.net"],
          });
        });
      });
    });

    describe("Modules", function () {
      it("should attach user Ids", function () {
        const userIdAsEids = {
          userIdAsEids: [
            {
              source: "pubcid.org",
              uids: [
                {
                  id: "abcxyzt",
                  atype: 1,
                },
              ],
            },
            {
              source: "criteo.com",
              uids: [
                {
                  id: "qwertyu",
                  atype: 1,
                },
              ],
            },
          ],
        };
        bannerBidRequest = { ...bannerBidRequest, ...userIdAsEids };
        const request = spec.buildRequests([bannerBidRequest], bidderRequest);
        const data = JSON.parse(request.data);

        expect(data.user.eids.length).to.equal(2);
        expect(data.user.eids[0].source).to.equal("pubcid.org");
        expect(data.user.eids[1].uids.length).to.equal(1);
        expect(data.user.eids[1].uids[0].id).to.equal("qwertyu");
      });

      it("should get bid floor from module", function () {
        const floorModuleData = {
          currency: "USD",
          floor: 3.2,
        };
        bannerBidRequest.getFloor = function () {
          return floorModuleData;
        };
        const request = spec.buildRequests([bannerBidRequest], bidderRequest);

        const data = JSON.parse(request.data);

        expect(data.source.ext.prebid).to.equal("$prebid.version$");
        expect(data.id).to.equal(bannerBidRequest.bidderRequestId);
        expect(data.imp[0].bidfloor).to.equal(floorModuleData.floor);
        expect(data.imp[0].bidfloorcur).to.equal(floorModuleData.currency);
      });

      it("should send gdpr data when gdpr does not apply", function () {
        const gdprData = {
          gdprConsent: {
            gdprApplies: false,
            consentString: undefined,
          },
        };
        const request = spec.buildRequests([bannerBidRequest], {
          ...bidderRequest,
          ...gdprData,
        });

        const data = JSON.parse(request.data);

        expect(data.user).to.deep.equal({
          ext: {
            consent: "",
          },
        });
        expect(data.regs).to.deep.equal({
          ext: {
            gdpr: false,
          },
        });
      });

      it("should send gdpr data when gdpr applies", function () {
        const tcString = "sometcstring";
        const gdprData = {
          gdprConsent: {
            gdprApplies: true,
            consentString: tcString,
          },
        };
        const request = spec.buildRequests([bannerBidRequest], {
          ...bidderRequest,
          ...gdprData,
        });

        const data = JSON.parse(request.data);

        expect(data.user).to.deep.equal({
          ext: {
            consent: tcString,
          },
        });
        expect(data.regs).to.deep.equal({
          ext: {
            gdpr: true,
          },
        });
      });
    });
    describe("Ortb2", function () {
      it("should attach schain", function () {
        const schain = {
          ortb2: {
            source: {
              ext: {
                schain: {
                  ver: "1.0",
                  complete: 1,
                  nodes: [
                    {
                      asi: "empower.net",
                      sid: "111222333",
                      hp: 1,
                    },
                  ],
                },
              },
            },
          },
        };
        const request = spec.buildRequests([bannerBidRequest], {
          ...bidderRequest,
          ...schain,
        });
        const data = JSON.parse(request.data);
        expect(data.schain.ver).to.equal("1.0");
        expect(data.schain.nodes.length).to.equal(1);
        expect(data.schain.nodes[0].sid).to.equal("111222333");
        expect(data.schain.nodes[0].asi).to.equal("empower.net");
      });

      it("should attach badv", function () {
        const badv = {
          ortb2: { badv: ["bad.example.com"] },
        };
        const request = spec.buildRequests([bannerBidRequest], {
          ...bidderRequest,
          ...badv,
        });
        const data = JSON.parse(request.data);
        expect(data.badv.length).to.equal(1);
        expect(data.badv[0]).to.equal("bad.example.com");
      });

      it("should attach bcat", function () {
        const bcat = {
          ortb2: { bcat: ["IAB-1-2", "IAB-1-2"] },
        };
        const request = spec.buildRequests([bannerBidRequest], {
          ...bidderRequest,
          ...bcat,
        });
        const data = JSON.parse(request.data);
        expect(data.bcat.length).to.equal(2);
        expect(data.bcat).to.deep.equal(bcat.ortb2.bcat);
      });

      it("should override initial device", function () {
        const device = {
          ortb2: {
            device: {
              w: 390,
              h: 844,
              dnt: 0,
              ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
              language: "en",
              ext: {
                vpw: 390,
                vph: 844,
              },
              sua: {
                source: 1,
                browsers: [],
                mobile: 1,
              },
            },
          },
        };
        const request = spec.buildRequests([bannerBidRequest], {
          ...bidderRequest,
          ...device,
        });
        const data = JSON.parse(request.data);
        expect(data.device.ua).to.equal(device.ortb2.device.ua);
        expect(data.device.sua.mobile).to.equal(device.ortb2.device.sua.mobile);
      });

      it("should override initial site", function () {
        const site = {
          ortb2: {
            site: {
              publisher: {
                domain: "empower.net",
              },
              page: "https://empower.net/prebid",
              name: "empower.net",
              cat: [],
              sectioncat: [],
              pagecat: [],
              ref: "",
              ext: {
                data: {},
              },
              content: {
                language: "en",
              },
            },
          },
        };
        const request = spec.buildRequests([bannerBidRequest], {
          ...bidderRequest,
          ...site,
        });
        const data = JSON.parse(request.data);
        expect(data.site.page).to.equal(site.ortb2.site.page);
        expect(data.site.domain).to.equal("publisher.com");
      });

      it("should attach device and user geo via device", function () {
        const device = {
          ortb2: {
            device: {
              geo: {
                lat: 1,
                lon: -1,
              },
            },
          },
        };
        const request = spec.buildRequests([bannerBidRequest], {
          ...bidderRequest,
          ...device,
        });
        const data = JSON.parse(request.data);
        expect(data.device.geo.lat).to.equal(device.ortb2.device.geo.lat);
        expect(data.user.geo.lat).to.equal(device.ortb2.device.geo.lat);
      });

      it("should attach device and user geo via user", function () {
        const ortb2 = {
          ortb2: {
            user: {
              geo: {
                lat: 1,
                lon: -1,
              },
            },
          },
        };
        const request = spec.buildRequests([bannerBidRequest], {
          ...bidderRequest,
          ...ortb2,
        });
        const data = JSON.parse(request.data);
        expect(data.device.geo.lat).to.equal(ortb2.ortb2.user.geo.lat);
        expect(data.user.geo.lat).to.equal(ortb2.ortb2.user.geo.lat);
      });

      it("should attach device and user geo both device/user", function () {
        const ortb2 = {
          ortb2: {
            user: {
              geo: {
                lat: 1,
                lon: -1,
              },
            },
            device: {
              geo: {
                lat: 2,
                lon: -1,
              },
            },
          },
        };
        const request = spec.buildRequests([bannerBidRequest], {
          ...bidderRequest,
          ...ortb2,
        });
        const data = JSON.parse(request.data);
        expect(data.device.geo.lat).to.equal(ortb2.ortb2.device.geo.lat);
        expect(data.user.geo.lat).to.equal(ortb2.ortb2.user.geo.lat);
      });

      it("should override initial user", function () {
        const user = {
          ortb2: {
            user: {
              gender: "F",
            },
          },
        };
        const request = spec.buildRequests([bannerBidRequest], {
          ...bidderRequest,
          ...user,
        });
        const data = JSON.parse(request.data);
        expect(data.user.gender).to.equal(user.ortb2.user.gender);
      });
    });
  });

  describe("onBidWon", function () {
    beforeEach(function () {
      sinon.stub(utils, "triggerPixel");
    });
    afterEach(function () {
      utils.triggerPixel.restore();
    });

    it("Should not trigger pixel if bid does not contain nurl", function () {
      spec.onBidWon({});

      expect(utils.triggerPixel.called).to.be.false;
    });

    it("Should not trigger pixel if nurl is empty", function () {
      spec.onBidWon({
        nurl: "",
      });

      expect(utils.triggerPixel.called).to.be.false;
    });

    it("Should trigger pixel with replaced nurl if nurl is not empty", function () {
      const bidResponse = spec.interpretResponse(
        { body: bannerServerResponse },
        bannerServerRequest
      );
      const bidToWon = bidResponse[0];
      bidToWon.adserverTargeting = {
        hb_pb: 0.1,
      };
      spec.onBidWon(bidToWon);

      expect(utils.triggerPixel.callCount).to.be.equal(1);
      expect(utils.triggerPixel.firstCall.args[0]).to.be.equal(
        "https://ng.virgul.com/i_wu?a=fac123456&ext=,ap0.12,acUSD,sp0.1,scUSD"
      );
      setCurrencyConfig({});
    });
  });
});
