import { submodule } from '../src/hook.js';

/** @type {string} */
const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'arcspan';

/** @type {RtdSubmodule} */
export const subModuleObj = {
  name: SUBMODULE_NAME,
  init: init
};

function init(config, userConsent) {
  if (config.params.silo === 'undefined') {
    return false;
  }
  var _s = document.createElement('script');
  _s.type = 'text/javascript';
  if (config.params.silo === 'test') {
    _s.src = 'https://localhost:8080/as.js';
  } else {
    _s.src = 'https://silo' + config.params.silo + '.p7cloud.net/as.js';
  }
  document.head.appendChild(_s);
  return true;
}

submodule(MODULE_NAME, subModuleObj);
