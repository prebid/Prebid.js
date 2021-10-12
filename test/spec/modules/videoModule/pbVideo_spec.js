import { expect } from 'chai';
import { PbVideo } from 'modules/videoModule/index.js';

let ortbParamsMock;
let videoCoreMock;
let getConfigMock;
let requestBidsMock;
let pbGlobalMock;
let pbEventsMock;
let videoEventsMock;
let adServerMock;

function resetTestVars() {
  ortbParamsMock = {
    'video': {},
    'content': {}
  }
  videoCoreMock = {
    registerProvider: sinon.spy(),
    onEvents: sinon.spy(),
    getOrtbParams: () => ortbParamsMock,
    setAdTagUrl: sinon.spy()
  };
  getConfigMock = () => {};
  requestBidsMock = {
    before: sinon.spy()
  };
  pbGlobalMock = {
    requestBids: requestBidsMock,
    getHighestCpmBids: sinon.spy()
  };
  pbEventsMock = {
    emit: sinon.spy(),
    on: sinon.spy()
  };
  videoEventsMock = [];
  adServerMock = {
    registerAdServer: sinon.spy(),
    getAdTagUrl: sinon.spy()
  };
}

let pbVideoFactory = (videoCore, getConfig, pbGlobal, pbEvents, videoEvents, adServer) => {
  const pbVideo = PbVideo(
    videoCore || videoCoreMock,
    getConfig || getConfigMock,
    pbGlobal || pbGlobalMock,
    pbEvents || pbEventsMock,
    videoEvents || videoEventsMock,
    adServer || adServerMock
  );
  pbVideo.init();
  return pbVideo;
}

describe('Prebid Video', function () {
  beforeEach(() => resetTestVars());

  describe('Setting video to config', function () {
    let providers = [{ divId: 'div1' }, { divId: 'div2' }];
    let getConfigCallback;
    let getConfig = (video, callback) => {
      getConfigCallback = callback;
    };

    beforeEach(() => {
      pbVideoFactory(null, getConfig);
      getConfigCallback({ video: { providers } });
    });

    it('Should register providers', function () {
      expect(videoCoreMock.registerProvider.calledTwice).to.be.true;
    });

    it('Should register events', function () {
      expect(videoCoreMock.onEvents.calledTwice).to.be.true;
      const onEventsSpy = videoCoreMock.onEvents;
      expect(onEventsSpy.getCall(0).args[2]).to.be.equal('div1');
      expect(onEventsSpy.getCall(1).args[2]).to.be.equal('div2');
    });

    describe('Event triggering', function () {
      it('Should emit events off of Prebid\'s Events', function () {
        let eventHandler;
        const videoCore = Object.assign({}, videoCoreMock, {
          onEvents: (events, eventHandler_) => eventHandler = eventHandler_
        });
        pbVideoFactory(videoCore, getConfig);
        getConfigCallback({ video: { providers } });
        const expectedType = 'test_event';
        const expectedPayload = {'test': 'data'};
        eventHandler(expectedType, expectedPayload);
        expect(pbEventsMock.emit.calledOnce).to.be.true;
        expect(pbEventsMock.emit.getCall(0).args[0]).to.be.equal(expectedType);
        expect(pbEventsMock.emit.getCall(0).args[1]).to.be.equal(expectedPayload);
      });
    });

    describe('Ad Server configuration', function() {
      const test_vendor_code = 5;
      const test_params = { test: 'params' };
      providers[0].adServer = { vendorCode: test_vendor_code, params: test_params };

      it('should register the ad server provider', function () {
        expect(adServerMock.registerAdServer.calledOnce).to.be.true;
        expect(adServerMock.registerAdServer.getCall(0).args[0]).to.be.equal(test_vendor_code);
        expect(adServerMock.registerAdServer.getCall(0).args[1]).to.be.equal(test_params);
      });
    });
  });

  describe('Ad unit Enrichment', function () {
    it('registers before:bidRequest hook', function () {
      const pbVideo = pbVideoFactory();
      expect(requestBidsMock.before.calledOnce).to.be.true;
    });

    it('requests oRtb params and writes them to ad unit', function() {
      const getOrtbParamsSpy = sinon.spy(videoCoreMock, 'getOrtbParams');
      let beforeBidRequestCallback;
      const requestBids = {
        before: callback_ => beforeBidRequestCallback = callback_
      };

      const pbVideo = pbVideoFactory(null, null, { requestBids });
      expect(beforeBidRequestCallback).to.not.be.undefined;
      const nextFn = sinon.spy();
      const adUnits = [{
        code: 'ad1',
        mediaTypes: {
          video: {}
        },
        video: { divId: 'divId' }
      }];
      beforeBidRequestCallback(nextFn, { adUnits });
      expect(getOrtbParamsSpy.calledOnce).to.be.true;
      const adUnit = adUnits[0];
      expect(adUnit.mediaTypes.video).to.have.property('video');
      expect(adUnit.mediaTypes.video).to.have.property('content');
      expect(nextFn.calledOnce).to.be.true;
    });
  });

  describe('Ad tag injection', function () {
    let auctionEndCallback;
    const pbEvents = {
      emit: () => {},
      on: (event, callback) => auctionEndCallback = callback
    };

    const expectedVendorCode = 5;
    const expectedAdTag = 'test_tag';
    const expectedAdUnit = {
      video: {
        adServer: {
          vendorCode: expectedVendorCode,
          baseAdTagUrl: expectedAdTag
        }
      }
    };
    const auctionResults = { adUnits: [ expectedAdUnit, {} ] };

    it('should request ad tag url from adServer when configured to use adServer', function () {

      pbVideoFactory(null, null, null, pbEvents);

      auctionEndCallback(auctionResults);
      expect(adServerMock.getAdTagUrl.calledOnce).to.be.true;
      expect(adServerMock.getAdTagUrl.getCall(0).args[0]).is.equal(expectedVendorCode);
      expect(adServerMock.getAdTagUrl.getCall(0).args[1]).is.equal(expectedAdUnit);
      expect(adServerMock.getAdTagUrl.getCall(0).args[2]).is.equal(expectedAdTag);

      expect(videoCoreMock.setAdTagUrl.called).to.be.false;
    });

    it('should load ad tag when ad server return ad tag', function () {
      const expectedAdTag = 'resulting ad tag';
      const adServerCore = {
        getAdTagUrl: () => expectedAdTag,
        registerAdServer: sinon.spy(),
      };
      pbVideoFactory(null, null, null, pbEvents, null, adServerCore);
      auctionEndCallback(auctionResults);
      expect(videoCoreMock.setAdTagUrl.calledOnce).to.be.true;
      expect(videoCoreMock.setAdTagUrl.calledOnce.args[0][0]).to.be.equal(expectedAdTag);
    });

    it('should load ad tag from highest bid when ad server is not configured', function () {
      
    });
  });
});
