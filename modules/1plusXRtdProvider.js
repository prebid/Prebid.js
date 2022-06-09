import { submodule } from '../src/hook.js'
import { logMessage } from '../src/utils.js';

// Constants
const REAL_TIME_MODULE = 'realTimeData'
const MODULE_NAME = '1plusX'

// Functions
const getBidRequestDataAsync = (reqBidsConfigObj, config, userConsent) => {
  // We don't
  // Maybe treat the case where we already have the audiences & segments in local storage
  // Get the required config
  // Call PAPI
  // -- Then :
  // ---- extract relevant data
  // ---- set the data to the bid
  // -- Catch : print err & do nothing
}

// Functions exported in submodule object
const init = (config, userConsent) => {
  // We prolly get the config again in getBidRequestData
  return true;
}

const getBidRequestData = (reqBidsConfigObj, callback, config, userConsent) => {
  getBidRequestDataAsync(reqBidsConfigObj, config, userConsent)
    .then(() => callback())
    .catch((err) => {
      logMessage(err);
      callback();
    })
}

// The RTD submodule object to be exported
export const onePlusXSubmodule = {
  name: MODULE_NAME,
  init,
  getBidRequestData
}

// Register the onePlusXSubmodule as submodule of realTimeData
submodule(REAL_TIME_MODULE, MODULE_NAME);
