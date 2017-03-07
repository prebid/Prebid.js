import { expect } from 'chai';
import Adapter from 'src/adapters/tapsense';
import bidmanager from 'src/bidmanager';
import adloader from "src/adloader";
import * as utils from "src/utils";

window.pbjs = window.pbjs || {};

const DEFAULT_BIDDER_REQUEST = {
  "bidderCode": "tapsense",
  "bidderRequestId": "141ed07a281ca3",
  "requestId": "b202e550-b0f7-4fb9-bfb4-1aa80f1795b4",
  "start": new Date().getTime(),
  "bids": [
    {
      "sizes": undefined, //set values in tests
      "bidder": "tapsense",
      "bidId": "2b211418dd0575",
      "bidderRequestId": "141ed07a281ca3",
      "placementCode": "thisisatest",
      "params": {
        "ufid": "thisisaufid",
        "refer": "thisisarefer",
        "version": "0.0.1",
        "ad_unit_id": "thisisanadunitid",
        "device_id": "thisisadeviceid",
        "lat": "thisislat",
        "long": "thisisalong",
        "user": "thisisanidfa",
        "price_floor": 0.01
      }
    }
  ]
}

const SUCCESSFUL_RESPONSE = {
  "count_ad_units": 1,
  "status": {
    "value": "ok",
  },
  "ad_units": [
    {
      html: "<html><head></head><body></body></html>",
      imp_url: "https://i.tapsense.com"
    }
  ],
  "id": "thisisanid",
  "width": 320,
  "height": 50,
  "time": new Date().getTime()
}

const UNSUCCESSFUL_RESPONSE = {
  "count_ad_units": 0,
  "status": {
    "value": "nofill" //will be set in test
  },
  "time": new Date().getTime()
}

function duplicate(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function makeSuccessfulRequest(adapter){
  let modifiedReq = duplicate(DEFAULT_BIDDER_REQUEST);
  modifiedReq.bids[0].sizes = [[320,50], [500,500]];
  adapter.callBids(modifiedReq);
  return modifiedReq.bids;
}

describe ("TapSenseAdapter", () => {
  let adapter, sandbox;
  beforeEach(() => {
    adapter = new Adapter;
    sandbox = sinon.sandbox.create();
  });
  afterEach(() => {
    sandbox.restore();
  })

  describe('request function', () => {
    beforeEach(() => {
      sandbox.stub(adloader, 'loadScript');
    });
    afterEach(() => {
      sandbox.restore();
    });
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
    it('requires parameters to make request', () => {
      adapter.callBids({});
      sinon.assert.notCalled(adloader.loadScript);
    });
    it('does not make a request if missing user', () => {
      let modifiedReq = duplicate(DEFAULT_BIDDER_REQUEST);
      delete modifiedReq.bids.user
      adapter.callBids(modifiedReq);
      sinon.assert.notCalled(adloader.loadScript);
    });
    it('does not make a request if missing ad_unit_id', () => {
      let modifiedReq = duplicate(DEFAULT_BIDDER_REQUEST);
      delete modifiedReq.bids.ad_unit_id
      adapter.callBids(modifiedReq);
      sinon.assert.notCalled(adloader.loadScript);
    });
    it('does not make a request if ad sizes are incorrect', () => {
      let modifiedReq = duplicate(DEFAULT_BIDDER_REQUEST);
      modifiedReq.bids[0].sizes = [[500,500]];
      adapter.callBids(modifiedReq);
      sinon.assert.notCalled(adloader.loadScript);
    });
    it('does not make a request if ad sizes are invalid format', () => {
      let modifiedReq = duplicate(DEFAULT_BIDDER_REQUEST);
      modifiedReq.bids[0].sizes = 1234;
      adapter.callBids(modifiedReq);
      sinon.assert.notCalled(adloader.loadScript);
    });

    describe("requesting an ad", () => {
      afterEach(() => {
        sandbox.restore();
      })
      it("makes a request if valid sizes are provided (nested array)", () => {
        makeSuccessfulRequest(adapter);
        sinon.assert.calledOnce(adloader.loadScript);
        expect(adloader.loadScript.firstCall.args[0]).to.contain(
          "ads04.tapsense.com"
        );
      });
      it("handles a singles array for size parameter", () => {
        let modifiedReq = duplicate(DEFAULT_BIDDER_REQUEST);
        modifiedReq.bids[0].sizes = [320,50];
        adapter.callBids(modifiedReq);
        expect(adloader.loadScript.firstCall.args[0]).to.contain(
          "ads04.tapsense.com"
        );
      });
      it("handles a string for size parameter", () => {
        let modifiedReq = duplicate(DEFAULT_BIDDER_REQUEST);
        modifiedReq.bids[0].sizes = "320x50";
        adapter.callBids(modifiedReq);
        expect(adloader.loadScript.firstCall.args[0]).to.contain(
          "ads04.tapsense.com"
        );
      });
      it("handles a string with multiple sizes for size parameter", () => {
        let modifiedReq = duplicate(DEFAULT_BIDDER_REQUEST);
        modifiedReq.bids[0].sizes = "320x50,500x500";
        adapter.callBids(modifiedReq);
        expect(adloader.loadScript.firstCall.args[0]).to.contain(
          "ads04.tapsense.com"
        );
      });
      it("appends bid params as a query string when requesting ad", () => {
        makeSuccessfulRequest(adapter);
        sinon.assert.calledOnce(adloader.loadScript);
        expect(adloader.loadScript.firstCall.args[0]).to.match(
          /ufid=thisisaufid&/
        );
        expect(adloader.loadScript.firstCall.args[0]).to.match(
          /refer=thisisarefer&/
        );
        expect(adloader.loadScript.firstCall.args[0]).to.match(
          /version=[^&]+&/
        );
        expect(adloader.loadScript.firstCall.args[0]).to.match(
          /jsonp=1&/
        );
        expect(adloader.loadScript.firstCall.args[0]).to.match(
          /ad_unit_id=thisisanadunitid&/
        );
        expect(adloader.loadScript.firstCall.args[0]).to.match(
          /device_id=thisisadeviceid&/
        );
        expect(adloader.loadScript.firstCall.args[0]).to.match(
          /lat=thisislat&/
        );
        expect(adloader.loadScript.firstCall.args[0]).to.match(
          /long=thisisalong&/
        );
        expect(adloader.loadScript.firstCall.args[0]).to.match(
          /user=thisisanidfa&/
        );
        expect(adloader.loadScript.firstCall.args[0]).to.match(
          /price_floor=0\.01&/
        );
        expect(adloader.loadScript.firstCall.args[0]).to.match(
          /callback=pbjs\.tapsense\.callback_with_price_.+&/
        );
      })
    })
  });

  describe("generateCallback", () => {
    beforeEach(() => {
      sandbox.stub(adloader, 'loadScript');
    });
    afterEach(() => {
      sandbox.restore();
    });
    it("generates callback in namespaced object with correct bidder id", () => {
      makeSuccessfulRequest(adapter);
      expect(pbjs.tapsense.callback_with_price_2b211418dd0575).to.exist.and.to.be.a('function');
    })
  });

  describe("response", () => {
    beforeEach(() => {
      sandbox.stub(bidmanager, 'addBidResponse');
      sandbox.stub(adloader, 'loadScript');
      let bids = makeSuccessfulRequest(adapter);
      sandbox.stub(utils, "getBidRequest", (id) => {
        return bids.find((item) => { return item.bidId === id});
      })
    });
    afterEach(() => {
      sandbox.restore();
    });
    describe("successful response", () => {
      beforeEach(() => {
        pbjs.tapsense.callback_with_price_2b211418dd0575(SUCCESSFUL_RESPONSE, 1.2);
      });
      it("called the bidmanager and registers a bid", () => {
        sinon.assert.calledOnce(bidmanager.addBidResponse);
        expect(bidmanager.addBidResponse.firstCall.args[1].getStatusCode()).to.equal(1);
      });
      it("should have the correct placementCode", () => {
        sinon.assert.calledOnce(bidmanager.addBidResponse);
        expect(bidmanager.addBidResponse.firstCall.args[0]).to.equal("thisisatest");
      });
    });
    describe("unsuccessful response", () => {
      beforeEach(() => {
        pbjs.tapsense.callback_with_price_2b211418dd0575(UNSUCCESSFUL_RESPONSE, 1.2);
      })
      it("should call the bidmanger and register an invalid bid", () => {
        sinon.assert.calledOnce(bidmanager.addBidResponse);
        expect(bidmanager.addBidResponse.firstCall.args[1].getStatusCode()).to.equal(2);
      });
      it("should have the correct placementCode", () => {
        expect(bidmanager.addBidResponse.firstCall.args[0]).to.equal("thisisatest");
      })
    });
    describe("no response/timeout", () => {
      it("should not register any bids", () => {
        sinon.assert.notCalled(bidmanager.addBidResponse);
      })
    });
    describe("edge cases", () => {
      it("does not register a bid if no price is supplied", () => {
        sandbox.stub(utils, "logMessage");
        pbjs.tapsense.callback_with_price_2b211418dd0575(SUCCESSFUL_RESPONSE);
        sinon.assert.notCalled(bidmanager.addBidResponse);
      });
    });
  });

})
