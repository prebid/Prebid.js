import { AD_BREAK_END, AUCTION_AD_LOAD_ATTEMPT, AUCTION_AD_LOAD_QUEUED, SETUP_COMPLETE } from '../../libraries/video/constants/events.js'
import { getExternalVideoEventName, getExternalVideoEventPayload } from '../../libraries/video/shared/helpers.js'

export function AdQueueCoordinator(videoCore, pbEvents) {
  const storage = {};

  function registerProvider(divId) {
    storage[divId] = [];
    videoCore.onEvents([SETUP_COMPLETE], onSetupComplete, divId);
  }

  function queueAd(adXml, divId, options) {
    const queue = storage[divId];
    if (queue) {
      queue.push({adXml, options});
      triggerEvent(AUCTION_AD_LOAD_QUEUED, adXml, options);
    } else {
      loadAd(divId, adXml, options);
    }
  }

  return {
    registerProvider,
    queueAd
  };

  function onSetupComplete(eventName, eventPayload) {
    const divId = eventPayload.divId;
    videoCore.offEvents([SETUP_COMPLETE], onSetupComplete, divId);
    loadQueuedAd(divId);
  }

  function onAdBreakEnd(eventName, eventPayload) {
    loadQueuedAd(eventPayload.divId);
  }

  function loadQueuedAd(divId) {
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
    loadAd(divId, queuedAd.adXml, queuedAd.options);
  }

  function loadAd(divId, adXml, options) {
    triggerEvent(AUCTION_AD_LOAD_ATTEMPT, adXml, options);
    videoCore.setAdXml(adXml, divId, options);
  }

  function triggerEvent(eventName, adTagXml, options) {
    const payload = Object.assign({ adTagXml }, options);
    pbEvents.emit(getExternalVideoEventName(eventName), getExternalVideoEventPayload(eventName, payload));
  }
}
