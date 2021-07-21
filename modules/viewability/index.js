import * as utils from '../../src/utils.js';
import { getGlobal } from '../../src/prebidGlobal.js';
import { Timer } from './timer.js';

// export const VIEWABILITY_CALLBACKS = {
//   'onStart': function(element, data) { utils.logInfo('Element has started being viewable', element, data); },
//   'onStop': function(element, data) { utils.logInfo('Element has stopped being viewable', element, data); },
//   'onComplete': function(element, data) { utils.logInfo('Element viewability has changed state', element, data); },
//   'onError': function(element, data) {},
// };

// var d = document.getElementById('div-gpt-ad-1460505748561-0')
// pbjs.measureElement(d, 63, 10000, {"onStart": function(){console.log("VIEW start");}, "onStop": function(){console.log("VIEW stop");}, "onComplete": function(){console.log("VIEW complete");}})

// let observers = {};

function measureElement(element, percentage, time, callbacks) {
  let options = {
    root: null, // defaults to the browser viewport if not specified or if null
    rootMargin: '0px',
    threshold: percentage / 100.0,
  };

  let timer;
  let observer;
  let viewable = false;
  let stateChange = function(entries) {
    viewable = entries[0].isIntersecting;

    // TODO: for debugging, remove
    utils.logInfo('viewability state change', entries[0]);

    if (!timer) {
      timer = new Timer(function() {
        // stop observing
        observer.unobserve(element);

        if (callbacks.onComplete) {
          window.setTimeout(callbacks.onComplete, 0);
        }
      }, time, false);
    }

    if (viewable) {
      timer.resume();
      if (callbacks.onStart) {
        window.setTimeout(callbacks.onStart, 0);
      }
    } else {
      timer.pause();
      if (callbacks.onStop) {
        window.setTimeout(callbacks.onStop, 0);
      }
    }
  };

  observer = new IntersectionObserver(stateChange, options);

  observer.observe(element);
}

function stopMeasurement(element) {

}

(getGlobal()).measureElement = measureElement;
(getGlobal()).stopMeasurement = stopMeasurement;
