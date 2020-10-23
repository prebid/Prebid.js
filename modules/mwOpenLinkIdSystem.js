/**
 * This module adds Parrable to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/mwOpenLinkIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

var openLinkID = {
  name: 'mwolid',
  cookie_expiration: (86400 * 1000 * 365 * 3),
  value: ''
}

const storage = getStorageManager();

function getExpirationDate() {
  const oneYearFromNow = new Date(utils.timestamp() + openLinkID.cookie_expiration);
  return oneYearFromNow.toGMTString();
}

function isValidConfig(configParams) {
    if (!configParams) {
      utils.logError('User ID - mwOlId submodule requires configParams');
      return false;
    }
    if (!configParams.account_id) {
      utils.logError('User ID - mwOlId submodule requires account Id to be defined');
      return false;
    }
    if (!configParams.partner_id) {
      utils.logError('User ID - mwOlId submodule requires partner Id to be defined');
      return false;
    }
    if (configParams.storage) {
      utils.logWarn('User ID - mwOlId submodule does not require a storage config');
    }
    return true;
  }

  function readCookie() {
    const mwOlIdStr = storage.getCookie(openLinkID.name);
    if (mwOlIdStr) {
      return deserializemwOlId(decodeURIComponent(mwOlIdStr));
    }
    return null;
  }
  
  function writeCookie(mwOlId) {
    if (mwOlId) {
      const mwOlIdStr = encodeURIComponent(serializemwOlId(mwOlId));
      storage.setCookie(openLinkID.name, mwOlIdStr, getExpirationDate(), 'lax');
    }
  }


  /* MW */
 
async function generateUUID() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = (performance && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

async function localStorageSupported(){
    try {
      var item = 1;
          localStorage.setItem(item, item);
          localStorage.removeItem(item);
          return true;
        } catch(e) {
          return false;
      }
  }

async function readLocalStorage(name){
    var localStorageItem = localStorage.getItem(name);
    return (localStorageItem != "undefined") ? localStorageItem : '';
}

async function confirmID(){
    openLinkID.value = await readCookie(openLinkID.name) || '';
    if(typeof openLinkID.value != "undefined" && 
        openLinkID.value !== null &&
        openLinkID.value.length > 0){
    }else{
        openLinkID.value = (await localStorageSupported() == true) ? await readLocalStorage(openLinkID.name): openLinkID.value;
    }
    if(typeof openLinkID.value != "undefined" && 
        openLinkID.value !== null &&
        openLinkID.value.length > 0){
    }
    else{
        openLinkID.value = await generateUUID();
        register(oild);   
    }
    return openLinkID.value;
}

async function register(olid){
  var account_id = (configParams.account_id != "undefined") ? configParams.account_id : '';
  var partner_id = (configParams.partner_id != "undefined") ? configParams.partner_id : '';
  var uid = (configParams.uid != "undefined") ? configParams.uid : '';
  var url = 'https://ol.mediawallahscript.com/?account_id=' + account_id +
            '&partner_id=' + partner_id +
            '&uid=' + uid +  
            '&olid=' + olid +
            '&cb=' +  Math.random() 
            ;
    ajax(url);
}


async function setID(){
  var olid = await confirmID();
  
  if(localStorageSupported){
      localStorage.setItem(openLinkID.name, olid);
  }
  writeCookie(olid);
  return olid;
    
}

  /* End MW */
  
  /** @type {Submodule} */
export const mwOpenLinkSubModule = {
    /**
     * used to link submodule with config
     * @type {string}
     */
    name: 'mwOlId',
    /**
     * decode the stored id value for passing to bid requests
     * @function
     * @param {MwOlId} mwOlId
     * @return {(Object|undefined}
     */
    decode(mwOlId) {
      if (mwOlId && utils.isPlainObject(mwOlId)) {
        return { mwOlId };
      }
      return undefined;
    },
  
    /**
     * performs action to obtain id and return a value in the callback's response argument
     * @function
     * @param {SubmoduleParams} [configParams]
     * @param {ConsentData} [consentData]
     * @returns {function(callback:function), id:MwOlId}
     */
    getId(configParams, consentData, currentStoredId) {
      if (!isValidConfig(configParams)) return;
      const hasGdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
      const gdprConsentString = hasGdpr ? consentData.consentString : '';
      // use protocol relative urls for http or https
      if (hasGdpr && (!gdprConsentString || gdprConsentString === '')) {
      utils.logInfo('Consent string is required to generate or retrieve ID.');
      return;
      }
      return await setID(configParams);
    }
  };
  
  submodule('userId', mwOpenLinkSubModule);