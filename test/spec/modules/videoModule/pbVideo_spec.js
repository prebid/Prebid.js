import { expect } from 'chai';
import { PbVideo } from 'modules/videoModule/index.js';

let ortbParamsMock;
let videoCoreMock;
let getConfigMock;
let requestBidsMock;
let pbGlobalMock;
let pbEventsMock;
let videoEventsMock;

function resetTestVars() {
  ortbParamsMock = {
    'video': {},
    'content': {}
  }
  videoCoreMock = {
    registerProvider: sinon.spy(),
    onEvents: sinon.spy(),
    getOrtbParams: () => ortbParamsMock
  };
  getConfigMock = () => {};
  requestBidsMock = {
    before: sinon.spy()
  };
  pbGlobalMock = {
    requestBids: requestBidsMock
  };
  pbEventsMock = {
    emit: sinon.spy(),
    on: sinon.spy()
  };
  videoEventsMock = [];
}

let pbVideoFactory = (videoCore, getConfig, pbGlobal, pbEvents, videoEvents) => {
  const pbVideo = PbVideo(
    videoCore || videoCoreMock,
    getConfig || getConfigMock,
    pbGlobal || pbGlobalMock,
    pbEvents || pbEventsMock,
    videoEvents || videoEventsMock
  );
  pbVideo.init();
  return pbVideo;
}

describe('Prebid Video', function () {
  beforeEach(() => resetTestVars());

  describe('Setting video to config', function () {
    let providers = [{ divId: 'div1' }, { divId: 'div2' }];
    let getConfigCallback;
    let customGetConfig = (video, callback) => {
      getConfigCallback = callback;
    };

    beforeEach(() => {
      const pbVideo = pbVideoFactory(null, customGetConfig, null, null, null);
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

    it('Should emit events off of Prebid\'s Events', function () {
      let eventHandler;
      const customVideoCore = Object.assign({}, videoCoreMock, {
        onEvents: (events, eventHandler_) => eventHandler = eventHandler_
      });
      const pbVideo = pbVideoFactory(customVideoCore, customGetConfig, null, null, null);
      getConfigCallback({ video: { providers } });
      const expectedType = 'test_event';
      const expectedPayload = {'test': 'data'};
      eventHandler(expectedType, expectedPayload);
      expect(pbEventsMock.emit.calledOnce).to.be.true;
      expect(pbEventsMock.emit.getCall(0).args[0]).to.be.equal(expectedType);
      expect(pbEventsMock.emit.getCall(0).args[1]).to.be.equal(expectedPayload);
    });
  });

  describe('Event triggering', function () {
    it('Should emit events off of Prebid\'s Events', function () {

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
      const pbVideo = pbVideoFactory(null, null, { requestBids }, null);
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
    });
  });

  describe('Ad tag injection', function () {
    // TODO: requires adServer to be implemented
  });
});
