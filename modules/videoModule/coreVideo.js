import { videoVendorDirectory } from './vendorDirectory.js';
import { ParentModule, submoduleBuilder } from './shared/parentModule';

export function VideoCore(parentModule_) {
  const parentModule = parentModule_;

  function registerProvider(providerConfig) {
    parentModule.registerSubmodule(providerConfig.divId, providerConfig);
  }

  function getOrtbParams(divId) {
    const submodule = parentModule.getSubmodule(divId);
    return submodule && submodule.getOrtbParams();
  }

  function setAdTagUrl(adTagUrl, divId) {
    const submodule = parentModule.getSubmodule(divId);
    return submodule && submodule.setAdTagUrl(adTagUrl);
  }

  function onEvents(events, callback, divId) {
    const submodule = parentModule.getSubmodule(divId);
    return submodule && submodule.onEvents(events, callback);
  }

  function offEvents(events, callback, divId) {
    const submodule = parentModule.getSubmodule(divId);
    return submodule && submodule.offEvents(events, callback);
  }

  return {
    registerProvider,
    getOrtbParams,
    setAdTagUrl,
    onEvents,
    offEvents
  };
}

export function videoCoreFactory() {
  const videoSubmoduleBuilder = submoduleBuilder(videoVendorDirectory);
  const parentModule = ParentModule(videoSubmoduleBuilder);
  return VideoCore(parentModule);
}
