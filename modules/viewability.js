import {insertHtmlIntoIframe, isFn, isStr, logInfo, logWarn, triggerPixel} from '../src/utils.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {find} from '../src/polyfill.js';

export const MODULE_NAME = 'viewability';

export function init() {
  (getGlobal()).viewability = {
    startMeasurement: startMeasurement,
    stopMeasurement: stopMeasurement,
  };

  listenMessagesFromCreative();
}

const observers = {};

function isValid(vid, element, tracker, criteria) {
  if (!element) {
    logWarn(`${MODULE_NAME}: no html element provided`);
    return false;
  }

  let validTracker = tracker &&
    ((tracker.method === 'img' && isStr(tracker.value)) ||
    (tracker.method === 'js' && isStr(tracker.value)) ||
    (tracker.method === 'callback' && isFn(tracker.value)));

  if (!validTracker) {
    logWarn(`${MODULE_NAME}: invalid tracker`, tracker);
    return false;
  }

  if (!criteria || !criteria.inViewThreshold || !criteria.timeInView) {
    logWarn(`${MODULE_NAME}: missing criteria`, criteria);
    return false;
  }

  if (!vid || observers[vid]) {
    logWarn(`${MODULE_NAME}: must provide an unregistered vid`, vid);
    return false;
  }

  return true;
}

function stopObserving(observer, vid, element) {
  observer.unobserve(element);
  observers[vid].done = true;
}

function fireViewabilityTracker(element, tracker) {
  switch (tracker.method) {
    case 'img':
      triggerPixel(tracker.value, () => {
        logInfo(`${MODULE_NAME}: viewability pixel fired`, tracker.value);
      });
      break;
    case 'js':
      insertHtmlIntoIframe(`<script src="${tracker.value}"></script>`);
      break;
    case 'callback':
      tracker.value(element);
      break;
  }
}

function viewabilityCriteriaMet(observer, vid, element, tracker) {
  stopObserving(observer, vid, element);
  fireViewabilityTracker(element, tracker);
}

/**
 * Start measuring viewability of an element
 * @typedef {{ method: string='img','js','callback', value: string|function }} ViewabilityTracker { method: 'img', value: 'http://my.tracker/123' }
 * @typedef {{ inViewThreshold: number, timeInView: number }} ViewabilityCriteria { inViewThreshold: 0.5, timeInView: 1000 }
 * @param {string} vid unique viewability identifier
 * @param {HTMLElement} element
 * @param {ViewabilityTracker} tracker
 * @param {ViewabilityCriteria} criteria
 */
export function startMeasurement(vid, element, tracker, criteria) {
  if (!isValid(vid, element, tracker, criteria)) {
    return;
  }

  const options = {
    root: null,
    rootMargin: '0px',
    threshold: criteria.inViewThreshold,
  };

  let observer;
  let viewable = false;
  let stateChange = (entries) => {
    viewable = entries[0].isIntersecting;

    if (viewable) {
      observers[vid].timeoutId = window.setTimeout(() => {
        viewabilityCriteriaMet(observer, vid, element, tracker);
      }, criteria.timeInView);
    } else if (observers[vid].timeoutId) {
      window.clearTimeout(observers[vid].timeoutId);
    }
  };

  observer = new IntersectionObserver(stateChange, options);
  observers[vid] = {
    observer: observer,
    element: element,
    timeoutId: null,
    done: false,
  };

  observer.observe(element);

  logInfo(`${MODULE_NAME}: startMeasurement called with:`, arguments);
}

/**
 * Stop measuring viewability of an element
 * @param {string} vid unique viewability identifier
 */
export function stopMeasurement(vid) {
  if (!vid || !observers[vid]) {
    logWarn(`${MODULE_NAME}: must provide a registered vid`, vid);
    return;
  }

  observers[vid].observer.unobserve(observers[vid].element);
  if (observers[vid].timeoutId) {
    window.clearTimeout(observers[vid].timeoutId);
  }

  // allow the observer under this vid to be created again
  if (!observers[vid].done) {
    delete observers[vid];
  }
}

function listenMessagesFromCreative() {
  window.addEventListener('message', receiveMessage, false);
}

/**
 * Recieve messages from creatives
 * @param {MessageEvent} evt
 */
export function receiveMessage(evt) {
  var key = evt.message ? 'message' : 'data';
  var data = {};
  try {
    data = JSON.parse(evt[key]);
  } catch (e) {
    return;
  }

  if (!data || data.message !== 'Prebid Viewability') {
    return;
  }

  switch (data.action) {
    case 'startMeasurement':
      let element = data.elementId && document.getElementById(data.elementId);
      if (!element) {
        element = find(document.getElementsByTagName('IFRAME'), iframe => (iframe.contentWindow || iframe.contentDocument.defaultView) == evt.source);
      }

      startMeasurement(data.vid, element, data.tracker, data.criteria);
      break;
    case 'stopMeasurement':
      stopMeasurement(data.vid);
      break;
  }
}

init();
