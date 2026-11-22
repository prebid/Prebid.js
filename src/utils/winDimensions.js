import { canAccessWindowTop, internal as utilsInternals } from '../utils.js';
import { CachedApiWrapper } from './cachedApiWrapper.js';
import { endLayoutEpoch, onLayoutEpochEnd, startLayoutEpoch } from './layoutEpoch.js';

const windowCaches = new WeakMap();
const activeCaches = new Set();

function createDimensions(getWindow) {
  const dimensions = new CachedApiWrapper(
    () => {
      // called for every value read into the cache, including through an object obtained from
      // getWinDimensions() in an earlier epoch, so that each value is discarded when the epoch it was read in ends
      startLayoutEpoch();
      activeCaches.add(dimensions);
      return getWindow();
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
          offsetWidth: true,
          offsetHeight: true,
          scrollWidth: true,
          scrollHeight: true,
          clientWidth: true,
          clientHeight: true,
          scrollTop: true,
          scrollLeft: true
        },
        body: {
          scrollTop: true,
          scrollLeft: true,
          offsetWidth: true,
          offsetHeight: true,
          scrollWidth: true,
          scrollHeight: true,
          clientWidth: true,
          clientHeight: true
        }
      }
    }
  );
  return dimensions;
}

const winDimensions = createDimensions(() => canAccessWindowTop() ? utilsInternals.getWindowTop() : utilsInternals.getWindowSelf());

export const internal = {
  winDimensions,
};

onLayoutEpochEnd(() => {
  internal.winDimensions.reset();
  activeCaches.forEach(cache => {
    if (cache !== internal.winDimensions) cache.reset();
  });
  activeCaches.clear();
});

/**
 * Dimensions and scroll offsets of the top window (or of this window, if the top one is not accessible).
 * Pass a window to read that specific frame instead.
 * Values are cached for the current layout epoch, together with element rects from the
 * `boundingClientRect` library, so the two can be combined; see `layoutEpoch.js`.
 */
export function getWinDimensions(win) {
  if (win == null) return internal.winDimensions.obj;
  if (!windowCaches.has(win)) {
    windowCaches.set(win, createDimensions(() => win));
  }
  return windowCaches.get(win).obj;
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
