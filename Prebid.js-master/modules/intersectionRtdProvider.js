import {submodule} from '../src/hook.js';
import {isFn, logError} from '../src/utils.js';
import {config} from '../src/config.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {includes} from '../src/polyfill.js';
import '../src/adapterManager.js';

let observerAvailable = true;
function getIntersectionData(requestBidsObject, onDone, providerConfig, userConsent) {
  const intersectionMap = {};
  const placeholdersMap = {};
  let done = false;
  if (!observerAvailable) return complete();
  const observer = new IntersectionObserver(observerCallback, {threshold: 0.5});
  const adUnitCodes = requestBidsObject.adUnitCodes || [];
  const auctionDelay = config.getConfig('realTimeData.auctionDelay') || 0;
  const waitForIt = providerConfig.waitForIt;
  let adUnits = requestBidsObject.adUnits || getGlobal().adUnits || [];
  if (adUnitCodes.length) {
    adUnits = adUnits.filter(unit => includes(adUnitCodes, unit.code));
  }
  let checkTimeoutId;
  findAndObservePlaceholders();
  if (auctionDelay > 0) {
    setTimeout(complete, auctionDelay);
  }
  function findAndObservePlaceholders() {
    const observed = adUnits.filter((unit) => {
      const code = unit.code;
      if (placeholdersMap[code]) return true;
      const ph = document.getElementById(code);
      if (ph) {
        placeholdersMap[code] = ph;
        observer.observe(ph);
        return true;
      }
    });
    if (
      observed.length === adUnits.length ||
      !waitForIt ||
      auctionDelay <= 0
    ) {
      return;
    }
    checkTimeoutId = setTimeout(findAndObservePlaceholders);
  }
  function observerCallback(entries) {
    let entry = entries.pop();
    while (entry) {
      const target = entry.target;
      const id = target.getAttribute('id');
      if (id) {
        const intersection = intersectionMap[id];
        if (!intersection || intersection.time < entry.time) {
          intersectionMap[id] = {
            'boundingClientRect': cloneRect(entry.boundingClientRect),
            'intersectionRect': cloneRect(entry.intersectionRect),
            'rootRect': cloneRect(entry.rootRect),
            'intersectionRatio': entry.intersectionRatio,
            'isIntersecting': entry.isIntersecting,
            'time': entry.time
          };
          if (adUnits.every(unit => !!intersectionMap[unit.code])) {
            complete();
          }
        }
      }
      entry = entries.pop();
    }
  }
  function complete() {
    if (done) return;
    if (checkTimeoutId) clearTimeout(checkTimeoutId);
    done = true;
    checkTimeoutId = null;
    observer && observer.disconnect();
    adUnits && adUnits.forEach((unit) => {
      const intersection = intersectionMap[unit.code];
      if (intersection && unit.bids) {
        unit.bids.forEach(bid => bid.intersection = intersection);
      }
    });
    onDone();
  }
}
function init(moduleConfig) {
  if (!isFn(window.IntersectionObserver)) {
    logError('IntersectionObserver is not defined');
    observerAvailable = false;
  } else {
    observerAvailable = true;
  }
  return observerAvailable;
}
function cloneRect(rect) {
  return rect ? {
    'left': rect.left,
    'top': rect.top,
    'right': rect.right,
    'bottom': rect.bottom,
    'width': rect.width,
    'height': rect.height,
    'x': rect.x,
    'y': rect.y,
  } : rect;
}
export const intersectionSubmodule = {
  name: 'intersection',
  getBidRequestData: getIntersectionData,
  init: init,
};
function registerSubModule() {
  submodule('realTimeData', intersectionSubmodule);
}
registerSubModule();
