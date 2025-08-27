import {getGlobalVarName} from '../../src/buildOptions.js';

window[getGlobalVarName()] = (window[getGlobalVarName()] || {});
window[getGlobalVarName()].installedModules = (window[getGlobalVarName()].installedModules || []);
window[getGlobalVarName()].cmd = window[getGlobalVarName()].cmd || [];
window[getGlobalVarName()].que = window[getGlobalVarName()].que || [];
