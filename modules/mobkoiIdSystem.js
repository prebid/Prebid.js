/**
 * This module adds mobkoiId support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/mobkoiIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { logError, logInfo, deepAccess, insertUserSyncIframe } from '../src/utils.js';

const GVL_ID = 898;
const MODULE_NAME = 'mobkoiId';
/**
 * The base URL for the mobkoi integration. It should provide the following endpoints:
 * - /pixeliframe
 * - /getPixel
 */
export const PROD_PREBID_JS_INTEGRATION_BASE_URL = 'https://pbjs.mobkoi.com';
export const EQUATIV_BASE_URL = 'https://sync.smartadserver.com';
export const EQUATIV_NETWORK_ID = '5290';

/**
 * The parameters that the publisher defined in the userSync.userIds[].params
 */
const USER_SYNC_PARAMS = {
  /**
   * !IMPORTANT: This value must match the value in mobkoiAnalyticsAdapter.js
   * The name of the parameter that the publisher can use to specify the integration endpoint.
   */
  PARAM_NAME_PREBID_JS_INTEGRATION_ENDPOINT: 'integrationEndpoint',
}

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

export const mobkoiIdSubmodule = {
  name: MODULE_NAME,
  gvlid: GVL_ID,

  decode(value) {
    return value ? { [MODULE_NAME]: value } : undefined;
  },

  getId(userSyncOptions, consentObject) {
    logInfo('Getting Equativ SAS ID.');

    if (!storage.cookiesAreEnabled()) {
      logError('Cookies are not enabled. Module will not work.');
      return {
        id: null
      };
    }

    const storageName = userSyncOptions && userSyncOptions.storage && userSyncOptions.storage.name;
    if (!storageName) {
      logError('Storage name is not defined. Module will not work.');
      return {
        id: null
      };
    }

    const existingId = storage.getCookie(storageName);

    if (existingId) {
      logInfo(`Found "${storageName}" from local cookie: "${existingId}"`);
      return { id: existingId };
    }

    logInfo(`Cannot found "${storageName}" in local cookie with name.`);
    return {
      callback: () => {
        return new Promise((resolve, _reject) => {
          utils.requestEquativSasId(
            userSyncOptions,
            consentObject,
            (sasId) => {
              if (!sasId) {
                logError('Equativ SAS ID is empty');
                resolve({ id: null });
                return;
              }

              logInfo(`Fetched Equativ SAS ID: "${sasId}"`);
              storage.setCookie(storageName, sasId, userSyncOptions.storage.expires);
              logInfo(`Stored Equativ SAS ID in local cookie with name: "${storageName}"`);
              resolve({ id: sasId });
            }
          );
        });
      }
    };
  },
  eids: {
    'mobkoiId': {
      source: 'mobkoi.com',
      atype: 1
    },
  }
};

submodule('userId', mobkoiIdSubmodule);

export const utils = {
  requestEquativSasId(syncUserOptions, consentObject, onCompleteCallback) {
    logInfo('Start requesting Equativ SAS ID');
    const integrationBaseUrl = deepAccess(
      syncUserOptions,
      `params.${USER_SYNC_PARAMS.PARAM_NAME_PREBID_JS_INTEGRATION_ENDPOINT}`) || PROD_PREBID_JS_INTEGRATION_BASE_URL;

    const equativPixelUrl = utils.buildEquativPixelUrl(syncUserOptions, consentObject);
    logInfo('Equativ SAS ID request URL:', equativPixelUrl);

    const url = integrationBaseUrl + '/pixeliframe?' +
      'pixelUrl=' + encodeURIComponent(equativPixelUrl) +
      '&cookieName=sas_uid';

    /**
     * Listen for messages from the iframe with automatic cleanup
     */
    const messageHandler = function(event) {
      switch (event.data.type) {
        case 'MOBKOI_PIXEL_SYNC_COMPLETE':
          const sasUid = event.data.syncData;
          logInfo('Parent window Sync completed. SAS ID:', sasUid);
          window.removeEventListener('message', messageHandler);
          onCompleteCallback(sasUid);
          break;
        case 'MOBKOI_PIXEL_SYNC_ERROR':
          logError('Parent window Sync failed:', event.data.error);
          window.removeEventListener('message', messageHandler);
          onCompleteCallback(null);
          break;
      }
    };

    window.addEventListener('message', messageHandler);

    insertUserSyncIframe(url, () => {
      logInfo('insertUserSyncIframe loaded');
    });

    // Return the URL for testing purposes
    return url;
  },

  /**
   * Build a pixel URL that will be placed in an iframe to fetch the Equativ SAS ID
   */
  buildEquativPixelUrl(syncUserOptions, consentObject) {
    logInfo('Generating Equativ SAS ID request URL');
    const integrationBaseUrl =
      deepAccess(
        syncUserOptions,
        `params.${USER_SYNC_PARAMS.PARAM_NAME_PREBID_JS_INTEGRATION_ENDPOINT}`) || PROD_PREBID_JS_INTEGRATION_BASE_URL;

    const gdprConsentString = consentObject && consentObject.gdpr && consentObject.gdpr.consentString ? consentObject.gdpr.consentString : '';
    const smartServerUrl = EQUATIV_BASE_URL + '/getuid?' +
      `url=` + encodeURIComponent(`${integrationBaseUrl}/getPixel?value=`) + '[sas_uid]' +
      `&gdpr_consent=${gdprConsentString}` +
      `&nwid=${EQUATIV_NETWORK_ID}`;

    return smartServerUrl;
  }
};
