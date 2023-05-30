import {submodule} from '../src/hook.js';
import {isFn, logError, pick, cleanObj} from '../src/utils.js';
import {config} from '../src/config.js';
import {getGlobal} from '../src/prebidGlobal.js';
import '../src/adapterManager.js';

let permissionsAvailable = true;
let geolocation;
function getGeolocationData(requestBidsObject, onDone, providerConfig, userConsent) {
  let done = false;
  if (!permissionsAvailable) return complete();
  const requestPermission = providerConfig.requestPermission === true;
  const waitForIt = providerConfig.waitForIt;
  const auctionDelay = config.getConfig('realTimeData.auctionDelay') || 0;
  const adUnits = requestBidsObject.adUnits || getGlobal().adUnits || [];
  navigator.permissions.query({
    name: 'geolocation',
  }).then(permission => {
    if (permission.state !== 'granted' && !requestPermission) return complete();
    navigator.geolocation.getCurrentPosition(geo => {
      geolocation = pick(geo.coords, [
        'accuracy',
        'altitude',
        'altitudeAccuracy',
        'heading',
        'latitude',
        'longitude',
        'speed'
      ]);
      complete();
    });
  });
  if (auctionDelay > 0) {
    setTimeout(complete, auctionDelay);
  }
  if (!waitForIt) complete();
  function complete() {
    if (done) return;
    done = true;
    geolocation && adUnits && adUnits.forEach((unit) => {
      unit.bids && unit.bids.forEach(bid => bid.geolocation = cleanObj(geolocation));
    });
    onDone();
  }
}
function init(moduleConfig) {
  geolocation = void 0;
  if (!isFn(navigator?.permissions?.query) || !isFn(navigator?.geolocation?.getCurrentPosition)) {
    logError('geolocation is not defined');
    permissionsAvailable = false;
  } else {
    permissionsAvailable = true;
  }
  return permissionsAvailable;
}
export const geolocationSubmodule = {
  name: 'geolocation',
  getBidRequestData: getGeolocationData,
  init: init,
};
function registerSubModule() {
  submodule('realTimeData', geolocationSubmodule);
}
registerSubModule();
