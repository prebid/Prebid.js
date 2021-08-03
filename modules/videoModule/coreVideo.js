export function videoCore(videoSubmoduleFactory_) {
  const submodules = {};
  const videoSubmoduleFactory = videoSubmoduleFactory_;

  function registerProvider(divId, vendorCode) {
    submodules[divId] = videoSubmoduleFactory.createSubmodule(divId, vendorCode);
  }

  function getOrtbParams(divId) {
    const submodule = submodules[divId];
    return submodule.getOrtbParams();
  }

  function setAdTagUrl(adTagUrl, divId) {
    const submodule = submodules[divId];
    return submodule.setAdTagUrl(adTagUrl);
  }

  function onEvents(events, callback, divId) {
    const submodule = submodules[divId];
    return submodule.onEvents(events, callback);
  }

  function offEvents(events, callback, divId) {
    const submodule = submodules[divId];
    return submodule.offEvents(events, callback);
  }

  return {
    registerProvider,
    getOrtbParams,
    setAdTagUrl,
    onEvents,
    offEvents
  };
}
