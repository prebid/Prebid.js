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
  describe('registerProvider', function () {

  });

  describe('getOrtbParams', function () {

  });

  describe('setAdTagUrl', function () {

  });

  describe('onEvents', function () {

  });

  describe('offEvents', function () {

  });
});
