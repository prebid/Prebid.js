
function gamAdServerSubmodule() {

  function getAdTagUrl(adUnit, baseAdTag) {
    // engine.adServers.dfp
    return dfp.buildVideoUrl({ adUnit: adUnit, url: baseAdTag });
  }
}
