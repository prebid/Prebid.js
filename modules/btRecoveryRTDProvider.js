import { isStr, logError } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { loadExternalScript } from '../src/adloader.js';

const MODULE_NAME = 'btRecovery';

function init(config) {
  const pubID = config.params && config.params.pubID;

  if (!pubID || !isStr(pubID)) {
    logError(`${MODULE_NAME}: params.pubID should be a string`);
    return false;
  }

  const scriptUrl = `https://btloader.com/tag?o=${pubID}&upapi=true`;
  loadExternalScript(scriptUrl, MODULE_NAME);

  return true;
}

export const btRecoveryRtdModule = {
  name: MODULE_NAME,
  init
};

function registerSubModule() {
  submodule('realTimeData', btRecoveryRtdModule);
}

registerSubModule();
