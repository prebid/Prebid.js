import { submodule } from '../src/hook.js';
import { logInfo } from '../src/utils.js'

const MODULE_NAME = 'TNCID';

const loadTNCScript = () => {
  let tncOptions = {
    autostart: true,
    tcf: true,
    getFiles: {
      options: false, // true
      callback: false, // true
      prepare: false, // false
      scripts: false, // true
    }
  };
  let t = window
    , n = t.document
    , c = '__tncPbjs'
    , i = 'c8549079-f149-4529-a34b-3fa91ef257d1'
    , d = tncOptions;

  try {
    t[c] = t[c] || {}; t[c].providerId = i; t[c].options = t[c].options || d;
    var f = 'ready'; t[c][f] = t[c][f] || function (z) {
      t[c][f].q = t[c][f].q || []; t[c][f].q.push(z);
      return t[c];
    }; var s = n.createElement('script'); s.setAttribute('global', c); s.async = !0;
    s.defer = !0; s.id = 'tnc_route'; s.src = 'https://js.tncid.app/route.js';
    n.querySelector('head,body').appendChild(s);
  } catch (err) { console.log(err); }

  return window.__tncPbjs;
}

const tncCallback = (cb) => {
  let tnc = window.__tnc || loadTNCScript();

  if (tnc) {
    tnc.ready(() => {
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

}

export const tncidSubModule = {
  name: MODULE_NAME,
  decode(id) {
    return {
      TNCID: id
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

    return {
      callback: tncCallback
    }
  }
}

submodule('userId', tncidSubModule)
