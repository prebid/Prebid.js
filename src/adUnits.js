import { deepAccess } from './utils';

let adUnits = {};

function incrementCounter(adunit) {
  adUnits[adunit] = adUnits[adunit] || {};
  adUnits[adunit].counter = (deepAccess(adUnits, `${adunit}.counter`) + 1) || 1;
  return adUnits[adunit].counter;
}

function getCounter(adunit) {
  return deepAccess(adUnits, `${adunit}.counter`) || 0;
}

exports.adunitCounter = {
  incrementCounter,
  getCounter
}
