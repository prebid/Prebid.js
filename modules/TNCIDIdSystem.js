import { submodule } from '../src/hook.js';
import { logInfo } from '../src/utils.js'

const MODULE_NAME = 'TNCID';

const tncCallback = function (cb) {
  let tnc = window.__tnc;

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
