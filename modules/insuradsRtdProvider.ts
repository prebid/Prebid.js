import { submodule } from '../src/hook.js';
import { logInfo } from '../src/utils.js'
import { fetch } from '../src/ajax.js';
import type { RtdProviderSpec } from './rtdModule/spec.ts';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const SERVER_IP = 'https://services.insurads.com';
const MODULE_NAME = 'insuradsRtd';
const ENDPOINT = `${SERVER_IP}/core/init/prebid`;
const LOG_PREFIX = 'insurads Rtd: ';
const GVLID = 596;

// Internal state to store keyValues
let keyValues = {};
let apiCallPromise = Promise.resolve();

declare module './rtdModule/spec.ts' {
  interface ProviderConfig {
    insuradsRtd: {
      params: {
        publicId: string;
        timeout?: number;
      };
    };
  }
}

export const insuradsRtdProvider: RtdProviderSpec<'insuradsRtd'> = {
  name: MODULE_NAME,
  gvlid: GVLID,
  init: (config, userConsent) => {
    const publicId = config?.params?.publicId;

    if (typeof publicId !== 'string' || publicId.trim().length === 0) {
      logInfo(LOG_PREFIX + 'publicId is required and must be a non-empty string');
      return false;
    }

    // Reset keyValues to avoid stale values after failed/empty response
    keyValues = {};

    // Start fetch immediately without blocking init
    apiCallPromise = makeApiCall(publicId);

    logInfo(LOG_PREFIX + 'submodule init', config, userConsent);
    return true;
  },
  getBidRequestData: (reqBidsConfigObj, callback, config, userConsent) => {
    logInfo(LOG_PREFIX + 'submodule getBidRequestData', reqBidsConfigObj, config, userConsent);

    // Wait for API call to complete before enriching bid requests
    const timeout = config?.params?.timeout || 1000; // Default 1 second timeout
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, timeout));

    Promise.race([apiCallPromise, timeoutPromise])
      .then(() => {
        // Enrich bid requests with RTD data for insurads bidder
        if (keyValues && Object.keys(keyValues).length > 0) {
          reqBidsConfigObj.adUnits.forEach(adUnit => {
            adUnit.bids.forEach(bid => {
              if (bid.bidder === 'insurads') {
                // Add RTD data to bid params so it can be accessed by the adapter
                bid.params = bid.params || {};

                (bid.params as any).rtdData = keyValues;
                logInfo(LOG_PREFIX + 'Enriched bid request for insurads', (bid.params as any).rtdData);
              }
            });
          });
        } else {
          logInfo(LOG_PREFIX + 'No keyValues available for bid enrichment');
        }

        callback();
      })
      .catch((_e) => {
        logInfo(LOG_PREFIX + 'Error waiting for API call');
        callback();
      });
  },
};

async function makeApiCall(publicId: string) {
  const currentUrl = encodeURIComponent(location.href);

  try {
    const response = await fetch(`${ENDPOINT}/${publicId}?url=${currentUrl}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      keyValues = {};
      logInfo(LOG_PREFIX + `Network error: ${response.status} ${response.statusText}, cleared cached values`);
      return;
    }
    if (response.status === 204) {
      keyValues = {};
      logInfo(LOG_PREFIX + '204 No Content received, cleared cached values');
      return;
    }

    const data = await response.json();
    if (data && data.keyValues) {
      keyValues = data.keyValues;
      logInfo(LOG_PREFIX + 'Received keyValues from endpoint', data.keyValues);
    } else {
      keyValues = {};
      logInfo(LOG_PREFIX + 'No keyValues in response, cleared cached values');
    }
  } catch (_e) {
    keyValues = {};
    logInfo(LOG_PREFIX + 'API call failed, cleared cached keyValues');
  }
}

function beforeInit() {
  // take actions to get data as soon as possible
  submodule('realTimeData', insuradsRtdProvider);
}

beforeInit();
