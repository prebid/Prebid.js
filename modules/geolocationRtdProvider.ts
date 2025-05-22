import {submodule} from '../src/hook.js';
import {isFn, logError, deepAccess, deepSetValue, logInfo, logWarn, timestamp} from '../src/utils.js';
import { ACTIVITY_TRANSMIT_PRECISE_GEO } from '../src/activities/activities.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { isActivityAllowed } from '../src/activities/rules.js';
import { activityParams } from '../src/activities/activityParams.js';
import {VENDORLESS_GVLID} from '../src/consentHandler.js';
import type {RtdProviderSpec} from "./rtdModule/spec.ts";

let permissionsAvailable = true;
let geolocation;

declare module './rtdModule/spec' {
    interface ProviderConfig {
        geolocation: {
            params?: {
                /**
                 * If true, request geolocation permissions from the browser.
                 */
                requestPermission?: boolean;
            }
        }
    }
}

export const geolocationSubmodule: RtdProviderSpec<'geolocation'> = {
  name: 'geolocation',
  gvlid: VENDORLESS_GVLID as any,
  getBidRequestData(requestBidsObject, onDone, providerConfig) {
      let done = false;
      if (!permissionsAvailable) {
          logWarn('permission for geolocation receiving was denied');
          return complete()
      }
      if (!isActivityAllowed(ACTIVITY_TRANSMIT_PRECISE_GEO, activityParams(MODULE_TYPE_RTD, 'geolocation'))) {
          logWarn('permission for geolocation receiving was denied by CMP');
          return complete()
      }
      const requestPermission = deepAccess(providerConfig, 'params.requestPermission') === true;
      navigator.permissions.query({
          name: 'geolocation',
      }).then(permission => {
          if (permission.state !== 'granted' && !requestPermission) return complete();
          navigator.geolocation.getCurrentPosition(geo => {
              geolocation = geo;
              complete();
          });
      });
      function complete() {
          if (done) return;
          done = true;
          if (geolocation) {
              deepSetValue(requestBidsObject, 'ortb2Fragments.global.device.geo', {
                  lat: geolocation.coords.latitude,
                  lon: geolocation.coords.longitude,
                  lastfix: Math.round((timestamp() - geolocation.timestamp) / 1000),
                  type: 1
              });
              logInfo('geolocation was successfully received ', requestBidsObject.ortb2Fragments.global.device.geo)
          }
          onDone();
      }
  },
  init() {
      geolocation = void 0;
      if (!isFn(navigator?.permissions?.query) || !isFn(navigator?.geolocation?.getCurrentPosition || !navigator?.permissions?.query)) {
          logError('geolocation is not defined');
          permissionsAvailable = false;
      } else {
          permissionsAvailable = true;
      }
      return permissionsAvailable;
  }
};

function registerSubModule() {
  submodule('realTimeData', geolocationSubmodule);
}
registerSubModule();
