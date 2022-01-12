import { config } from '../src/config.js';
import { isGptPubadsDefined, isFn } from '../src/utils.js';
import * as ajax from '../src/ajax.js'
import strIncludes from 'core-js-pure/features/string/includes.js';

export const MODULE_NAME = 'Yieldmo Synthetic Inventory Module';
export const AD_SERVER_ENDPOINT = 'https://ads.yieldmo.com/v002/t_ads/ads';
const USPAPI_VERSION = 1;

let cmpVersion = 0;
let cmpResolved = false;

export function init(config) {
  checkSandbox(window);
  validateConfig(config);

  const consentData = () => {
    const consentDataObj = {};
    return (api, result) => {
      consentDataObj[api] = result;
      if ('cmp' in consentDataObj && 'usp' in consentDataObj) {
        if (!isGptPubadsDefined()) {
          window.top.googletag = window.top.googletag || {};
          window.top.googletag.cmd = window.top.googletag.cmd || [];
        }
        ajax.ajaxBuilder()(`${AD_SERVER_ENDPOINT}?${serialize(collectData(config.placementId, consentDataObj))}`, {
          success: (responceText, responseObj) => {
            window.top.__ymAds = processResponse(responseObj);
            const googletag = window.top.googletag;
            googletag.cmd.push(() => {
              if (window.top.document.body) {
                googletagCmd(config, googletag);
              } else {
                window.top.document.addEventListener('DOMContentLoaded', () => googletagCmd(config, googletag));
              }
            });
          },
          error: (message, err) => {
            throw err;
          }
        });
      }
    }
  };
  const consentDataHandler = consentData();
  lookupIabConsent((a) => consentDataHandler('cmp', a), (e) => consentDataHandler('cmp', false));
  lookupUspConsent((a) => consentDataHandler('usp', a), (e) => consentDataHandler('usp', false));
}

export function validateConfig(config) {
  if (!('placementId' in config)) {
    throw new Error(`${MODULE_NAME}: placementId required`);
  }
  if (!('adUnitPath' in config)) {
    throw new Error(`${MODULE_NAME}: adUnitPath required`);
  }
}

function googletagCmd(config, googletag) {
  const gamContainer = window.top.document.createElement('div');
  const containerName = 'ym_sim_container_' + config.placementId;
  gamContainer.id = containerName;
  window.top.document.body.appendChild(gamContainer);
  googletag.defineSlot(config.adUnitPath, [1, 1], containerName)
    .addService(googletag.pubads())
    .setTargeting('ym_sim_p_id', config.placementId);
  googletag.enableServices();
  googletag.display(containerName);
}

function collectData(placementId, consentDataObj) {
  const timeStamp = new Date().getTime();
  const connection = window.navigator.connection || {};
  const description = Array.prototype.slice.call(document.getElementsByTagName('meta'))
    .filter((meta) => meta.getAttribute('name') === 'description')[0];

  return {
    bust: timeStamp,
    dnt: window.top.doNotTrack === '1' || window.top.navigator.doNotTrack === '1' || false,
    pr: document.referrer || '',
    _s: 1,
    e: 4,
    page_url: window.top.location.href,
    p: placementId,
    description: description ? description.content.substring(0, 1000) : '',
    title: document.title,
    scrd: window.top.devicePixelRatio || 0,
    h: window.top.screen.height || window.top.screen.availHeight || window.top.outerHeight || window.top.innerHeight || 481,
    w: window.top.screen.width || window.top.screen.availWidth || window.top.outerWidth || window.top.innerWidth || 321,
    pft: timeStamp,
    ct: timeStamp,
    connect: typeof connection.effectiveType !== 'undefined' ? connection.effectiveType : undefined,
    bwe: typeof connection.downlink !== 'undefined' ? connection.downlink + 'Mb/sec' : undefined,
    rtt: typeof connection.rtt !== 'undefined' ? String(connection.rtt) : undefined,
    sd: typeof connection.saveData !== 'undefined' ? String(connection.saveData) : undefined,
    us_privacy: (consentDataObj.usp && consentDataObj.usp.usPrivacy) || '',
    cmp: (consentDataObj.cmp && consentDataObj.cmp.tcString) || ''
  };
}

function serialize(dataObj) {
  const str = [];
  for (let p in dataObj) {
    if (dataObj.hasOwnProperty(p) && (dataObj[p] || dataObj[p] === false)) {
      str.push(encodeURIComponent(p) + '=' + encodeURIComponent(dataObj[p]));
    }
  }
  return str.join('&');
}

function processResponse(res) {
  let parsedResponseBody;
  try {
    parsedResponseBody = JSON.parse(res.responseText);
  } catch (err) {
    throw new Error(`${MODULE_NAME}: response is not valid JSON`);
  }
  if (res && res.status === 204) {
    throw new Error(`${MODULE_NAME}: no content success status`);
  }
  if (parsedResponseBody.data && parsedResponseBody.data.length && parsedResponseBody.data[0].error_code) {
    throw new Error(`${MODULE_NAME}: no ad, error_code: ${parsedResponseBody.data[0].error_code}`);
  }
  return parsedResponseBody;
}

function checkSandbox(w) {
  try {
    return !w.top.document && w.top !== w && !w.frameElement;
  } catch (e) {
    throw new Error(`${MODULE_NAME}: module was placed in the sandbox iframe`);
  }
}

function lookupIabConsent(cmpSuccess, cmpError) {
  function findCMP() {
    let f = window;
    let cmpFrame;
    let cmpFunction;

    while (!cmpFrame) {
      try {
        if (isFn(f.__tcfapi)) {
          cmpVersion = 2;
          cmpFunction = f.__tcfapi;
          cmpFrame = f;
          continue;
        }
      } catch (e) { }

      try {
        if (f.frames['__tcfapiLocator']) {
          cmpVersion = 2;
          cmpFrame = f;
          continue;
        }
      } catch (e) { }

      if (f === window.top) break;
      f = f.parent;
    }
    return {
      cmpFrame,
      cmpFunction
    };
  }

  function cmpResponseCallback(tcfData, success) {
    if (success) {
      setTimeout(() => {
        if (!cmpResolved) {
          cmpSuccess(tcfData);
        }
      }, 3000);
      if (tcfData.gdprApplies === false || tcfData.eventStatus === 'tcloaded' || tcfData.eventStatus === 'useractioncomplete') {
        cmpSuccess(tcfData);
        cmpResolved = true;
      }
    } else {
      cmpError('CMP unable to register callback function.  Please check CMP setup.');
    }
  }

  let { cmpFrame, cmpFunction } = findCMP();

  if (!cmpFrame) {
    return cmpError('CMP not found.');
  }

  if (isFn(cmpFunction)) {
    cmpFunction('addEventListener', cmpVersion, cmpResponseCallback);
  } else {
    callCmpWhileInIframe('addEventListener', cmpFrame, cmpResponseCallback);
  }

  function callCmpWhileInIframe(commandName, cmpFrame, moduleCallback) {
    let apiName = '__tcfapi';
    let callName = `${apiName}Call`;
    let callId = Math.random() + '';
    let msg = {
      [callName]: {
        command: commandName,
        version: cmpVersion,
        parameter: undefined,
        callId: callId
      }
    };

    cmpFrame.postMessage(msg, '*');

    window.addEventListener('message', readPostMessageResponse, false);

    function readPostMessageResponse(event) {
      let cmpDataPkgName = `${apiName}Return`;
      let json = (typeof event.data === 'string' && strIncludes(event.data, cmpDataPkgName)) ? JSON.parse(event.data) : event.data;
      if (json[cmpDataPkgName] && json[cmpDataPkgName].callId) {
        let payload = json[cmpDataPkgName];

        if (payload.callId === callId) {
          moduleCallback(payload.returnValue, payload.success);
        }
      }
    }
  }
}

function lookupUspConsent(uspSuccess, uspError) {
  function findUsp() {
    let f = window;
    let uspapiFrame;
    let uspapiFunction;

    while (!uspapiFrame) {
      try {
        if (isFn(f.__uspapi)) {
          uspapiFunction = f.__uspapi;
          uspapiFrame = f;
          continue;
        }
      } catch (e) {}

      try {
        if (f.frames['__uspapiLocator']) {
          uspapiFrame = f;
          continue;
        }
      } catch (e) {}
      if (f === window.top) break;
      f = f.parent;
    }
    return {
      uspapiFrame,
      uspapiFunction,
    };
  }

  function handleUspApiResponseCallbacks() {
    const uspResponse = {};

    function afterEach() {
      if (uspResponse.usPrivacy) {
        uspSuccess(uspResponse);
      } else {
        uspError('Unable to get USP consent string.');
      }
    }

    return {
      consentDataCallback: (consentResponse, success) => {
        if (success && consentResponse.uspString) {
          uspResponse.usPrivacy = consentResponse.uspString;
        }
        afterEach();
      },
    };
  }

  let callbackHandler = handleUspApiResponseCallbacks();
  let { uspapiFrame, uspapiFunction } = findUsp();

  if (!uspapiFrame) {
    return uspError('USP CMP not found.');
  }

  if (isFn(uspapiFunction)) {
    uspapiFunction(
      'getUSPData',
      USPAPI_VERSION,
      callbackHandler.consentDataCallback
    );
  } else {
    callUspApiWhileInIframe(
      'getUSPData',
      uspapiFrame,
      callbackHandler.consentDataCallback
    );
  }

  function callUspApiWhileInIframe(commandName, uspapiFrame, moduleCallback) {
    let callId = Math.random() + '';
    let msg = {
      __uspapiCall: {
        command: commandName,
        version: USPAPI_VERSION,
        callId: callId,
      },
    };

    uspapiFrame.postMessage(msg, '*');

    window.addEventListener('message', readPostMessageResponse, false);

    function readPostMessageResponse(event) {
      const res = event && event.data && event.data.__uspapiReturn;
      if (res && res.callId) {
        if (res.callId === callId) {
          moduleCallback(res.returnValue, res.success);
        }
      }
    }
  }
}

config.getConfig('yieldmo_synthetic_inventory', config => init(config.yieldmo_synthetic_inventory));
