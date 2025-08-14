import { logMessage } from '../src/utils.js';
import { config } from '../src/config.js';
import * as events from '../src/events.js';
import {EVENTS} from '../src/constants.js';

const MODULE_NAME = 'bidViewabilityIO';
const CONFIG_ENABLED = 'enabled';

// IAB numbers from: https://support.google.com/admanager/answer/4524488?hl=en
const IAB_VIEWABLE_DISPLAY_TIME = 1000;
const IAB_VIEWABLE_DISPLAY_LARGE_PX = 242000;
export const IAB_VIEWABLE_DISPLAY_THRESHOLD = 0.5
export const IAB_VIEWABLE_DISPLAY_LARGE_THRESHOLD = 0.3;

const CLIENT_SUPPORTS_IO = window.IntersectionObserver && window.IntersectionObserverEntry && window.IntersectionObserverEntry.prototype &&
    'intersectionRatio' in window.IntersectionObserverEntry.prototype;

const supportedMediaTypes = [
  'banner'
];

export let isSupportedMediaType = (bid) => {
  return supportedMediaTypes.indexOf(bid.mediaType) > -1;
}

let _logMessage = (message) => {
  return logMessage(`${MODULE_NAME}: ${message}`);
}

// returns options for the iO that detects if the ad is viewable
export let getViewableOptions = (bid) => {
  if (bid.mediaType === 'banner') {
    return {
      root: null,
      rootMargin: '0px',
      threshold: bid.width * bid.height > IAB_VIEWABLE_DISPLAY_LARGE_PX ? IAB_VIEWABLE_DISPLAY_LARGE_THRESHOLD : IAB_VIEWABLE_DISPLAY_THRESHOLD
    }
  }
}

// markViewed returns a function what will be executed when an ad satisifes the viewable iO
export let markViewed = (bid, entry, observer) => {
  return () => {
    observer.unobserve(entry.target);
    events.emit(EVENTS.BID_VIEWABLE, bid);
    _logMessage(`id: ${entry.target.getAttribute('id')} code: ${bid.adUnitCode} was viewed`);
  }
}

// viewCallbackFactory creates the callback used by the viewable IntersectionObserver.
// When an ad comes into view, it sets a timeout for a function to be executed
// when that ad would be considered viewed per the IAB specs. The bid that was rendered
// is passed into the factory, so it can pass it into markViewed, so that it can be included
// in the BID_VIEWABLE event data. If the ad leaves view before the timer goes off, the setTimeout
// is cancelled, an the bid will not be marked as viewed. There's probably some kind of race-ish
// thing going on between IO and setTimeout but this isn't going to be perfect, it's just going to
// be pretty good.
export let viewCallbackFactory = (bid) => {
  return (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        _logMessage(`viewable timer starting for id: ${entry.target.getAttribute('id')} code: ${bid.adUnitCode}`);
        entry.target.view_tracker = setTimeout(markViewed(bid, entry, observer), IAB_VIEWABLE_DISPLAY_TIME);
      } else {
        _logMessage(`id: ${entry.target.getAttribute('id')} code: ${bid.adUnitCode} is out of view`);
        if (entry.target.view_tracker) {
          clearTimeout(entry.target.view_tracker);
          _logMessage(`viewable timer stopped for id: ${entry.target.getAttribute('id')} code: ${bid.adUnitCode}`);
        }
      }
    });
  };
};

export let init = () => {
  config.getConfig(MODULE_NAME, conf => {
    if (conf[MODULE_NAME][CONFIG_ENABLED] && CLIENT_SUPPORTS_IO) {
      // if the module is enabled and the browser supports Intersection Observer,
      // then listen to AD_RENDER_SUCCEEDED to setup IO's for supported mediaTypes
      events.on(EVENTS.AD_RENDER_SUCCEEDED, ({doc, bid, id}) => {
        if (isSupportedMediaType(bid)) {
          let viewable = new IntersectionObserver(viewCallbackFactory(bid), getViewableOptions(bid));
          let element = document.getElementById(bid.adUnitCode);
          viewable.observe(element);
        }
      });
    }
  });
}

init()
