/**
 * This module adds flocId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/flocId
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import {submodule} from '../src/hook.js'

const MODULE_NAME = 'originFloc';

/**
 * Encode the id
 * @param value
 * @returns {string|*}
 */
function encodeId(value) {
  const result = {};
  if (value) {
    const bidIds = {
      id: value
    }
    result.flocId = bidIds;
    utils.logInfo('Decoded value ' + JSON.stringify(result));
    return result;
  }
  return undefined;
}

/** @type {Submodule} */
export const flocIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{flocId:{ id: string }} or undefined if value doesn't exists
   */
  decode(value) {
    return (value) ? encodeId(value) : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    const configParams = (config && config.params) || {};
    if (!configParams || (typeof configParams.token !== 'string')) {
      utils.logError('User ID - flocId submodule requires token to be defined');
      return;
    }
    return {id: configParams.token}
  }
};

submodule('userId', flocIdSubmodule);
