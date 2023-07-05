import {isEmptyStr, isStr, logError, isFn, logWarn} from '../src/utils.js';
import {submodule} from '../src/hook.js';
import { loadExternalScript } from '../src/adloader.js';

export const _config = {
  MODULE: 'aaxBlockmeter',
  ADSERVER_TARGETING_KEY: 'atk',
  BLOCKMETER_URL: 'c.aaxads.com/aax.js',
  VERSION: '1.2'
};

window.aax = window.aax || {};

function loadBlockmeter(_rtdConfig) {
  if (!(_rtdConfig.params && _rtdConfig.params.pub) || !isStr(_rtdConfig.params && _rtdConfig.params.pub) || isEmptyStr(_rtdConfig.params && _rtdConfig.params.pub)) {
    logError(`${_config.MODULE}: params.pub should be a string`);
    return false;
  }

  const params = [];
  params.push(`pub=${_rtdConfig.params.pub}`);
  params.push(`dn=${window.location.hostname}`);

  let url = _rtdConfig.params.url;
  if (!url || isEmptyStr(url)) {
    logWarn(`${_config.MODULE}: params.url is missing, using default url.`);
    url = `${_config.BLOCKMETER_URL}?ver=${_config.VERSION}`;
  }

  const scriptUrl = `https://${url}&${params.join('&')}`;
  loadExternalScript(scriptUrl, _config.MODULE);
  return true;
}

function markAdBlockInventory(codes, _rtdConfig, _userConsent) {
  return codes.reduce((targets, code) => {
    targets[code] = targets[code] || {};
    const getAaxTargets = () => isFn(window.aax.getTargetingData)
      ? window.aax.getTargetingData(code, _rtdConfig, _userConsent)
      : {};
    targets[code] = {
      [_config.ADSERVER_TARGETING_KEY]: code,
      ...getAaxTargets()
    };
    return targets;
  }, {});
}

export const aaxBlockmeterRtdModule = {
  name: _config.MODULE,
  init: loadBlockmeter,
  getTargetingData: markAdBlockInventory,
};

function registerSubModule() {
  submodule('realTimeData', aaxBlockmeterRtdModule);
}

registerSubModule();
