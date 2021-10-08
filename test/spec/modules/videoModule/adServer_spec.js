import { expect } from 'chai';
import { AdServerCore } from 'modules/videoModule/adServer.js';

describe('Ad Server Core', function () {
  const parentModuleMock = {
    registerSubmodule: sinon.spy(),
    getSubmodule: sinon.spy()
  };
  const testVendorCode = 'test';
  const adServerCore = AdServerCore(parentModuleMock);
  adServerCore.registerAdServer({ vendorCode: testVendorCode });

  describe('Register Ad Server', function () {
    it('should use the vendor code as an id as well as a vendor code', function () {
      expect(parentModuleMock.registerSubmodule.calledOnce).to.be.true;
      expect(parentModuleMock.registerSubmodule.args[0][0]).to.be.equal(testVendorCode);
      expect(parentModuleMock.registerSubmodule.args[0][1]).to.be.equal(testVendorCode);
    });
  });

  describe('Get Ad Tag Url', function () {
    it('should request the right submodule', function () {
      adServerCore.getAdTagUrl(testVendorCode);
      expect(parentModuleMock.getSubmodule.calledOnce).to.be.true;
      expect(parentModuleMock.getSubmodule.args[0][0]).to.be.equal(testVendorCode);
    });
  });
});
