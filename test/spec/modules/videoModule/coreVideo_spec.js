import { expect } from 'chai';
import {
  videoSubmoduleBuilder,
  videoCore
} from 'modules/videoModule/coreVideo';

describe('Video Submodule Builder', function () {
  const playerSpecificSubmoduleFactory = sinon.spy();
  const vendorDirectory = {
    1: playerSpecificSubmoduleFactory
  };
  const submoduleBuilder = videoSubmoduleBuilder(vendorDirectory);

  it('should call submodule factory when vendor code is supported', function () {
    submoduleBuilder.build({ vendorCode: 1 });
    expect(playerSpecificSubmoduleFactory.calledOnce).to.be.true;
  });

  it('should throw when vendor code is not recognized', function () {
    expect(() => submoduleBuilder.build({ vendorCode: 2 })).to.throw('Unrecognized vendor code');
  });
});

describe('Video Core', function () {
  const mockSubmodule = {
    getOrtbParams: sinon.spy(),
    setAdTagUrl: sinon.spy(),
    onEvents: sinon.spy(),
    offEvents: sinon.spy(),
  };

  const otherSubmodule = {
    getOrtbParams: () => {},
    setAdTagUrl: () => {},
    onEvents: () => {},
    offEvents: () => {},
  };

  const mockSubmoduleBuilder = {
    build: (config) => {
      if (config.vendorCode === 0) {
        return mockSubmodule;
      } else {
        return otherSubmodule;
      }
    }
  };

  const coreVideo = videoCore(mockSubmoduleBuilder);
  const testId = 'test_id';
  const otherId = 'other_id';

  coreVideo.registerProvider({
    vendorCode: 0,
    divId: testId
  });

  coreVideo.registerProvider({
    vendorCode: 1,
    divId: otherId
  });

  describe('registerProvider', function () {
    it('should throw when the builder fails to build', function () {
      const flawedVideoCore = videoCore({
        build: () => {
          throw new Error('flawed');
        }
      });
      expect(() => flawedVideoCore.registerProvider({ vendorCode: 0 })).to.throw('flawed');
    });
  });

  describe('getOrtbParams', function () {
    it('delegates to the submodule of the right divId', function () {
      coreVideo.getOrtbParams(testId);
      coreVideo.getOrtbParams(otherId);
      expect(mockSubmodule.getOrtbParams.calledOnce).to.be.true;
    });
  });

  describe('setAdTagUrl', function () {
    it('delegates to the submodule of the right divId', function () {
      coreVideo.setAdTagUrl('', testId);
      coreVideo.setAdTagUrl('', otherId);
      expect(mockSubmodule.setAdTagUrl.calledOnce).to.be.true;
    });
  });

  describe('onEvents', function () {
    it('delegates to the submodule of the right divId', function () {
      coreVideo.onEvents([], () => {}, testId);
      coreVideo.onEvents([], () => {}, otherId);
      expect(mockSubmodule.onEvents.calledOnce).to.be.true;
    });
  });

  describe('offEvents', function () {
    it('delegates to the submodule of the right divId', function () {
      coreVideo.offEvents([], () => {}, testId);
      coreVideo.offEvents([], () => {}, otherId);
      expect(mockSubmodule.offEvents.calledOnce).to.be.true;
    });
  });
});
