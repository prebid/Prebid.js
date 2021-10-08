import { SubmoduleBuilder } from 'modules/videoModule/shared/parentModule.js';
import { expect } from 'chai';

describe('Parent Module', function() {

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
