import 'src/prebid.js';
import { expect } from 'chai';
import { PbVideo } from 'modules/videoModule';
import { EVENTS } from 'src/constants.js';

let ortbVideoMock;
let ortbContentMock;
let videoCoreMock;
let getConfigMock;
let requestBidsMock;
let pbGlobalMock;
let pbEventsMock;
let videoEventsMock;
let gamSubmoduleMock;
let gamSubmoduleFactoryMock;
let videoImpressionVerifierFactoryMock;
let videoImpressionVerifierMock;
let adQueueCoordinatorMock;
let adQueueCoordinatorFactoryMock;

function resetTestVars() {
  ortbVideoMock = {};
  ortbContentMock = {};
  videoCoreMock = {
    registerProvider: sinon.spy(),
    initProvider: sinon.spy(),
    onEvents: sinon.spy(),
    getOrtbVideo: () => ortbVideoMock,
    getOrtbContent: () => ortbContentMock,
    setAdTagUrl: sinon.spy(),
    hasProviderFor: sinon.spy(),
  };
  getConfigMock = () => {};
  requestBidsMock = {
    before: sinon.spy()
  };
  pbGlobalMock = {
    requestBids: requestBidsMock,
    getHighestCpmBids: sinon.spy(),
    getBidResponsesForAdUnitCode: sinon.spy(),
    setConfig: sinon.spy(),
    getConfig: () => ({}),
    markWinningBidAsUsed: sinon.spy()
  };
  pbEventsMock = {
    emit: sinon.spy(),
    on: sinon.spy()
  };
  videoEventsMock = [];
  gamSubmoduleMock = {
    getAdTagUrl: sinon.spy()
  };

  gamSubmoduleFactoryMock = sinon.spy(() => gamSubmoduleMock);

  videoImpressionVerifierMock = {
    trackBid: sinon.spy(),
    getBidIdentifiers: sinon.spy()
  };

  videoImpressionVerifierFactoryMock = () => videoImpressionVerifierMock;

  adQueueCoordinatorMock = {
    registerProvider: sinon.spy(),
    queueAd: sinon.spy()
  };

  adQueueCoordinatorFactoryMock = () => adQueueCoordinatorMock;
}

let pbVideoFactory = (videoCore, getConfig, pbGlobal, pbEvents, videoEvents, gamSubmoduleFactory, videoImpressionVerifierFactory, adQueueCoordinator) => {
  const pbVideo = PbVideo(
    videoCore || videoCoreMock,
    getConfig || getConfigMock,
    pbGlobal || pbGlobalMock,
    pbEvents || pbEventsMock,
    videoEvents || videoEventsMock,
    gamSubmoduleFactory || gamSubmoduleFactoryMock,
    videoImpressionVerifierFactory || videoImpressionVerifierFactoryMock,
    adQueueCoordinator || adQueueCoordinatorMock
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
        expect(pbEventsMock.emit.getCall(0).args[0]).to.be.equal('video' + expectedType.replace(/^./, expectedType[0].toUpperCase()));
        expect(pbEventsMock.emit.getCall(0).args[1]).to.be.equal(expectedPayload);
      });
    });

    describe('Ad Server configuration', function() {
      const test_vendor_code = 5;
      const test_params = { test: 'params' };
      providers[0].adServer = { vendorCode: test_vendor_code, params: test_params };

      it('should instantiate the GAM Submodule', function () {
        expect(gamSubmoduleFactoryMock.calledOnce).to.be.true;
      });
    });
  });

  describe('Ad unit Enrichment', function () {
    it('registers before:bidRequest hook', function () {
      pbVideoFactory();
      expect(requestBidsMock.before.calledOnce).to.be.true;
    });

    it('requests oRtb params and writes them to ad unit and config', function() {
      const getOrtbVideoSpy = videoCoreMock.getOrtbVideo = sinon.spy(() => ({
        test: 'videoTestValue'
      }));
      const getOrtbContentSpy = videoCoreMock.getOrtbContent = sinon.spy(() => ({
        test: 'contentTestValue'
      }));

      let beforeBidRequestCallback;
      const requestBids = {
        before: callback_ => beforeBidRequestCallback = callback_
      };

      pbVideoFactory(null, null, Object.assign({}, pbGlobalMock, { requestBids }));
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
      expect(getOrtbVideoSpy.calledOnce).to.be.true;
      expect(getOrtbContentSpy.calledOnce).to.be.true;
      const adUnit = adUnits[0];
      expect(adUnit.mediaTypes.video).to.have.property('test', 'videoTestValue');
      expect(nextFn.calledOnce).to.be.true;
      expect(nextFn.getCall(0).args[0].ortb2).to.be.deep.equal({ site: { content: { test: 'contentTestValue' } } });
    });

    it('allows publishers to override video param', function () {
      const getOrtbVideoSpy = videoCoreMock.getOrtbVideo = sinon.spy(() => ({
        test: 'videoTestValue',
        test2: 'videoModuleValue'
      }));

      let beforeBidRequestCallback;
      const requestBids = {
        before: callback_ => beforeBidRequestCallback = callback_
      };

      pbVideoFactory(null, null, Object.assign({}, pbGlobalMock, { requestBids }));
      expect(beforeBidRequestCallback).to.not.be.undefined;
      const nextFn = sinon.spy();
      const adUnits = [{
        code: 'ad1',
        mediaTypes: {
          video: {
            test2: 'publisherValue'
          }
        },
        video: { divId: 'divId' }
      }];
      beforeBidRequestCallback(nextFn, { adUnits });
      expect(getOrtbVideoSpy.calledOnce).to.be.true;
      const adUnit = adUnits[0];
      expect(adUnit.mediaTypes.video).to.have.property('test', 'videoTestValue');
      expect(adUnit.mediaTypes.video).to.have.property('test2', 'publisherValue');
      expect(nextFn.calledOnce).to.be.true;
    });
  });

  describe('Ad tag injection', function () {
    let auctionEndCallback;
    let providers = [{ divId: 'div1', adServer: {} }, { divId: 'div2' }];
    let getConfig = (propertyName, callbackFn) => {
      if (propertyName === 'video') {
        if (callbackFn) {
          callbackFn({ video: { providers } });
        } else {
          return { providers };
        }
      }
    };

    const pbEvents = {
      emit: () => {},
      on: (event, callback) => {
        if (event === EVENTS.AUCTION_END) {
          auctionEndCallback = callback
        }
      },
      off: () => {}
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
      gamSubmoduleMock.getAdTagUrl.resetHistory();
      videoCoreMock.setAdTagUrl.resetHistory();
      adQueueCoordinatorMock.queueAd.resetHistory();
    });

    let beforeBidRequestCallback;
    const requestBids = {
      before: callback_ => beforeBidRequestCallback = callback_
    };

    it('should request ad tag url from adServer when configured to use adServer', function () {
      const expectedVastUrl = 'expectedVastUrl';
      const expectedVastXml = 'expectedVastXml';
      const pbGlobal = Object.assign({}, pbGlobalMock, {
        requestBids,
        getHighestCpmBids: () => [{
          vastUrl: expectedVastUrl,
          vastXml: expectedVastXml
        }, {}, {}, {}]
      });
      pbVideoFactory(null, getConfig, pbGlobal, pbEvents);

      beforeBidRequestCallback(() => {}, {});
      auctionEndCallback(auctionResults);
      expect(gamSubmoduleMock.getAdTagUrl.calledOnce).to.be.true;
      expect(gamSubmoduleMock.getAdTagUrl.getCall(0).args[0]).is.equal(expectedAdUnit);
      expect(gamSubmoduleMock.getAdTagUrl.getCall(0).args[1]).is.equal(expectedAdTag);
    });

    it('should load ad tag when ad server returns ad tag', function () {
      const expectedAdTag = 'resulting ad tag';
      const gamSubmoduleFactory = () => ({
        getAdTagUrl: () => expectedAdTag
      });
      const expectedVastUrl = 'expectedVastUrl';
      const expectedVastXml = 'expectedVastXml';
      const pbGlobal = Object.assign({}, pbGlobalMock, {
        requestBids,
        getHighestCpmBids: () => [{
          vastUrl: expectedVastUrl,
          vastXml: expectedVastXml
        }, {}, {}, {}]
      });
      pbVideoFactory(null, getConfig, pbGlobal, pbEvents, null, gamSubmoduleFactory);
      beforeBidRequestCallback(() => {}, {});
      auctionEndCallback(auctionResults);
      expect(adQueueCoordinatorMock.queueAd.calledOnce).to.be.true;
      expect(adQueueCoordinatorMock.queueAd.args[0][0]).to.be.equal(expectedAdTag);
      expect(adQueueCoordinatorMock.queueAd.args[0][1]).to.be.equal(expectedDivId);
      expect(adQueueCoordinatorMock.queueAd.args[0][2]).to.have.property('adUnitCode', expectedAdUnitCode);
    });

    it('should load ad tag from highest bid when ad server is not configured', function () {
      const expectedVastUrl = 'expectedVastUrl';
      const expectedVastXml = 'expectedVastXml';
      const pbGlobal = Object.assign({}, pbGlobalMock, {
        requestBids,
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

      pbVideoFactory(null, () => ({ providers: [] }), pbGlobal, pbEvents);
      beforeBidRequestCallback(() => {}, {});
      auctionEndCallback(auctionResults);
      expect(adQueueCoordinatorMock.queueAd.calledOnce).to.be.true;
      expect(adQueueCoordinatorMock.queueAd.args[0][0]).to.be.equal(expectedVastUrl);
      expect(adQueueCoordinatorMock.queueAd.args[0][1]).to.be.equal(expectedDivId);
      expect(adQueueCoordinatorMock.queueAd.args[0][2]).to.have.property('adUnitCode', expectedAdUnitCode);
      expect(adQueueCoordinatorMock.queueAd.args[0][2]).to.have.property('adXml', expectedVastXml);
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
        if (event === EVENTS.BID_ADJUSTMENT) {
          bidAdjustmentCb = callback;
        } else if (event === 'videoAdImpression') {
          adImpressionCb = callback;
        } else if (event === 'videoAdError') {
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
      expect(pbEvents.emit.getCall(0).args[0]).to.be.equal('videoBidImpression');
      const payload = pbEvents.emit.getCall(0).args[1];
      expect(payload.bid).to.be.equal(expectedBid);
      expect(payload.adEvent).to.be.equal(expectedAdEventPayload);
      expect(pbGlobal.markWinningBidAsUsed.calledOnce).to.be.true;
    });

    it('should trigger video bid error when the bid matched', function () {
      pbEvents.emit.resetHistory();
      const pbGlobal = Object.assign({}, pbGlobalMock, { getBidResponsesForAdUnitCode: () => ({ bids: [expectedBid] }) });
      const videoImpressionVerifier = Object.assign({}, videoImpressionVerifierMock, { getBidIdentifiers: () => ({}) });
      pbVideoFactory(null, null, pbGlobal, pbEvents, null, null, () => videoImpressionVerifier);
      adErrorCb(expectedAdEventPayload);

      expect(pbEvents.emit.calledOnce).to.be.true;
      expect(pbEvents.emit.getCall(0).args[0]).to.be.equal('videoBidError');
      const payload = pbEvents.emit.getCall(0).args[1];
      expect(payload.bid).to.be.equal(expectedBid);
      expect(payload.adEvent).to.be.equal(expectedAdEventPayload);
      expect(pbGlobal.markWinningBidAsUsed.calledOnce).to.be.true;
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
