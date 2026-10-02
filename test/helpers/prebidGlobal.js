import { getGlobalVarName } from '../../src/buildOptions.js';

const globalVarName = getGlobalVarName();
const prebidGlobal = window[globalVarName] = (window[globalVarName] || {});

prebidGlobal.version = prebidGlobal.version || 'v$prebid.version$';
prebidGlobal.installedModules = (prebidGlobal.installedModules || []);
prebidGlobal.cmd = prebidGlobal.cmd || [];
prebidGlobal.que = prebidGlobal.que || [];
