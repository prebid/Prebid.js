/**
 * This module adds BritePoolId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/unifiedIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../../src/utils'
import {ajax} from '../../src/ajax';

/** @type {Submodule} */
export const britepoolIdSubmodule = {
  /**
   * Used to link submodule with config
   * @type {string}
   */
  name: 'britepoolId',
  /**
   * Decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{britepoolid:string}}
   */
  decode(value) {
    return {
      'britepoolid': value['primaryBPID']
    }
  },
  /**
   * Performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleParams} [configParams]
   * @returns {function(callback:function)}
   */
  getId(submoduleConfigParams, consentData) {
    const { params, headers, url, getter, errors } = britepoolIdSubmodule.createParams(submoduleConfigParams, consentData);
    let getterResponse = null;
    if (typeof getter === 'function') {
      getterResponse = getter(params);
      // First let's rule out that the response is not a Promise
      if (!(typeof getterResponse === 'object' && typeof getterResponse.then === 'function')) {
        // Optimization to return value from getter
        return britepoolIdSubmodule.normalizeValue(getterResponse);
      }
    }
    // Return for async operation
    return function(callback) {
      if (errors.length > 0) {
        errors.forEach(error => utils.logError(error));
        callback();
        return;
      }
      if (getterResponse) {
        // Resolve the getter function response
        Promise.resolve(getterResponse).then(response => {
          callback(britepoolIdSubmodule.normalizeValue(response));
        }).catch(error => {
          if (error !== '') utils.logError(error);
          callback();
        });
      } else {
        ajax(url, {
          success: response => {
            const responseObj = britepoolIdSubmodule.normalizeValue(response);
            callback(responseObj ? { primaryBPID: responseObj.primaryBPID } : null);
          },
          error: error => {
            if (error !== '') utils.logError(error);
            callback();
          }
        }, JSON.stringify(params), { customHeaders: headers, contentType: 'application/json', method: 'POST' });
      }
    }
  },
  /**
   * Helper method to create params for our API call
   * @param {SubmoduleParams} [configParams]
   * @returns {object} Object with parsed out params
   */
  createParams(submoduleConfigParams, consentData) {
    let errors = [];
    const headers = {};
    let params = Object.assign({}, submoduleConfigParams);
    if (params.getter) {
      // Custom getter will not require other params
      if (typeof params.getter !== 'function') {
        errors.push(`${MODULE_NAME} - britepoolId submodule requires getter to be a function`);
        return { errors };
      }
    } else {
      if (typeof params.api_key !== 'string' || Object.keys(params).length < 2) {
        errors.push('User ID - britepoolId submodule requires api_key and at least one identifier to be defined');
        return { errors };
      }
      // Add x-api-key into the header
      headers['x-api-key'] = params.api_key;
    }
    const url = params.url || 'https://api.britepool.com/v1/britepool/id';
    const getter = params.getter;
    delete params.api_key;
    delete params.url;
    delete params.getter;
    return {
      params,
      headers,
      url,
      getter,
      errors
    };
  },
  /**
   * Helper method to normalize a JSON value
   */
  normalizeValue(value) {
    let valueObj = null;
    if (typeof value === 'object') {
      valueObj = value;
    } else if (typeof value === 'string') {
      try {
        valueObj = JSON.parse(value);
      } catch (error) {
        utils.logError(error);
      }
    }
    return valueObj;
  }
};
