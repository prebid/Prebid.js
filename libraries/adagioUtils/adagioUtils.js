import {
  canAccessWindowTop,
  generateUUID,
  getWindowSelf,
  getWindowTop,
  isSafeFrameWindow
} from '../../src/utils.js';

/**
 * Returns the best Window object to use with ADAGIO.
 * @returns {Window} window.top or window.self object
 */
export function getBestWindowForAdagio() {
  return (canAccessWindowTop()) ? getWindowTop() : getWindowSelf();
}

/**
 * Returns the window.ADAGIO global object used to store Adagio data.
 * This object is created in window.top if possible, otherwise in window.self.
 */
export const _ADAGIO = (function() {
  const w = getBestWindowForAdagio();

  w.ADAGIO = w.ADAGIO || {};
  // TODO: consider using the Prebid-generated page view ID instead of generating a custom one
  w.ADAGIO.pageviewId = w.ADAGIO.pageviewId || generateUUID();
  w.ADAGIO.adUnits = w.ADAGIO.adUnits || {};
  w.ADAGIO.pbjsAdUnits = w.ADAGIO.pbjsAdUnits || [];
  w.ADAGIO.queue = w.ADAGIO.queue || [];
  w.ADAGIO.versions = w.ADAGIO.versions || {};
  w.ADAGIO.versions.pbjs = '$prebid.version$';
  w.ADAGIO.windows = w.ADAGIO.windows || [];
  w.ADAGIO.isSafeFrameWindow = isSafeFrameWindow();

  return w.ADAGIO;
})();
