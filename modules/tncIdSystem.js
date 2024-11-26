import { submodule } from '../src/hook.js';
import { logInfo } from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

const MODULE_NAME = 'tncId';
const TNC_DEFAULT_NS = '__tnc';
const TNC_PREBID_NS = '__tncPbjs';
let url = null;

const loadRemoteScript = async (ns) => {
  await new Promise((resolve) => {
    let currentURL = new URL(url);
    currentURL.searchParams.append('ns', ns);
    loadExternalScript(currentURL.toString(), MODULE_TYPE_UID, MODULE_NAME, resolve);
  });
}

const tncCallback = async function(cb) {
  try {
    let tncNS = TNC_DEFAULT_NS;
    if (!window[tncNS]) {
      if (!url) return cb();
      tncNS = TNC_PREBID_NS;
      await (window[tncNS] || loadRemoteScript(tncNS));
    }
    let tnc = window[tncNS];
    if (!tnc || typeof tnc.ready !== 'function') return cb();

    await new Promise(resolve => tnc.ready(resolve));
    tnc = window[tncNS];
    let tncid = await tnc.getTNCID('prebid');
    return cb(tncid);
  } catch (err) { return cb(); }
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
      // callback: tncCallback
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
