import { logMessage } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { qualifiedAjaxBuilder } from '../src/ajax.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

export const graphUrl = 'https://rtga.tapad.com/v1/graph';
const MODULE_NAME = 'tapadId';

export const tapadIdSubmodule = {
  name: MODULE_NAME,
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
  getId(config, consentData) {
    const uspData = consentData?.usp;
    if (uspData && uspData !== '1---') {
      return { id: undefined };
    }
    const configParams = config.params || {};

    if (configParams.companyId === null || configParams.companyId === undefined || isNaN(Number(configParams.companyId))) {
      logMessage('Please provide a valid Company Id. Contact prebid@tapad.com for assistance.');
    }

    return {
      callback: (complete) => {
        qualifiedAjaxBuilder(MODULE_TYPE_UID, MODULE_NAME, 10000)(
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
    };
  },
  eids: {
    'tapadId': {
      source: 'tapad.com',
      atype: 1
    },
  }
};
submodule('userId', tapadIdSubmodule);
