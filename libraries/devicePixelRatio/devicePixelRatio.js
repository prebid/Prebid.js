import {canAccessWindowTop, internal as utilsInternals} from '../../src/utils.js';
import {cachedGetter, internal as dimInternals} from '../../src/utils/winDimensions.js';

export const internal = {
  fetchDevicePixelRatio
};

const cachedDpr = cachedGetter(() => internal.fetchDevicePixelRatio());
// WARNING: devicePixelRatio carries high fingerprinting weights per
// https://github.com/duckduckgo/tracker-radar/blob/main/build-data/generated/api_fingerprint_weights.json.
// Importers should only request it when absolutely necessary.
export const getDevicePixelRatio = cachedDpr.get;
dimInternals.resetters.push(cachedDpr.reset);

function fetchDevicePixelRatio() {
  const win = canAccessWindowTop() ? utilsInternals.getWindowTop() : utilsInternals.getWindowSelf();
  return win.devicePixelRatio;
}
