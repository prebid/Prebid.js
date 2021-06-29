import {getGlobal} from '../src/prebidGlobal.js';
import {ajax} from '../src/ajax.js';
import {config} from '../src/config.js';
import * as utils from '../src/utils.js';
import MD5 from 'crypto-js/md5.js';

let email;
let conf;
const LOG_PRE_FIX = 'ID-Library: ';
const CONF_DEFAULT_OBSERVER_DEBOUNCE_MS = 250;
const CONF_DEFAULT_FULL_BODY_SCAN = false;
const OBSERVER_CONFIG = {
  subtree: true,
  attributes: true,
  attributeOldValue: false,
  childList: true,
  attirbuteFilter: ['value'],
  characterData: true,
  characterDataOldValue: false
};
const logInfo = createLogInfo(LOG_PRE_FIX);
const logError = createLogError(LOG_PRE_FIX);

function createLogInfo(prefix) {
  return function (...strings) {
    utils.logInfo(prefix + ' ', ...strings);
  }
}

function createLogError(prefix) {
  return function (...strings) {
    utils.logError(prefix + ' ', ...strings);
  }
}

function getEmail(value) {
  const matched = value.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
  if (!matched) {
    return null;
  }
  logInfo('Email found: ' + matched[0]);
  return matched[0];
}

function bodyAction(mutations, observer) {
  logInfo('BODY observer on debounce called');
  // If the email is found in the input element, disconnect the observer
  if (email) {
    observer.disconnect();
    logInfo('Email is found, body observer disconnected');
    return;
  }

  const body = document.body.innerHTML;
  email = getEmail(body);
  if (email !== null) {
    logInfo(`Email obtained from the body ${email}`);
    observer.disconnect();
    logInfo('Post data on email found in body');
    postData();
  }
}

function targetAction(mutations, observer) {
  logInfo('Target observer called');
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      email = node.textContent;

      if (email) {
        logInfo('Email obtained from the target ' + email);
        observer.disconnect();
        logInfo('Post data on email found in target');
        postData();
        return;
      }
    }
  }
}

function addInputElementsElementListner(conf) {
  logInfo('Adding input element listeners');
  const inputs = document.querySelectorAll('input[type=text], input[type=email]');

  for (var i = 0; i < inputs.length; i++) {
    logInfo(`Original Value in Input = ${inputs[i].value}`);
    inputs[i].addEventListener('change', event => processInputChange(event));
    inputs[i].addEventListener('blur', event => processInputChange(event));
  }
}

function removeInputElementsElementListner() {
  logInfo('Removing input element listeners');
  const inputs = document.querySelectorAll('input[type=text], input[type=email]');

  for (var i = 0; i < inputs.length; i++) {
    inputs[i].removeEventListener('change', event => processInputChange(event));
    inputs[i].removeEventListener('blur', event => processInputChange(event));
  }
}

function processInputChange(event) {
  const value = event.target.value;
  logInfo(`Modified Value of input ${event.target.value}`);
  email = getEmail(value);
  if (email !== null) {
    logInfo('Email found in input ' + email);
    postData();
    removeInputElementsElementListner();
  }
}

function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    const context = this;
    const args = arguments;
    const later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    if (callNow) {
      func.apply(context, args);
    } else {
      logInfo('Debounce wait time ' + wait);
      timeout = setTimeout(later, wait);
    }
  };
};

function handleTargetElement() {
  const targetObserver = new MutationObserver(debounce(targetAction, conf.debounce, false));

  const targetElement = document.getElementById(conf.target);
  if (targetElement) {
    email = targetElement.innerText;

    if (!email) {
      logInfo('Finding the email with observer');
      targetObserver.observe(targetElement, OBSERVER_CONFIG);
    } else {
      logInfo('Target found with target ' + email);
      logInfo('Post data on email found in target with target');
      postData();
    }
  }
}

function handleBodyElements() {
  if (doesInputElementsHaveEmail()) {
    logInfo('Email found in input elements ' + email);
    logInfo('Post data on email found in target without');
    postData();
    return;
  }
  email = getEmail(document.body.innerHTML);
  if (email !== null) {
    logInfo('Email found in body ' + email);
    logInfo('Post data on email found in the body without observer');
    postData();
    return;
  }
  addInputElementsElementListner();
  if (conf.fullscan === true) {
    const bodyObserver = new MutationObserver(debounce(bodyAction, conf.debounce, false));
    bodyObserver.observe(document.body, OBSERVER_CONFIG);
  }
}

function doesInputElementsHaveEmail() {
  const inputs = document.getElementsByTagName('input');

  for (let index = 0; index < inputs.length; ++index) {
    const curInput = inputs[index];
    email = getEmail(curInput.value);
    if (email !== null) {
      return true;
    }
  }
  return false;
}

function syncCallback() {
  return {
    success: function () {
      logInfo('Data synced successfully.');
    },
    error: function () {
      logInfo('Data sync failed.');
    }
  }
}

function postData() {
  (getGlobal()).refreshUserIds();
  const userIds = (getGlobal()).getUserIds();
  if (Object.keys(userIds).length === 0) {
    logInfo('No user ids');
    return;
  }
  logInfo('Users' + userIds);
  const syncPayload = {};
  syncPayload.hid = MD5(email).toString();
  syncPayload.uids = userIds;
  const payloadString = JSON.stringify(syncPayload);
  logInfo(payloadString);
  ajax(conf.url, syncCallback(), payloadString, {method: 'POST', withCredentials: true});
}

function associateIds() {
  if (window.MutationObserver || window.WebKitMutationObserver) {
    if (conf.target) {
      handleTargetElement();
    } else {
      handleBodyElements();
    }
  }
}

export function setConfig(config) {
  if (!config) {
    logError('Required confirguration not provided');
    return;
  }
  if (!config.url) {
    logError('The required url is not configured');
    return;
  }
  if (typeof config.debounce !== 'number') {
    config.debounce = CONF_DEFAULT_OBSERVER_DEBOUNCE_MS;
    logInfo('Set default observer debounce to ' + CONF_DEFAULT_OBSERVER_DEBOUNCE_MS);
  }
  if (typeof config.fullscan !== 'boolean') {
    config.fullscan = CONF_DEFAULT_FULL_BODY_SCAN;
    logInfo('Set default fullscan ' + CONF_DEFAULT_FULL_BODY_SCAN);
  }
  conf = config;
  associateIds();
}

config.getConfig('idImportLibrary', config => setConfig(config.idImportLibrary));
