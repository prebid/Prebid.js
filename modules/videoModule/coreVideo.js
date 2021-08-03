export function VideoCore(submoduleBuilder_) {
  const submodules = {};
  const submoduleBuilder = submoduleBuilder_;

  function registerProvider(providerConfig) {
    let submodule;
    try {
      submodule = submoduleBuilder.build(providerConfig);
    } catch (e) {
      throw e;
    }
    submodules[providerConfig.divId] = submodule;
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

const vendorDirectory = {
  1: 'jwplayerFunction',
  2: 'videoJsFunction'
};

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

    return submoduleFactory(providerConfig);
  }

  return {
    build
  };
}
