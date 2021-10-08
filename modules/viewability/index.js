import * as utils from '../../src/utils.js';
import { getGlobal } from '../../src/prebidGlobal.js';
import find from 'core-js-pure/features/array/find.js';

export function init() {
  (getGlobal()).viewability = {
    startMeasurement: startMeasurement,
    stopMeasurement: stopMeasurement,
  };

  listenMessagesFromCreative();
}

const observers = {};

// vid - unique viewability identifier
// element
// tracker { method: 'img', url: 'http://my.tracker/123' }
// criteria - { inViewThreshold: 0.5, timeInView: 5000 }
export function startMeasurement(vid, element, tracker, criteria) {
  if (!element || !tracker || !tracker.method || !tracker.url) {
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

        switch (tracker.method) {
          case 'img':
            // image
            utils.triggerPixel(tracker.url, () => {
              utils.logInfo('tracker fired', tracker.url);
            });
            break;
          case 'js':
            // javascript
            utils.insertHtmlIntoIframe(`<script src="${tracker.url}"></script>`);
            break;
          default:
            utils.logWarn('unsupported tracking method', tracker.method);
            break;
        }
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

      startMeasurement(data.vid, element, data.tracker, data.criteria);
      break;
    case 'stopMeasurement':
      stopMeasurement(data.vid);
      break;
  }
}

init();
