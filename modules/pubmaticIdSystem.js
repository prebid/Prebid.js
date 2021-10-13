import { logError, getWindowLocation } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';

const MODULE_NAME = 'pubmaticId';

export const dmdIdSubmodule = {
	name: MODULE_NAME,

	decode(value) {
	    return value && typeof value === 'string'
	      ? { 'pubmaticId': value }
	      : undefined;
	},

	getId(config, consentData, cacheIdObj) {
	    const configParams = (config && config.params) || {};
	    
	    if (
	      !configParams ||
	      !configParams.api_key ||
	      typeof configParams.api_key !== 'string'
	    ) {
	      logError('dmd submodule requires an api_key.');
	      return;
	    }

	    // If cahceIdObj is null or undefined - calling AIX-API
	    if (cacheIdObj) {
	      return cacheIdObj;
	    } else {
	      const url = `https://image6.pubmatic.com/UCookieSetPug?oid=2&`;
	      // Setting headers	      
	      const headers = {};
	      headers['x-api-key'] = configParams.api_key;
	      headers['x-domain'] = getWindowLocation();

	      // Response callbacks
	      const resp = function (callback) {
	        const callbacks = {
	          success: response => {
	            let responseObj;
	            let responseId;
	            try {
	              responseObj = JSON.parse(response);
	              if (responseObj && responseObj.id) {
	                responseId = responseObj.id;
	              }
	            } catch (error) {
	              logError(error);
	            }
	            callback(responseId);
	          },
	          error: error => {
	            logError(`${MODULE_NAME}: ID fetch encountered an error`, error);
	            callback();
	          }
	        };
	        ajax(url, callbacks, undefined, { method: 'GET', withCredentials: true, customHeaders: headers });
	      };
	      return { callback: resp };
	    }
	}
};

submodule('userId', dmdIdSubmodule);