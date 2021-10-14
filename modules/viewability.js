import * as utils from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';
import find from 'core-js-pure/features/array/find.js';

export function init() {
  (getGlobal()).viewability = {
    startMeasurement: startMeasurement,
    stopMeasurement: stopMeasurement,
  };

  listenMessagesFromCreative();
}

const observers = {};

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
  if (!element) {
    utils.logWarn('provide an html element to track');
    return;
  }

  let validTracker = tracker &&
    ((tracker.method === 'img' && utils.isStr(tracker.value)) ||
    (tracker.method === 'js' && utils.isStr(tracker.value)) ||
    (tracker.method === 'callback' && utils.isFn(tracker.value)));

  if (!validTracker) {
    utils.logWarn('invalid tracker', tracker);
    return;
  }

  if (!criteria || !criteria.inViewThreshold || !criteria.timeInView) {
    utils.logWarn('missing criteria', criteria);
    return;
  }

  if (!vid || observers[vid]) {
    utils.logWarn('provide an unregistered vid', vid);
    return;
  }

  let options = {
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
        // stop observing
        observer.unobserve(element);

        switch (tracker.method) {
          case 'img':
            utils.triggerPixel(tracker.value, () => {
              utils.logInfo('viewability pixel fired', tracker.value);
            });
            break;
          case 'js':
            utils.insertHtmlIntoIframe(`<script src="${tracker.value}"></script>`);
            break;
          case 'callback':
            tracker.value(element);
            break;
        }
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
  };

  observer.observe(element);
}

/**
 * Stop measuring viewability of an element
 * @param {string} vid unique viewability identifier
 */
export function stopMeasurement(vid) {
  if (!vid || !observers[vid]) {
    utils.logWarn('provide a registered vid', vid);
    return;
  }

  observers[vid].observer.unobserve(observers[vid].element);
  if (observers[vid].timeoutId) {
    window.clearTimeout(observers[vid].timeoutId);
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
