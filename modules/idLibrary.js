import {getGlobal} from '../src/prebidGlobal.js';
import {ajax} from '../src/ajax.js';
import {config} from '../src/config.js';
import * as utils from '../src/utils.js';
import MD5 from 'crypto-js/md5.js';

let email;
const LOG_PRE_FIX = 'ID-Library: ';
const CONF_DEFAULT_OBSERVER_DEBOUNCE_MS = 250;
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
  return matched[0];
}

function hasEmail(value) {
  const email = getEmail(value);
  return !!email;
}

function bodyAction(conf, mutations, observer) {
  logInfo('BODY observer on debounce called');

  if (email) {
    observer.disconnect();
    logInfo('Email is found, body observer disconnected');
  }

  const body = document.body.innerHTML;

  if (hasEmail(body)) {
    email = getEmail(body);

    logInfo(`Email obtained from the body ${email}`);
    observer.disconnect();
    logInfo('Post data on email found in body');
    postData(conf.url);
  }
}

function targetAction(conf, mutations, observer) {
  logInfo('Target observer called');
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      email = node.textContent;

      if (email) {
        logInfo('Email obtained from the target ' + email);
        observer.disconnect();
        logInfo(' Post data on email found in target');
        postData(conf.url);
      }
    }
  }
}

function addInputElementsElementListner(conf) {
  logInfo('Adding input element listeners');
  const inputs = document.querySelectorAll('input[type=text], input[type=email]');
  for (const input of Array.from(inputs)) {
    logInfo(` Original Value in Input = ${input.value}`);
    input.addEventListener('change', event => processInputChange(event, conf));
    input.addEventListener('blur', event => processInputChange(event, conf));
  }
}

function removeInputElementsElementListner(conf) {
  logInfo('Removing input element listeners');
  const inputs = document.querySelectorAll('input[type=text], input[type=email]');
  for (const input of Array.from(inputs)) {
    input.removeEventListener('change', event => processInputChange(event, conf));
    input.removeEventListener('blur', event => processInputChange(event, conf));
  }
}

function processInputChange(event, conf) {
  const value = event.target.value;
  logInfo(`Modified Value of input ${event.target.value}`);
  if (hasEmail(value)) {
    email = getEmail(value);

    logInfo('Email found in input ' + email);
    postData(conf.url);
    removeInputElementsElementListner(conf);
  }
}

function debounce(func, wait, immediate) {
  let timeout;

  return function (...args) {
    const context = this;
    const later = function () {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    }
  };
}

function handleTargetElement(conf) {
  const targetObserver = new MutationObserver(function (mutations, observer) {
    logInfo('target observer called');
    debounce(targetAction(conf, mutations, observer), conf.debounce, false);
  });

  const targetElement = document.getElementById(conf.target);
  if (targetElement) {
    email = targetElement.innerText;

    if (!email) {
      logInfo('Finding the email with observer');
      targetObserver.observe(targetElement, OBSERVER_CONFIG);
    } else {
      logInfo(' Target found with target ' + email);
      logInfo(' Post data on email found in target with target');
      postData(conf.url);
    }
  }
}

function handleBodyElements(conf) {
  if (doesInputElementsHaveEmail()) {
    logInfo('Email found in input elements ' + email);
    logInfo('Post data on email found in target without');
    postData(conf.url);
    return;
  }
  if (hasEmail(document.body.innerHTML)) {
    email = getEmail(document.body.innerHTML);

    logInfo('Email found in body ' + email);
    logInfo(' Post data on email found in the body without observer');
    postData(conf.url);
    return;
  }
  addInputElementsElementListner(conf);
  const bodyObserver = new MutationObserver(function (mutations, observer) {
    logInfo('Body observer called');
    debounce(bodyAction(conf, mutations, observer), conf.debounce, false);
  });
  bodyObserver.observe(document.body, OBSERVER_CONFIG);
}

function doesInputElementsHaveEmail() {
  const inputs = document.getElementsByTagName('input');

  for (let index = 0; index < inputs.length; ++index) {
    const curInput = inputs[index];

    if (hasEmail(curInput.value)) {
      email = getEmail(curInput.value);
      return true;
    }
  }
  return false;
}

function syncCallback() {
  return {
    success: function (responseBody) {
      logInfo(' Data synced successfully.');
    },
    error: function () {
      logInfo(' Data sync failed.');
    }
  }
}

function postData(url) {
  (getGlobal()).refreshUserIds();
  const userIds = (getGlobal()).getUserIds();
  if (!userIds || userIds.length === 0) {
    return;
  }
  logInfo(' Users' + JSON.stringify(userIds));
  const syncPayload = {};
  syncPayload.hid = MD5(email).toString();
  syncPayload.uids = JSON.stringify(userIds);
  const payloadString = JSON.stringify(syncPayload);
  logInfo(payloadString);
  ajax(url, syncCallback(), payloadString, {method: 'POST', withCredentials: true});
}

function associateIds(conf) {
  if (window.MutationObserver || window.WebKitMutationObserver) {
    if (conf.target) {
      handleTargetElement(conf);
    } else {
      handleBodyElements(conf);
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
  if (!config.debounce) {
    config.debounce = CONF_DEFAULT_OBSERVER_DEBOUNCE_MS;
    logInfo('Set default observer debounce to ' + CONF_DEFAULT_OBSERVER_DEBOUNCE_MS);
  }

  associateIds(config);
}

config.getConfig('idLibrary', config => setConfig(config.idLibrary));
