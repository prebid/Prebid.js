import {canAccessWindowTop, internal as utilsInternals} from '../../src/utils.js';

function getFallbackWindow(win) {
  if (win) {
    return win;
  }

  return canAccessWindowTop() ? utilsInternals.getWindowTop() : utilsInternals.getWindowSelf();
}

export function getDevicePixelRatio(win) {
  try {
    return getFallbackWindow(win).devicePixelRatio;
  } catch (e) {
  }
  return 1;
}
