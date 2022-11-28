import { expect } from 'chai';
import { VideoCore } from 'modules/videoModule/coreVideo.js';

describe('Video Core', function () {
  const mockSubmodule = {
    getOrtbVideo: sinon.spy(),
    getOrtbContent: sinon.spy(),
    setAdTagUrl: sinon.spy(),
    onEvent: sinon.spy(),
    offEvent: sinon.spy(),
  };

  const otherSubmodule = {
    getOrtbVideo: () => {},
    getOrtbContent: () => {},
    setAdTagUrl: () => {},
    onEvent: () => {},
    offEvent: () => {},
  };

  const testId = 'test_id';
  const testVendorCode = 0;
  const otherId = 'other_id';
  const otherVendorCode = 1;

  const parentModuleMock = {
    registerSubmodule: sinon.spy(),
    getSubmodule: sinon.spy(id => {
      if (id === testId) {
        return mockSubmodule;
      } else if (id === otherId) {
        return otherSubmodule;
      }
    })
  };

  const videoCore = VideoCore(parentModuleMock);

  videoCore.registerProvider({
    vendorCode: testVendorCode,
    divId: testId
  });

  videoCore.registerProvider({
    vendorCode: otherVendorCode,
    divId: otherId
  });

  describe('registerProvider', function () {
    it('should delegate the registration to the Parent Module', function () {
      expect(parentModuleMock.registerSubmodule.calledTwice).to.be.true;
      expect(parentModuleMock.registerSubmodule.args[0][0]).to.be.equal(testId);
      expect(parentModuleMock.registerSubmodule.args[1][0]).to.be.equal(otherId);
      expect(parentModuleMock.registerSubmodule.args[0][1]).to.be.equal(testVendorCode);
      expect(parentModuleMock.registerSubmodule.args[1][1]).to.be.equal(otherVendorCode);
    });
  });

  describe('getOrtbVideo', function () {
    it('delegates to the submodule of the right divId', function () {
      videoCore.getOrtbVideo(testId);
      videoCore.getOrtbVideo(otherId);
      expect(mockSubmodule.getOrtbVideo.calledOnce).to.be.true;
    });
  });

  describe('getOrtbContent', function () {
    it('delegates to the submodule of the right divId', function () {
      videoCore.getOrtbContent(testId);
      videoCore.getOrtbContent(otherId);
      expect(mockSubmodule.getOrtbContent.calledOnce).to.be.true;
    });
  });

  describe('setAdTagUrl', function () {
    it('delegates to the submodule of the right divId', function () {
      videoCore.setAdTagUrl('', testId);
      videoCore.setAdTagUrl('', otherId);
      expect(mockSubmodule.setAdTagUrl.calledOnce).to.be.true;
    });
  });

  describe('onEvents', function () {
    it('delegates to the submodule of the right divId', function () {
      videoCore.onEvents(['event'], () => {}, testId);
      videoCore.onEvents(['event'], () => {}, otherId);
      expect(mockSubmodule.onEvent.calledOnce).to.be.true;
    });
  });

  describe('offEvents', function () {
    it('delegates to the submodule of the right divId', function () {
      videoCore.offEvents(['event'], () => {}, testId);
      videoCore.offEvents(['event'], () => {}, otherId);
      expect(mockSubmodule.offEvent.calledOnce).to.be.true;
    });
  });
});
