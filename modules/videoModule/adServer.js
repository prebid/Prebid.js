import { adServerDirectory } from './vendorDirectory.js';
import { ParentModule, SubmoduleBuilder } from './shared/parentModule.js';

export function AdServerCore(parentModule_) {
  const parentModule = parentModule_;

  function registerAdServer(config) {
    const vendorCode = config.vendorCode;
    parentModule.registerSubmodule(vendorCode, vendorCode, config);
  }

  function getAdTagUrl(vendorCode, adUnit, baseAdTagUrl) {
    const submodule = parentModule.getSubmodule(vendorCode);
    return submodule && submodule.getAdTagUrl(adUnit, baseAdTagUrl);
  }

  return {
    registerAdServer,
    getAdTagUrl
  }
}

export function coreAdServerFactory() {
  const adServerSubmoduleBuilder = SubmoduleBuilder(adServerDirectory);
  const parentModule = ParentModule(adServerSubmoduleBuilder);
  const adServerCore = AdServerCore(parentModule);
  return adServerCore;
}
