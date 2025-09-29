import {canAccessWindowTop, internal as utilsInternals} from '../utils.js';
import {CachedApiWrapper} from './cachedApiWrapper.js';

const CHECK_INTERVAL_MS = 20;

const winDimensions = new CachedApiWrapper(
  () => canAccessWindowTop() ? utilsInternals.getWindowTop() : utilsInternals.getWindowSelf(),
  {
    innerHeight: true,
    innerWidth: true,
    screen: {
      width: true,
      height: true,
    },
    visualViewport: {
      width: true,
      height: true
    },
    document: {
      documentElement: {
        clientWidth: true,
        clientHeight: true,
        scrollTop: true,
        scrollLeft: true
      },
      body: {
        scrollTop: true,
        scrollLeft: true,
        clientWidth: true,
        clientHeight: true
      }
    }
  }
);

export const internal = {
  reset: winDimensions.reset,
};

export const getWinDimensions = (() => {
  let lastCheckTimestamp;
  return function () {
    if (!lastCheckTimestamp || (Date.now() - lastCheckTimestamp > CHECK_INTERVAL_MS)) {
      internal.reset();
      lastCheckTimestamp = Date.now();
    }
    return winDimensions.obj;
  }
})();

export function resetWinDimensions() {
  internal.reset();
}

export function getScreenOrientation(win) {
  const fallbackWin = win ?? (canAccessWindowTop() ? utilsInternals.getWindowTop() : utilsInternals.getWindowSelf());
  const screenData = fallbackWin?.screen ?? utilsInternals.getWindowSelf()?.screen ?? window?.screen;
  const width = Number(screenData?.width);
  const height = Number(screenData?.height);

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return;
  }

  return height >= width ? 'portrait' : 'landscape';
}
