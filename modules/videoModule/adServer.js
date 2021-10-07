import { adServerDirectory } from './vendorDirectory.js';
import { ParentModule, submoduleBuilder } from './shared/parentModule';

export function AdServerCore(parentModule_) {
  const parentModule = parentModule_;

  function registerAdServer(config) {
    parentModule.registerSubmodule(config.vendorCode, config.params);
  }

  function getAdTagUrl(vendorCode) {
    const submodule = parentModule.getSudmodule(vendorCode);
    return submodule && submodule.getAdTagUrl();
  }

  return {
    registerAdServer,
    getAdTagUrl
  }
}

export function coreAdServerFactory() {
  const adServerSubmoduleBuilder = submoduleBuilder(adServerDirectory);
  const parentModule = ParentModule(adServerSubmoduleBuilder);
  const adServerCore = AdServerCore(parentModule);
  return adServerCore;
}
