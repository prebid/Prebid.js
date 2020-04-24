/**
 * This module adds pubDirect to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/unifiedIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js';

function parseData(networkCode, segments) {
  if (segments && networkCode) {
    const userId = JSON.parse(localStorage.getItem('pubId'));
    const url = `https://api.staging.pub.direct/aud-xchg/v1/sync/${networkCode}/${userId.ID}`;
    ajax(url, undefined, JSON.stringify(segments), undefined);
  }
}
/** @type {Submodule} */
export const pubDirectSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'pubDirect',
  /**
   * decode the stored id value for passing to bid requests
   * @function decode
   * @param {(Object|string)} value
   * @returns {(Object|undefined)}
   */
  decode(value, config) {
    if (!config) {
      parseData(config.params.publisherId, config.params.segments);
    }
    return (value && typeof value['PUBDIRECTID'] === 'string') ? { 'pubDirectId': value['PUBDIRECTID'] } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleParams} [configParams]
   * @param {ConsentData} [consentData]
   * @param {(Object|undefined)} cacheIdObj
   * @returns {IdResponse|undefined}
   */
  getId(configParams, consentData, cacheIdObj) {
    if (!configParams) {
      utils.logError(`Pubdirect params missing.`);
      return undefined;
    }
    // pubdirect ID logic
    var siteIdValue = {
      ID: '',
      timestamp: null,
      origin: '',
      DoNotTrack: false,
    };
    var iframeCreated = false;
    var incomingUserId = '';
    var receiver = {};
    var consent = true;
    var doNotTrackUser = false;

    window.addEventListener('message', msgFiltering);

    var userRandomId = {
      ID: IDGenerator(),
      timestamp: new Date().getTime(),
      origin: '',
      DoNotTrack: false,
    };

    function IDGenerator() {
      var array = new Uint32Array(8);
      window.crypto.getRandomValues(array);
      var str = '';
      for (var i = 0; i < array.length; i++) {
        str += (i < 2 || i > 5 ? '' : '-') + array[i].toString(16).slice(-4);
      }
      return str;
    }

    function ifLoaded() {
      if (consent === true) {
        if (doNotTrackUser === true) {
          messageHub('doNotTrackUser', parseData);
        }
        // Get the window displayed in the iframe.
        if (iframeCreated === false) {
          messageHub('self', parseData);
        } else if (iframeCreated === true) {
          messageHub(incomingUserId, parseData);
        }
      } else {

      }
    }

    function callModule() {
      if (localStorage.getItem('pubId')) {
        let callValue = localStorage.getItem('pubId');
        callValue = JSON.parse(callValue).ID;
        let callbackObj = {
          'pubDirectId': callValue
        };

        const reply = function (callback) {
          callback(callbackObj)
        }

        return { callback: reply }
      }
    }

    function msgFiltering(e) {
      iframeCreated = true;
      incomingUserId = e;
      if (e.origin !== 'https://pub.direct') {
        return;
      }
      if (iframeCreated === true) {
        var iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.id = 'receiver';
        iframe.src = 'https://pub.direct/sync.html';
        document.body.appendChild(iframe);
        iframe.onload = ifLoaded;
      }
    }

    function messageHub(e, callback) {
      if (e !== undefined && e.data !== 'clear' && e !== 'self' && e !== 'doNotTrackUser' && e.data.timestamp !== undefined) {
        siteIdValue = JSON.parse((localStorage.getItem('pubId')));
        if (siteIdValue.timestamp <= e.data.timestamp) {
          sendMessage(siteIdValue);
        } else {
          localStorage.setItem('pubId', JSON.stringify(e.data));
          callback(configParams.publisherId, configParams.segments);
          callModule();
        }
      } else if (e === 'self') {
        if (localStorage.getItem('pubId')) {
          siteIdValue = JSON.parse(localStorage.getItem('pubId'));
          siteIdValue.origin = window.location.href;
          sendMessage(siteIdValue);
        } else {
          userRandomId.origin = window.location.href;
          localStorage.setItem('pubId', JSON.stringify(userRandomId));
          sendMessage(userRandomId);
        }
      } else if (e.data === 'clear') {
        callback(configParams.publisherId, configParams.segments);
        callModule();
      } else if (e === 'doNotTrackUser') {
        if (localStorage.getItem('pubId')) {
          siteIdValue = JSON.parse(localStorage.getItem('pubId'));
          siteIdValue.origin = window.location.href;
          siteIdValue.DoNotTrack = true;
          sendMessage(siteIdValue);
        } else {
          userRandomId.origin = window.location.href;
          userRandomId.DoNotTrack = true;
          localStorage.setItem('pubId', JSON.stringify(userRandomId));
          sendMessage(userRandomId);
        }
      }
    }

    function sendMessage(e) {
      receiver = document.getElementById('receiver');
      receiver.contentWindow.postMessage(e, 'https://pub.direct/sync.html');
    }

    function init() {
      if (iframeCreated === false) {
        var iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.id = 'receiver';
        iframe.src = 'https://pub.direct/sync.html';
        document.body.appendChild(iframe);
        iframe.onload = ifLoaded;
      }
    }
    init();
  }
};

submodule('userId', pubDirectSubmodule);
