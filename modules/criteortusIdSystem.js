/**
 * This module adds Criteo Real Time User Sync to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/criteortusIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils'
import { ajax } from '../src/ajax';
import { submodule } from '../src/hook';

const key = '__pbjs_criteo_rtus';

/** @type {Submodule} */
export const criteortusIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'criteortus',
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @returns {{criteortus:Object}}
   */
  decode() {
    let uid = utils.getCookie(key);
    try {
      uid = JSON.parse(uid);
      return { 'criteortus': uid };
    } catch (error) {
      utils.logError('Error in parsing criteo rtus data', error);
    }
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleParams} [configParams]
   * @returns {function(callback:function)}
   */
  getId(configParams) {
    if (!configParams || !utils.isPlainObject(configParams.clientIdentifier)) {
      utils.logError('User ID - Criteo rtus requires client identifier to be defined');
      return;
    }

    let uid = utils.getCookie(key);
    if (uid) {
      return uid;
    } else {
      let userIds = {};
      return function(callback) {
        let bidders = Object.keys(configParams.clientIdentifier);

        function afterAllResponses() {
          // criteo rtus user id expires in 1 hour
          const expiresStr = (new Date(Date.now() + (60 * 60 * 1000))).toUTCString();
          utils.setCookie(key, JSON.stringify(userIds), expiresStr);
          callback(userIds);
        }

        const onResponse = utils.delayExecution(afterAllResponses, bidders.length);

        bidders.forEach((bidder) => {
          let url = `https://gum.criteo.com/sync?c=${configParams.clientIdentifier[bidder]}&r=3`;
          const getSuccessHandler = (bidder) => {
            return function onSuccess(response) {
              if (response) {
                try {
                  response = JSON.parse(response);
                  userIds[bidder] = response;
                  onResponse();
                } catch (error) {
                  utils.logError(error);
                }
              }
            }
          }

          const getFailureHandler = (bidder) => {
            return function onFailure(error) {
              utils.logError(`Criteo RTUS server call failed for ${bidder}`, error);
              onResponse();
            }
          }

          ajax(
            url,
            {
              success: getSuccessHandler(bidder),
              error: getFailureHandler(bidder)
            },
            undefined,
            Object.assign({
              method: 'GET',
              withCredentials: true
            })
          );
        })
      }
    }
  }
};

submodule('userId', criteortusIdSubmodule);
