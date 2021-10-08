import { videoVendorDirectory } from './vendorDirectory.js';
import { ParentModule, SubmoduleBuilder } from './shared/parentModule.js';

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
  const videoSubmoduleBuilder = SubmoduleBuilder(videoVendorDirectory);
  const parentModule = ParentModule(videoSubmoduleBuilder);
  return VideoCore(parentModule);
}
