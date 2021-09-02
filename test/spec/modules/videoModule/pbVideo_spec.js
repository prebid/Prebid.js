import { expect } from 'chai';
import { PbVideo } from 'modules/videoModule/index.js';

let ortbParamsMock = {
  'video': {},
  'content': {}
}
let videoCoreMock = {
  registerProvider: sinon.spy(),
  getOrtbParams: () => ortbParamsMock
};
let getConfigMock = () => {};
let requestBidsMock = {
  before: sinon.spy()
};
let pbGlobalMock = {
  requestBids: requestBidsMock
};
let pbEventsMock = {
  emit: sinon.spy(),
  on: sinon.spy()
};
let videoEventsMock = [];

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
  describe('Provider Registration', function () {

  });

  describe('Event Registration', function () {

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
