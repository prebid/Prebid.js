import { expect } from 'chai';
import { PbVideo } from 'modules/videoModule/index.js';
import CONSTANTS from 'src/constants.json';
import { AD_IMPRESSION, AD_ERROR, BID_VIDEO_IMPRESSION, BID_VIDEO_ERROR } from 'modules/videoModule/constants/events.js';

let ortbParamsMock;
let videoCoreMock;
let getConfigMock;
let requestBidsMock;
let pbGlobalMock;
let pbEventsMock;
let videoEventsMock;
let adServerMock;
let videoImpressionVerifierFactoryMock;
let videoImpressionVerifierMock;

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
    getHighestCpmBids: sinon.spy(),
    getBidResponsesForAdUnitCode: sinon.spy()
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

  videoImpressionVerifierMock = {
    trackBid: sinon.spy(),
    getBidIdentifiers: sinon.spy()
  };

  videoImpressionVerifierFactoryMock = () => videoImpressionVerifierMock;
}

let pbVideoFactory = (videoCore, getConfig, pbGlobal, pbEvents, videoEvents, adServer, videoImpressionVerifierFactory) => {
  const pbVideo = PbVideo(
    videoCore || videoCoreMock,
    getConfig || getConfigMock,
    pbGlobal || pbGlobalMock,
    pbEvents || pbEventsMock,
    videoEvents || videoEventsMock,
    adServer || adServerMock,
    videoImpressionVerifierFactory || videoImpressionVerifierFactoryMock
  );
  pbVideo.init();
  return pbVideo;
}

describe('Prebid Video', function () {
  beforeEach(() => resetTestVars());

  describe('Setting video to config', function () {
    let providers = [{ divId: 'div1' }, { divId: 'div2' }];
    let getConfigCallback;
    let getConfig = (propertyName, callback) => {
      if (propertyName === 'video') {
        getConfigCallback = callback;
      }
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
        const adServerConfig = adServerMock.registerAdServer.getCall(0).args[0];
        expect(adServerConfig.vendorCode).to.be.equal(test_vendor_code);
        expect(adServerConfig.params).to.be.deep.equal(test_params);
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
      on: (event, callback) => {
        if (event === CONSTANTS.EVENTS.AUCTION_END) {
          auctionEndCallback = callback
        }
      }
    };

    const expectedVendorCode = 5;
    const expectedAdTag = 'test_tag';
    const expectedAdUnitCode = 'expectedAdUnitcode';
    const expectedDivId = 'expectedDivId';
    const expectedAdUnit = {
      code: expectedAdUnitCode,
      video: {
        divId: expectedDivId,
        adServer: {
          vendorCode: expectedVendorCode,
          baseAdTagUrl: expectedAdTag
        }
      }
    };
    const auctionResults = { adUnits: [ expectedAdUnit, {} ] };

    beforeEach(() => {
      adServerMock.getAdTagUrl.resetHistory();
      videoCoreMock.setAdTagUrl.resetHistory();
    });

    it('should request ad tag url from adServer when configured to use adServer', function () {
      const expectedVastUrl = 'expectedVastUrl';
      const expectedVastXml = 'expectedVastXml';
      const pbGlobal = Object.assign({}, pbGlobalMock, {
        getHighestCpmBids: () => [{
          vastUrl: expectedVastUrl,
          vastXml: expectedVastXml
        }, {}, {}, {}]
      });
      pbVideoFactory(null, null, pbGlobal, pbEvents);

      auctionEndCallback(auctionResults);
      expect(adServerMock.getAdTagUrl.calledOnce).to.be.true;
      expect(adServerMock.getAdTagUrl.getCall(0).args[0]).is.equal(expectedVendorCode);
      expect(adServerMock.getAdTagUrl.getCall(0).args[1]).is.equal(expectedAdUnit);
      expect(adServerMock.getAdTagUrl.getCall(0).args[2]).is.equal(expectedAdTag);
    });

    it('should load ad tag when ad server return ad tag', function () {
      const expectedAdTag = 'resulting ad tag';
      const adServerCore = Object.assign({}, adServerMock, {
        getAdTagUrl: () => expectedAdTag
      });
      const expectedVastUrl = 'expectedVastUrl';
      const expectedVastXml = 'expectedVastXml';
      const pbGlobal = Object.assign({}, pbGlobalMock, {
        getHighestCpmBids: () => [{
          vastUrl: expectedVastUrl,
          vastXml: expectedVastXml
        }, {}, {}, {}]
      });
      pbVideoFactory(null, null, pbGlobal, pbEvents, null, adServerCore);
      auctionEndCallback(auctionResults);
      expect(videoCoreMock.setAdTagUrl.calledOnce).to.be.true;
      expect(videoCoreMock.setAdTagUrl.args[0][0]).to.be.equal(expectedAdTag);
      expect(videoCoreMock.setAdTagUrl.args[0][1]).to.be.equal(expectedDivId);
      expect(videoCoreMock.setAdTagUrl.args[0][2]).to.have.property('adUnitCode', expectedAdUnitCode);
    });

    it('should load ad tag from highest bid when ad server is not configured', function () {
      const expectedVastUrl = 'expectedVastUrl';
      const expectedVastXml = 'expectedVastXml';
      const pbGlobal = Object.assign({}, pbGlobalMock, {
        getHighestCpmBids: () => [{
          vastUrl: expectedVastUrl,
          vastXml: expectedVastXml
        }, {}, {}, {}]
      });
      const expectedAdUnit = {
        code: expectedAdUnitCode,
        video: { divId: expectedDivId }
      };
      const auctionResults = { adUnits: [ expectedAdUnit, {} ] };

      pbVideoFactory(null, null, pbGlobal, pbEvents);
      auctionEndCallback(auctionResults);
      expect(videoCoreMock.setAdTagUrl.calledOnce).to.be.true;
      expect(videoCoreMock.setAdTagUrl.args[0][0]).to.be.equal(expectedVastUrl);
      expect(videoCoreMock.setAdTagUrl.args[0][1]).to.be.equal(expectedDivId);
      expect(videoCoreMock.setAdTagUrl.args[0][2]).to.have.property('adUnitCode', expectedAdUnitCode);
      expect(videoCoreMock.setAdTagUrl.args[0][2]).to.have.property('adXml', expectedVastXml);
    });
  });

  describe('Ad tracking', function () {
    const expectedAdEventPayload = { adEventPayloadMarker: 'marker' };
    const expectedBid = { bidMarker: 'marker' };
    let bidAdjustmentCb;
    let adImpressionCb;
    let adErrorCb;

    const pbEvents = {
      on: (event, callback) => {
        if (event === CONSTANTS.EVENTS.BID_ADJUSTMENT) {
          bidAdjustmentCb = callback;
        } else if (event === AD_IMPRESSION) {
          adImpressionCb = callback;
        } else if (event === AD_ERROR) {
          adErrorCb = callback;
        }
      },
      emit: sinon.spy()
    };

    it('should ask Impression Verifier to track bid on Bid Adjustment', function () {
      pbVideoFactory(null, null, null, pbEvents);
      bidAdjustmentCb();
      expect(videoImpressionVerifierMock.trackBid.calledOnce).to.be.true;
    });

    it('should trigger video bid impression when the bid matched', function () {
      pbEvents.emit.resetHistory();
      const pbGlobal = Object.assign({}, pbGlobalMock, { getBidResponsesForAdUnitCode: () => ({ bids: [expectedBid] }) });
      const videoImpressionVerifier = Object.assign({}, videoImpressionVerifierMock, { getBidIdentifiers: () => ({}) });
      pbVideoFactory(null, null, pbGlobal, pbEvents, null, null, () => videoImpressionVerifier);
      adImpressionCb(expectedAdEventPayload);

      expect(pbEvents.emit.calledOnce).to.be.true;
      expect(pbEvents.emit.getCall(0).args[0]).to.be.equal(BID_VIDEO_IMPRESSION);
      const payload = pbEvents.emit.getCall(0).args[1];
      expect(payload.bid).to.be.equal(expectedBid);
      expect(payload.adEvent).to.be.equal(expectedAdEventPayload);
    });

    it('should trigger video bid error when the bid matched', function () {
      pbEvents.emit.resetHistory();
      const pbGlobal = Object.assign({}, pbGlobalMock, { getBidResponsesForAdUnitCode: () => ({ bids: [expectedBid] }) });
      const videoImpressionVerifier = Object.assign({}, videoImpressionVerifierMock, { getBidIdentifiers: () => ({}) });
      pbVideoFactory(null, null, pbGlobal, pbEvents, null, null, () => videoImpressionVerifier);
      adErrorCb(expectedAdEventPayload);

      expect(pbEvents.emit.calledOnce).to.be.true;
      expect(pbEvents.emit.getCall(0).args[0]).to.be.equal(BID_VIDEO_ERROR);
      const payload = pbEvents.emit.getCall(0).args[1];
      expect(payload.bid).to.be.equal(expectedBid);
      expect(payload.adEvent).to.be.equal(expectedAdEventPayload);
    });

    it('should not trigger a bid impression when the bid did not match', function () {
      pbEvents.emit.resetHistory();
      const pbGlobal = Object.assign({}, pbGlobalMock, { getBidResponsesForAdUnitCode: () => ({ bids: [expectedBid] }) });
      const videoImpressionVerifier = Object.assign({}, videoImpressionVerifierMock, { getBidIdentifiers: () => ({ auctionId: 'id' }) });
      pbVideoFactory(null, null, pbGlobal, pbEvents, null, null, () => videoImpressionVerifier);
      adImpressionCb(expectedAdEventPayload);

      expect(pbEvents.emit.called).to.be.false;
    });

    it('should not trigger a bid error when the bid did not match', function () {
      pbEvents.emit.resetHistory();
      const pbGlobal = Object.assign({}, pbGlobalMock, { getBidResponsesForAdUnitCode: () => ({ bids: [expectedBid] }) });
      const videoImpressionVerifier = Object.assign({}, videoImpressionVerifierMock, { getBidIdentifiers: () => ({ auctionId: 'id' }) });
      pbVideoFactory(null, null, pbGlobal, pbEvents, null, null, () => videoImpressionVerifier);
      adErrorCb(expectedAdEventPayload);

      expect(pbEvents.emit.called).to.be.false;
    });
  });
});
