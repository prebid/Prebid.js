import { submodule } from '../src/hook.js';
import { logInfo } from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';

const MODULE_NAME = 'tncId';
const FALLBACK_TNC_PROVIDERID = 'c8549079-f149-4529-a34b-3fa91ef257d1';
const FALLBACK_TNC_INSTANCE = '__tncPbjs';

const waitTNCScript = (tncNS) => {
  return new Promise((resolve, reject) => {
    var tnc = window[tncNS];
    if (!tnc) reject(new Error('No TNC Object'));
    if (tnc.tncid) resolve(tnc.tncid);
    tnc.ready(() => {
      tnc = window[tncNS];
      if (tnc.tncid) resolve(tnc.tncid);
      else tnc.on('data-sent', () => resolve(tnc.tncid));
    });
  });
}

const loadRemoteScript = (providerId) => {
  return new Promise((resolve) => {
    loadExternalScript('https://js.tncid.app/remote.js?ns=' + FALLBACK_TNC_INSTANCE + '&providerId=' + providerId, MODULE_NAME, resolve);
  })
}

const tncCallback = function (providerId, cb) {
  let tncNS = '__tnc';
  let promiseArray = [];
  if (!window[tncNS]) {
    tncNS = FALLBACK_TNC_INSTANCE;
    promiseArray.push(loadRemoteScript(providerId));
  }

  return Promise.all(promiseArray).then(() => waitTNCScript(tncNS)).then(cb).catch(() => cb());
}

export const tncidSubModule = {
  name: MODULE_NAME,
  decode(id) {
    return {
      tncid: id
    };
  },
  gvlid: 750,
  getId(config, consentData) {
    const gdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
    const consentString = gdpr ? consentData.consentString : '';
    let providerId = FALLBACK_TNC_PROVIDERID;
    if (config && config.params && config.params.providerId)providerId = config.params.providerId;

    if (gdpr && !consentString) {
      logInfo('Consent string is required for TNCID module');
      return;
    }

    return {
      callback: function (cb) { return tncCallback(providerId, cb); }
    }
  }
}

submodule('userId', tncidSubModule)
