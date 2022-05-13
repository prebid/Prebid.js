import { submodule } from '../src/hook.js';
import { logInfo } from '../src/utils.js'

const MODULE_NAME = 'TNCID';
const FALLBACK_TNC_INSTANCE = '__tncPbjs';
const FALLBACK_TNC_PROVIDERID = 'c8549079-f149-4529-a34b-3fa91ef257d1';
const loadTNCScript = function (tncInstance, providerId) {
  try {
    let tncOptions = {
      autostart: true,
      tcf: true,
      getFiles: {
        cacheid: false, // true
        options: false, // true
        callback: false, // true
        prepare: false, // false
        scripts: false // true
      }
    };
    let t = window;
    let n = t.document;
    let c = tncInstance;
    let i = providerId;
    let d = tncOptions;

    t[c] = t[c] || {}; t[c].providerId = i; t[c].options = t[c].options || d;
    var f = 'ready'; t[c][f] = t[c][f] || function (z) {
      t[c][f].q = t[c][f].q || []; t[c][f].q.push(z);
      return t[c];
    }; var s = n.createElement('script'); s.setAttribute('global', c); s.async = !0;
    s.defer = !0; s.id = 'tnc_route'; s.src = 'https://js.tncid.app/route.js';
    n.querySelector('head,body').appendChild(s);

    return new Promise((resolve, reject) => {
      try {
        t[c].ready(() => {
          t[c].on('data-sent', () => resolve(t[c]));
        });
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    return Promise.reject(err);
  }

}
const tncCallback = function (providerId, cb) {
  let promise = window.__tnc || window[FALLBACK_TNC_INSTANCE]
    ? Promise.resolve(window.__tnc || window[FALLBACK_TNC_INSTANCE])
    : loadTNCScript(FALLBACK_TNC_INSTANCE, providerId);

  promise
    .then(tnc => {
      if (tnc) {
        tnc.ready(function () {
          if (tnc.tncid) {
            cb(tnc.tncid);
          } else {
            tnc.on('data-sent', () => {
              cb(tnc.tncid);
            });
          }
        });
      } else {
        cb();
      }
    })
    .catch(() => cb());
}

export const tncidSubModule = {
  name: MODULE_NAME,
  decode(id) {
    return {
      TNCID: id
    };
  },
  gvlid: 750,
  getId(config = {}, consentData) {
    const gdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
    const consentString = gdpr ? consentData.consentString : '';
    const { params } = config;
    const providerId = (params || {}).providerId || FALLBACK_TNC_PROVIDERID;

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
