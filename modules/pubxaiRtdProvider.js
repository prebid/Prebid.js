import { ajax } from "../src/ajax.js";
import { config } from "../src/config.js";
import { submodule } from "../src/hook.js";
import { deepAccess } from "../src/utils.js";
import { createFloorsDataForAuction } from "./priceFloors.js";

const MODULE_NAME = "realTimeData";
const SUBMODULE_NAME = "pubxai";
let floorRulesPromise = null;
const FloorsApiStatus = Object.freeze({
  IN_PROGRESS: "IN_PROGRESS",
  SUCCESS: "SUCCESS",
  ERROR: "ERROR",
});
const FLOORS_EVENT_HANDLE = "floorsApi";

export const getFloorsConfig = (provider, floorsResponse) => {
  console.log("pubx", "getFloorsConfig called");
  const floorsConfig = {
    floors: {
      enforcement: { floorDeals: true },
      data: floorsResponse,
    },
  };
  const { floorMin, enforcement } = deepAccess(provider, "params");
  if (floorMin) {
    floorsConfig.floors.floorMin = floorMin;
  }
  if (enforcement) {
    floorsConfig.floors.enforcement = enforcement;
  }
  return floorsConfig;
};

export const setFloorsConfig = (provider, data) => {
  console.log("pubx", "setFloorsConfig called");
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
  console.log("pubx", "loaded", window.__pubxLoaded__);
  console.log("pubx", "floors config", window.__pubxFloorsConfig__);
};

export const setDefaultPriceFloors = (provider) => {
  console.log("pubx", "setDefaultFloorsConfig called");
  const data = deepAccess(provider, "params.data");
  setFloorsConfig(provider, data);
};

export const setPriceFloors = async (provider) => {
  console.log("pubx", "setPriceFloors called");
  window.__pubxPrevFloorsConfig__ = config.getConfig("floors");
  setDefaultPriceFloors(provider);
  return fetchFloorRules(provider)
    .then((floorsResponse) => {
      setFloorsConfig(provider, floorsResponse);
      setFloorsApiStatus(FloorsApiStatus.SUCCESS);
    })
    .catch((error) => {
      setFloorsApiStatus(FloorsApiStatus.ERROR);
    });
};

const setFloorsApiStatus = (status) => {
  window.__pubxFloorsApiStatus__ = status;
  console.log("pubx", "api status set to", status);
  window.dispatchEvent(
    new CustomEvent(FLOORS_EVENT_HANDLE, { detail: { status } })
  );
};

export const fetchFloorRules = async (provider) => {
  const url = deepAccess(provider, "params.endpoint");
  console.log("pubx", "fetchFloorRules called", url);
  return new Promise((resolve, reject) => {
    console.log("pubx", "initiate ajax call");
    setFloorsApiStatus(FloorsApiStatus.IN_PROGRESS);
    // When the api call exceeds auctionDelay, the api call doesn't fail but the auction starts.
    // TODO: do we want to introduce a timeout for the api call?
    ajax(url, {
      success: (responseText, response) => {
        console.log("pubx", "success response", response);
        console.log("pubx", "success responseText", responseText);
        try {
          if (response && response.response) {
            // "content-type" = 'text/plain; charset=utf-8'
            const floorsResponse = JSON.parse(response.response);
            console.log("pubx", "success floorsResponse", floorsResponse);
            resolve(floorsResponse);
          } else {
            resolve(null);
          }
        } catch (error) {
          console.log("pubx", "error parsing success response", error);
          reject(error);
        }
      },
      error: (responseText, response) => {
        console.log("pubx", "ajax error response", response);
        reject(response);
      },
    });
  });
};

const init = (provider) => {
  console.log("pubx", "init called");
  const useRtd = deepAccess(provider, "params.useRtd");
  if (!useRtd) {
    return false;
  }
  floorRulesPromise = setPriceFloors(provider);
  return true;
};

// TODO: is this called before every auction of before every bid request? Is it okay if it runs only once?
const getBidRequestData = (() => {
  let floorsAttached = false;
  return (reqBidsConfigObj, onDone, config) => {
    if (!floorsAttached) {
      console.log("pubx", "getBidRequestData called", config);
      createFloorsDataForAuction(
        reqBidsConfigObj.adUnits,
        reqBidsConfigObj.auctionId
      );
      floorRulesPromise.then(() => {
        createFloorsDataForAuction(
          reqBidsConfigObj.adUnits,
          reqBidsConfigObj.auctionId
        );
        // const myCustomData = {
        //   pubxData: "myCustomData",
        // };
        // mergeDeep(reqBidsConfigObj.ortb2Fragments.global, myCustomData);
        // reqBidsConfigObj.adUnits.forEach((adUnit) =>
        //   mergeDeep(adUnit, "ortb2Imp.ext.bids", myCustomData)
        // );
        // reqBidsConfigObj.adUnits.forEach((adUnit) =>
        //   adUnit.bids.forEach((bid) =>
        //     mergeDeep(bid.floorData, {
        //       skipRate: 50,
        //       modelVersion: "server 274",
        //     })
        //   )
        // );
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
console.log("pubx.ai:", "pubxaiRtdProvider module loaded");
