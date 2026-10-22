import { canAccessWindowTop, internal as utilsInternals } from '../utils.js';
import { CachedApiWrapper } from './cachedApiWrapper.js';
import { endLayoutEpoch, onLayoutEpochEnd, startLayoutEpoch } from './layoutEpoch.js';

const winDimensions = new CachedApiWrapper(
  () => {
    // called for every value read into the cache, including through an object obtained from
    // getWinDimensions() in an earlier epoch, so that each value is discarded when the epoch it was read in ends
    startLayoutEpoch();
    return canAccessWindowTop() ? utilsInternals.getWindowTop() : utilsInternals.getWindowSelf();
  },
  {
    innerHeight: true,
    innerWidth: true,
    scrollX: true,
    scrollY: true,
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
  winDimensions,
};

onLayoutEpochEnd(() => internal.winDimensions.reset());

/**
 * Dimensions and scroll offsets of the top window (or of this window, if the top one is not accessible).
 * Values are cached for the current layout epoch, together with element rects from the
 * `boundingClientRect` library, so the two can be combined; see `layoutEpoch.js`.
 */
export function getWinDimensions() {
  return internal.winDimensions.obj;
}

export function resetWinDimensions() {
  endLayoutEpoch();
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
