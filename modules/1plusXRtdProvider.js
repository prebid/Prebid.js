import { submodule } from '../src/hook.js'
import { ajax } from '../src/ajax.js'
import { logMessage, logError, deepAccess, isNumber } from '../src/utils.js';

// Constants
const REAL_TIME_MODULE = 'realTimeData';
const MODULE_NAME = '1plusX';
const PAPI_VERSION = 'v1.0';

// Functions
const extractConfig = (config) => {
  // CustomerId
  const customerId = deepAccess(config, 'params.customerId');
  if (!customerId) {
    throw new Error('REQUIRED CUSTOMER ID');
  }
  // Timeout
  const tempTimeout = deepAccess(config, 'params.timeout');
  const timeout = isNumber(tempTimeout) && tempTimeout > 300 ? tempTimeout : 1000;

  return { customerId, timeout };
}

const getPapiUrl = ({ customerId }) => {
  logMessage('GET PAPI URL');
  // https://[yourClientId].profiles.tagger.opecloud.com/[VERSION]/targeting?url=
  const currentUrl = encodeURIComponent(window.location.href);
  const papiUrl = `https://${customerId}.profiles.tagger.opecloud.com/${PAPI_VERSION}/targeting?url=${currentUrl}`;
  return papiUrl;
}

const getTargetingDataFromPapi = (papiUrl) => {
  return new Promise((resolve, reject) => {
    ajax(papiUrl, {
      success(responseText, response) {
        logMessage(responseText);
        resolve(response.response);
      },
      error(errorText, error) {
        console.log(errorText)
        console.log(JSON.stringify(error, null, 2))
        reject(error);
      }
    })
  })
}

// Functions exported in submodule object
const init = (config, userConsent) => {
  // We prolly get the config again in getBidRequestData
  return true;
}

const getBidRequestData = (reqBidsConfigObj, callback, config, userConsent) => {
  try {
    // Get the required config
    const { customerId } = extractConfig(config);
    // Get PAPI URL
    const papiUrl = getPapiUrl({ customerId })
    // Call PAPI
    getTargetingDataFromPapi(papiUrl)
      .then((response) => {
        // -- Then :
        // ---- extract relevant data
        // ---- set the data to the bid
        console.log('REQUEST TO PAPI SUCCESS');
        callback();
      })
      .catch((error) => {
        // -- Catch : print err & do nothing
        console.log('REQUEST TO PAPI ERROR');
        // logError(error);
        callback();
      })
  } catch (error) {
    logError(error);
    callback();
  }
}

// The RTD submodule object to be exported
export const onePlusXSubmodule = {
  name: MODULE_NAME,
  init,
  getBidRequestData
}

// Register the onePlusXSubmodule as submodule of realTimeData
submodule(REAL_TIME_MODULE, MODULE_NAME);
