import { submodule } from '../src/hook.js';
import { logInfo } from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

const MODULE_NAME = 'tncId';
let url = null;

const waitTNCScript = (tncNS) => {
  return new Promise((resolve, reject) => {
    var tnc = window[tncNS];
    if (!tnc) reject(new Error('No TNC Object'));
    if (tnc.tncid) resolve(tnc.tncid);
    tnc.ready(async () => {
      let tncid = await tnc.getTNCID('prebid');
      resolve(tncid);
    });
  });
}

const loadRemoteScript = () => {
  return new Promise((resolve) => {
    loadExternalScript(url, MODULE_TYPE_UID, MODULE_NAME, resolve);
  })
}

const tncCallback = function (cb) {
  let tncNS = '__tnc';
  let promiseArray = [];
  if (!window[tncNS]) {
    tncNS = '__tncPbjs';
    promiseArray.push(loadRemoteScript());
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

    if (gdpr && !consentString) {
      logInfo('Consent string is required for TNCID module');
      return;
    }

    if (config.params && config.params.url) { url = config.params.url; }

    return {
      callback: function (cb) { return tncCallback(cb); }
    }
  },
  eids: {
    'tncid': {
      source: 'thenewco.it',
      atype: 3
    },
  }
}

submodule('userId', tncidSubModule)
