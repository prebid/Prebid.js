import { AD_BREAK_END, SETUP_COMPLETE } from '../../libraries/video/constants/events.js'

export function AdQueueCoordinator(videoCore) {
  const storage = {};

  function registerProvider(divId) {
    storage[divId] = [];
    videoCore.onEvents([SETUP_COMPLETE], onSetupComplete, divId);
  }

  function requiresQueueing(divId) {
    return !!storage[divId];
  }

  function queueAd(adUrl, divId, options) {
    const queue = storage[divId];
    if (queue) {
      queue.push({adUrl, options});
    }
  }

  return {
    registerProvider,
    requiresQueueing,
    queueAd
  };

  function onSetupComplete(eventName, eventPayload) {
    const divId = eventPayload.divId;
    videoCore.offEvents([SETUP_COMPLETE], onSetupComplete, divId);
    loadNextAd(divId);
  }

  function onAdBreakEnd(eventName, eventPayload) {
    loadNextAd(eventPayload.divId);
  }

  function loadNextAd(divId) {
    videoCore.offEvents([AD_BREAK_END], onAdBreakEnd, divId);
    const adQueue = storage[divId];
    if (!adQueue) {
      return;
    }

    if (!adQueue.length) {
      delete storage[divId];
      return;
    }

    const queuedAd = adQueue.shift();
    videoCore.onEvents([AD_BREAK_END], onAdBreakEnd, divId);
    videoCore.setAdTagUrl(queuedAd.adUrl, divId, queuedAd.options);
  }
}
