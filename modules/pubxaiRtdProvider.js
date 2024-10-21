import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import { submodule } from '../src/hook.js';
import { deepAccess } from '../src/utils.js';
/**
 * This RTD module has a dependency on the priceFloors module.
 * We utilize the createFloorsDataForAuction function from the priceFloors module to incorporate price floors data into the current auction.
 */
import { createFloorsDataForAuction } from './priceFloors.js'; // eslint-disable-line prebid/validate-imports

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'pubxai';
window.__pubxFloorRulesPromise__ = null;
export const FloorsApiStatus = Object.freeze({
  IN_PROGRESS: 'IN_PROGRESS',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
});
export const FLOORS_EVENT_HANDLE = 'floorsApi';
export const FLOORS_END_POINT = 'https://floor.pbxai.com/';
export const FLOOR_PROVIDER = 'PubxFloorProvider';

export const getFloorsConfig = (provider, floorsResponse) => {
  const floorsConfig = {
    floors: {
      enforcement: { floorDeals: true },
      data: floorsResponse,
    },
  };
  const { floorMin, enforcement } = deepAccess(provider, 'params');
  if (floorMin) {
    floorsConfig.floors.floorMin = floorMin;
  }
  if (enforcement) {
    floorsConfig.floors.enforcement = enforcement;
  }
  return floorsConfig;
};

export const setFloorsConfig = (provider, data) => {
  if (data) {
    const floorsConfig = getFloorsConfig(provider, data);
    config.setConfig(floorsConfig);
    window.__pubxLoaded__ = true;
    window.__pubxFloorsConfig__ = floorsConfig;
  } else {
    config.setConfig({ floors: window.__pubxPrevFloorsConfig__ });
    window.__pubxLoaded__ = false;
    window.__pubxFloorsConfig__ = null;
  }
};

export const setDefaultPriceFloors = (provider) => {
  const { data } = deepAccess(provider, 'params');
  if (data !== undefined) {
    data.floorProvider = FLOOR_PROVIDER;
    setFloorsConfig(provider, data);
  }
};

export const setPriceFloors = async (provider) => {
  window.__pubxPrevFloorsConfig__ = config.getConfig('floors');
  setDefaultPriceFloors(provider);
  return fetchFloorRules(provider)
    .then((floorsResponse) => {
      setFloorsConfig(provider, floorsResponse);
      setFloorsApiStatus(FloorsApiStatus.SUCCESS);
    })
    .catch((_) => {
      setFloorsApiStatus(FloorsApiStatus.ERROR);
    });
};

export const setFloorsApiStatus = (status) => {
  window.__pubxFloorsApiStatus__ = status;
  window.dispatchEvent(
    new CustomEvent(FLOORS_EVENT_HANDLE, { detail: { status } })
  );
};

export const getUrl = (provider) => {
  const { pubxId, endpoint } = deepAccess(provider, 'params');
  return `${endpoint || FLOORS_END_POINT}?pubxId=${pubxId}&page=${
    window.location.href
  }`;
};

export const fetchFloorRules = async (provider) => {
  return new Promise((resolve, reject) => {
    setFloorsApiStatus(FloorsApiStatus.IN_PROGRESS);
    ajax(getUrl(provider), {
      success: (responseText, response) => {
        try {
          if (response && response.response) {
            const floorsResponse = JSON.parse(response.response);
            resolve(floorsResponse);
          } else {
            resolve(null);
          }
        } catch (error) {
          reject(error);
        }
      },
      error: (responseText, response) => {
        reject(response);
      },
    });
  });
};

const init = (provider) => {
  window.__pubxFloorRulesPromise__ = setPriceFloors(provider);
  return true;
};

const getBidRequestData = (() => {
  let floorsAttached = false;
  return (reqBidsConfigObj, onDone) => {
    if (!floorsAttached) {
      createFloorsDataForAuction(
        reqBidsConfigObj.adUnits,
        reqBidsConfigObj.auctionId
      );
      window.__pubxFloorRulesPromise__.then(() => {
        createFloorsDataForAuction(
          reqBidsConfigObj.adUnits,
          reqBidsConfigObj.auctionId
        );
        onDone();
      });
      floorsAttached = true;
    }
  };
})();

export const pubxaiSubmodule = {
  name: SUBMODULE_NAME,
  init,
  getBidRequestData,
};

export const beforeInit = () => {
  submodule(MODULE_NAME, pubxaiSubmodule);
};

beforeInit();
