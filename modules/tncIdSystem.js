
import { submodule } from '../src/hook.js';
import { logInfo } from '../src/utils.js'

const MODULE_NAME = 'tncId';
const FALLBACK_TNC_PROVIDERID = 'c8549079-f149-4529-a34b-3fa91ef257d1';
const FALLBACK_TNC_INSTANCE = '__tncPbjs';

const loadRemoteTNCScript = (providerId) => {
  try {
    let tncOptions = {
      autostart: true,
      tcf: true,
      getFiles: {
        cacheid: true, // true
        options: false, // true
        callback: false, // true
        prepare: false, // false
        scripts: false // true
      }
    };
    let t = window;
    let n = t.document;
    let c = FALLBACK_TNC_INSTANCE;
    let i = providerId;
    let d = tncOptions;

    t[c] = t[c] || {}; t[c].providerId = i; t[c].options = t[c].options || d;
    var f = 'ready'; t[c][f] = t[c][f] || function (z) {
      t[c][f].q = t[c][f].q || []; t[c][f].q.push(z);
      return t[c];
    }; var s = n.createElement('script'); s.setAttribute('global', c); s.async = !0;
    s.defer = !0; s.id = 'tnc_route'; s.src = 'https://js.tncid.app/route.js';
    n.querySelector('head,body').appendChild(s);
  } catch (error) { }
}

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

const tncCallback = function (providerId, cb) {
  let tncNS = '__tnc';
  if (!window[tncNS]) {
    tncNS = FALLBACK_TNC_INSTANCE;
    loadRemoteTNCScript(providerId);
  }

  return waitTNCScript(tncNS).then(cb).catch(() => cb());
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
