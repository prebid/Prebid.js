import { SubmoduleBuilder, ParentModule } from 'modules/videoModule/shared/parentModule.js';
import { expect } from 'chai';

describe('Parent Module', function() {
  const vendorCodeForMock = 0;
  const unrecognizedVendorCode = 999;
  const mockSubmodule = { test: 'test' };
  const mockSubmoduleBuilder = {
    build: vendorCode => {
      if (vendorCode === vendorCodeForMock) {
        return mockSubmodule;
      } else {
        throw new Error('flawed');
      }
    }
  };
  const parentModule = ParentModule(mockSubmoduleBuilder);

  describe('Register Submodule', function () {
    it('should throw when the builder fails to build', function () {
      // const flawedVideoCore = VideoCore({
      //   build: () => {
      //     throw new Error('flawed');
      //   }
      // });

      expect(() => parentModule.registerSubmodule(unrecognizedVendorCode)).to.throw('flawed');
      // expect(() => flawedVideoCore.registerProvider({ vendorCode: 0 })).to.throw('flawed');
    });
  });

  describe('Get Submodule', function () {
    it('should return registered submodules', function () {
      parentModule.registerSubmodule(vendorCodeForMock);
      const submodule = parentModule.getSubmodule(vendorCodeForMock);
      expect(submodule).to.be.equal(mockSubmodule);
    });

    it('should return undefined when submodule is not registered', function () {
      const submodule = parentModule.getSubmodule(unrecognizedVendorCode);
      expect(submodule).to.be.undefined;
    });
  })
});

describe('Submodule Builder', function () {
  const vendorCode1 = 1;
  const vendorCode2 = 2;
  const submodule1 = {};
  const initSpy = sinon.spy();
  const submodule2 = { init: initSpy };
  const submoduleFactory1 = () => submodule1;
  const submoduleFactory2 = () => submodule2;
  const submoduleFactory1Spy = sinon.spy(submoduleFactory1);

  const vendorDirectory = {};
  vendorDirectory[vendorCode1] = submoduleFactory1Spy;
  vendorDirectory[vendorCode2] = submoduleFactory2;

  const submoduleBuilder = SubmoduleBuilder(vendorDirectory);

  it('should call submodule factory when vendor code is supported', function () {
    const submodule = submoduleBuilder.build(vendorCode1);
    expect(submoduleFactory1Spy.calledOnce).to.be.true;
    expect(submodule).to.be.equal(submodule1);
  });

  it('should instantiate the submodule, when supported', function () {
    const submodule = submoduleBuilder.build(vendorCode2);
    expect(initSpy.calledOnce).to.be.true;
    expect(submodule).to.be.equal(submodule2);
  });

  it('should throw when vendor code is not recognized', function () {
    const unrecognizedVendorCode = 999;
    expect(() => submoduleBuilder.build(unrecognizedVendorCode)).to.throw('Unrecognized submodule code: ' + unrecognizedVendorCode);
  });
});
