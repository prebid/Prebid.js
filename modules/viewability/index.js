import * as utils from '../../src/utils.js';
import { getGlobal } from '../../src/prebidGlobal.js';
import find from 'core-js-pure/features/array/find.js';

export function init() {
  (getGlobal()).viewability = {
    startMeasurement: startMeasurement,
    stopMeasurement: stopMeasurement,
  };
}

const observers = {};

// vid - unique viewability identifier
// element
// trackerURL
// criteria - { inViewThreshold: 0.5, timeInView: 5000 }
export function startMeasurement(vid, element, trackerURL, criteria) {
  if (!element) {
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
  let timeoutId;
  let stateChange = (entries) => {
    viewable = entries[0].isIntersecting;

    if (viewable) {
      timeoutId = window.setTimeout(() => {
        // stop observing
        observer.unobserve(element);

        utils.logInfo('element is viewable', element);
        utils.triggerPixel(trackerURL, () => {
          utils.logInfo('tracker fired', element, trackerURL);
        });
      }, criteria.timeInView);
    } else if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  };

  observer = new IntersectionObserver(stateChange, options);
  observer.observe(element);

  observers[vid] = {
    observer: observer,
    element: element,
  };
}

export function stopMeasurement(vid) {
  if (!vid || !observers[vid]) {
    utils.logWarn('provide a registered vid', vid);
    return;
  }

  observers[vid].observer.unobserve(observers[vid].element);
}

function listenMessagesFromCreative() {
  window.addEventListener('message', receiveMessage, false);
}

function receiveMessage(evt) {
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

      startMeasurement(data.vid, element, data.trackerURL, data.criteria);
      break;
    case 'stopMeasurement':
      stopMeasurement(data.vid);
      break;
  }
}

init();
listenMessagesFromCreative();
