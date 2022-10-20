import {isEmptyStr, isStr, logError, isFn} from '../src/utils.js';
import {submodule} from '../src/hook.js';
import { loadExternalScript } from '../src/adloader.js';

const MODULE = 'aaxBlockmeter';
const ADSERVER_TARGETING_KEY = 'atk';
const BLOCKMETER_URL = 'https://c.aaxads.com/aax.js';

window.aax = window.aax || {};

function loadBlockmeter(config) {
  if (!(config.params && config.params.pub) || !isStr(config.params && config.params.pub) || isEmptyStr(config.params && config.params.pub)) {
    logError(`${MODULE}: params.pub should be a string`);
    return false;
  }
  const url = `${BLOCKMETER_URL}?pub=${config.params.pub}&dn=${window.location.hostname}`;
  loadExternalScript(url, MODULE);
  return true;
}

function markAdBlockInventory(codes, _rtdConfig, _userConsent) {
  return codes.reduce((targets, code) => {
    targets[code] = targets[code] || {};
    const getAaxTargets = () => isFn(window.aax.getTargetingData)
      ? window.aax.getTargetingData(code, _rtdConfig, _userConsent)
      : {};
    targets[code] = {
      [ADSERVER_TARGETING_KEY]: code,
      ...getAaxTargets()
    };
    return targets;
  }, {});
}

export const aaxBlockmeterRtdModule = {
  name: MODULE,
  init: loadBlockmeter,
  getTargetingData: markAdBlockInventory,
};

function registerSubModule() {
  submodule('realTimeData', aaxBlockmeterRtdModule);
}

registerSubModule();
