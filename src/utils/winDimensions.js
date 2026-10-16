import { canAccessWindowTop, internal as utilsInternals } from '../utils.js';
import { CachedApiWrapper, LIVE } from './cachedApiWrapper.js';

const CHECK_INTERVAL_MS = 20;

// scrollTop/scrollLeft change continuously (up to thousands of CSS pixels per second during a
// fling), unlike the rest of this object (innerHeight, screen.*, clientWidth/Height, ...), which
// only changes on resize. Caching them behind the same TTL as everything else lets a caller
// combine a live rect with a stale scroll offset - or vice versa - producing a document-relative
// coordinate that describes no layout state that ever existed. They're read live instead; see
// https://github.com/prebid/Prebid.js/issues/15446.
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
        scrollTop: LIVE,
        scrollLeft: LIVE
      },
      body: {
        scrollTop: LIVE,
        scrollLeft: LIVE,
        clientWidth: true,
        clientHeight: true
      }
    }
  }
);

export const internal = {
  winDimensions,
};

export const getWinDimensions = (() => {
  let lastCheckTimestamp;
  return function () {
    if (!lastCheckTimestamp || (Date.now() - lastCheckTimestamp > CHECK_INTERVAL_MS)) {
      internal.winDimensions.reset();
      lastCheckTimestamp = Date.now();
    }
    return internal.winDimensions.obj;
  };
})();

export function resetWinDimensions() {
  internal.winDimensions.reset();
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
