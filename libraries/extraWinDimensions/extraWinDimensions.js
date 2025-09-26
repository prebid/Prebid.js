import {canAccessWindowTop, internal as utilsInternals} from '../../src/utils.js';
import {cachedGetter, internal as dimInternals} from '../../src/utils/winDimensions.js';

export const internal = {
  fetchExtraDimensions
};

const extraDims = cachedGetter(() => internal.fetchExtraDimensions());
// WARNING: metrics from this helper carry high fingerprinting weights per
// https://github.com/duckduckgo/tracker-radar/blob/main/build-data/generated/api_fingerprint_weights.json.
// Importers should only request them when absolutely necessary.
export const getExtraWinDimensions = extraDims.get;
dimInternals.resetters.push(extraDims.reset);

function fetchExtraDimensions() {
  const win = canAccessWindowTop() ? utilsInternals.getWindowTop() : utilsInternals.getWindowSelf();
  return {
    outerWidth: win.outerWidth,
    outerHeight: win.outerHeight,
    screen: {
      availWidth: win.screen?.availWidth,
      availHeight: win.screen?.availHeight,
      colorDepth: win.screen?.colorDepth,
    }
  };
}
