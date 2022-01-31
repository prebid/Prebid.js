import { logMessage } from '../src/utils.js';
import { uspDataHandler } from '../src/adapterManager.js';
import { submodule } from '../src/hook.js';
import * as ajax from '../src/ajax.js'

export const graphUrl = 'https://rtga.tapad.com/v1/graph';

export const tapadIdSubmodule = {
  name: 'tapadId',
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @returns {{tapadId: string} | undefined}
   */
  decode(id) {
    return { tapadId: id };
  },
  /*
   * @function
   * @summary initiate Real Time Graph
   * @param {SubmoduleParams} [configParams]
   * @param {ConsentData} [consentData]
   * @returns {IdResponse }}
   */
  getId(config) {
    const uspData = uspDataHandler.getConsentData();
    if (uspData && uspData !== '1---') {
      return { id: undefined };
    }
    const configParams = config.params || {};

    if (configParams.companyId == null || isNaN(Number(configParams.companyId))) {
      logMessage('Please provide a valid Company Id. Contact prebid@tapad.com for assistance.');
    }

    return {
      callback: (complete) => {
        ajax.ajaxBuilder(10000)(
          `${graphUrl}?company_id=${configParams.companyId}&tapad_id_type=TAPAD_ID`,
          {
            success: (response) => {
              const responseJson = JSON.parse(response);
              if (responseJson.hasOwnProperty('tapadId')) {
                complete(responseJson.tapadId);
              }
            },
            error: (_, e) => {
              if (e.status === 404) {
                complete(undefined);
              }
              if (e.status === 403) {
                logMessage('Invalid Company Id. Contact prebid@tapad.com for assistance.');
              }
            }
          }
        );
      }
    }
  }
}
submodule('userId', tapadIdSubmodule);
