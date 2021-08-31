import { vendorDirectory } from './vendorDirectory.js';

export function VideoCore(submoduleBuilder_) {
  const submodules = {};
  const submoduleBuilder = submoduleBuilder_;

  function registerProvider(providerConfig) {
    const divId = providerConfig.divId;
    if (submodules[divId]) {
      return;
    }

    let submodule;
    try {
      submodule = submoduleBuilder.build(providerConfig);
    } catch (e) {
      throw e;
    }
    submodules[divId] = submodule;
  }

  function getOrtbParams(divId) {
    const submodule = submodules[divId];
    return submodule && submodule.getOrtbParams();
  }

  function setAdTagUrl(adTagUrl, divId) {
    const submodule = submodules[divId];
    return submodule && submodule.setAdTagUrl(adTagUrl);
  }

  function onEvents(events, callback, divId) {
    const submodule = submodules[divId];
    return submodule && submodule.onEvents(events, callback);
  }

  function offEvents(events, callback, divId) {
    const submodule = submodules[divId];
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
  const submoduleBuilder = VideoSubmoduleBuilder(vendorDirectory);
  return VideoCore(submoduleBuilder);
}

export function VideoSubmoduleBuilder(vendorDirectory_) {
  const vendorDirectory = vendorDirectory_;

  function build(providerConfig) {
    const submoduleFactory = vendorDirectory[providerConfig.vendorCode];
    if (!submoduleFactory) {
      throw new Error('Unrecognized vendor code');
    }

    const submodule = submoduleFactory(providerConfig);
    submodule.init && submodule.init();
    return submodule;
  }

  return {
    build
  };
}
