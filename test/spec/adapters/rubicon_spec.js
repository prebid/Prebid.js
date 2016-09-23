import { expect } from "chai";
import adloader from "src/adloader";
import adapterManager from "src/adaptermanager";
import bidManager from "src/bidmanager";
import RubiconAdapter from "src/adapters/rubicon";

var CONSTANTS = require("src/constants.json");


describe("the rubicon adapter", () => {

  let rubiconAdapter = adapterManager.bidderRegistry["rubicon"],
      sandbox,
      adUnit;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    adUnit = {
      code: "/19968336/header-bid-tag-0",
      sizes: [[300, 250], [320, 50]],
      bids: [
        {
          bidder: "rubicon",
          params: {
            accountId: "14062",
            siteId: "70608",
            zoneId: "335918",
            userId: "12346",
            keywords: ["a","b","c"],
            inventory: {
              rating:"5-star",
              prodtype:"tech"
            },
            visitor: {
              ucat:"new",
              lastsearch:"iphone"
            },
            position: "atf"
          }
        }
      ]
    };

  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("callBids public interface", () => {

    it("should receive a well-formed bidRequest from the adaptermanager", () => {

      sandbox.stub(rubiconAdapter, "callBids");

      adapterManager.callBids({
          adUnits: [clone(adUnit)]
      });

      let bidderRequest = rubiconAdapter.callBids.getCall(0).args[0];

      expect(bidderRequest).to.have.property("bids")
        .that.is.an("array")
        .with.lengthOf(1);

      expect(bidderRequest).to.have.deep.property("bids[0]")
        .to.have.property("bidder", "rubicon");

      expect(bidderRequest).to.have.deep.property("bids[0]")
        .to.have.property("placementCode", adUnit.code);

      expect(bidderRequest).to.have.deep.property("bids[0]")
        .with.property("sizes")
        .that.is.an("array")
        .with.lengthOf(2)
        .that.deep.equals(adUnit.sizes);

      expect(bidderRequest).to.have.deep.property("bids[0]")
        .with.property('params')
        .that.deep.equals(adUnit.bids[0].params)

    });

  });

  describe("callBids implementation", () => {

    let bidderRequest,
        slot;

    beforeEach(() => {
      sandbox.stub(adloader, "loadScript");
      sandbox.spy(rubiconAdapter, "callBids");

      slot = {
        clearTargeting: sandbox.spy(),
        setPosition: sandbox.spy(),
        addFPV: sandbox.spy(),
        addFPI: sandbox.spy(),
        addKW: sandbox.spy(),
        getElementId: () => "/19968336/header-bid-tag-0",
        getRawResponses: () => {},
        getRawResponseBySizeId: () => {}
      };

      window.rubicontag = {
        cmd: {
          push: cb => cb()
        },
        setIntegration: sandbox.spy(),
        run: () => {},
        addEventListener: () => {},
        setUserKey: sandbox.spy(),
        defineSlot: sandbox.spy(bid => slot)
      };

      bidderRequest = {
        bidderCode: "rubicon",
        requestId: "c45dd708-a418-42ec-b8a7-b70a6c6fab0a",
        bidderRequestId: "178e34bad3658f",
        bids: [
          {
            bidder: "rubicon",
            params: {
              accountId: "14062",
              siteId: "70608",
              zoneId: "335918",
              userId: "12346",
              keywords: ["a","b","c"],
              inventory: {
                rating:"5-star",
                prodtype:"tech"
              },
              visitor: {
                ucat:"new",
                lastsearch:"iphone"
              },
              position: "atf"
            },
            placementCode: "/19968336/header-bid-tag-0",
            sizes: [[300, 250], [320, 50]],
            bidId: "2ffb201a808da7",
            bidderRequestId: "178e34bad3658f",
            requestId: "c45dd708-a418-42ec-b8a7-b70a6c6fab0a"
          }
        ],
        start: 1472239426002,
        timeout: 5000
      };

    });

    describe("when doing fastlane slot configuration", () => {

      beforeEach(() => {
        rubiconAdapter.callBids(bidderRequest);
      });

      it("should load the fastlane SDK if not loaded", () => {

        let pathToSDK = adloader.loadScript.getCall(0).args[0];
        expect(pathToSDK).to.equal(`http://ads.rubiconproject.com/header/${bidderRequest.bids[0].params.accountId}.js`);

        rubiconAdapter.callBids(bidderRequest);
        expect(adloader.loadScript.calledOnce).to.equal(true);

      });

      it("should make a valid call to rubicontag.defineSlot", () => {

        expect(window.rubicontag.defineSlot.calledOnce).to.equal(true);

        let slotParam = window.rubicontag.defineSlot.firstCall.args[0];
        expect(slotParam).to.contain.all.keys(
          "siteId",
          "zoneId",
          "sizes",
          "id"
        );
        expect(slotParam).to.have.property("sizes")
          .that.is.an("array")
          .with.lengthOf(2)
          .that.deep.equals([15, 43]);

      });

      it("should call rubicontag.setUserKey when params.userId is set", () => {

        expect(window.rubicontag.setUserKey.calledWith(adUnit.bids[0].params.userId)).to.equal(true);

      });

      it("should set proper targeting params for Slot when passed", () => {

        expect(slot.setPosition.calledOnce).to.equal(true);
        expect(slot.setPosition.firstCall.calledWith("atf")).to.equal(true);

        expect(slot.addFPV.calledTwice).to.equal(true);
        expect(slot.addFPV.firstCall.calledWith("ucat", "new")).to.equal(true);
        expect(slot.addFPV.secondCall.calledWith("lastsearch", "iphone")).to.equal(true);

        expect(slot.addFPI.calledTwice).to.equal(true);
        expect(slot.addFPI.firstCall.calledWith("rating", "5-star")).to.equal(true);
        expect(slot.addFPI.secondCall.calledWith("prodtype", "tech")).to.equal(true);

        expect(slot.addKW.calledOnce).to.equal(true);
        expect(slot.addKW.firstCall.calledWith(["a","b","c"])).to.equal(true);

      });

      it("should set the rubicontag integration as prebid.js", () => {

        expect(window.rubicontag.setIntegration.calledWith("$$PREBID_GLOBAL$$")).to.equal(true);

      });

    });

    describe("when handling fastlane responses", () => {

      beforeEach(() => {
        // need a fresh rubicon adapter for these tests to reset private state.
        rubiconAdapter = new RubiconAdapter();
      });

      describe("individually through events", () => {

        let bids;
        let _callback;
        let addEventListener;

        beforeEach(() => {
          bids = [];

          addEventListener = sandbox.stub(window.rubicontag, "addEventListener", (event, callback) => {
            _callback = callback;
            return true;
          });

          sandbox.stub(bidManager, 'addBidResponse', (elemId, bid) => {
            bids.push(bid);
          });
        });

        it("should only register one listener for multiple bid requests", () => {

          rubiconAdapter.callBids(bidderRequest);
          rubiconAdapter.callBids(bidderRequest);

          expect(addEventListener.calledOnce).to.equal(true);

        });

        it("should register successful bids with the bidmanager", () => {

          sandbox.stub(window.rubicontag, "run", () => {
            _callback({
              elementId: "/19968336/header-bid-tag-0",
              sizeId: "43"
            });
            _callback({
              elementId: "/19968336/header-bid-tag-0",
              sizeId: "15"
            });
          });

          sandbox.stub(slot, "getRawResponseBySizeId", (sizeId) => {
            return {
              "43": {
                "advertiser": 12345,
                "cpm": 0.811,
                "dimensions": [
                  300,
                  250
                ],
                "auction_id": "431ee1bc-3cc4-4bb7-b0d4-eb9faedb433c"
              },
              "15": {
                "advertiser": 12345,
                "cpm": 0.59,
                "dimensions": [
                  320,
                  50
                ],
                "auction_id": "431ee1bc-3cc4-4bb7-b0d4-eb9faedb433c"
              }
            }[sizeId];
          });

          rubiconAdapter.callBids(bidderRequest);

          expect(bidManager.addBidResponse.calledTwice).to.equal(true);

          expect(bids).to.be.lengthOf(2);
          expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
          expect(bids[1].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);

          expect(bids[0].bidderCode).to.equal("rubicon");
          expect(bids[0].width).to.equal(300);
          expect(bids[0].height).to.equal(250);
          expect(bids[0].cpm).to.equal(0.811);

          expect(bids[1].bidderCode).to.equal("rubicon");
          expect(bids[1].width).to.equal(320);
          expect(bids[1].height).to.equal(50);
          expect(bids[1].cpm).to.equal(0.59);
        })

      });

      describe("all at once", () => {

        let bids;

        beforeEach(() => {
          bids = [];

          sandbox.stub(window.rubicontag, "run", cb => cb());
          sandbox.stub(window.rubicontag, "addEventListener", () => false);
          sandbox.stub(bidManager, 'addBidResponse', (elemId, bid) => {
            bids.push(bid);
          });
        });

        it("should register successful bids with the bidmanager", () => {

          sandbox.stub(slot, "getRawResponses", () => [
            {
              "advertiser": 12345,
              "cpm": 0.811,
              "dimensions": [
                300,
                250
              ],
              "auction_id": "431ee1bc-3cc4-4bb7-b0d4-eb9faedb433c"
            },
            {
              "advertiser": 123456,
              "cpm": 0.59,
              "dimensions": [
                320,
                50
              ],
              "auction_id": "a3e042e5-3fb7-498f-b60e-71540f4769a8"
            }
          ]);

          debugger;

          rubiconAdapter.callBids(bidderRequest);

          expect(bidManager.addBidResponse.calledTwice).to.equal(true);

          expect(bids).to.be.lengthOf(2);
          expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
          expect(bids[1].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);

          expect(bids[0].bidderCode).to.equal("rubicon");
          expect(bids[0].width).to.equal(300);
          expect(bids[0].height).to.equal(250);
          expect(bids[0].cpm).to.equal(0.811);

          expect(bids[1].bidderCode).to.equal("rubicon");
          expect(bids[1].width).to.equal(320);
          expect(bids[1].height).to.equal(50);
          expect(bids[1].cpm).to.equal(0.59);

        });

        it("should register bad responses as errors with the bidmanager", () => {

          sandbox.stub(slot, "getRawResponses", () => []);

          rubiconAdapter.callBids(bidderRequest);

          expect(bidManager.addBidResponse.calledOnce).to.equal(true);
          expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);

        });

      });

    });

  });

});

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}