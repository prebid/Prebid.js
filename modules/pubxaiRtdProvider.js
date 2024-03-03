import { ajax } from "../src/ajax.js";
import { config } from "../src/config.js";
import { submodule } from "../src/hook.js";
import { deepAccess } from "../src/utils.js";

const MODULE_NAME = "realTimeData";
const SUBMODULE_NAME = "pubxai";

const getFloorsConfig = (provider, floorsResponse) => {
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

// TODO: how to set prebid auctionDelay?

const setDefaultConfig = (provider) => {
  const { data } = deepAccess(provider, "params");
  const floorsConfig = getFloorsConfig(provider, data);
  config.setConfig(floorsConfig);
  console.log("pubx: setting default floors config", floorsConfig);
  window.__pubxLoaded__ = true;
  console.log("pubx", "loaded", window.__pubxLoaded__);
};

const setConfig = (provider, floorsResponse) => {
  const floorsConfig = getFloorsConfig(provider, floorsResponse);
  config.setConfig(floorsConfig);
  console.log("pubx: setting floors config", floorsConfig);
  window.__pubxLoaded__ = true;
};

const setFloorsConfig = async (provider) => {
  const url = deepAccess(provider, "params.endpoint");
  console.log("pubx", "endpoint", url);
  // TODO: set API timeout?
  ajax(url, {
    success: (responseText, response) => {
      console.log("pubx", "success response", response);
      console.log("pubx", "success responseText", responseText);
      try {
        if (responseText) {
          // "content-type" is 'text/plain; charset=utf-8'
          const floorsResponse = JSON.parse(response.response);
          console.log("pubx", "success floorsResponse", floorsResponse);
          setConfig(provider, floorsResponse);
        } else {
          window.__pubxLoaded__ = false;
        }
        console.log("pubx", "loaded", window.__pubxLoaded__);
      } catch (error) {
        console.log("pubx", "error parsing response", error);
        setDefaultConfig(provider);
        // TODO: Wrong JSON response from server (unlikely). Do we want to log this in instrumentation?
      }
    },
    error: (responseText, response) => {
      // TODO: timeout or error. Do we want to log this in instrumentation?
      // TODO: default value here?
      console.log("pubx", "error response", response);
      setDefaultConfig(provider);
    },
  });
};

const init = (provider) => {
  const useRtd = deepAccess(provider, "params.useRtd");
  if (!useRtd) {
    return false;
  }
  setFloorsConfig(provider);
  return true;
};

export const pubxaiSubmodule = {
  name: SUBMODULE_NAME,
  init,
};

export const beforeInit = () => {
  submodule(MODULE_NAME, pubxaiSubmodule);
};

beforeInit();
console.log("pubx.ai:", "pubxaiRtdProvider module loaded");
