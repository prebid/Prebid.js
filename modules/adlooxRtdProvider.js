/**
 * This module adds the Adloox provider to the real time data module
 * This module adds the [Adloox]{@link https://www.adloox.com/} provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will inject Adloox's prebid API JS
 * The module will fetch segments from Adloox's server
 * @module modules/adlooxRtdProvider
 * @requires module:modules/realTimeData
 * @requires module:modules/adlooxAnalyticsAdapter
 */

/* eslint prebid/validate-imports: "warn" */

import { command as analyticsCommand, COMMAND } from './adlooxAnalyticsAdapter.js';
import { config as _config } from '../src/config.js';
import { submodule } from '../src/hook.js';
import includes from 'core-js-pure/features/array/includes.js';
import { getGlobal } from '../src/prebidGlobal.js';
import * as utils from '../src/utils.js';

const MODULE = 'adlooxRtdProvider';

let CONFIGURED = false;

const URL_JS = 'https://p.adlooxtracking.com/gpt/a.js';

function init(config, userConsent) {
  utils.logInfo(MODULE, 'init', config, userConsent);

  if (!utils.isPlainObject(config)) {
    utils.logError(MODULE, 'missing config');
    return false;
  }
  if (config.params === undefined) config.params = {};
  if (!(utils.isPlainObject(config.params))) {
    utils.logError(MODULE, 'invalid params');
    return false;
  }
  if (!(config.params.js === undefined || utils.isStr(config.params.js))) {
    utils.logError(MODULE, 'invalid js params value');
    return false;
  }
  // legacy/deprecated configuration code path
  if (config.params.params === undefined) {
    config.params.params = {};
  } else if (!utils.isPlainObject(config.params.params) || !(utils.isInteger(config.params.params.clientid) && utils.isInteger(config.params.params.tagid) && utils.isInteger(config.params.params.platformid))) {
    utils.logError(MODULE, 'invalid subsection params block');
    return false;
  }

  window.adloox_pubint = window.adloox_pubint || { cmd: [] };

  const script = document.createElement('script');
  script.src = config.params.js || URL_JS;
  utils.insertElement(script);

  function analyticsConfigCallback(data) {
    CONFIGURED = true;

    const params = utils.mergeDeep({}, config.params.params, data);

    window.adloox_pubint.cmd.push(function() {
      window.adloox_pubint.init(params);
    });
  }
  if (Object.keys(config.params.params).length) {
    utils.logWarn(MODULE, 'legacy/deprecated configuration (please migrate to adlooxAnalyticsAdapter)');
    analyticsConfigCallback({});
  } else {
    analyticsCommand(COMMAND.CONFIG, null, analyticsConfigCallback);
  }

  return true;
}

function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  if (!CONFIGURED) {
    utils.logError(MODULE, 'getBidRequestData', 'called before configured, is analytics enabled?');
    return;
  }

  utils.logInfo(MODULE, 'getBidRequestData', reqBidsConfigObj, callback, config, userConsent);

  const context = {
    set: function(n, x) {
      utils.logInfo(MODULE, 'segment', 'context', n, x);
      const data = _config.getConfig('fpd.context.data') || {};
      delete data[n];
      if (x !== undefined) data[n] = x;
      _config.setConfig({ fpd: { context: { data: data } } });
    }
  };
  const user = {
    set: function(n, x) {
      utils.logInfo(MODULE, 'segment', 'user', n, x);
      const data = _config.getConfig('fpd.user.data') || {};
      delete data[n];
      if (x !== undefined) data[n] = x;
      _config.setConfig({ fpd: { user: { data: data } } });
    }
  };
  const slots = (reqBidsConfigObj.adUnits || getGlobal().adUnits).map(adUnit => {
    return {
      id: adUnit.code,
      // modules/gptPreAuction.js does not update the AdUnits themselves... (╯°□°)╯ ┻━┻
      name: utils.deepAccess(adUnit, 'fpd.context.pbAdSlot') || utils.getGptSlotInfoForAdUnitCode(adUnit.code).gptSlot || adUnit.code,
      set: function(n, x) {
        utils.logInfo(MODULE, 'segment', 'slot', adUnit.code, n, x);
        const data = utils.deepAccess(adUnit, 'fpd.context.data', {});
        delete data[n];
        if (x !== undefined) data[n] = x;
        utils.deepSetValue(adUnit, 'fpd.context.data', data);
      }
    };
  });

  window.adloox_pubint.cmd.push(function() {
    window.adloox_pubint.seg(context, user, slots, callback);
  });
}

function getTargetingData(adUnitArray, config, userConsent) {
  utils.logInfo(MODULE, 'getTargetingData', adUnitArray, config, userConsent);

  function add(pairs, dest) {
    // targeting:getTargetingValues expects strings or arrays
    Object.keys(pairs).filter(key => /^adl_/.test(key)).forEach(k => {
      let v = pairs[k];
      switch (true) {
        case utils.isBoolean(v):
          if (!v) break;
          v = 1;
        // falls through
        case utils.isNumber(v):
          if (!v) break;
          v = v.toString();
        // falls through
        case utils.isStr(v):
          if (!v.length) break;
          v = [ v ];
        // falls through
        case utils.isArray(v):
          let i = v.length;
          if (!i) break;
          while (i-- > 0) v[i] = v[i].toString();
          dest[k] = v;
        // falls through
      }
    });
  }

  const data0 = {};
  add(_config.getConfig('fpd.context.data') || {}, data0);
  add(_config.getConfig('fpd.user.data') || {}, data0);

  return getGlobal().adUnits.filter(adUnit => includes(adUnitArray, adUnit.code)).reduce((data, adUnit) => {
    data[adUnit.code] = utils.deepClone(data0);
    const fpdContextData = utils.deepAccess(adUnit, 'fpd.context.data', {});
    add(fpdContextData, data[adUnit.code]);
    return data;
  }, {});
}

export const subModuleObj = {
  name: 'adloox',
  init: init,
  getBidRequestData: getBidRequestData,
  getTargetingData: getTargetingData
};

submodule('realTimeData', subModuleObj);
