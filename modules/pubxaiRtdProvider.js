import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { deepAccess, logError } from '../src/utils.js';
import { config } from '../src/config.js';
// import { createFloorsDataForAuction, handleSetFloorsConfig } from './priceFloors.js';


const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'pubxai';

function init(provider) {
  const useRtd = deepAccess(provider, 'params.useRtd');
  if (!useRtd) {
    return false;
  }
  return true;
}

function fetchDataFromURL(url) {
  return new Promise((resolve, reject) => {
    const callback = {
      success(responseText, response) {
        resolve(JSON.parse(response.response));
      },
      error(error) {
        reject(error);
      }
    };

    ajax(url, callback);
  })
}

function setDataToConfig(url, reqBidsConfigObj) {
  fetchDataFromURL(url)
    .then(response => {
      console.log('pubx RTD module response', response);
      const floors = {
        floors: {
          enforcement: {
            floorDeals: false, //default to false
            bidAdjustment: true
          },
          data: response
        }
      };
      config.setConfig(floors);
      // createFloorsDataForAuction(reqBidsConfigObj.adUnits, reqBidsConfigObj.auctionId);
      // handleSetFloorsConfig(floors);
      console.log("pubx floors", pbjs.getConfig('floors'));
      window.sessionStorage.setItem('pubxFloors', JSON.stringify(floors));
    })
    .catch(err => {
      logError('pubX API Fetch Error: ', err);
    })
}

function getBidRequestData(reqBidsConfigObj, callback, rtd_config, userConsent) {
  console.log("pubx reqBidsConfigObj", reqBidsConfigObj);
  const endpoint = deepAccess(rtd_config, 'params.endpoint');
  setDataToConfig(endpoint, reqBidsConfigObj);
}

export const pubxaiSubmodule = {
  name: SUBMODULE_NAME,
  init,
  getBidRequestData,
};

export function beforeInit() {
  submodule(MODULE_NAME, pubxaiSubmodule);
}

beforeInit();
