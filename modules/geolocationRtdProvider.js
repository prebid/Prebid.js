import {submodule} from '../src/hook.js';
import {isFn, logError, pick, cleanObj, deepAccess, deepSetValue} from '../src/utils.js';
// import {config} from '../src/config.js';
import {getGlobal} from '../src/prebidGlobal.js';
// import '../src/adapterManager.js';
import {gppDataHandler} from '../src/adapterManager.js';

let permissionsAvailable = true;
let geolocation;
function getGeolocationData(requestBidsObject, onDone, providerConfig, userConsent) {
  let done = false;
  if (!permissionsAvailable) return complete();
  const requestPermission = deepAccess(providerConfig, 'params.requestPermission') === true;
  logError('RBO', requestBidsObject, gppDataHandler.getConsentData());
  const waitForIt = providerConfig.waitForIt;
  const adUnits = requestBidsObject.adUnits || getGlobal().adUnits || [];
  navigator.permissions.query({
    name: 'geolocation',
  }).then(permission => {
    if (permission.state !== 'granted' && !requestPermission) return complete();
    navigator.geolocation.getCurrentPosition(geo => {
      geolocation = geo;
      complete();
    });
  });
  if (!waitForIt) complete();
  function complete() {
    if (done) return;
    done = true;
    if (geolocation) {
      deepSetValue(requestBidsObject, 'ortb2Fragments.global.device.geo', {
        lat: geolocation.coords.latitude,
        lon: geolocation.coords.longitude,
        lastfix: geolocation.timestamp,
        type: 1
      });
    }
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
